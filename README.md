# CRM Leads Management & Conversion Tracking (FastAPI + MongoDB + React)

## Repo structure
- `backend/` FastAPI + Motor (MongoDB) + JWT + WebSocket + Scheduler
- `frontend/` React (Vite) + Tailwind + Router + TanStack Query + Zustand + Recharts

---

## Backend setup

### 1) Start MongoDB (recommended)
```bash
cd backend
docker compose up -d
```

### 2) Configure env
```bash
cd backend
cp .env.example .env
```

### 3) Install & run
```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# seed demo users + sample leads
python -m app.utils.seed

# run api
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  
Health: http://localhost:8000/health

Demo users:
- manager1 / password
- sales1 / password
- sales2 / password

---

## Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open: http://localhost:5173

---

## Realtime notifications
- When a lead has `next_followup_at`, the scheduler scans every minute.
- It creates notifications **5 minutes before** the due time for:
  - assigned sales person (if any)
  - the manager who assigned it (assigned_by)
- Delivered in realtime via WebSocket if user is online; otherwise shown on next login.

---

## Tests (backend)
```bash
cd backend
pytest -q
```
