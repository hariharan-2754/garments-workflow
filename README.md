# 🧵 GarmentFlow ERP — Complete Garment Manufacturing Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20%2F%20Dual%20JSON%20Engine-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Frontend-TailwindCSS%20%2B%20Vanilla%20ES6-38B2AC?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**GarmentFlow** is an enterprise-grade, end-to-end Garment Manufacturing ERP (Enterprise Resource Planning) platform designed specifically for apparel factories, fashion studios, and textile production lines.

It unifies **12 core operational modules** into a single cohesive platform: from customer sales order intake and automated Bill of Materials (BOM) explosion, to multi-stage job-card shop floor routing, quality control audits (AQL 1.5), machine maintenance tracking, worker piece-rate payroll, double-entry financial bookkeeping, and automated CSV report generation.

---

## 🌟 12 Core Integrated ERP Modules

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        GARMENTFLOW ERP PLATFORM                        │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. 🔐 Auth & 4-Tier RBAC       │ 7. ⚙️ Machine Monitoring & Breakdown │
│ 2. 📊 Executive Command Center │ 8. 🏢 Supplier & Purchase Orders (GRN)│
│ 3. 🧵 Materials, Inventory&BOM │ 9. 🚚 Customer Orders & Dispatch (AWB)│
│ 4. 🏭 Production Orders & Jobs │ 10. 💰 Financial Ledger & Piece-Rates  │
│ 5. 🔍 Quality Control & Rework │ 11. 📑 Reports & CSV Export Center    │
│ 6. ⏱️ Attendance & Leaves      │ 12. 🛡️ Shift Rules & Immutable Audits │
└────────────────────────────────┴───────────────────────────────────────┘
```

1. **User Authentication & RBAC**: Strict 4-tier role enforcement (`ADMIN`, `MANAGER`, `SUPERVISOR`, `WORKER`) with JWT bearer tokens and BCrypt hashing.
2. **Dashboard & Command Center**: Live KPI cards, department throughput metrics, production pipeline visualizer, stock alerts, and recent transactions.
3. **Materials, Inventory & BOM**: SKU catalog, low-stock alerts, stock movement ledger, and multi-item Bill of Materials configuration.
4. **Production Orders & Job Cards**: 7-stage manufacturing progression (`Cutting` ➔ `Stitching` ➔ `Printing` ➔ `Embroidery` ➔ `QC` ➔ `Packing` ➔ `Dispatch`) with automatic next-stage job card generation.
5. **Quality Control & Rework**: 24-point garment inspection checklist (AQL 1.5), First Pass Yield (FPY) metrics, and automated rework job card routing.
6. **Attendance & Leave Management**: Operator shift clock-in/out with grace-period late detection, daily attendance register, and employee leave application/approval workflow.
7. **Machine Health & Maintenance**: Machine status cards (`Running`, `Idle`, `Maintenance`, `Breakdown`), breakdown ticket filing, and repair resolution with downtime logging.
8. **Supplier & Purchase Orders**: Vendor directory, Purchase Order (PO) lifecycle, and Goods Receipt (GRN) that automatically increments inventory and records expenses.
9. **Customer Orders & Logistics Dispatch**: Sales order booking with auto-conversion to production orders, plus packing slip generation with courier AWB tracking.
10. **Financial Ledger & Piece-Rates**: Double-entry financial journal (Incomes vs Expenses), P&L summary cards, and worker piece-rate wage settlement.
11. **Reports & Analytics Export**: Instant one-click CSV export across Production, Attendance, Inventory, QC Audits, and Financial Ledgers.
12. **System Settings & Audit Trail**: Factory shift parameters, grace periods, notification center, and an immutable audit log trail.

---

## 🔑 Pre-Seeded Default Credentials

| Role | Name | Department | Email Address | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin User | Factory Management | `admin@garmentflow.com` | `Admin@1234` |
| **Manager** | Suresh Nair | Cutting Bay | `suresh@garmentflow.com` | `Worker@1234` |
| **Supervisor** | Kavita Rao | Stitching Bay | `kavita@garmentflow.com` | `Worker@1234` |
| **Worker (Cutting)** | Ravi Kumar | Cutting | `ravi@garmentflow.com` | `Worker@1234` |
| **Worker (Stitching)** | Priya Sharma | Stitching | `priya@garmentflow.com` | `Worker@1234` |
| **Worker (QC)** | Arjun Patel | Quality Check | `arjun@garmentflow.com` | `Worker@1234` |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- Modern Web Browser (Google Chrome, Microsoft Edge, Firefox, or Safari)

---

### 2. Start Backend (FastAPI)

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. Activate virtual environment (if available) or use Python
.\venv\Scripts\Activate.ps1    # On Windows PowerShell
# source venv/bin/activate     # On macOS / Linux

# 3. Install required packages
pip install -r requirements.txt

# 4. Seed database with complete ERP manufacturing dataset
python seed.py

# 5. Start API server on port 8000
python -m uvicorn app:app --reload --port 8000
```

