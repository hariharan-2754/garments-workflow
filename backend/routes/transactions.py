from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime, timezone
from config.db import get_db
from middleware.auth import get_current_user, require_manager_or_above, require_supervisor_or_above
from models.transaction import TransactionCreate, PieceRatePayoutRequest, TransactionResponse
from utils.audit_helper import log_audit

router = APIRouter(prefix="/transactions", tags=["Finance & Transactions"])

def _make_id_query(id_str: str) -> dict:
    if ObjectId.is_valid(id_str):
        return {"$or": [{"_id": ObjectId(id_str)}, {"_id": id_str}]}
    return {"_id": id_str}

def _doc_to_txn_res(d: dict) -> dict:
    return {
        "id": str(d["_id"]),
        "transactionNumber": d.get("transactionNumber", "TXN-000"),
        "date": d.get("date", ""),
        "type": d.get("type", "Income"),
        "category": d.get("category", "Sales"),
        "amount": float(d.get("amount", 0.0)),
        "referenceId": d.get("referenceId"),
        "partyName": d.get("partyName"),
        "description": d.get("description"),
        "paymentMethod": d.get("paymentMethod", "Bank Transfer"),
        "status": d.get("status", "Completed"),
        "createdAt": d.get("createdAt", "")
    }

@router.get("", response_model=List[TransactionResponse])
@router.get("/ledger", response_model=List[TransactionResponse])
async def list_transactions(
    type: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.get("role") == "WORKER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Company financial ledger is restricted to Administrative users."
        )

    query = {}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if startDate and endDate:
        query["date"] = {"$gte": startDate, "$lte": endDate}
    elif startDate:
        query["date"] = {"$gte": startDate}

    docs = await db.transactions.find(query).sort("date", -1).to_list(1000)
    return [_doc_to_txn_res(d) for d in docs]

@router.get("/summary")
async def get_financial_summary(db=Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.get("role") == "WORKER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Financial P&L summary is restricted to Administrative users."
        )

@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    body: TransactionCreate,
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    now = datetime.now(timezone.utc).isoformat()
    count = await db.transactions.count_documents({})
    prefix = "INC" if body.type == "Income" else "EXP"
    txn_num = f"TXN-{prefix}-{datetime.now().strftime('%y%m')}-{count + 1:04d}"

    doc = {
        "transactionNumber": txn_num,
        "date": now.split("T")[0],
        "type": body.type,
        "category": body.category,
        "amount": float(body.amount),
        "referenceId": body.referenceId,
        "partyName": body.partyName,
        "description": body.description,
        "paymentMethod": body.paymentMethod,
        "status": body.status or "Completed",
        "createdAt": now
    }

    res = await db.transactions.insert_one(doc)
    doc["_id"] = res.inserted_id

    await log_audit(f"Recorded {body.type} transaction {txn_num} (₹{body.amount})", "Finance", str(doc["_id"]), user=admin)
    return _doc_to_txn_res(doc)

@router.get("/summary/pnl")
async def get_financial_summary(db=Depends(get_db), current_user=Depends(get_current_user)):
    docs = await db.transactions.find({}).to_list(2000)
    total_income = sum(float(d.get("amount", 0.0)) for d in docs if d.get("type") == "Income" and d.get("status") == "Completed")
    total_expense = sum(float(d.get("amount", 0.0)) for d in docs if d.get("type") == "Expense" and d.get("status") == "Completed")
    net_profit = total_income - total_expense

    # Breakdown by category
    expenses_by_cat = {}
    income_by_cat = {}
    for d in docs:
        cat = d.get("category", "Other")
        amt = float(d.get("amount", 0.0))
        if d.get("type") == "Expense":
            expenses_by_cat[cat] = expenses_by_cat.get(cat, 0.0) + amt
        else:
            income_by_cat[cat] = income_by_cat.get(cat, 0.0) + amt

    return {
        "totalIncome": round(total_income, 2),
        "totalExpense": round(total_expense, 2),
        "netProfit": round(net_profit, 2),
        "expensesByCategory": {k: round(v, 2) for k, v in expenses_by_cat.items()},
        "incomeByCategory": {k: round(v, 2) for k, v in income_by_cat.items()}
    }

# ================= PIECE-RATE PAYOUTS =================
@router.get("/piece-rate/ledger")
async def list_piece_rate_ledger(
    workerId: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if current_user.get("role") == "WORKER":
        query["workerId"] = str(current_user.get("_id"))
    elif workerId:
        query["workerId"] = workerId

    docs = await db.piece_rate_ledger.find(query).sort("timestamp", -1).to_list(1000)
    for d in docs:
        d["id"] = str(d["_id"])
    return docs

@router.post("/piece-rate/settle-payout")
async def settle_piece_rate_payout(
    workerId: str = Query(...),
    db=Depends(get_db),
    admin=Depends(require_manager_or_above)
):
    unsettled = await db.piece_rate_ledger.find({"workerId": workerId, "status": "Accrued"}).to_list(500)
    if not unsettled:
        raise HTTPException(status_code=400, detail="No accrued piece-rate earnings found for this worker")

    total_payout = sum(float(x.get("payoutAmount", 0.0)) for x in unsettled)
    worker = await db.users.find_one(_make_id_query(workerId))
    worker_name = worker.get("name") if worker else "Worker"

    now = datetime.now(timezone.utc).isoformat()
    # Mark ledger records as Paid
    for item in unsettled:
        await db.piece_rate_ledger.update_one({"_id": item["_id"]}, {"$set": {"status": "Paid", "paidAt": now}})

    # Create Expense transaction
    await db.transactions.insert_one({
        "transactionNumber": f"TXN-PAYOUT-{datetime.now().strftime('%y%m%d%H%M')}",
        "date": now.split("T")[0],
        "type": "Expense",
        "category": "Worker Payout",
        "amount": round(total_payout, 2),
        "referenceId": workerId,
        "partyName": worker_name,
        "description": f"Piece-rate wage payout for {len(unsettled)} job tasks",
        "paymentMethod": "UPI",
        "status": "Completed",
        "createdAt": now
    })

    await log_audit(f"Settled piece-rate payout ₹{total_payout} for {worker_name}", "Finance", workerId, user=admin)
    return {"message": f"Successfully paid ₹{total_payout} to {worker_name} across {len(unsettled)} tasks"}
