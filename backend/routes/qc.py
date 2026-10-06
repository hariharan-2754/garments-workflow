from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above
from models.qc import QCInspectionCreate, QCInspectionResponse
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/qc", tags=["Quality Control"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_qc_res(d: dict) -> dict:
    inspected = max(1, int(d.get("quantityInspected", 1)))
    passed = int(d.get("quantityPassed", 0))
    rejected = int(d.get("quantityRejected", 0))
    rework = int(d.get("quantityRework", 0))
    defect_rate = round(((rejected + rework) / inspected) * 100.0, 2)
    fpy = round((passed / inspected) * 100.0, 2)

    return {
        "id": str(d["_id"]),
        "productionOrderId": str(d.get("productionOrderId")),
        "orderNumber": d.get("orderNumber"),
        "productName": d.get("productName"),
        "jobCardId": d.get("jobCardId"),
        "inspectorId": str(d.get("inspectorId")),
        "inspectorName": d.get("inspectorName", "Inspector"),
        "quantityInspected": inspected,
        "quantityPassed": passed,
        "quantityRejected": rejected,
        "quantityRework": rework,
        "defectRate": defect_rate,
        "firstPassYield": fpy,
        "defects": d.get("defects") or [],
        "result": d.get("result", "PASS"),
        "remarks": d.get("remarks"),
        "proofImage": d.get("proofImage"),
        "createdAt": d.get("createdAt", "")
    }

@router.get("", response_model=List[QCInspectionResponse])
@router.get("/inspections", response_model=List[QCInspectionResponse])
async def list_inspections(
    result: Optional[str] = Query(None),
    orderId: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if result:
        query["result"] = result
    if orderId:
        query["productionOrderId"] = orderId

    docs = await db.qc_inspections.find(query).sort("createdAt", -1).to_list(1000)
    return [_doc_to_qc_res(d) for d in docs]

@router.post("", response_model=QCInspectionResponse, status_code=status.HTTP_201_CREATED)
async def create_qc_inspection(
    body: QCInspectionCreate,
    db=Depends(get_db),
    inspector=Depends(get_current_user)
):
    prod_order = await db.production_orders.find_one(_make_id_query(body.productionOrderId))
    if not prod_order:
        raise HTTPException(status_code=404, detail="Production order not found")

    now = datetime.now(timezone.utc).isoformat()
    inspected = body.quantityInspected
    passed = body.quantityPassed
    rejected = body.quantityRejected
    rework = body.quantityRework

    if passed + rejected + rework > inspected:
        raise HTTPException(status_code=400, detail="Sum of Passed, Rejected, and Rework cannot exceed Total Inspected Quantity")

    doc = {
        "productionOrderId": str(prod_order["_id"]),
        "orderNumber": prod_order.get("orderNumber"),
        "productName": prod_order.get("productName"),
        "jobCardId": body.jobCardId,
        "inspectorId": str(inspector["_id"]),
        "inspectorName": inspector.get("name"),
        "stageName": body.stageName or "Quality Control",
        "quantityInspected": inspected,
        "quantityPassed": passed,
        "quantityRejected": rejected,
        "quantityRework": rework,
        "defects": [d.dict() for d in body.defects] if body.defects else [],
        "result": body.result,
        "remarks": body.remarks,
        "proofImage": body.proofImage,
        "createdAt": now
    }

    res = await db.qc_inspections.insert_one(doc)
    doc["_id"] = res.inserted_id

    # If QC FAIL / REWORK -> Auto generate a Rework Job Card
    if body.result in ["FAIL", "REWORK"] and rework > 0:
        rework_job_num = f"RW-{prod_order.get('orderNumber')}-{datetime.now().strftime('%M%S')}"
        await db.job_cards.insert_one({
            "jobNumber": rework_job_num,
            "productionOrderId": str(prod_order["_id"]),
            "orderNumber": prod_order.get("orderNumber"),
            "productName": prod_order.get("productName"),
            "department": "Stitching", # Default rework department
            "workerId": None,
            "workerName": None,
            "machineId": None,
            "plannedQuantity": rework,
            "completedQuantity": 0,
            "rejectedQuantity": 0,
            "reworkQuantity": 0,
            "status": "Rework",
            "pieceRate": 0.0, # Rework generally non-billable
            "notes": f"Rework triggered from QC inspection: {body.remarks or 'Defect correction'}",
            "createdAt": now,
            "updatedAt": now
        })
        await create_notification(
            "QC Defect Alert: Rework Created",
            f"Rework ticket {rework_job_num} spawned for order {prod_order.get('orderNumber')}",
            "danger",
            "QC"
        )
    elif body.result == "PASS":
        # Progress order to Packing stage
        target_stages = prod_order.get("targetStages") or []
        completed = list(prod_order.get("completedStages") or [])
        if "Quality Control" not in completed:
            completed.append("Quality Control")
        
        await db.production_orders.update_one({"_id": prod_order["_id"]}, {
            "$set": {
                "completedStages": completed,
                "currentStage": "Packing",
                "updatedAt": now
            }
        })

    await log_audit(f"QC Inspection result '{body.result}' for {prod_order.get('orderNumber')} (Passed: {passed}, Rejected: {rejected})", "QC", str(doc["_id"]), user=inspector)
    return _doc_to_qc_res(doc)
