from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above
from models.machine import (
    MachineCreateRequest, MachineUpdateRequest,
    MaintenanceTicketCreate, MaintenanceTicketUpdate, MachineResponse
)
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/machines", tags=["Machines & Maintenance"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_machine_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "machineCode": d.get("machineCode", "M-000"),
        "name": d.get("name", "Sewing Machine"),
        "machineType": d.get("machineType", "Single Needle"),
        "department": d.get("department", "Stitching"),
        "productionLine": d.get("productionLine", "Line 1"),
        "serialNumber": d.get("serialNumber"),
        "manufacturer": d.get("manufacturer"),
        "status": d.get("status", "Idle"),
        "assignedOperator": d.get("assignedOperator"),
        "lastMaintenanceDate": d.get("lastMaintenanceDate"),
        "totalDowntimeHours": float(d.get("totalDowntimeHours", 0.0)),
        "notes": d.get("notes")
    }

@router.get("", response_model=List[MachineResponse])
async def list_machines(
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    machineType: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if status:
        query["status"] = status
    if machineType:
        query["machineType"] = machineType

    docs = await db.machines.find(query).sort("machineCode", 1).to_list(1000)
    
    if search:
        s = search.lower().strip()
        docs = [d for d in docs if s in d.get("machineCode", "").lower() or s in d.get("name", "").lower()]

    return [_doc_to_machine_res(d) for d in docs]

@router.post("", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
async def create_machine(
    body: MachineCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    code_clean = body.machineCode.strip().upper()
    existing = await db.machines.find_one({"machineCode": code_clean})
    if existing:
        raise HTTPException(status_code=400, detail="Machine Code already registered")

    doc = body.dict()
    doc["machineCode"] = code_clean
    doc["totalDowntimeHours"] = 0.0
    doc["createdAt"] = datetime.now(timezone.utc).isoformat()

    res = await db.machines.insert_one(doc)
    doc["_id"] = res.inserted_id

    await log_audit(f"Registered new machine: {code_clean} ({body.name})", "Machines", str(doc["_id"]), user=admin)
    return _doc_to_machine_res(doc)

@router.put("/{machine_id}/status")
async def update_machine_status(
    machine_id: str,
    status: str = Query(..., pattern="^(Running|Idle|Maintenance|Breakdown|Offline)$"),
    assignedOperator: Optional[str] = Query(None),
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    existing = await db.machines.find_one(_make_id_query(machine_id))
    if not existing:
        raise HTTPException(status_code=404, detail="Machine not found")

    updates = {"status": status}
    if assignedOperator is not None:
        updates["assignedOperator"] = assignedOperator

    await db.machines.update_one(_make_id_query(machine_id), {"$set": updates})

    if status == "Breakdown":
        await create_notification(
            "Machine Breakdown Reported",
            f"Machine {existing.get('machineCode')} ({existing.get('name')}) reported DOWN in {existing.get('department')}",
            "danger",
            "Machinery"
        )

    await log_audit(f"Machine {existing.get('machineCode')} status changed to {status}", "Machines", machine_id, user=user)
    return {"message": f"Machine status updated to {status}"}

# ================= MAINTENANCE TICKETS =================
@router.get("/maintenance/tickets")
async def list_maintenance_tickets(
    status: Optional[str] = Query(None),
    machineId: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if machineId:
        query["machineId"] = machineId

    docs = await db.maintenance_tickets.find(query).sort("reportedDate", -1).to_list(500)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.post("/maintenance/tickets", status_code=status.HTTP_201_CREATED)
async def report_maintenance(
    body: MaintenanceTicketCreate,
    db=Depends(get_db),
    user=Depends(get_current_user)
):
    machine = await db.machines.find_one(_make_id_query(body.machineId))
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    now = datetime.now(timezone.utc).isoformat()
    ticket_num = f"MNT-{datetime.now().strftime('%y%m')}-{datetime.now().strftime('%M%S')}"

    doc = {
        "ticketNumber": ticket_num,
        "machineId": str(machine["_id"]),
        "machineCode": machine.get("machineCode"),
        "machineName": machine.get("name"),
        "department": machine.get("department"),
        "issue": body.issue,
        "maintenanceType": body.maintenanceType,
        "reportedBy": user.get("name"),
        "reportedDate": now,
        "assignedTechnician": body.assignedTechnician,
        "status": "Open",
        "downtimeHours": 0.0,
        "cost": body.cost or 0.0,
        "notes": body.notes
    }

    res = await db.maintenance_tickets.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    # Set machine status to Maintenance
    await db.machines.update_one({"_id": machine["_id"]}, {
        "$set": {"status": "Maintenance"}
    })

    await create_notification(
        "New Maintenance Ticket",
        f"{ticket_num} filed for {machine.get('machineCode')}: {body.issue}",
        "warning",
        "Machinery"
    )

    await log_audit(f"Opened maintenance ticket {ticket_num} for {machine.get('machineCode')}", "Machines", doc["id"], user=user)
    return doc

@router.put("/maintenance/tickets/{ticket_id}/resolve")
async def resolve_maintenance_ticket(
    ticket_id: str,
    body: MaintenanceTicketUpdate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    ticket = await db.maintenance_tickets.find_one(_make_id_query(ticket_id))
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")

    now = datetime.now(timezone.utc).isoformat()
    updates = {
        "status": body.status,
        "downtimeHours": float(body.downtimeHours or ticket.get("downtimeHours", 0.0)),
        "resolutionNotes": body.resolutionNotes,
        "resolvedAt": now
    }
    if body.cost is not None:
        updates["cost"] = float(body.cost)

    await db.maintenance_tickets.update_one(_make_id_query(ticket_id), {"$set": updates})

    # If resolved or closed, restore machine to Idle/Running
    if body.status in ["Resolved", "Closed"]:
        await db.machines.update_one(_make_id_query(ticket["machineId"]), {
            "$set": {
                "status": "Idle",
                "lastMaintenanceDate": now.split("T")[0]
            },
            "$inc": {"totalDowntimeHours": float(body.downtimeHours or 0.0)}
        })

        # Record maintenance cost into financial expense ledger if cost > 0
        cost = float(body.cost or ticket.get("cost", 0.0))
        if cost > 0:
            await db.transactions.insert_one({
                "transactionNumber": f"TXN-MNT-{datetime.now().strftime('%y%m')}-{ticket.get('machineCode')}",
                "date": now.split("T")[0],
                "type": "Expense",
                "category": "Machine Maintenance",
                "amount": cost,
                "referenceId": ticket_id,
                "partyName": ticket.get("assignedTechnician") or "Technician",
                "description": f"Repair & Maintenance for {ticket.get('machineCode')} ({ticket.get('issue')})",
                "paymentMethod": "Bank Transfer",
                "status": "Completed",
                "createdAt": now
            })

    await log_audit(f"Resolved maintenance ticket {ticket.get('ticketNumber')}", "Machines", ticket_id, user=admin)
    return {"message": "Maintenance ticket updated successfully"}