> 🌐 **Backend URL:** [http://localhost:8000](http://localhost:8000)  
> 📑 **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)  
> 📖 **Redoc Alternative Docs:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 3. Start Frontend

Because the frontend uses modern ES6 JavaScript modules, serve it through any local web server:

```powershell
# Open a second terminal window
cd frontend

# Run Python's built-in lightweight web server
python -m http.server 5500
```

Open your browser and navigate to:  
👉 **[http://localhost:5500/login.html](http://localhost:5500/login.html)**  
👉 **[http://localhost:5500/dashboard.html](http://localhost:5500/dashboard.html)**

---

## 📁 Repository Structure

```text
garments-workflow/
├── backend/
│   ├── app.py                 # FastAPI application & startup seeder
│   ├── seed.py                # Standalone database seeder script
│   ├── db.json                # High-fidelity JSON database engine
│   ├── requirements.txt       # Dependencies (FastAPI, Motor, Pydantic, Passlib, etc.)
│   ├── config/
│   │   ├── db.py              # Dual Database Engine (MongoDB Atlas + MockCollection)
│   │   └── settings.py        # Environment variables & Pydantic config
│   ├── middleware/
│   │   └── auth.py            # JWT token validation, hashing & RBAC decorators
│   ├── models/                # 13 Pydantic domain models
│   ├── routes/                # 14 FastAPI REST routers
│   └── utils/
│       └── audit_helper.py    # Centralized audit logging & notification helper
│
├── frontend/
│   ├── login.html             # High-fashion split card login
│   ├── dashboard.html         # ERP Command Center & live metrics
│   ├── attendance.html        # Attendance register & leave manager
│   ├── inventory.html         # Raw materials & BOM manager
│   ├── production.html        # Production orders & job cards board
│   ├── qc.html                # Quality Control & defect inspections
│   ├── machines.html          # Factory machines & maintenance tickets
│   ├── purchasing.html        # Suppliers & Purchase Orders (GRN)
│   ├── orders-dispatch.html   # Customer Sales Orders & Logistics Dispatch
│   ├── finance.html           # P&L ledger & worker piece-rate payroll
│   ├── reports.html           # Reports center & CSV exports
│   ├── workers.html           # Workforce roster & employee records
│   ├── departments.html       # Factory departments manager
│   ├── assign-task.html       # Task dispatcher
│   ├── audit-settings.html    # Factory shift settings & audit trail
│   ├── worker-home.html       # Mobile operator workstation portal
│   ├── worker-task.html       # Operator job progress & piece counter
│   ├── css/style.css          # Custom styling & animations
│   └── js/                    # Vanilla ES6 module controllers
│
├── docs/
│   ├── ARCHITECTURE.md        # System architecture, sequence flows & database schemas
│   └── MODULES.md             # In-depth operational specification for all 12 modules
│
└── README.md                  # Project overview and quick start guide
```

---

## 📚 Technical Documentation
- **[Architecture & Data Flows](docs/ARCHITECTURE.md)**: Sequence diagrams, database schemas, and RBAC matrix.
- **[12 Modules Specification](docs/MODULES.md)**: Detailed API contracts, user flows, and business logic for each module.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
