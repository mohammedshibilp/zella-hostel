# Zella Hostel Management System

A production-quality, enterprise-grade **Hostel Management System** built strictly with the client-approved EdTech design system (**#3F2576** primary purple, **#F7941D** secondary orange, **#F8F9FB** background, **#1E1B4B** text, Montserrat typography, white rounded cards, collapsible sidebar, mobile drawer) on a robust full-stack architecture:

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Axios + Lucide React + Recharts + html2pdf.js
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2 + Pydantic v2 + Alembic
- **Database**: PostgreSQL (Primary) with automatic local SQLite fallback for dev/tests

---

## 1. Architecture Overview

```
                          ┌───────────────────────────┐
                          │    Browser Client (SPA)   │
                          │ React 19 + TypeScript     │
                          │ Tailwind CSS + Montserrat │
                          └─────────────┬─────────────┘
                                        │  Axios HTTP / Bearer JWT
                                        ▼
                          ┌───────────────────────────┐
                          │   FastAPI Backend (8000)  │
                          │   Pydantic v2 Schemas     │
                          │   Dependency Injection    │
                          └─────────────┬─────────────┘
                                        │  SQLAlchemy 2.0 ORM
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
       ┌───────────────────────────┐         ┌───────────────────────────┐
       │   PostgreSQL 16 (Primary) │         │   SQLite (Dev Fallback)   │
       │   Alembic Migrations      │         │   hostel.db (Auto-detect) │
       └───────────────────────────┘         └───────────────────────────┘
```

---

## 2. Core Functional Modules & Client Requirements

### A. Exact 23-Room Chart & Bed Matrix
- **Floor 1**: 101 to 110 (10 rooms × 2 beds = 20 beds)
- **Floor 2**: 201 to 210 (10 rooms × 2 beds = 20 beds)
- **Floor 3**: 301 to 303 (3 rooms × 3 beds = 9 beds)
- **Total**: Exactly 23 rooms, 49 beds stored as individual database entities (`rooms`, `beds`).
- Occupancy is dynamically derived from PostgreSQL records.
- Clicking any room displays the complete room modal: capacity, occupied, vacant, all beds, occupant guest name, phone number, admission date, package, and reservation status.
- Clicking any bed allows status management (`Available` / `Maintenance`).

### B. Complete Business Lifecycle
```
ENQUIRY (Date, Mode, Occupation, Approx Date, Contact, Status)
   ↓
CONVERT TO ADMISSION
   ↓
CREATE GUEST (Name, Phone, Email, Guardian, Address, ID Proof)
   ↓
SELECT PACKAGE (Standard, Deluxe AC, Triple Economy)
   ↓
SELECT ROOM & SELECT BED (Available beds only)
   ↓
ADMISSION (Security deposit, Monthly fee)
   ↓
BED OCCUPIED (Status changes to 'Occupied', Room occupancy recalculated)
   ↓
DASHBOARD UPDATED (Occupied beds increase, vacancies decrease)
   ↓
FEE RECEIPT (Receipt No, Discount, Paid, Balance, Payment Reference, Card/UPI/Bank/Cash)
   ↓
ACCOUNT TRANSACTION (Auto-synced into Double-Entry Ledger)
   ↓
ATTENDANCE (Present, Absent, Leave, Out, with search and bulk marking)
   ↓
CHECKOUT (Bed released to 'Available', Room occupancy decrements, Guest status = 'Vacated')
   ↓
DASHBOARD UPDATED (Real-time recalculation)
```

### C. Booking Collision Rejection
- Beds reserved for upcoming guests have status `Reserved`.
- Overlapping booking requests for the same bed are **rejected with HTTP 400** by backend validation.

### D. Admission Collision Prevention & Transaction Safety
- Admitting two guests to the same occupied bed is rejected with HTTP 400.
- Operations run inside atomic database transactions; no partial guest or admission records exist on failure.

### E. Fee Receipts & Invoicing
- Auto-generated unique numbering format: `REC-YYYY-NNNN`.
- Fields: Receipt No, Date, Guest Name, Room & Bed, Package, Fee Type, Billing Period, Amount, Discount, Paid Amount, Balance Due, Payment Mode (`Cash`, `Bank`, `UPI`, `Card`, `Other`), Payment Reference / UTR, Remarks.
- Client-side printable voucher and branded PDF generation via `html2pdf.js`.

### F. Double-Entry Accounts & Ledger
- Supports all 4 client permutations:
  1. `Guest` + `Cash` + `Debit` (e.g. security deposit refund)
  2. `Guest` + `Bank` + `Credit` (e.g. online fee payment)
  3. `Plain` + `Cash` + `Debit` (e.g. daily provisions / maintenance)
  4. `Plain` + `Bank` + `Credit` (e.g. interest / scrap sale)
- Real-time balances: Total Debit, Total Credit, Cash in Hand, Bank Balance, and Net Operating Balance.

### G. Attendance Roster
- Date selector with roster for all active residents.
- Four statuses supported: `Present`, `Absent`, `Leave`, `Out`.
- Search filter by resident name, room number, or bed number.
- Bulk "Mark All Present" and "Mark All Absent" shortcuts.

### H. Core Dashboard Metrics (Client Specified)
The dashboard strictly focuses on the 3 core metrics required by the client:
- **TOTAL GUESTS**: Real-time count of active residents currently admitted in the hostel.
- **VACANCIES**: Real-time count of vacant beds (`total_beds - occupied_beds`) across all 23 rooms.
- **BOOKING**: Real-time count of confirmed advance bookings awaiting check-in.
- **Quick Action Hub**: Clean shortcuts to New Admission, 23-Room Chart, Fee Receipts, and Daily Attendance without cluttering charts.

---

## 3. Database Schema & Relationships

- `users`: ID, email, full_name, hashed_password, role (`ADMIN`/`STAFF`), is_active.
- `rooms`: ID, room_number (unique), floor, capacity, room_type, status, notes.
- `beds`: ID, room_id (`CASCADE`), bed_number, is_occupied, status, notes.
- `packages`: ID, name, monthly_fee, security_deposit, amenities, is_active.
- `enquiries`: ID, date, name, mode, occupation, approx_coming_date, package_id (`SET NULL`), contact_no, current_status.
- `guests`: ID, name, contact_no, email, occupation, guardian_name, guardian_phone, address, id_proof_type, id_proof_number, status (`Active`/`Vacated`).
- `admissions`: ID, guest_id (`CASCADE`), room_id (`RESTRICT`), bed_id (`RESTRICT`), package_id (`SET NULL`), admission_date, security_deposit, monthly_fee, status (`Active`/`CheckedOut`), checkout_date.
- `bookings`: ID, guest_name, contact_no, email, room_id, bed_id, package_id, booking_date, check_in_date, advance_amount, status (`Confirmed`/`CheckedIn`/`Cancelled`).
- `attendance`: ID, guest_id (`CASCADE`), date, status (`Present`/`Absent`/`Leave`/`Out`), remarks.
- `fee_receipts`: ID, receipt_no (unique), guest_id, admission_id, date, fee_type, amount, discount, paid_amount, balance_amount, payment_mode, payment_reference, period_start, period_end.
- `account_transactions`: ID, date, transaction_type (`Guest`/`Plain`), guest_id, particulars, amount, payment_channel (`Cash`/`Bank`), entry_type (`Dr`/`Cr`), reference_no.

---

## 4. Default Seed Credentials

> [!WARNING]
> These credentials are for initial development and testing only. In a production environment, change them immediately upon first login.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@zellahostel.com` | `Admin@12345` |
| **Staff** | `staff@zellahostel.com` | `Staff@12345` |

---

## 5. Setup & Running Instructions

### Option 1: Docker Compose (Production Deployment)

1. Copy `.env.example` to `.env` and configure your credentials:
   ```bash
   cp .env.example .env
   ```
2. Build and launch all services:
   ```bash
   docker compose up --build -d
   ```
3. Run Alembic migrations and seed initial data:
   ```bash
   docker compose exec backend alembic upgrade head
   docker compose exec backend python -m app.database.seed
   ```

### Option 2: Local Development Setup

#### 1. Backend Setup
```bash
cd backend

# Create & activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run seed script (creates 23 rooms, 49 beds, packages, default users)
python -m app.database.seed

# Run all automated tests
pytest -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Check TypeScript & compile production build
npm run build

# Start Vite development server
npm run dev
```

---

## 6. Exact Application URLs

- **Frontend Web Application**: [http://localhost:5173](http://localhost:5173) (or `http://localhost:80` in Docker)
- **Backend API Base**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)
- **FastAPI Interactive Swagger Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **FastAPI ReDoc**: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

---

## 7. PostgreSQL Database Setup Instructions

To connect to a standalone PostgreSQL database:

1. Create the PostgreSQL user and database:
   ```sql
   CREATE USER hostel_admin WITH PASSWORD 'hostel_secure_password_2026';
   CREATE DATABASE hostel_management OWNER hostel_admin;
   GRANT ALL PRIVILEGES ON DATABASE hostel_management TO hostel_admin;
   ```
2. Update `.env` in the backend directory:
   ```env
   DATABASE_URL=postgresql+psycopg://hostel_admin:hostel_secure_password_2026@localhost:5432/hostel_management
   ```
3. Run Alembic migrations from zero:
   ```bash
   alembic upgrade head
   ```
4. Run the seed script:
   ```bash
   python -m app.database.seed
   ```
5. Verify room count:
   ```sql
   SELECT count(*) FROM rooms; -- Returns 23
   SELECT count(*) FROM beds;  -- Returns 49
   ```
#   z e l l a - h o s t e l  
 