# 🏗️ GarmentFlow ERP — System Architecture & Data Flow

## 1. Executive Summary

**GarmentFlow** is a comprehensive, production-grade Garment Manufacturing Enterprise Resource Planning (ERP) platform built with a modern, high-performance architecture:
- **Backend:** FastAPI (Python 3.10+ async REST API)
- **Database Engine:** Dual-Engine Architecture (Async MongoDB with Motor + High-Fidelity Local JSON Mock DB Engine with MongoDB query operator support: `$in`, `$gte`, `$lte`, `$regex`, `$or`, etc.)
- **Security & RBAC:** JWT Bearer Token Authentication, BCrypt Password Hashing, 4-Tier Role Authorization (`ADMIN`, `MANAGER`, `SUPERVISOR`, `WORKER`)
- **Frontend:** Vanilla ES6 JavaScript Modules with TailwindCSS & Plus Jakarta Sans typography.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    Client[Browser Frontend - ES6 Modules] -->|HTTP / REST + Bearer JWT| Gateway[FastAPI Application Gateway]
    
    subgraph FastAPI Middleware & Routers
        Gateway --> AuthGuard[RBAC & Auth Middleware]
        AuthGuard --> R1[Auth & Profile Router]
        AuthGuard --> R2[Analytics & Dashboard Router]
        AuthGuard --> R3[Workforce & Employee Router]
        AuthGuard --> R4[Attendance & Leave Router]
        AuthGuard --> R5[Materials & Inventory Router]
        AuthGuard --> R6[Production & Job Card Router]
        AuthGuard --> R7[Quality Control Router]
        AuthGuard --> R8[Machine & Breakdown Router]
        AuthGuard --> R9[Supplier & Purchase Router]
        AuthGuard --> R10[Customer & Dispatch Router]
        AuthGuard --> R11[Finance & Ledger Router]
        AuthGuard --> R12[Audit & Settings Router]
    end

    subgraph Data Access Layer
        R1 & R2 & R3 & R4 & R5 & R6 & R7 & R8 & R9 & R10 & R11 & R12 --> DBEngine[Database Abstraction Layer]
        DBEngine -->|Production Mode| MongoDB[(MongoDB Cluster / Atlas)]
        DBEngine -->|Zero-Config Fallback| LocalDB[(Local db.json Mock Engine)]
    end
```

---

## 3. End-to-End Manufacturing Workflow Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer / Sales
    actor Manager as Production Planner
    actor Worker as Floor Worker (Cutting)
    actor QC as QC Inspector
    actor Dispatch as Logistics Operator
    actor Finance as Accounts

    Customer->>Manager: Sales Order Placed (SO-001)
    Manager->>Manager: Auto-Spawn Production Order (PROD-001) & BOM Verification
    Manager->>Worker: Dispatch Stage 1 Job Card (JC-CUT-01)
    Worker->>Worker: Complete Cutting (100 Pcs) & Log Output
    Worker->>Finance: Auto-Accrue Piece Rate (₹5.00/pc = ₹500)
    Worker->>QC: Submit to Quality Inspection
    QC->>QC: Run 6-Point Garment Audit (AQL 1.5)
    alt Quality Pass (FPY >= 95%)
        QC->>Dispatch: Forward to Packing & Logistics
        Dispatch->>Customer: Generate Packing Slip & Dispatch AWB
        Finance->>Finance: Record Revenue & Expense in Financial Ledger
    else Quality Defect / Rework
        QC->>Worker: Auto-Generate Rework Job Card
    end
```

---

## 4. Database Schema Relationships

| Entity | Primary Key | Key Foreign References | Description |
| :--- | :--- | :--- | :--- |
| `users` | `_id` | `department` | System operators, workers, supervisors, managers, admins |
| `departments` | `_id` | - | Factory operational bay / workstation categories |
| `materials` | `_id` | `supplierId` | Raw materials, fabrics, trims, unit costs, and reorder thresholds |
| `boms` | `_id` | `materialId` | Bill of Materials linking finished apparel to raw material consumption |
| `production_orders`| `_id` | `customerId` | Master manufacturing orders with multi-stage progress tracking |
| `job_cards` | `_id` | `productionOrderId`, `workerId`, `machineId` | Atomic work assignments executed at each factory department |
| `qc_inspections` | `_id` | `productionOrderId`, `jobCardId`, `inspectorId` | Quality inspection audits with defect classification and FPY metrics |
| `machines` | `_id` | `operatorId`, `department` | Factory machinery directory, health status, and maintenance tickets |
| `suppliers` | `_id` | - | Raw material vendor directory with ratings and payment terms |
| `purchase_orders` | `_id` | `supplierId`, `materialId` | Vendor procurement orders and Goods Receipt Note (GRN) workflow |
| `customers` | `_id` | - | Wholesale / retail client directory |
| `sales_orders` | `_id` | `customerId` | Commercial sales contracts automatically driving production |
| `dispatches` | `_id` | `salesOrderId`, `productionOrderId` | Packaging slips, courier AWB tracking numbers, and delivery statuses |
| `attendance` | `_id` | `employeeId` | Daily shift clock-in/out records, overtime, and late flags |
| `leaves` | `_id` | `employeeId` | Employee leave requests with approval lifecycle |
| `transactions` | `_id` | `orderId`, `vendorId` | Master double-entry financial ledger recording revenues & expenses |
| `piece_rate_ledger`| `_id` | `workerId`, `jobCardId` | Accrued piece-rate earnings payable to factory operators |
| `audit_logs` | `_id` | `userId` | Immutable system event trail logging user actions and timestamps |

---

## 5. Security & RBAC Enforcement

The system enforces strict 4-tier Role-Based Access Control (RBAC):

```text
[ ADMIN ]
   ├── Full system configuration, factory shift parameters, and audit trails
   ├── Complete financial ledger oversight & piece-rate settlements
   └── User, employee, and role privilege management
         │
[ MANAGER ]
   ├── Sales order bookings, production scheduling, and purchase order approvals
   ├── Material inventory management & BOM configuration
   └── Executive analytics and CSV report generation
         │
[ SUPERVISOR ]
   ├── Daily shift attendance verification & bulk approval
   ├── Job card dispatching, worker/machine assignment, and QC inspections
   └── Machine breakdown ticketing & maintenance resolution
         │
[ WORKER ]
   ├── Mobile workstation task queue view
   ├── Daily shift clock-in / clock-out
   ├── Job progress reporting & defect flagging
   └── Piece-rate earnings ledger view & leave application
```
