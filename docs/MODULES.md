# 📦 GarmentFlow ERP — 12 Core Manufacturing Modules Specification

This document provides a comprehensive operational and technical specification for all 12 interconnected modules of the **GarmentFlow Garment Manufacturing ERP**.

---

## 1. User Authentication & Role-Based Access Control (RBAC)
- **Primary Page:** `frontend/login.html` & `frontend/register.html`
- **Backend Router:** `backend/routes/auth.py`
- **Database Collection:** `users`
- **Supported Roles:**
  - `ADMIN`: Full factory administrative authority, financial ledger control, system settings, audit trail.
  - `MANAGER`: Production planning, purchase order approvals, sales order management, executive reporting.
  - `SUPERVISOR`: Daily floor shift attendance, task & job card dispatch, machine ticket triage, QC inspection.
  - `WORKER`: Workstation execution portal, shift clock-in/out, piece-rate earnings log, leave requests.
- **Key APIs:**
  - `POST /login` (or `/auth/login`) — Authenticate and generate Bearer JWT.
  - `POST /register` — Register a new floor worker or operator.
  - `GET /workers` — Retrieve full staff directory.

---

## 2. Command Center Dashboard & Executive Analytics
- **Primary Page:** `frontend/dashboard.html`
- **Backend Router:** `backend/routes/analytics.py`
- **Features:**
  - Real-time KPI summary (Active Work Orders, Factory Attendance Rate %, Low Stock SKU Alerts, Machines Running/Down, First Pass Yield % FPY, Revenue & Net Profit).
  - Department throughput bar chart (Cutting, Stitching, Printing, Embroidery, Quality Control, Packing).
  - Live production run stage pipeline with progress bars.
  - Low stock warning table with instant reorder triggers.
  - Recent financial ledger activity stream.
- **Key APIs:**
  - `GET /analytics/dashboard` — Live operational KPI aggregation.

---

## 3. Materials, Inventory & Bill of Materials (BOM)
- **Primary Page:** `frontend/inventory.html`
- **Backend Router:** `backend/routes/materials.py`
- **Database Collections:** `materials`, `stock_ledger`, `boms`
- **Features:**
  - Complete SKU catalog (Fabrics, Sewing Threads, Buttons, Zippers, Labels, Packaging).
  - Real-time stock balance tracking with visual Minimum Stock / Reorder Threshold indicators.
  - Stock Adjustment modal with reason logging (Inward, Outward, Scrap, Calibration).
  - Bill of Materials (BOM) manager linking finished apparel styles to exact material consumption and wastage percentages.
- **Key APIs:**
  - `GET /materials` — List all inventory SKUs.
  - `POST /materials` — Create raw material SKU.
  - `POST /materials/adjust-stock` — Adjust warehouse quantities and update stock ledger.
  - `GET /materials/boms` & `POST /materials/boms` — Manage garment Bill of Materials.

---

## 4. Production Orders & Multi-Stage Job Cards
- **Primary Page:** `frontend/production.html`
- **Backend Router:** `backend/routes/production.py`
- **Database Collections:** `production_orders`, `job_cards`
- **Features:**
  - Visual 7-stage manufacturing progression:
    $$\text{Cutting} \longrightarrow \text{Stitching} \longrightarrow \text{Printing} \longrightarrow \text{Embroidery} \longrightarrow \text{Quality Control} \longrightarrow \text{Packing} \longrightarrow \text{Dispatch}$$
  - Automated Stage Advancement: When a worker or supervisor marks a Job Card completed, the production order progresses and automatically spawns the next stage's Job Card.
  - Job card assignment modal for pairing workers with specific factory machinery.
- **Key APIs:**
  - `GET /production/orders` & `POST /production/orders` — Manage master production runs.
  - `GET /production/job-cards` — List workstation job cards by department or status.
  - `PUT /production/job-cards/{id}/assign` — Assign operator and machinery.
  - `PUT /production/job-cards/{id}/complete` — Complete stage, accrue piece-rate, and advance stage.

---

## 5. Quality Control (QC) & Defect Rework Loop
- **Primary Page:** `frontend/qc.html`
- **Backend Router:** `backend/routes/qc.py`
- **Database Collection:** `qc_inspections`
- **Features:**
  - 24-point garment audit checklist based on AQL 1.5 standards.
  - Defect categorization (Critical, Major, Minor) covering Seam Slippage, Fabric Flaw, Dimension Out-of-Spec, Stain, Asymmetry, and Trim Missing.
  - First Pass Yield (FPY) calculation.
  - Automated Rework Routing: Rejected garments trigger a dedicated Rework Job Card back to the responsible station.
- **Key APIs:**
  - `GET /qc/inspections` & `POST /qc/inspections` — Record batch audits.
  - `GET /qc/metrics` — Aggregate factory defect metrics and FPY.

---

## 6. Workforce, Attendance & Leave Management
- **Primary Page:** `frontend/attendance.html` & `frontend/workers.html`
- **Backend Router:** `backend/routes/attendance.py`, `backend/routes/employees.py`
- **Database Collections:** `attendance`, `leaves`, `users`
- **Features:**
  - Mobile operator shift clock-in / clock-out with grace-period late detection.
  - Daily attendance register table with date and department filtering.
  - Supervisor mark-attendance modal with overtime calculation.
  - Employee leave application and supervisor approval/rejection pipeline.
