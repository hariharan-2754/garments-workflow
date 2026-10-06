from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above
from models.attendance import (
    AttendanceCheckInRequest, AttendanceCheckOutRequest,
    AdminMarkAttendanceRequest, BulkAttendanceRequest,
    LeaveRequestCreate, LeaveStatusUpdate, AttendanceResponse
)
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/attendance", tags=["Attendance & Leaves"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "employeeId": str(d.get("employeeId")),
        "employeeName": d.get("employeeName", "Unknown"),
        "department": d.get("department"),
        "date": d.get("date"),
        "checkInTime": d.get("checkInTime"),
        "checkOutTime": d.get("checkOutTime"),
        "status": d.get("status", "Present"),
        "workingHours": round(float(d.get("workingHours") or 0.0), 2),
        "overtimeHours": round(float(d.get("overtimeHours") or 0.0), 2),
        "shift": d.get("shift", "General"),
        "remarks": d.get("remarks"),
        "markedBy": d.get("markedBy"),
        "createdAt": d.get("createdAt")
    }

@router.get("", response_model=List[AttendanceResponse])
async def list_attendance(
    date: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    employeeId: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if date:
        query["date"] = date
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if status:
        query["status"] = status
    if employeeId:
        query["employeeId"] = employeeId

    # If worker, restrict only to their own attendance
    if current_user.get("role") == "WORKER":
        query["employeeId"] = str(current_user.get("_id"))

    docs = await db.attendance.find(query).sort("date", -1).to_list(1000)
    return [_doc_to_res(d) for d in docs]

@router.get("/today/my-status")
async def get_my_today_status(db=Depends(get_db), current_user=Depends(get_current_user)):
    user_id = str(current_user.get("_id"))
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    record = await db.attendance.find_one({"employeeId": user_id, "date": today_str})
    if not record:
        return {"status": "Not Checked In", "record": None}
    return {"status": record.get("status"), "record": _doc_to_res(record)}

@router.post("/check-in")
async def check_in(body: AttendanceCheckInRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    user_id = str(current_user.get("_id"))
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    # Check for duplicate check-in today
    existing = await db.attendance.find_one({"employeeId": user_id, "date": today_str})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Already checked in today at {existing.get('checkInTime')}"
        )

    # Calculate Late status based on shift rules
    settings_doc = await db.settings.find_one({"type": "system"}) or {}
    shift_start = settings_doc.get("shiftStartTime", "09:00")
    grace_mins = int(settings_doc.get("gracePeriodMinutes", 15))
    
    # Parse check-in time vs shift
    status_label = "Present"
    try:
        shift_h, shift_m = [int(x) for x in shift_start.split(":")]
        shift_cutoff = (datetime.combine(now.date(), datetime.min.time()) + timedelta(hours=shift_h, minutes=shift_m + grace_mins)).time()
        if now.time() > shift_cutoff:
            status_label = "Late"
    except Exception:
        pass

    doc = {
        "employeeId": user_id,
        "employeeName": current_user.get("name"),
        "department": current_user.get("department"),
        "date": today_str,
        "checkInTime": time_str,
        "checkOutTime": None,
        "status": status_label,
        "workingHours": 0.0,
        "overtimeHours": 0.0,
        "shift": body.shift or current_user.get("shift", "General"),
        "remarks": body.remarks,
        "markedBy": "Self",
        "createdAt": now.isoformat()
    }

    result = await db.attendance.insert_one(doc)
    doc["_id"] = result.inserted_id
    
    if status_label == "Late":
        await create_notification("Late Attendance", f"{current_user.get('name')} checked in late at {time_str}", "warning", "Attendance")

    return _doc_to_res(doc)

@router.post("/check-out")
async def check_out(body: AttendanceCheckOutRequest, db=Depends(get_db), current_user=Depends(get_current_user)):
    user_id = str(current_user.get("_id"))
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    record = await db.attendance.find_one({"employeeId": user_id, "date": today_str})
    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot check out without checking in first."
        )
    
    if record.get("checkOutTime"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Already checked out today at {record.get('checkOutTime')}"
        )

    # Calculate hours
    checkin_str = record.get("checkInTime")
    working_hours = 0.0
    overtime = 0.0
    try:
        t_in = datetime.strptime(checkin_str, "%H:%M:%S")
        t_out = datetime.strptime(time_str, "%H:%M:%S")
        diff_sec = (t_out - t_in).total_seconds()
        working_hours = max(0.0, diff_sec / 3600.0)
        
        standard_hours = 8.0
        if working_hours > standard_hours:
            overtime = working_hours - standard_hours
    except Exception:
        working_hours = 8.0

    updates = {
        "checkOutTime": time_str,
        "workingHours": round(working_hours, 2),
        "overtimeHours": round(overtime, 2)
    }
    if body.remarks:
        updates["remarks"] = f"{record.get('remarks') or ''} | {body.remarks}".strip(" |")

    await db.attendance.update_one({"_id": record["_id"]}, {"$set": updates})
    updated = await db.attendance.find_one({"_id": record["_id"]})
    return _doc_to_res(updated)

