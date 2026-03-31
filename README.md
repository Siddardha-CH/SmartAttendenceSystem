# 🎓 Smart Attendance System

A full-stack attendance management system with **real-time face recognition**. Built with a **React + Vite** frontend and a **Java Spring Boot** backend, backed by **H2** (local) and **PostgreSQL** (production).

---

## 📋 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Prerequisites](#-prerequisites)
3. [Running Locally](#-running-locally)
4. [Accessing the Database (H2 Console)](#-accessing-the-database-h2-console)
5. [Database Tables Reference](#-database-tables-reference)
6. [Useful SQL Queries](#-useful-sql-queries)
7. [System Access & Roles](#-system-access--roles)
8. [Backend API Endpoints](#%EF%B8%8F-backend-api-endpoints)
9. [Deploying to Production (Render)](#%EF%B8%8F-deploying-to-production-render)
10. [Environment Variables Reference](#-environment-variables-reference)

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────┐        ┌──────────────────────────────┐
│   React Frontend (Vite)      │  HTTP  │   Spring Boot Backend        │
│   Port: 8080 (dev)           │◄──────►│   Port: 8081                 │
│                              │        │                              │
│  • face-api.js (ML in-browser│        │  • REST API (/api/*)         │
│  • React Router (SPA)        │        │  • Spring Data JPA           │
│  • Radix UI + Tailwind CSS   │        │  • H2 (local) / PG (prod)    │
└──────────────────────────────┘        └──────────────────────────────┘
                                                      │
                              ┌───────────────────────┴───────────────┐
                              │ Local Dev                  Production  │
                              │ H2 File DB                 PostgreSQL  │
                              │ backend/data/attendance    (Render)    │
                              └───────────────────────────────────────┘
```

---

## 💻 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Java JDK** | 17+ | Run the Spring Boot backend |
| **Node.js** | 18+ | Run the Vite frontend |
| **npm** | 9+ | Frontend package manager |
| **Maven Wrapper** | included | Bundled via `mvnw` — no install needed |

---

## 🚀 Running Locally

You need **two terminals** running simultaneously — one for the backend, one for the frontend.

### Terminal 1 — Start the Backend

```bash
# Navigate into the backend folder
cd backend

# Windows
.\mvnw spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```

✅ **Success signal:** You will see:
```
Started BackendApplication in X.XXX seconds
Tomcat started on port(s): 8081 (http)
```

The backend is now live at: **`http://localhost:8081`**

> **First-run note**: On the very first startup, the app automatically seeds a default Admin account:
> - Email: `admin@school.edu`
> - Password: `admin123`

---

### Terminal 2 — Start the Frontend

```bash
# From the project root directory (NOT the backend folder)
npm install        # only needed once

npm run dev        # starts the Vite dev server
```

✅ **Success signal:** Vite will output something like:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:8080/
```

Open your browser at **`http://localhost:8080`**

> **Important**: The frontend reads `VITE_API_URL` to find the backend.
> For local development this defaults to `http://localhost:8081/api` automatically.
> You only need a `.env.local` file if the backend is on a different host/port.

---

## 🗄️ Accessing the Database (H2 Console)

When running locally, the backend uses a lightweight **H2 embedded database** stored as a file at `backend/data/attendance.mv.db`. Spring Boot provides a built-in web UI to browse and query it directly.

### Steps

**1. Make sure the backend is running** (see above).

**2. Open the H2 Console in your browser:**
```
http://localhost:8081/h2-console
```

**3. Fill in the connection form exactly as follows:**

| Field | Value |
|-------|-------|
| **Driver Class** | `org.h2.Driver` |
| **JDBC URL** | `jdbc:h2:file:./data/attendance` |
| **User Name** | `sa` |
| **Password** | *(leave completely blank)* |

**4. Click `Connect`.**

You now have full SQL access to all tables.

> ⚠️ **The JDBC URL must be typed exactly** — `jdbc:h2:file:./data/attendance`  
> Do NOT use `jdbc:h2:mem:*` or any other variation, or you will connect to an empty in-memory database.

---

## 📊 Database Tables Reference

Once connected to H2 Console, you will see these tables:

### `APP_USERS` — System staff accounts
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Unique user ID |
| `email` | VARCHAR | Login email |
| `password` | VARCHAR | Hashed password |
| `name` | VARCHAR | Display name |
| `role` | VARCHAR | `ADMIN`, `TEACHER`, or `VIEWER` |
| `institute_id` | VARCHAR | Linked institute |
| `active` | BOOLEAN | Account enabled/disabled |

### `STUDENTS` — Enrolled students
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Unique student ID |
| `name` | VARCHAR | Full name |
| `class_id` | VARCHAR | Assigned class |
| `institute_id` | VARCHAR | Assigned institute |
| `face_descriptor` | CLOB | JSON array of face embedding numbers (from face-api.js) |
| `face_image` | CLOB | Base64-encoded face photo |

### `ATTENDANCE_RECORDS` — Daily attendance log
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Unique record ID |
| `student_id` | VARCHAR | Which student |
| `student_name` | VARCHAR | Cached display name |
| `attendance_date` | VARCHAR | Date in `YYYY-MM-DD` format |
| `attendance_time` | VARCHAR | Time string |
| `attendance_status` | VARCHAR | `present`, `late`, or `absent` |
| `confidence` | FLOAT | Face match confidence (0.0 – 1.0) |
| `marked_by` | VARCHAR | `face-recognition` or `manual` |

### `CLASSES` — Class / course definitions
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Unique class ID |
| `name` | VARCHAR | Class name |
| `institute_id` | VARCHAR | Parent institute |

### `INSTITUTES` — Top-level organizations
| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR | Unique institute ID |
| `name` | VARCHAR | Institute name |

---

## 🔍 Useful SQL Queries

Run these directly in the H2 Console **SQL Statement** box.

```sql
-- View all system users and their roles
SELECT id, name, email, role, active FROM APP_USERS;

-- View all students in a specific class
SELECT id, name, class_id FROM STUDENTS WHERE class_id = 'your-class-id';

-- View today's attendance
SELECT student_name, attendance_status, attendance_time, confidence
FROM ATTENDANCE_RECORDS
WHERE attendance_date = CURRENT_DATE
ORDER BY attendance_time;

-- Count attendance by status for a given date
SELECT attendance_status, COUNT(*) AS total
FROM ATTENDANCE_RECORDS
WHERE attendance_date = '2025-03-31'
GROUP BY attendance_status;

-- Find students who have NEVER been marked present
SELECT s.name, s.id
FROM STUDENTS s
WHERE s.id NOT IN (
    SELECT DISTINCT student_id FROM ATTENDANCE_RECORDS WHERE attendance_status = 'present'
);

-- Reset admin password (to 'admin123')
-- Note: update accordingly if you use hashing
UPDATE APP_USERS SET password = 'admin123' WHERE email = 'admin@school.edu';
```

---

## 🔐 System Access & Roles

The system uses **Role-Based Access Control (RBAC)**.

### Default Admin Login

| Field | Value |
|-------|-------|
| **Email** | `admin@school.edu` |
| **Password** | `admin123` |

### Role Permissions

| Feature | Admin | Teacher | Viewer |
|---------|:-----:|:-------:|:------:|
| Manage Institutes & Classes | ✅ | ❌ | ❌ |
| Manage Users (add/disable) | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ |
| Add / edit Students | ✅ | ✅ | ❌ |
| Register Faces (webcam) | ✅ | ✅ | ❌ |
| Take Live Attendance | ✅ | ✅ | ❌ |
| Mark Attendance Manually | ✅ | ✅ | ❌ |
| View Dashboard & Reports | ✅ | ✅ | ✅ |
| Download Excel Exports | ✅ | ✅ | ✅ |

---

## 🛰️ Backend API Endpoints

Base URL (local): **`http://localhost:8081/api`**

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/users/login` | Log in — body: `{ email, password }` |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | Get all staff users |
| `POST` | `/users` | Create a new user |
| `PUT` | `/users/{id}` | Update a user |
| `DELETE` | `/users/{id}` | Delete a user |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/students` | Get all students |
| `POST` | `/students` | Add a student (includes face descriptor) |
| `PUT` | `/students/{id}` | Update student info |
| `DELETE` | `/students/{id}` | Remove a student |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/attendance/date/{date}` | Get attendance for a date (`YYYY-MM-DD`) |
| `POST` | `/attendance` | Record a new attendance entry |
| `DELETE` | `/attendance/{id}` | Remove an attendance record |

### Classes & Institutes
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/classes` | Get all classes |
| `POST` | `/classes` | Create a class |
| `GET` | `/institutes` | Get all institutes |
| `POST` | `/institutes` | Create an institute |

---

## ☁️ Deploying to Production (Render)

The `render.yaml` Blueprint file at the project root automates the full deployment.

### Step-by-step

**1. Push your code to GitHub.**

**2. On Render, create a PostgreSQL database:**
- Go to `New → PostgreSQL`
- Name it `smartattend-db`, plan: Free
- Copy the **Internal Database URL** once it's provisioned

**3. Deploy via Blueprint:**
- Go to `New → Blueprint`
- Connect your GitHub repository
- Render will detect `render.yaml` and create:
  - `smartattend-backend` (Java web service)
  - `smartattend-frontend` (Static site)

**4. Set environment variables on the backend service:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Internal Database URL from step 2 |
| `DB_USERNAME` | Your Postgres username |
| `DB_PASSWORD` | Your Postgres password |

**5. Set environment variable on the frontend service:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://smartattend-backend.onrender.com/api` |

> ℹ️ The production backend uses the `prod` Spring profile automatically (via `-Dspring.profiles.active=prod` in `render.yaml`). This disables the H2 console and switches to PostgreSQL.

---

## 🔧 Environment Variables Reference

### Frontend (`.env.local` for local dev)

```env
# Copy .env.example → .env.local and fill in:
VITE_API_URL=http://localhost:8081/api
```

### Backend (Render environment / production only)

```env
DATABASE_URL=jdbc:postgresql://...internal-render-url.../smartattend-db
DB_USERNAME=your_pg_user
DB_PASSWORD=your_pg_password
```

> Local development does **not** need any backend `.env` file.  
> The `application.properties` defaults handle everything automatically.

---

## 🗂️ Project Structure (Quick Reference)

```
SmartAttendanceSystem/
├── backend/                        # Spring Boot app
│   ├── src/main/
│   │   ├── java/com/smartattendance/
│   │   │   ├── model/              # JPA entities (Student, AttendanceRecord, …)
│   │   │   ├── repository/         # Spring Data JPA repos
│   │   │   └── controller/         # REST controllers
│   │   └── resources/
│   │       ├── application.properties        # Local H2 config
│   │       └── application-prod.properties   # Production PostgreSQL config
│   └── data/
│       └── attendance.mv.db        # H2 database file (auto-created)
│
├── src/                            # React + Vite frontend
│   ├── pages/                      # Route-level page components
│   ├── components/                 # Reusable UI components
│   └── lib/                        # API client, utilities
│
├── render.yaml                     # Render.com deployment blueprint
├── .env.example                    # Template for local environment vars
└── package.json                    # Frontend npm scripts
```
