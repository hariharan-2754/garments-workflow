from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import io
import csv
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above, require_manager_or_above

router = APIRouter(prefix="/analytics", tags=["Reports & Analytics"])

@router.get("/dashboard-kpis")
@router.get("/dashboard")
@router.get("/api/dashboard")
async def get_dashboard_kpis(db=Depends(get_db), current_user=Depends(get_current_user)):
    """
    Role-Aware Dynamic ERP Dashboard API:
    - ADMIN / MANAGER: Factory-wide scope (all operations + P&L financial metrics)
    - SUPERVISOR: Department-scoped operational metrics (bay workers, job cards, machines, QC)
    - WORKER: Personal workstation dashboard (own attendance, assigned jobs, efficiency, machine, piece earnings)
    """
    role = current_user.get("role", "WORKER")
    user_id = str(current_user.get("_id"))
    user_dept = current_user.get("department") or "Cutting"
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # =========================================================================
    # 1. WORKER PERSONAL SCOPE
    # =========================================================================
    if role == "WORKER":
        # A. Attendance Today
        att_doc = await db.attendance.find_one({"employeeId": user_id, "date": today_str})
        att_status = att_doc.get("status") if att_doc else "Not Checked In"
        check_in_time = att_doc.get("checkInTime") if att_doc else None
        check_out_time = att_doc.get("checkOutTime") if att_doc else None
        working_hours = float(att_doc.get("workingHours") or 0.0) if att_doc else 0.0
        overtime_hours = float(att_doc.get("overtimeHours") or 0.0) if att_doc else 0.0

        # B. Assigned Tasks & Job Cards
        dept_regex = {"$regex": f"^{user_dept}$", "$options": "i"}
        tasks_doc = await db.tasks.find({"department": dept_regex}).to_list(200)
        job_cards = await db.job_cards.find({
            "$or": [
                {"workerId": user_id},
                {"department": dept_regex}
            ]
        }).to_list(200)

        active_tasks_count = sum(1 for t in tasks_doc if t.get("status") not in ["Completed", "Reviewed"])
        active_jc_count = sum(1 for j in job_cards if j.get("status") not in ["Completed"])
        total_pending = active_tasks_count + active_jc_count

        completed_tasks_count = sum(1 for t in tasks_doc if t.get("status") in ["Completed", "Reviewed"])
        completed_jc_count = sum(1 for j in job_cards if j.get("status") in ["Completed"])
        total_completed = completed_tasks_count + completed_jc_count

        # C. Production & Piece-Rate Performance
        total_target_qty = sum(int(j.get("plannedQuantity") or j.get("targetQuantity") or 100) for j in job_cards)
        total_completed_qty = sum(int(j.get("completedQuantity") or 0) for j in job_cards)
        total_rejected_qty = sum(int(j.get("rejectedQuantity") or 0) for j in job_cards)
        total_rework_qty = sum(int(j.get("reworkQuantity") or 0) for j in job_cards)
        total_accepted_qty = max(0, total_completed_qty - total_rejected_qty)
        
        efficiency_pct = round((total_completed_qty / max(1, total_target_qty)) * 100.0, 1) if total_target_qty > 0 else 0.0

        # Piece-Rate Earnings
        piece_entries = await db.piece_rate_ledger.find({
            "$or": [{"workerId": user_id}, {"workerName": current_user.get("name")}]
        }).to_list(500)
        total_piece_earnings = sum(float(p.get("payoutAmount") or p.get("totalAmount") or 0.0) for p in piece_entries)

        # D. Assigned Machine
        assigned_machine = await db.machines.find_one({
            "$or": [
                {"assignedOperator": current_user.get("name")},
                {"department": dept_regex}
            ]
        })
        machine_info = {
            "name": assigned_machine.get("name") if assigned_machine else "Standard Workstation",
            "machineCode": assigned_machine.get("machineCode") if assigned_machine else "BAY-STD",
            "status": assigned_machine.get("status") if assigned_machine else "Running",
            "department": assigned_machine.get("department") if assigned_machine else user_dept
        }

        # E. Personal QC Record
        qc_docs = await db.qc_inspections.find({"inspectorName": current_user.get("name")}).to_list(100)
        if not qc_docs:
            qc_docs = await db.qc_inspections.find({}).to_list(20)
        qc_passed = sum(int(q.get("quantityPassed", 0)) for q in qc_docs)
        qc_rejected = sum(int(q.get("quantityRejected", 0)) for q in qc_docs)
        qc_rework = sum(int(q.get("quantityRework", 0)) for q in qc_docs)

        return {
            "scope": "personal",
            "role": "WORKER",
            "user": {
                "id": user_id,
                "name": current_user.get("name"),
                "department": user_dept,
                "designation": current_user.get("designation", "Floor Operator")
            },
            "attendance": {
                "status": att_status,
                "checkInTime": check_in_time,
                "checkOutTime": check_out_time,
                "workingHours": round(working_hours, 2),
                "overtimeHours": round(overtime_hours, 2),
                "date": today_str
            },
            "tasks": {
                "pending": total_pending,
                "completed": total_completed,
                "activeList": [_clean_task(t) for t in tasks_doc[:5]]
            },
            "production": {
                "targetQuantity": total_target_qty,
                "completedQuantity": total_completed_qty,
                "acceptedQuantity": total_accepted_qty,
                "rejectedQuantity": total_rejected_qty,
                "reworkQuantity": total_rework_qty,
                "efficiencyPercent": min(100.0, efficiency_pct)
            },
            "machine": machine_info,
            "qc": {
                "passed": qc_passed,
                "rejected": qc_rejected,
                "rework": qc_rework
            },
            "earnings": {
                "totalPiecePayout": round(total_piece_earnings, 2),
                "accruedEntriesCount": len(piece_entries)
            },
            # Compatibility aliases for shared frontend UI components:
            "activeOrders": total_pending,
            "completedOrders": total_completed,
            "pendingTasks": total_pending,
            "attendanceRate": 100.0 if att_status in ["Present", "Late"] else 0.0,
            "netProfit": round(total_piece_earnings, 2)
        }

    # =========================================================================
    # 2. SUPERVISOR DEPARTMENT SCOPE
    # =========================================================================
    elif role == "SUPERVISOR":
        dept_regex = {"$regex": f"^{user_dept}$", "$options": "i"}

        # Department Workers & Attendance
        dept_workers = await db.users.find({"role": "WORKER", "department": dept_regex}).to_list(500)
        total_dept_workers = len(dept_workers)
        worker_ids = [str(w["_id"]) for w in dept_workers]

        dept_att = await db.attendance.find({"date": today_str, "department": dept_regex}).to_list(500)
        present_today = sum(1 for a in dept_att if a.get("status") in ["Present", "Late"])
        late_today = sum(1 for a in dept_att if a.get("status") == "Late")
        absent_today = max(0, total_dept_workers - present_today)
        att_rate = round((present_today / max(1, total_dept_workers)) * 100.0, 1) if total_dept_workers > 0 else 0.0

        # Department Production & Job Cards
        dept_job_cards = await db.job_cards.find({"department": dept_regex}).to_list(500)
        active_jobs = sum(1 for j in dept_job_cards if j.get("status") not in ["Completed"])
        completed_jobs = sum(1 for j in dept_job_cards if j.get("status") == "Completed")
        dept_target_qty = sum(int(j.get("plannedQuantity") or j.get("targetQuantity") or 0) for j in dept_job_cards)
        dept_done_qty = sum(int(j.get("completedQuantity") or 0) for j in dept_job_cards)

        # Department Machines
        dept_machines = await db.machines.find({"department": dept_regex}).to_list(200)
        total_dept_machines = len(dept_machines)
        machines_running = sum(1 for m in dept_machines if m.get("status") == "Running")
        machines_down = sum(1 for m in dept_machines if m.get("status") in ["Breakdown", "Maintenance"])

        # Department QC Stats
        dept_qc = await db.qc_inspections.find({}).to_list(500)
        inspected = sum(int(q.get("quantityInspected", 0)) for q in dept_qc)
        passed = sum(int(q.get("quantityPassed", 0)) for q in dept_qc)
        fpy = round((passed / max(1, inspected)) * 100.0, 1) if inspected > 0 else 98.5

        return {
            "scope": "department",
            "role": "SUPERVISOR",
            "department": user_dept,
            "totalWorkers": total_dept_workers,
            "presentToday": present_today,
            "absentToday": absent_today,
            "lateToday": late_today,
            "attendanceRate": att_rate,
            "activeOrders": active_jobs,
            "completedOrders": completed_jobs,
            "pendingTasks": active_jobs,
            "targetQuantity": dept_target_qty,
            "completedQuantity": dept_done_qty,
            "totalMachines": total_dept_machines,
            "machinesRunning": machines_running,
            "machinesDown": machines_down,
            "firstPassYield": fpy,
            "lowStockCount": 0,
            "netProfit": 0.0,
            "departmentThroughput": [{"department": user_dept, "completedJobs": completed_jobs}]
        }

    # =========================================================================
    # 3. ADMIN / MANAGER FACTORY-WIDE SCOPE
    # =========================================================================
    else:
        active_orders = await db.production_orders.count_documents({"status": "In Progress"})
        completed_orders = await db.production_orders.count_documents({"status": "Completed"})
        pending_tasks = await db.job_cards.count_documents({"status": {"$in": ["Pending", "Assigned", "In Progress"]}})

        present_today = await db.attendance.count_documents({"date": today_str, "status": {"$in": ["Present", "Late"]}})
        absent_today = await db.attendance.count_documents({"date": today_str, "status": "Absent"})
        late_today = await db.attendance.count_documents({"date": today_str, "status": "Late"})
        total_workers = await db.users.count_documents({"role": "WORKER"})

        all_materials = await db.materials.find({}).to_list(1000)
        low_stock_count = sum(1 for m in all_materials if float(m.get("currentQuantity", 0)) <= float(m.get("minimumStock", 10)))

        machines_down = await db.machines.count_documents({"status": {"$in": ["Breakdown", "Maintenance"]}})
        machines_running = await db.machines.count_documents({"status": "Running"})
        total_machines = await db.machines.count_documents({})

        qc_today_docs = await db.qc_inspections.find({}).to_list(1000)
        total_inspected = sum(int(q.get("quantityInspected", 0)) for q in qc_today_docs)
        total_passed = sum(int(q.get("quantityPassed", 0)) for q in qc_today_docs)
        fpy = round((total_passed / max(1, total_inspected)) * 100.0, 1) if total_inspected > 0 else 98.5

        all_txns = await db.transactions.find({}).to_list(1000)
        total_revenue = sum(float(t.get("amount", 0.0)) for t in all_txns if t.get("type") == "Income" and t.get("status") == "Completed")
        total_expenses = sum(float(t.get("amount", 0.0)) for t in all_txns if t.get("type") == "Expense" and t.get("status") == "Completed")

        departments = ["Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing"]
        dept_stats = []
        for dept in departments:
            jc_count = await db.job_cards.count_documents({"department": {"$regex": f"^{dept}$", "$options": "i"}, "status": "Completed"})
            dept_stats.append({"department": dept, "completedJobs": jc_count})

        return {
            "scope": "factory",
            "role": role,
            "activeOrders": active_orders,
            "completedOrders": completed_orders,
            "pendingTasks": pending_tasks,
            "presentToday": present_today,
            "absentToday": absent_today,
            "lateToday": late_today,
            "totalWorkers": total_workers,
            "attendanceRate": round((present_today / max(1, total_workers)) * 100.0, 1) if total_workers > 0 else 0.0,
            "lowStockCount": low_stock_count,
            "machinesDown": machines_down,
            "machinesRunning": machines_running,
            "totalMachines": total_machines,
            "firstPassYield": fpy,
            "totalRevenue": round(total_revenue, 2),
            "totalExpenses": round(total_expenses, 2),
            "netProfit": round(total_revenue - total_expenses, 2),
            "departmentThroughput": dept_stats
        }

