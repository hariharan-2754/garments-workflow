from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_supervisor_or_above
from models.dispatch import PackingSlipCreate, DispatchCreate, DispatchStatusUpdate, DispatchResponse
from utils.audit_helper import log_audit, create_notification

router = APIRouter(prefix="/dispatch", tags=["Packing & Logistics"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_dispatch_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "dispatchNumber": d.get("dispatchNumber", "DSP-000"),
        "customerOrderId": str(d.get("customerOrderId")),
        "orderNumber": d.get("orderNumber"),
        "customerName": d.get("customerName"),
        "courierName": d.get("courierName", "Standard"),
        "trackingNumber": d.get("trackingNumber", "N/A"),
        "dispatchDate": d.get("dispatchDate", ""),
        "expectedDeliveryDate": d.get("expectedDeliveryDate"),
        "status": d.get("status", "Ready to Dispatch"),
        "timeline": d.get("timeline") or [],
        "shippingAddress": d.get("shippingAddress", ""),
        "shippingCost": float(d.get("shippingCost", 0.0))
    }

@router.get("/list", response_model=List[DispatchResponse])
async def list_dispatches(
    status: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    docs = await db.dispatches.find(query).sort("dispatchDate", -1).to_list(1000)
    return [_doc_to_dispatch_res(d) for d in docs]

@router.post("/packing-slips")
async def create_packing_slip(
    body: PackingSlipCreate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.packing_slips.count_documents({})
    pack_num = f"PKG-{datetime.now().strftime('%y%m')}-{count + 1:04d}"

    doc = {
        "packingNumber": pack_num,
        "customerOrderId": body.customerOrderId,
        "productionOrderId": body.productionOrderId,
        "packageCount": body.packageCount,
        "weightKg": body.weightKg,
        "dimensions": body.dimensions,
        "items": body.items,
        "packedBy": body.packedBy or admin.get("name"),
        "notes": body.notes,
        "createdAt": now
    }

    res = await db.packing_slips.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    # Update customer order production status to Packed
    await db.customer_orders.update_one(_make_id_query(body.customerOrderId), {
        "$set": {"productionStatus": "Packed", "deliveryStatus": "Ready to Dispatch"}
    })

    await log_audit(f"Generated Packing Slip {pack_num}", "Logistics", doc["id"], user=admin)
    return doc

@router.post("/create", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
async def create_dispatch(
    body: DispatchCreate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    cust_order = await db.customer_orders.find_one(_make_id_query(body.customerOrderId))
    if not cust_order:
        raise HTTPException(status_code=404, detail="Customer Order not found")

    now = datetime.now(timezone.utc).isoformat()
    count = await db.dispatches.count_documents({})
    disp_num = f"DSP-{datetime.now().strftime('%y%m')}-{count + 1:04d}"

    timeline = [
        {"status": "Dispatched", "location": "Factory Dispatch Bay", "timestamp": now, "remarks": f"Handed to courier {body.courierName}"}
    ]

    doc = {
        "dispatchNumber": disp_num,
        "customerOrderId": body.customerOrderId,
        "orderNumber": cust_order.get("orderNumber"),
        "customerName": cust_order.get("customerName"),
        "packingSlipId": body.packingSlipId,
        "courierName": body.courierName,
        "trackingNumber": body.trackingNumber,
        "dispatchDate": now.split("T")[0],
        "expectedDeliveryDate": body.expectedDeliveryDate,
        "shippingAddress": body.shippingAddress,
        "shippingCost": body.shippingCost or 0.0,
        "status": "In Transit",
        "timeline": timeline,
        "notes": body.notes,
        "createdAt": now
    }

    res = await db.dispatches.insert_one(doc)
    doc["_id"] = res.inserted_id

    # Update Customer Order delivery status
    await db.customer_orders.update_one({"_id": cust_order["_id"]}, {
        "$set": {"deliveryStatus": "In Transit"}
    })

    await log_audit(f"Dispatched order {cust_order.get('orderNumber')} via {body.courierName} (AWB: {body.trackingNumber})", "Logistics", str(doc["_id"]), user=admin)
    return _doc_to_dispatch_res(doc)

@router.put("/{dispatch_id}/status")
async def update_dispatch_status(
    dispatch_id: str,
    body: DispatchStatusUpdate,
    db=Depends(get_db),
    admin=Depends(require_supervisor_or_above)
):
    disp = await db.dispatches.find_one(_make_id_query(dispatch_id))
    if not disp:
        raise HTTPException(status_code=404, detail="Dispatch record not found")

    now = datetime.now(timezone.utc).isoformat()
    timeline = list(disp.get("timeline") or [])
    timeline.append({
        "status": body.status,
        "location": body.location or "En Route",
        "timestamp": now,
        "remarks": body.remarks or ""
    })

    await db.dispatches.update_one(_make_id_query(dispatch_id), {
        "$set": {
            "status": body.status,
            "timeline": timeline,
            "updatedAt": now
        }
    })

    # Update customer order if Delivered
    if body.status == "Delivered":
        await db.customer_orders.update_one(_make_id_query(disp["customerOrderId"]), {
            "$set": {"deliveryStatus": "Delivered"}
        })
        await create_notification(
            "Order Delivered",
            f"Consignment {disp.get('dispatchNumber')} for {disp.get('customerName')} has been delivered.",
            "success",
            "Logistics"
        )

    await log_audit(f"Updated Dispatch {disp.get('dispatchNumber')} status to '{body.status}'", "Logistics", dispatch_id, user=admin)
    return {"message": f"Dispatch status updated to {body.status}"}
