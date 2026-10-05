# 🧵 GarmentFlow (Shoplytic) — Garments Workflow & Production Management System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20%2F%20JSON%20Mock-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Frontend-TailwindCSS%20%2B%20Vanilla%20ES6-38B2AC?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A modern, full-stack workflow and apparel production management application tailored for garment manufacturers, fashion studios, and textile production pipelines. **GarmentFlow** streamlines task assignment across manufacturing departments (Cutting, Stitching, Printing, Embroidery, Quality Check, Packing) while offering a sleek **Shoplytic Product Catalog & Grid Dashboard**.

---

## 🌟 Key Features

- **🛍️ Shoplytic Product Grid Dashboard**:
  - Interactive 4-column menswear apparel catalog with real-time price range filtering and search.
  - Interactive **Custom Price Range Slider** with instant feedback and dynamic item counter.
  - **Quick "+ Create Order / Task"** modal to register garment production jobs on the fly.
  - Seamless toggle between **Product Grid View** and operational **List / Task Monitoring View**.

- **🔐 Menswear Split-Card Authentication**:
  - High-fashion editorial split modal layout matching premium apparel brand designs.
  - Instant one-click demo credential filling (`Admin` and `Worker` presets).
  - Built-in zero-latency local fallback so login is instant even if the backend is offline.

- **👥 Role-Based Access Control (RBAC)**:
  - **Admin / Manager Portal**: Create tasks, assign work to workers by department, monitor live statuses, review submissions, and manage teams.
  - **Worker Portal**: View assigned queue, update production stages, upload photo proof, and mark items complete.

- **🏢 Department & Pipeline Tracking**:
  - Dedicated modules for **Cutting**, **Stitching**, **Printing**, **Embroidery**, **Packing**, and **Quality Check**.
  - Track priority levels (`High`, `Medium`, `Low`), target deadlines, and status changes in real time.

- **💾 Dual Database Engine (MongoDB Atlas + Local JSON Fallback)**:
  - Works with remote/local **MongoDB** via `motor` async driver.
  - Automatically falls back to an embedded lightweight local database (`db.json`) if MongoDB is unreachable, ensuring zero configuration friction.

---

## 🔑 Default Credentials

The system comes pre-configured with the following demo credentials:

| Role | Department | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administration | `admin@garmentflow.com` | `Admin@1234` |
| **Worker** | Cutting | `ravi@garmentflow.com` | `Worker@1234` |
| **Worker** | Stitching | `priya@garmentflow.com` | `Worker@1234` |
| **Worker** | Quality Check | `arjun@garmentflow.com` | `Worker@1234` |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+**
- Modern Web Browser (Chrome, Edge, Firefox, Safari)

---

### 2. Start the Backend (FastAPI)

Open a terminal in the project root:

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. (Optional) Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Windows PowerShell
# source venv/bin/activate     # On macOS / Linux

# 3. Install required packages
pip install -r requirements.txt

# 4. (Optional) Seed the database with default departments & demo users
python seed.py

# 5. Start the API server on port 8000
python -m uvicorn app:app --reload --port 8000
```

> 🌐 **Backend API:** [http://localhost:8000](http://localhost:8000)  
> 📑 **Swagger API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)  
> 📖 **Redoc Alternative Docs:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 3. Start the Frontend

Because the frontend uses modern JavaScript ES modules (`import`/`export`), it must be served via a local HTTP server:

```powershell
# Open a second terminal window
cd frontend

# Run Python's built-in lightweight web server
python -m http.server 5500
```

Now open your browser and navigate to:
👉 **[http://localhost:5500/login.html](http://localhost:5500/login.html)** (or **[http://localhost:5500/dashboard.html](http://localhost:5500/dashboard.html)**)

---

## 📁 Project Architecture & File Structure

```text
garments-workflow/
├── backend/
│   ├── app.py                 # FastAPI application entry point & CORS configuration
│   ├── seed.py                # Database seeder script for initial demo data
│   ├── db.json                # Local JSON database engine fallback
│   ├── requirements.txt       # Python dependencies (FastAPI, Motor, JWT, Bcrypt, etc.)
│   ├── config/
│   │   ├── db.py              # MongoDB Atlas connection manager + Mock Database engine
│   │   └── settings.py        # Pydantic environment configuration
│   ├── middleware/
│   │   └── auth.py            # JWT token creation, validation, and role guards
│   ├── models/
│   │   ├── user.py            # Pydantic schemas for Auth & Users
│   │   ├── task.py            # Schemas for Tasks & Garment Production Orders
│   │   └── department.py      # Schemas for Factory Departments
│   ├── routes/
│   │   ├── auth.py            # /login and /register endpoints
│   │   ├── tasks.py           # /tasks CRUD & status transition endpoints
│   │   ├── workers.py         # /workers roster & assignment endpoints
│   │   └── departments.py     # /departments management endpoints
│   └── uploads/               # Stored task reference photos and attachments
│
├── frontend/
│   ├── login.html             # High-fashion split card modal login page
│   ├── dashboard.html         # Shoplytic product catalog & production dashboard
│   ├── assign-task.html       # Task dispatching and worker assignment form
│   ├── departments.html       # Department oversight & worker headcount
│   ├── workers.html           # Factory workforce roster & management
│   ├── worker-home.html       # Worker personal task queue dashboard
│   ├── worker-task.html       # Worker task execution & proof submission view
│   ├── register.html          # New worker registration page
│   ├── index.html             # GarmentFlow marketing/landing page
│   ├── css/
│   │   └── style.css          # Custom styling and status badges
│   └── js/
│       ├── api.js             # Centralized API fetcher, host detector, and auth tokens
│       ├── dashboard.js       # Product grid rendering, filtering, and order modal
│       ├── assign-task.js     # Task creation logic
│       ├── departments.js     # Department CRUD logic
│       ├── workers.js         # Worker list & role actions
│       ├── worker-home.js     # Worker task feed logic
│       └── worker-task.js     # Worker status change logic
│
└── README.md                  # Project documentation
```

---

## 🛠️ Environment Variables Configuration

To customize your backend setup, you can create a `.env` file in the `backend/` directory:

```env
# MongoDB Configuration (Optional - falls back to db.json if omitted)
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=garmentflow

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-chars
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Allowed CORS Origins
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:8080,http://localhost:8000

# Storage
UPLOAD_DIR=uploads
```

---

## 💡 Troubleshooting & FAQ

### 1. `Application Control policy has blocked uvicorn.exe`
On Windows systems with AppLocker or security policies restricting standalone virtual environment `.exe` binaries, run `uvicorn` as a Python module:
```powershell
python -m uvicorn app:app --reload --port 8000
```

### 2. Login is taking too long
- Ensure you browse via **`http://localhost:5500/login.html`** or **`http://127.0.0.1:5500/login.html`**.
- The frontend includes an automatic 4.5s connection timeout with instant local credential authentication so you never get stuck.

### 3. JavaScript ES Module CORS error when double-clicking HTML files
Modern browsers block ES module `import` statements when loading via `file:///` URLs. Always run a local server:
```powershell
cd frontend
python -m http.server 5500
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
