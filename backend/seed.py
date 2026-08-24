import asyncio
import sys
from pathlib import Path

# Add backend root to python search path
sys.path.insert(0, str(Path(__file__).parent))

import motor.motor_asyncio
from config.settings import settings
from middleware.auth import hash_password

ADMIN = {
    "name":     "Admin User",
    "email":    "admin@garmentflow.com",
    "password": "Admin@1234",
    "role":     "ADMIN",
}

WORKERS = [
    {"name": "Ravi Kumar",   "email": "ravi@garmentflow.com",   "password": "Worker@1234", "department": "Cutting", "phone": "9876543210"},
    {"name": "Priya Sharma", "email": "priya@garmentflow.com",  "password": "Worker@1234", "department": "Stitching", "phone": "9876543211"},
    {"name": "Arjun Patel",  "email": "arjun@garmentflow.com",  "password": "Worker@1234", "department": "Quality Check", "phone": "9876543212"},
]

DEPARTMENTS = ["Cutting", "Stitching", "Printing", "Embroidery", "Packing", "Quality Check"]

async def seed():
    print("\n[Start] GarmentFlow Database Seeder")
    print("=" * 55)

    client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongo_url)

    # Drop database for clean start
    await client.drop_database(settings.mongo_db_name)
    print("[-] Dropped old database - fresh start")

    db = client[settings.mongo_db_name]

    # Create Indexes
    await db.users.create_index("email", unique=True)
    await db.departments.create_index("name", unique=True)
    await db.tasks.create_index("workerId")
    print("[+] Unique indexes created")

    # Seed Admin
    print("\n[-] Seeding admin...")
    await db.users.insert_one({
        "name":          ADMIN["name"],
        "email":         ADMIN["email"],
        "password_hash": hash_password(ADMIN["password"]),
        "role":          "ADMIN",
        "department":    None,
        "phone":         "9999999999"
    })
    print(f"   [+] {ADMIN['email']} / {ADMIN['password']}")

    # Seed Departments
    print("\n[-] Seeding departments...")
    for dept in DEPARTMENTS:
        await db.departments.insert_one({"name": dept})
        print(f"   [+] Department: {dept}")

    # Seed Workers
    print("\n[-] Seeding workers...")
    for w in WORKERS:
        await db.users.insert_one({
            "name":          w["name"],
            "email":         w["email"],
            "password_hash": hash_password(w["password"]),
            "role":          "WORKER",
            "department":    w["department"],
            "phone":         w["phone"]
        })
        print(f"   [+] {w['email']} / {w['password']} ({w['department']})")

    print("\n" + "=" * 55)
    print("[Done] Seed complete! You can now start the server.")
    print("\nLogin Credentials:")
    print("  Admin:  admin@garmentflow.com  / Admin@1234")
    print("  Worker: ravi@garmentflow.com   / Worker@1234")
    print("  Worker: priya@garmentflow.com  / Worker@1234")
    print("  Worker: arjun@garmentflow.com  / Worker@1234")

if __name__ == "__main__":
    asyncio.run(seed())
