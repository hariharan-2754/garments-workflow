from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
import uuid
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above, require_manager_or_above
from models.production import (
    ProductionOrderCreateRequest, ProductionOrderStatusUpdate,
    JobCardCreateRequest, JobCardCompleteRequest, ProductionOrderResponse
)
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/production", tags=["Production & Job Cards"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_order_res(d: dict) -> dict:
    target_stages = d.get("targetStages") or ["Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing", "Dispatch"]
    completed_stages = d.get("completedStages") or []
    progress = int((len(completed_stages) / max(1, len(target_stages))) * 100) if target_stages else 0
    if d.get("status") == "Completed":
        progress = 100

    return {
        "id": str(d["_id"]),
        "orderNumber": d.get("orderNumber", "PO-000"),
        "customerName": d.get("customerName", "Internal"),
        "productName": d.get("productName", ""),
        "quantity": int(d.get("quantity", 1)),
        "priority": d.get("priority", "Medium"),
        "dueDate": d.get("dueDate", ""),
        "currentStage": d.get("currentStage", target_stages[0] if target_stages else "Cutting"),
        "status": d.get("status", "Pending"),
        "targetStages": target_stages,
        "completedStages": completed_stages,
        "progressPercent": progress,
        "notes": d.get("notes"),
        "createdAt": d.get("createdAt", ""),
        "updatedAt": d.get("updatedAt", "")
    }

