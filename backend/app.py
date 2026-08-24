import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config.settings import settings
from config.db import connect_db, disconnect_db, get_db
from middleware.auth import hash_password
from routes import auth, departments, workers, tasks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="GarmentFlow Task Management",
    version="1.0.0",
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

# Include Routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(workers.router)
app.include_router(tasks.router)

@app.on_event("startup")
async def startup_event():
    await connect_db()
    db = get_db()
    
    # Seed default Admin User if not exists
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
            "phone": "9999999999"
        })
        logger.info("Admin user seeded: admin@garmentflow.com / Admin@1234")
        
    # Seed default departments if none exist
    default_depts = ["Cutting", "Stitching", "Printing", "Embroidery", "Packing", "Quality Check"]
    dept_count = await db.departments.count_documents({})
    if dept_count == 0:
        logger.info("Seeding default departments...")
        for dept_name in default_depts:
            await db.departments.insert_one({"name": dept_name})
        logger.info(f"Seeded {len(default_depts)} departments.")

    # Seed default workers if not exists
    workers_to_seed = [
        {"name": "Ravi Kumar",   "email": "ravi@garmentflow.com",   "password": "Worker@1234", "department": "Cutting", "phone": "9876543210"},
        {"name": "Priya Sharma", "email": "priya@garmentflow.com",  "password": "Worker@1234", "department": "Stitching", "phone": "9876543211"},
        {"name": "Arjun Patel",  "email": "arjun@garmentflow.com",  "password": "Worker@1234", "department": "Quality Check", "phone": "9876543212"},
    ]
    for w in workers_to_seed:
        existing_worker = await db.users.find_one({"email": w["email"]})
        if not existing_worker:
            logger.info(f"Seeding default worker {w['email']}...")
            await db.users.insert_one({
                "name": w["name"],
                "email": w["email"],
                "password_hash": hash_password(w["password"]),
                "role": "WORKER",
                "department": w["department"],
                "phone": w["phone"]
            })
            logger.info(f"Worker seeded: {w['email']}")

@app.on_event("shutdown")
async def shutdown_event():
    await disconnect_db()

@app.get("/health")
def health_check():
    return {"status": "healthy"}
