import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.settings import settings
from config.db import connect_db, disconnect_db, get_db
from middleware.auth import hash_password
from routes import (
    auth, departments, workers, tasks,
    employees, attendance, materials, production,
    qc, machines, suppliers, purchases,
    customers, dispatch, transactions, analytics,
    settings as settings_router
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GarmentFlow ERP Management System",
    version="2.0.0",
)

# Configure CORS
origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
allow_all = "*" in origins or not origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=False if allow_all else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Uploads directory
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include Routers (Existing + New ERP Modules)
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(workers.router)
app.include_router(tasks.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(materials.router)
app.include_router(production.router)
app.include_router(qc.router)
app.include_router(machines.router)
app.include_router(suppliers.router)
app.include_router(purchases.router)
app.include_router(customers.router)
app.include_router(dispatch.router)
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)

@app.on_event("startup")
async def startup_event():
    await connect_db()
    db = get_db()
    
    # 1. Seed default Admin User if not exists
    admin_email = "admin@garmentflow.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        logger.info("Seeding default admin user...")
        await db.users.insert_one({
            "name": "Admin User",
            "email": admin_email,
            "password_hash": hash_password("Admin@1234"),
            "role": "ADMIN",
            "department": None,
            "designation": "Factory General Manager",
            "salary": 85000.0,
            "shift": "General",
            "status": "Active",
            "phone": "9999999999",
            "joiningDate": "2024-01-01"
        })
        logger.info("Admin user seeded: admin@garmentflow.com / Admin@1234")
        
    # 2. Seed default departments if none exist
    default_depts = ["Cutting", "Stitching", "Printing", "Embroidery", "Packing", "Quality Check"]
    dept_count = await db.departments.count_documents({})
    if dept_count == 0:
        logger.info("Seeding default departments...")
        for dept_name in default_depts:
            await db.departments.insert_one({"name": dept_name})
        logger.info(f"Seeded {len(default_depts)} departments.")

    # 3. Seed default staff / workers
    staff_to_seed = [
        {"name": "Ravi Kumar",   "email": "ravi@garmentflow.com",   "password": "Worker@1234", "role": "WORKER", "department": "Cutting", "designation": "Master Pattern Cutter", "salary": 24000.0, "phone": "9876543210"},
        {"name": "Priya Sharma", "email": "priya@garmentflow.com",  "password": "Worker@1234", "role": "WORKER", "department": "Stitching", "designation": "Senior Tailor", "salary": 22000.0, "phone": "9876543211"},
        {"name": "Arjun Patel",  "email": "arjun@garmentflow.com",  "password": "Worker@1234", "role": "WORKER", "department": "Quality Check", "designation": "QC Lead Auditor", "salary": 26000.0, "phone": "9876543212"},
        {"name": "Kavita Rao",   "email": "kavita@garmentflow.com", "password": "Worker@1234", "role": "SUPERVISOR", "department": "Stitching", "designation": "Line Supervisor", "salary": 38000.0, "phone": "9876543213"},
        {"name": "Suresh Nair",  "email": "suresh@garmentflow.com", "password": "Worker@1234", "role": "MANAGER", "department": "Cutting", "designation": "Production Floor Manager", "salary": 55000.0, "phone": "9876543214"}
    ]
    for w in staff_to_seed:
        existing_w = await db.users.find_one({"email": w["email"]})
        if not existing_w:
            await db.users.insert_one({
                "name": w["name"],
                "email": w["email"],
                "password_hash": hash_password(w["password"]),
                "role": w["role"],
                "department": w["department"],
                "designation": w["designation"],
                "salary": w["salary"],
                "employmentType": "Full-Time",
                "shift": "General",
                "status": "Active",
                "phone": w["phone"],
                "joiningDate": "2024-03-01"
            })

    # 4. Seed system settings
    sys_settings = await db.settings.find_one({"type": "system"})
    if not sys_settings:
        await db.settings.insert_one({
            "type": "system",
            "shiftStartTime": "09:00",
            "shiftEndTime": "18:00",
            "gracePeriodMinutes": 15,
            "standardWorkingHours": 8.0,
            "overtimeThresholdHours": 8.5,
            "weeklyHolidays": ["Sunday"],
            "lowStockThresholdDefault": 20,
            "currencySymbol": "₹",
            "companyName": "GarmentFlow Apparels Ltd.",
            "companyAddress": "Sector 5, Industrial Apparel Park, Tirupur, India",
            "taxRatePercent": 5.0
        })

    # 5. Seed default Materials if none exist
    mat_count = await db.materials.count_documents({})
    if mat_count == 0:
        demo_mats = [
            {"sku": "FAB-COT-01", "name": "100% Combed Cotton Single Jersey (180 GSM)", "category": "Fabric", "unit": "Meter", "currentQuantity": 1450.0, "minimumStock": 200.0, "reorderLevel": 500.0, "warehouseLocation": "Fabric Rack A-1", "supplierName": "Vardhman Textiles Ltd", "costPerUnit": 185.0},
            {"sku": "FAB-POLY-02", "name": "Polyester Spandex Dri-Fit Mesh (160 GSM)", "category": "Fabric", "unit": "Meter", "currentQuantity": 820.0, "minimumStock": 150.0, "reorderLevel": 300.0, "warehouseLocation": "Fabric Rack A-3", "supplierName": "Arvind Mills", "costPerUnit": 140.0},
            {"sku": "THR-POLY-40", "name": "Coats Spun Polyester Sewing Thread (Tex 27)", "category": "Thread", "unit": "Roll", "currentQuantity": 85.0, "minimumStock": 20.0, "reorderLevel": 40.0, "warehouseLocation": "Trims Bin T-2", "supplierName": "Coats India", "costPerUnit": 75.0},
            {"sku": "BTN-RES-18", "name": "Pearl 4-Hole Resin Shirt Buttons (18L)", "category": "Buttons", "unit": "Packet", "currentQuantity": 45.0, "minimumStock": 10.0, "reorderLevel": 25.0, "warehouseLocation": "Accessories Cabinet 1", "supplierName": "YKK Trims", "costPerUnit": 120.0},
            {"sku": "ZIP-MET-05", "name": "YKK Brass Metal Zipper #5 (Antique Finish)", "category": "Zippers", "unit": "Piece", "currentQuantity": 350.0, "minimumStock": 80.0, "reorderLevel": 150.0, "warehouseLocation": "Trims Bin Z-1", "supplierName": "YKK Trims", "costPerUnit": 22.0},
            {"sku": "LBL-SAT-MAIN", "name": "Woven Satin Neck Label & Wash Care Label", "category": "Labels", "unit": "Piece", "currentQuantity": 2400.0, "minimumStock": 500.0, "reorderLevel": 1000.0, "warehouseLocation": "Label Shelf L-1", "supplierName": "Avery Dennison", "costPerUnit": 3.5},
            {"sku": "PKG-POLY-BAG", "name": "Recycled Biodegradable Polybags (12x15)", "category": "Packaging", "unit": "Piece", "currentQuantity": 18.0, "minimumStock": 50.0, "reorderLevel": 100.0, "warehouseLocation": "Packing Section", "supplierName": "EcoPack Solutions", "costPerUnit": 4.0}
        ]
        for m in demo_mats:
            m["createdAt"] = "2024-03-01T00:00:00Z"
            m["updatedAt"] = "2024-03-01T00:00:00Z"
            await db.materials.insert_one(m)

    # 6. Seed default Machines if none exist
    mach_count = await db.machines.count_documents({})
    if mach_count == 0:
        demo_machines = [
            {"machineCode": "SN-01", "name": "Juki DDL-8700 Single Needle Lockstitch", "machineType": "Single Needle", "department": "Stitching", "productionLine": "Line 1", "status": "Running", "assignedOperator": "Priya Sharma", "totalDowntimeHours": 2.5},
            {"machineCode": "OL-01", "name": "Pegasus M900 4-Thread Overlock", "machineType": "Overlock", "department": "Stitching", "productionLine": "Line 1", "status": "Running", "assignedOperator": "Worker David", "totalDowntimeHours": 0.0},
            {"machineCode": "CUT-01", "name": "Eastman 8-Inch Auto Straight Knife Cutter", "machineType": "Cutting Machine", "department": "Cutting", "productionLine": "Cutting Bay", "status": "Running", "assignedOperator": "Ravi Kumar", "totalDowntimeHours": 1.0},
            {"machineCode": "EMB-01", "name": "Tajima 6-Head Computerized Embroidery", "machineType": "Embroidery Machine", "department": "Embroidery", "productionLine": "Embroidery Bay", "status": "Idle", "assignedOperator": "Elena Rostova", "totalDowntimeHours": 4.0},
            {"machineCode": "PRN-01", "name": "M&R Automatic 8-Color Screen Printing Carousel", "machineType": "Printing Machine", "department": "Printing", "productionLine": "Print Shop", "status": "Maintenance", "assignedOperator": "Amara Okafor", "totalDowntimeHours": 12.0}
        ]
        for mc in demo_machines:
            mc["createdAt"] = "2024-03-01T00:00:00Z"
            await db.machines.insert_one(mc)

    # 7. Seed default Suppliers if none exist
    supp_count = await db.suppliers.count_documents({})
    if supp_count == 0:
        demo_supps = [
            {"name": "Vardhman Textiles Ltd", "contactPerson": "Anil Verma", "phone": "9811223344", "email": "anil@vardhman.com", "category": "Fabric", "paymentTerms": "Net 30", "rating": 4.8, "status": "Active", "totalOrdersCount": 8, "outstandingBalance": 45000.0},
            {"name": "Coats India Threads", "contactPerson": "Deepak Mehta", "phone": "9822334455", "email": "sales@coatsindia.com", "category": "Thread", "paymentTerms": "Net 15", "rating": 4.9, "status": "Active", "totalOrdersCount": 14, "outstandingBalance": 12000.0},
            {"name": "YKK Zippers & Trims", "contactPerson": "Vikram Singh", "phone": "9833445566", "email": "vikram@ykk.co.in", "category": "Zippers", "paymentTerms": "Immediate", "rating": 5.0, "status": "Active", "totalOrdersCount": 11, "outstandingBalance": 0.0}
        ]
        for s in demo_supps:
            s["createdAt"] = "2024-03-01T00:00:00Z"
            await db.suppliers.insert_one(s)

    # 8. Seed default Customers if none exist
    cust_count = await db.customers.count_documents({})
    if cust_count == 0:
        demo_custs = [
            {"name": "Nordic Apparel Co.", "contactPerson": "Henrik Lindqvist", "phone": "+46 8 123 4567", "email": "orders@nordicapparel.com", "address": "Stockholm, Sweden", "customerType": "Retail Brand", "createdAt": "2024-03-01T00:00:00Z"},
            {"name": "Urban Threads Studio", "contactPerson": "Sarah Jenkins", "phone": "+1 415 987 6543", "email": "sarah@urbanthreads.io", "address": "San Francisco, CA, USA", "customerType": "Boutique", "createdAt": "2024-03-01T00:00:00Z"},
            {"name": "Kashmir Pashmina Retail", "contactPerson": "Tariq Bhatt", "phone": "9844556677", "email": "tariq@kashmirpashmina.in", "address": "Srinagar, J&K, India", "customerType": "Wholesaler", "createdAt": "2024-03-01T00:00:00Z"}
        ]
        for c in demo_custs:
            await db.customers.insert_one(c)

    # 9. Seed default Production Orders & BOMs if none exist
    prod_count = await db.production_orders.count_documents({})
    if prod_count == 0:
        await db.boms.insert_one({
            "productName": "Classic Crewneck Organic Tee",
            "productCode": "TSH-CREW-01",
            "description": "Standard 180 GSM Crewneck Tee",
            "items": [
                {"materialId": "FAB-COT-01", "materialName": "100% Combed Cotton Single Jersey", "category": "Fabric", "requiredQuantity": 1.4, "wastagePercentage": 5.0, "unit": "Meter"},
                {"materialId": "THR-POLY-40", "materialName": "Coats Spun Polyester Sewing Thread", "category": "Thread", "requiredQuantity": 65.0, "wastagePercentage": 2.0, "unit": "Meter"},
                {"materialId": "LBL-SAT-MAIN", "materialName": "Woven Satin Neck Label", "category": "Labels", "requiredQuantity": 1.0, "wastagePercentage": 0.0, "unit": "Piece"}
            ],
            "createdAt": "2024-03-01T00:00:00Z"
        })

        sample_order = {
            "orderNumber": "PROD-2403-0001",
            "customerName": "Nordic Apparel Co.",
            "productName": "Classic Crewneck Organic Tee",
            "quantity": 500,
            "priority": "High",
            "dueDate": "2026-10-25",
            "targetStages": ["Cutting", "Stitching", "Printing", "Embroidery", "Quality Control", "Packing", "Dispatch"],
            "completedStages": ["Cutting"],
            "currentStage": "Stitching",
            "status": "In Progress",
            "notes": "Premium export batch with custom branding",
            "createdAt": "2024-03-05T09:00:00Z",
            "updatedAt": "2024-03-06T14:30:00Z"
        }
        res_po = await db.production_orders.insert_one(sample_order)

        # Job cards
        await db.job_cards.insert_one({
            "jobNumber": "JC-PROD-2403-0001-CUT",
            "productionOrderId": str(res_po.inserted_id),
            "orderNumber": "PROD-2403-0001",
            "productName": "Classic Crewneck Organic Tee",
            "department": "Cutting",
            "workerId": None,
            "workerName": "Ravi Kumar",
            "machineId": "CUT-01",
            "plannedQuantity": 500,
            "completedQuantity": 500,
            "rejectedQuantity": 4,
            "reworkQuantity": 0,
            "status": "Completed",
            "pieceRate": 4.5,
            "dueDate": "2026-10-10",
            "createdAt": "2024-03-05T09:00:00Z",
            "updatedAt": "2024-03-06T12:00:00Z"
        })
        await db.job_cards.insert_one({
            "jobNumber": "JC-PROD-2403-0001-STI",
            "productionOrderId": str(res_po.inserted_id),
            "orderNumber": "PROD-2403-0001",
            "productName": "Classic Crewneck Organic Tee",
            "department": "Stitching",
            "workerId": None,
            "workerName": "Priya Sharma",
            "machineId": "SN-01",
            "plannedQuantity": 496,
            "completedQuantity": 280,
            "rejectedQuantity": 2,
            "reworkQuantity": 5,
            "status": "In Progress",
            "pieceRate": 8.0,
            "dueDate": "2026-10-18",
            "createdAt": "2024-03-06T12:30:00Z",
            "updatedAt": "2024-03-06T16:00:00Z"
        })

    # 10. Seed default financial transactions if none exist
    txn_count = await db.transactions.count_documents({})
    if txn_count == 0:
        demo_txns = [
            {"transactionNumber": "TXN-INC-2403-001", "date": "2024-03-02", "type": "Income", "category": "Sales", "amount": 185000.0, "partyName": "Nordic Apparel Co.", "description": "50% Advance for 500 pcs Organic Tee Order", "paymentMethod": "Bank Transfer", "status": "Completed", "createdAt": "2024-03-02T10:00:00Z"},
            {"transactionNumber": "TXN-EXP-2403-001", "date": "2024-03-03", "type": "Expense", "category": "Material Purchase", "amount": 42000.0, "partyName": "Vardhman Textiles Ltd", "description": "Consignment of Combed Cotton Single Jersey (GRN-2403-01)", "paymentMethod": "Bank Transfer", "status": "Completed", "createdAt": "2024-03-03T11:00:00Z"},
            {"transactionNumber": "TXN-EXP-2403-002", "date": "2024-03-04", "type": "Expense", "category": "Machine Maintenance", "amount": 3500.0, "partyName": "Apex Machine Servicing", "description": "Preventive servicing for Tajima 6-Head Embroidery Machine", "paymentMethod": "UPI", "status": "Completed", "createdAt": "2024-03-04T15:00:00Z"}
        ]
        for t in demo_txns:
            await db.transactions.insert_one(t)

@app.on_event("shutdown")
async def shutdown_event():
    await disconnect_db()

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0", "system": "GarmentFlow ERP"}