def _clean_task(t: dict) -> dict:
    return {
        "id": str(t.get("_id", "")),
        "title": t.get("title", "Production Task"),
        "department": t.get("department", "Floor"),
        "status": t.get("status", "Pending"),
        "priority": t.get("priority", "Medium")
    }

@router.get("/export-csv")
@router.get("/export/csv")
async def export_report_csv(
    reportType: str = Query(..., pattern="^(production|attendance|inventory|qc|financial)$"),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    role = current_user.get("role", "WORKER")
    user_dept = current_user.get("department")

    # Security Guard: Workers cannot export company financials or factory-wide data
    if role == "WORKER" and reportType == "financial":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Factory financial reports are restricted to Administrative users."
        )

    output = io.StringIO()
    writer = csv.writer(output)

    if reportType == "production":
        writer.writerow(["Order Number", "Customer", "Product", "Quantity", "Current Stage", "Status", "Due Date", "Created At"])
        query = {}
        if role == "SUPERVISOR" and user_dept:
            query["currentStage"] = {"$regex": f"^{user_dept}$", "$options": "i"}
        orders = await db.production_orders.find(query).to_list(2000)
        for o in orders:
            writer.writerow([
                o.get("orderNumber"), o.get("customerName"), o.get("productName"),
                o.get("quantity"), o.get("currentStage"), o.get("status"), o.get("dueDate"), o.get("createdAt")
            ])
    elif reportType == "attendance":
        writer.writerow(["Date", "Employee Name", "Department", "Status", "Check In", "Check Out", "Working Hours", "Overtime"])
        query = {}
        if role == "WORKER":
            query["employeeId"] = str(current_user["_id"])
        elif role == "SUPERVISOR" and user_dept:
            query["department"] = {"$regex": f"^{user_dept}$", "$options": "i"}
        records = await db.attendance.find(query).to_list(2000)
        for r in records:
            writer.writerow([
                r.get("date"), r.get("employeeName"), r.get("department"),
                r.get("status"), r.get("checkInTime"), r.get("checkOutTime"),
                r.get("workingHours"), r.get("overtimeHours")
            ])
    elif reportType == "inventory":
        writer.writerow(["SKU", "Material Name", "Category", "Current Stock", "Unit", "Min Stock", "Cost Per Unit", "Supplier"])
        mats = await db.materials.find({}).to_list(2000)
        for m in mats:
            writer.writerow([
                m.get("sku"), m.get("name"), m.get("category"),
                m.get("currentQuantity"), m.get("unit"), m.get("minimumStock"),
                m.get("costPerUnit"), m.get("supplierName")
            ])
    elif reportType == "qc":
        writer.writerow(["Date", "Order Number", "Inspector", "Inspected Qty", "Passed", "Rejected", "Rework", "Defect Rate %", "Result"])
        qc_docs = await db.qc_inspections.find({}).to_list(2000)
        for q in qc_docs:
            ins = max(1, int(q.get("quantityInspected", 1)))
            rej = int(q.get("quantityRejected", 0)) + int(q.get("quantityRework", 0))
            writer.writerow([
                q.get("createdAt"), q.get("orderNumber"), q.get("inspectorName"),
                ins, q.get("quantityPassed"), q.get("quantityRejected"), q.get("quantityRework"),
                round((rej / ins) * 100.0, 2), q.get("result")
            ])
    elif reportType == "financial":
        if role not in ["ADMIN", "MANAGER"]:
            raise HTTPException(status_code=403, detail="Not authorized to export financial reports")
        writer.writerow(["Transaction ID", "Date", "Type", "Category", "Amount", "Party Name", "Payment Method", "Status"])
        txns = await db.transactions.find({}).to_list(2000)
        for t in txns:
            writer.writerow([
                t.get("transactionNumber"), t.get("date"), t.get("type"),
                t.get("category"), t.get("amount"), t.get("partyName"),
                t.get("paymentMethod"), t.get("status")
            ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=GarmentFlow_{reportType}_report.csv"}
    )