- **Key APIs:**
  - `GET /attendance` & `GET /attendance/today/my-status` — Attendance status.
  - `POST /attendance/check-in` & `POST /attendance/check-out` — Operator time clock.
  - `POST /attendance/leaves/apply` & `PUT /attendance/leaves/{id}/status` — Leave request workflow.

---

## 7. Factory Machine Monitoring & Maintenance
- **Primary Page:** `frontend/machines.html`
- **Backend Router:** `backend/routes/machines.py`
- **Database Collections:** `machines`, `maintenance_tickets`
- **Features:**
  - Interactive machine cards displaying status (`Running`, `Idle`, `Maintenance`, `Breakdown`).
  - Breakdown ticketing system with severity tagging (`Critical`, `Moderate`, `Minor`).
  - Maintenance resolution logging with technician cost capture and downtime calculation.
- **Key APIs:**
  - `GET /machines` & `POST /machines` — Machine registry.
  - `POST /machines/tickets` — File breakdown ticket.
  - `PUT /machines/tickets/{id}/resolve` — Mark ticket resolved, update machine back to Running, and record maintenance expense.

---

## 8. Supplier & Purchase Order Management (Procurement)
- **Primary Page:** `frontend/purchasing.html`
- **Backend Router:** `backend/routes/suppliers.py`, `backend/routes/purchases.py`
- **Database Collections:** `suppliers`, `purchase_orders`
- **Features:**
  - Supplier directory with ratings, payment terms, and category tags.
  - Purchase Order (PO) creation with line item pricing.
  - Goods Receipt Note (GRN) Receiving Workflow: Completing a GRN automatically increments warehouse material stock and creates a financial expense transaction.
- **Key APIs:**
  - `GET /suppliers` & `POST /suppliers` — Vendor directory.
  - `GET /purchases/orders` & `POST /purchases/orders` — PO lifecycle.
  - `PUT /purchases/orders/{id}/grn` — Receive goods, update inventory, and book expense.

---

## 9. Customer Sales Orders & Logistics Dispatch Tracking
- **Primary Page:** `frontend/orders-dispatch.html`
- **Backend Router:** `backend/routes/customers.py`, `backend/routes/dispatch.py`
- **Database Collections:** `customers`, `sales_orders`, `dispatches`
- **Features:**
  - Customer directory with order history and billing info.
  - Sales Order (SO) booking that automatically spawns a Production Order and links to cutting line.
  - Logistics dispatch generator with AWB courier tracking, shipping method, and package status timeline.
- **Key APIs:**
  - `GET /customers` & `POST /customers` — Customer management.
  - `GET /customers/orders` & `POST /customers/orders` — Sales orders.
  - `GET /dispatch` & `POST /dispatch` — Dispatch manifest and AWB tracking.

---

## 10. Financial Ledger & Piece-Rate Wage Settlement
- **Primary Page:** `frontend/finance.html`
- **Backend Router:** `backend/routes/transactions.py`
- **Database Collections:** `transactions`, `piece_rate_ledger`
- **Features:**
  - Double-entry financial journal recording Incomes (Sales, Advances) and Expenses (Raw Materials, Payroll, Maintenance, Utilities).
  - Profit & Loss summary cards (Total Revenue, Total Cost, Net Operating Profit).
  - Worker piece-rate wage calculation: Automatically aggregates accepted pieces completed by operators and provides one-click payout settlement.
- **Key APIs:**
  - `GET /transactions/ledger` & `POST /transactions` — Financial records.
  - `GET /transactions/summary` — P&L aggregation.
  - `GET /transactions/piece-rate/ledger` & `POST /transactions/piece-rate/settle` — Piece-rate payout settlement.

---

## 11. Reports & CSV Data Export Center
- **Primary Page:** `frontend/reports.html`
- **Backend Router:** `backend/routes/analytics.py`
- **Features:**
  - Instant one-click CSV export for 5 key operational domains:
    1. **Production Run Report** (Order numbers, quantities, stage, status, completion date)
    2. **Daily Attendance Report** (Worker names, shift times, working hours, overtime)
    3. **Inventory Valuation & Stock Report** (SKUs, category, on-hand qty, unit cost, valuation)
    4. **Quality Inspection & Defect Audit Report** (Batch audits, pass/reject counts, defect rates)
    5. **Financial Transactions Ledger** (Transactions, categories, debit/credit amounts, party names)
- **Key APIs:**
  - `GET /analytics/export-csv?reportType={type}` — Direct CSV stream download.

---

## 12. Factory Shift Configuration & Immutable Audit Log Trail
- **Primary Page:** `frontend/audit-settings.html`
- **Backend Router:** `backend/routes/settings.py`
- **Database Collections:** `settings`, `audit_logs`, `notifications`
- **Features:**
  - Factory shift parameter control: Shift start/end times, grace period minutes, overtime cutoff.
  - Immutable system audit trail capturing user ID, action description, module, entity ID, and timestamp for full compliance and accountability.
  - System notification feed for floor alerts and order status changes.
- **Key APIs:**
  - `GET /settings` & `PUT /settings` — System parameters.
  - `GET /settings/audit-logs` — Immutable audit trail.
  - `GET /settings/notifications` — Alert notification center.
