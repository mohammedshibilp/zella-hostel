# Zella Hostel Management System

A production-quality, enterprise-grade **Hostel Management System** developed with the reference EdTech design system (**#3F2576** primary purple, **#F7941D** secondary orange, **#F8F9FB** background, **#1E1B4B** text, Montserrat typography, white cards with 16–24px rounded corners, 256px/80px collapsible sidebar, mobile drawer) built on **FastAPI + PostgreSQL + SQLAlchemy + Alembic** and **React 19 + TypeScript + Vite + Tailwind CSS**.

---

## Key Features & Client Functional Specifications

1. **23 Initial Rooms & Bed Matrix**:
   - Floor 1: Rooms 101 to 110 (Double Sharing)
   - Floor 2: Rooms 201 to 210 (Double Sharing)
   - Floor 3: Rooms 301 to 303 (Triple Sharing)
   - Total Rooms: 23 • Total Beds: 49
   - Interactive visual room chart with bed vacancy/occupancy indicators and maintenance status.

2. **Enquiry Management**:
   - Date, Name, Mode (`Call` / `Walk-in`), Occupation (`Working` / `Studying`), Approximate Coming Date, Package Required, Contact No, Current Status (`Open` / `Converted` / `Closed`).
   - One-click **Convert to Admission** flow.

3. **Admissions & Resident KYC**:
   - Personal details, contact, guardian info, ID proof verification.
   - Intelligent bed collision prevention (rejects already occupied beds).
   - Checkout workflow releasing the bed back to vacant pool and updating occupancy.

4. **Advance Bookings**:
   - Pre-booking with advance token payments.
   - Date overlap and bed collision validation.
   - Check-in conversion directly creating resident admissions.

5. **Daily Attendance Module**:
   - Daily attendance tracker with bulk "Mark All Present" / "Mark All Absent".
   - Statuses: `Present`, `Absent`, `Leave`.
   - Real-time date summaries and attendance rate.

6. **Fee Receipts & Invoicing**:
   - Unique sequential receipt numbering (`REC-2026-0001`).
   - Automated double-entry sync to accounting ledger.
   - Client-side printable vouchers and PDF export using `html2pdf.js`.

7. **Double-Entry Accounts & Ledger**:
   - Date, Particulars (`Guest` / `Plain`), Amount, Bank/Cash, Dr/Cr.
   - Instant calculation of Cash in Hand, Bank Balance, and Net Operating Balance.

8. **Administration & Analytics**:
   - Recharts visual dashboards for income vs expenses and floor occupancy rates.
   - Room maintenance tracking ("Others" module).
   - Hostel packages and multi-role operator accounts (`ADMIN` vs `STAFF`).

---

## Default Access Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@zellahostel.com` | `Admin@12345` |
| **Staff** | `staff@zellahostel.com` | `Staff@12345` |

---

## Quick Start Guide

### Option 1: Full-Stack Docker Compose (Recommended for Production)

```bash
docker compose up --build -d
```
- Frontend: `http://localhost:5173`
- Backend REST API: `http://localhost:8000/api/v1`
- Interactive Swagger Docs: `http://localhost:8000/api/v1/docs`

### Option 2: Running Locally

#### 1. Backend (FastAPI + PostgreSQL / SQLite fallback)

```bash
cd backend

# Activate virtual environment
.\.venv\Scripts\activate

# Install requirements (if not done)
uv pip install -r requirements.txt

# Seed initial 23 rooms, packages & default users
python -m app.database.seed

# Start backend server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend (React 19 + Vite)

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```

---

## Automated Backend Testing

Run the test suite using `pytest`:

```bash
cd backend
pytest -v
```
