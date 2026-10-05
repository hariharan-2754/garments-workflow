# GarmentFlow - Workflow Management System

## Authentication & Credentials

The application uses **Email Address** and **Password** for authentication across all roles.

### Default Credentials

| Role | Email | Password | Department |
| --- | --- | --- | --- |
| **Admin** | `admin@garmentflow.com` | `Admin@1234` | System Admin |
| **Worker** | `ravi@garmentflow.com` | `Worker@1234` | Cutting |
| **Worker** | `priya@garmentflow.com` | `Worker@1234` | Stitching |
| **Worker** | `arjun@garmentflow.com` | `Worker@1234` | Quality Check |

## Quick Start

### Backend (FastAPI + MongoDB / SQLite JSON fallback)
```bash
cd backend
python seed.py
python app.py
```

### Frontend
Serve the `frontend/` directory or open `frontend/login.html` in a web browser.