@router.get("/orders", response_model=List[ProductionOrderResponse])
async def list_production_orders(
    status: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if stage:
        query["currentStage"] = stage
    if priority:
        query["priority"] = priority

    docs = await db.production_orders.find(query).sort("createdAt", -1).to_list(1000)
    
    if search:
        s = search.lower().strip()
        docs = [d for d in docs if s in (d.get("orderNumber") or "").lower() or s in (d.get("customerName") or "").lower() or s in (d.get("productName") or "").lower()]

    return [_doc_to_order_res(d) for d in docs]

@router.get("/orders/{order_id}", response_model=ProductionOrderResponse)
async def get_production_order(order_id: str, db=Depends(get_db), current_user=Depends(get_current_user)):
    doc = await db.production_orders.find_one(_make_id_query(order_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Production order not found")
    return _doc_to_order_res(doc)

@router.post("/orders", response_model=ProductionOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_production_order(
    body: ProductionOrderCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.production_orders.count_documents({})
    order_num = body.orderNumber or f"PROD-{datetime.now().strftime('%y%m')}-{count + 1:04d}"

    target_stages = body.targetStages or ["Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing", "Dispatch"]
    first_stage = target_stages[0] if target_stages else "Cutting"

    doc = {
        "orderNumber": order_num,
        "customerName": body.customerName.strip(),
        "productName": body.productName.strip(),
        "quantity": body.quantity,
        "priority": body.priority,
        "dueDate": body.dueDate,
        "targetStages": target_stages,
        "completedStages": [],
        "currentStage": first_stage,
        "status": "In Progress",
        "notes": body.notes,
        "createdAt": now,
        "updatedAt": now
    }

    # BOM Material Planning & Reservation
    if body.reserveMaterial:
        bom = await db.boms.find_one({"productName": {"$regex": f"^{body.productName.strip()}$", "$options": "i"}})
        if bom and bom.get("items"):
            for item in bom["items"]:
                needed_qty = float(item["requiredQuantity"]) * body.quantity * (1.0 + float(item.get("wastagePercentage", 0.0)) / 100.0)
                mat = await db.materials.find_one(_make_id_query(item.get("materialId")))
                if mat:
                    curr = float(mat.get("currentQuantity", 0.0))
                    # Record reservation in ledger
                    await db.inventory_ledger.insert_one({
                        "materialId": str(mat["_id"]),
                        "materialSku": mat.get("sku"),
                        "materialName": mat.get("name"),
                        "type": "Reservation",
                        "quantity": needed_qty,
                        "balanceAfter": max(0.0, curr - needed_qty),
                        "reason": f"Auto BOM reservation for {order_num}",
                        "referenceId": order_num,
                        "performedBy": admin.get("name"),
                        "timestamp": now
                    })

    res = await db.production_orders.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Auto create initial Job Card for the first stage
    first_job_num = f"JC-{order_num}-{first_stage[:3].upper()}"
    job_card_doc = {
        "jobNumber": first_job_num,
        "productionOrderId": str(doc["_id"]),
        "orderNumber": order_num,
        "productName": body.productName,
        "department": first_stage,
        "workerId": None,
        "workerName": None,
        "machineId": None,
        "plannedQuantity": body.quantity,
        "completedQuantity": 0,
        "rejectedQuantity": 0,
        "reworkQuantity": 0,
        "status": "Pending",
        "pieceRate": 5.0, # Default ₹5 / pc
        "startDate": None,
        "dueDate": body.dueDate,
        "proofImage": None,
        "notes": f"Stage 1 job card for {order_num}",
        "createdAt": now,
        "updatedAt": now
    }
    await db.job_cards.insert_one(job_card_doc)

    await log_audit(f"Launched Production Order {order_num} ({body.quantity} pcs {body.productName})", "Production", str(doc["_id"]), user=admin)
    return _doc_to_order_res(doc)

# ================= JOB CARDS & STAGE AUTOMATION =================
@router.get("/job-cards")
async def list_job_cards(
    orderId: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    workerId: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if orderId:
        query["productionOrderId"] = orderId
    if department:
        query["department"] = {"$regex": f"^{department}$", "$options": "i"}
    if status:
        query["status"] = status
    
    if current_user.get("role") == "WORKER":
        user_dept = current_user.get("department")
        # Workers see job cards assigned to them or in their department
        worker_id = str(current_user.get("_id"))
        query["$or"] = [
            {"workerId": worker_id},
            {"department": {"$regex": f"^{user_dept}$", "$options": "i"}}
        ]
    elif workerId:
        query["workerId"] = workerId

    docs = await db.job_cards.find(query).sort("createdAt", -1).to_list(1000)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.post("/job-cards", status_code=status.HTTP_201_CREATED)
async def create_job_card(
    body: JobCardCreateRequest,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    prod_order = await db.production_orders.find_one(_make_id_query(body.productionOrderId))
    if not prod_order:
        raise HTTPException(status_code=404, detail="Production order not found")

    now = datetime.now(timezone.utc).isoformat()
    job_count = await db.job_cards.count_documents({"productionOrderId": body.productionOrderId})
    job_num = f"JC-{prod_order.get('orderNumber')}-{body.department[:3].upper()}-{job_count+1}"

    doc = {
        "jobNumber": job_num,
        "productionOrderId": str(prod_order["_id"]),
        "orderNumber": prod_order.get("orderNumber"),
        "productName": prod_order.get("productName"),
        "department": body.department,
        "workerId": body.workerId,
        "workerName": body.workerName,
        "machineId": body.machineId,
        "plannedQuantity": body.plannedQuantity,
        "completedQuantity": 0,
        "rejectedQuantity": 0,
        "reworkQuantity": 0,
        "status": "Assigned" if body.workerId else "Pending",
        "pieceRate": body.pieceRate or 5.0,
        "startDate": body.startDate,
        "dueDate": body.dueDate or prod_order.get("dueDate"),
        "proofImage": None,
        "notes": body.notes,
        "createdAt": now,
        "updatedAt": now
    }

    res = await db.job_cards.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    if body.workerId:
        await create_notification(
            "New Job Assigned",
            f"You have been assigned to {job_num} ({body.department})",
            "info",
            "Production"
        )

    await log_audit(f"Created Job Card {job_num} for {body.department}", "Production", doc["id"], user=admin)
    return doc

@router.put("/job-cards/{job_id}/assign")
async def assign_job_card(
    job_id: str,
    workerId: str = Query(...),
    machineId: Optional[str] = Query(None),
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    worker = await db.users.find_one(_make_id_query(workerId))
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    job = await db.job_cards.find_one(_make_id_query(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job card not found")

    updates = {
        "workerId": str(worker["_id"]),
        "workerName": worker.get("name"),
        "machineId": machineId,
        "status": "Assigned",
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    await db.job_cards.update_one(_make_id_query(job_id), {"$set": updates})

    # Update machine status to Running if machine assigned
    if machineId:
        await db.machines.update_one(_make_id_query(machineId), {"$set": {"status": "Running", "assignedOperator": worker.get("name")}})

    await log_audit(f"Assigned Job Card {job.get('jobNumber')} to {worker.get('name')}", "Production", job_id, user=admin)
    return {"message": "Job card assigned successfully"}

@router.put("/job-cards/{job_id}/complete")
async def complete_job_card(
    job_id: str,
    body: JobCardCompleteRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    job = await db.job_cards.find_one(_make_id_query(job_id))
    if not job:
        raise HTTPException(status_code=404, detail="Job card not found")

    now = datetime.now(timezone.utc).isoformat()
    completed_qty = int(body.completedQuantity)
    rejected_qty = int(body.rejectedQuantity)
    accepted_qty = max(0, completed_qty - rejected_qty)

    await db.job_cards.update_one(_make_id_query(job_id), {
        "$set": {
            "completedQuantity": completed_qty,
            "rejectedQuantity": rejected_qty,
            "reworkQuantity": body.reworkQuantity,
            "proofImage": body.proofImage,
            "status": "Completed",
            "notes": body.notes or job.get("notes"),
            "updatedAt": now
        }
    })

    # Record Piece-rate earnings for worker if piece rate > 0
    worker_id = job.get("workerId") or str(current_user.get("_id"))
    piece_rate = float(job.get("pieceRate", 0.0))
    if piece_rate > 0 and accepted_qty > 0:
        payout = accepted_qty * piece_rate
        await db.piece_rate_ledger.insert_one({
            "workerId": worker_id,
            "workerName": job.get("workerName") or current_user.get("name"),
            "jobCardId": str(job["_id"]),
            "jobNumber": job.get("jobNumber"),
            "department": job.get("department"),
            "completedQuantity": completed_qty,
            "rejectedQuantity": rejected_qty,
            "acceptedQuantity": accepted_qty,
            "ratePerPiece": piece_rate,
            "payoutAmount": payout,
            "status": "Accrued",
            "timestamp": now
        })

    # AUTO STAGE PROGRESSION FOR PRODUCTION ORDER
    prod_order = await db.production_orders.find_one(_make_id_query(job["productionOrderId"]))
    if prod_order:
        target_stages = prod_order.get("targetStages") or []
        completed_stages = list(prod_order.get("completedStages") or [])
        curr_dept = job.get("department")
        
        if curr_dept not in completed_stages:
            completed_stages.append(curr_dept)

        next_stage = None
        try:
            curr_idx = target_stages.index(curr_dept)
            if curr_idx + 1 < len(target_stages):
                next_stage = target_stages[curr_idx + 1]
        except ValueError:
            pass

        order_status = "In Progress"
        if not next_stage or len(completed_stages) >= len(target_stages):
            order_status = "Completed"
            next_stage = "Dispatch"

        await db.production_orders.update_one({"_id": prod_order["_id"]}, {
            "$set": {
                "completedStages": completed_stages,
                "currentStage": next_stage or "Completed",
                "status": order_status,
                "updatedAt": now
            }
        })

        # Automatically spawn next-stage Job Card if there's a next stage and not completed
        if next_stage and order_status != "Completed":
            existing_next = await db.job_cards.find_one({
                "productionOrderId": str(prod_order["_id"]),
                "department": next_stage
            })
            if not existing_next:
                next_jc_num = f"JC-{prod_order.get('orderNumber')}-{next_stage[:3].upper()}"
                await db.job_cards.insert_one({
                    "jobNumber": next_jc_num,
                    "productionOrderId": str(prod_order["_id"]),
                    "orderNumber": prod_order.get("orderNumber"),
                    "productName": prod_order.get("productName"),
                    "department": next_stage,
                    "workerId": None,
                    "workerName": None,
                    "machineId": None,
                    "plannedQuantity": accepted_qty or prod_order.get("quantity"),
                    "completedQuantity": 0,
                    "rejectedQuantity": 0,
                    "reworkQuantity": 0,
                    "status": "Pending",
                    "pieceRate": 5.0,
                    "dueDate": prod_order.get("dueDate"),
                    "createdAt": now,
                    "updatedAt": now
                })
                await create_notification(
                    "Next Production Stage Activated",
                    f"{next_stage} job card auto-generated for {prod_order.get('orderNumber')}",
                    "info",
                    "Production"
                )

    await log_audit(f"Completed Job Card {job.get('jobNumber')} ({accepted_qty} accepted pcs)", "Production", job_id, user=current_user)
    return {"message": "Job card marked completed and forwarded to next stage", "acceptedQuantity": accepted_qty}
