from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import io
import csv
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above

router = APIRouter(prefix="/analytics", tags=["Reports & Analytics"])

@router.get("/dashboard-kpis")
@router.get("/dashboard")
async def get_dashboard_kpis(db=Depends(get_db), current_user=Depends(get_current_user)):
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # 1. Today's Production & Orders
    active_orders = await db.production_orders.count_documents({"status": "In Progress"})
    completed_orders = await db.production_orders.count_documents({"status": "Completed"})
    pending_tasks = await db.job_cards.count_documents({"status": {"$in": ["Pending", "Assigned", "In Progress"]}})

    # 2. Attendance KPIs
    present_today = await db.attendance.count_documents({"date": today_str, "status": {"$in": ["Present", "Late"]}})
    absent_today = await db.attendance.count_documents({"date": today_str, "status": "Absent"})
    late_today = await db.attendance.count_documents({"date": today_str, "status": "Late"})
    total_workers = await db.users.count_documents({"role": "WORKER"})

    # 3. Inventory KPIs
    all_materials = await db.materials.find({}).to_list(1000)
    low_stock_count = sum(1 for m in all_materials if float(m.get("currentQuantity", 0)) <= float(m.get("minimumStock", 10)))

    # 4. Machine KPIs
    machines_down = await db.machines.count_documents({"status": {"$in": ["Breakdown", "Maintenance"]}})
    machines_running = await db.machines.count_documents({"status": "Running"})
    total_machines = await db.machines.count_documents({})

    # 5. QC KPIs
    qc_today_docs = await db.qc_inspections.find({}).to_list(1000)
    total_inspected = sum(int(q.get("quantityInspected", 0)) for q in qc_today_docs)
    total_passed = sum(int(q.get("quantityPassed", 0)) for q in qc_today_docs)
    fpy = round((total_passed / max(1, total_inspected)) * 100.0, 1) if total_inspected > 0 else 98.5

    # 6. Financial Revenue
    all_txns = await db.transactions.find({}).to_list(1000)
    total_revenue = sum(float(t.get("amount", 0.0)) for t in all_txns if t.get("type") == "Income" and t.get("status") == "Completed")
    total_expenses = sum(float(t.get("amount", 0.0)) for t in all_txns if t.get("type") == "Expense" and t.get("status") == "Completed")

    # 7. Department Throughput
    departments = ["Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing"]
    dept_stats = []
    for dept in departments:
        jc_count = await db.job_cards.count_documents({"department": {"$regex": f"^{dept}$", "$options": "i"}, "status": "Completed"})
        dept_stats.append({"department": dept, "completedJobs": jc_count})

    return {
        "activeOrders": active_orders,
        "completedOrders": completed_orders,
        "pendingTasks": pending_tasks,
        "presentToday": present_today,
        "absentToday": absent_today,
        "lateToday": late_today,
        "totalWorkers": total_workers,
        "attendanceRate": round((present_today / max(1, total_workers)) * 100.0, 1) if total_workers > 0 else 0,
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

@router.get("/export-csv")
@router.get("/export/csv")
async def export_report_csv(
    reportType: str = Query(..., pattern="^(production|attendance|inventory|qc|financial)$"),
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if reportType == "production":
        writer.writerow(["Order Number", "Customer", "Product", "Quantity", "Current Stage", "Status", "Due Date", "Created At"])
        orders = await db.production_orders.find({}).to_list(2000)
        for o in orders:
            writer.writerow([
                o.get("orderNumber"), o.get("customerName"), o.get("productName"),
                o.get("quantity"), o.get("currentStage"), o.get("status"), o.get("dueDate"), o.get("createdAt")
            ])
    elif reportType == "attendance":
        writer.writerow(["Date", "Employee Name", "Department", "Status", "Check In", "Check Out", "Working Hours", "Overtime"])
        records = await db.attendance.find({}).to_list(2000)
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