@router.post("/admin-mark")
async def admin_mark_attendance(
    body: AdminMarkAttendanceRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    emp = await db.users.find_one(_make_id_query(body.employeeId))
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    existing = await db.attendance.find_one({"employeeId": str(emp["_id"]), "date": body.date})
    
    working_hours = 0.0
    if body.checkInTime and body.checkOutTime:
        try:
            t_in = datetime.strptime(body.checkInTime, "%H:%M:%S" if len(body.checkInTime) == 8 else "%H:%M")
            t_out = datetime.strptime(body.checkOutTime, "%H:%M:%S" if len(body.checkOutTime) == 8 else "%H:%M")
            diff = (t_out - t_in).total_seconds()
            working_hours = max(0.0, diff / 3600.0)
        except Exception:
            working_hours = 8.0 if body.status in ["Present", "Late"] else 4.0 if body.status == "Half Day" else 0.0
    elif body.status in ["Present", "Late"]:
        working_hours = 8.0
    elif body.status == "Half Day":
        working_hours = 4.0

    doc = {
        "employeeId": str(emp["_id"]),
        "employeeName": emp.get("name"),
        "department": emp.get("department"),
        "date": body.date,
        "checkInTime": body.checkInTime,
        "checkOutTime": body.checkOutTime,
        "status": body.status,
        "workingHours": round(working_hours, 2),
        "overtimeHours": round(body.overtimeHours or 0.0, 2),
        "shift": body.shift or "General",
        "remarks": body.remarks,
        "markedBy": admin.get("name"),
        "createdAt": datetime.now(timezone.utc).isoformat()
    }

    if existing:
        await db.attendance.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["_id"] = existing["_id"]
    else:
        result = await db.attendance.insert_one(doc)
        doc["_id"] = result.inserted_id

    await log_audit(f"Marked attendance for {emp.get('name')} as {body.status} on {body.date}", "Attendance", str(doc["_id"]), user=admin)
    return _doc_to_res(doc)

@router.post("/bulk-mark")
async def bulk_mark_attendance(
    body: BulkAttendanceRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    count = 0
    for rec in body.records:
        rec.date = body.date
        await admin_mark_attendance(rec, db, admin)
        count += 1
    return {"message": f"Successfully updated {count} attendance records for {body.date}"}

# ================= LEAVES =================
@router.get("/leaves")
async def list_leaves(
    status: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if current_user.get("role") == "WORKER":
        query["employeeId"] = str(current_user.get("_id"))
    
    docs = await db.leaves.find(query).sort("createdAt", -1).to_list(500)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.post("/leaves/apply")
async def apply_leave(
    body: LeaveRequestCreate,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    doc = {
        "employeeId": str(current_user.get("_id")),
        "employeeName": current_user.get("name"),
        "department": current_user.get("department"),
        "leaveType": body.leaveType,
        "startDate": body.startDate,
        "endDate": body.endDate,
        "reason": body.reason,
        "status": "Pending",
        "approvedBy": None,
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    result = await db.leaves.insert_one(doc)
    doc["id"] = str(result.inserted_id)

    await create_notification("New Leave Request", f"{current_user.get('name')} requested {body.leaveType} from {body.startDate} to {body.endDate}", "info", "Leaves")
    return doc

@router.put("/leaves/{leave_id}/status")
async def update_leave_status(
    leave_id: str,
    body: LeaveStatusUpdate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    leave_doc = await db.leaves.find_one(_make_id_query(leave_id))
    if not leave_doc:
        raise HTTPException(status_code=404, detail="Leave request not found")

    await db.leaves.update_one(_make_id_query(leave_id), {
        "$set": {
            "status": body.status,
            "approvedBy": admin.get("name"),
            "resolutionRemarks": body.remarks,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
    })

    # If approved, update attendance records for that range
    if body.status == "Approved":
        try:
            start = datetime.strptime(leave_doc["startDate"], "%Y-%m-%d")
            end = datetime.strptime(leave_doc["endDate"], "%Y-%m-%d")
            delta = timedelta(days=1)
            curr = start
            while curr <= end:
                d_str = curr.strftime("%Y-%m-%d")
                existing = await db.attendance.find_one({"employeeId": leave_doc["employeeId"], "date": d_str})
                att_record = {
                    "employeeId": leave_doc["employeeId"],
                    "employeeName": leave_doc["employeeName"],
                    "department": leave_doc.get("department"),
                    "date": d_str,
                    "checkInTime": None,
                    "checkOutTime": None,
                    "status": "Leave",
                    "workingHours": 0.0,
                    "overtimeHours": 0.0,
                    "shift": "General",
                    "remarks": f"Approved {leave_doc.get('leaveType')}",
                    "markedBy": admin.get("name"),
                    "createdAt": datetime.now(timezone.utc).isoformat()
                }
                if existing:
                    await db.attendance.update_one({"_id": existing["_id"]}, {"$set": att_record})
                else:
                    await db.attendance.insert_one(att_record)
                curr += delta
        except Exception:
            pass

    await log_audit(f"{body.status} leave request for {leave_doc.get('employeeName')}", "Leaves", leave_id, user=admin)
    return {"message": f"Leave request {body.status.lower()} successfully"}
