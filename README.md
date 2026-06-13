# SmartAttendence — Face Recognition Attendance System

> Real-time browser-side face recognition for frictionless, fraud-proof attendance — no server image uploads, no manual roll calls.

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=flat&logo=spring)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql)
![face-api.js](https://img.shields.io/badge/face--api.js-Browser%20ML-FF6B35?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript)

---

## Features

| Feature | Detail |
|---|---|
| **Browser-Side Recognition** | face-api.js runs entirely in the browser — no student photos ever leave the device |
| **3-Role RBAC** | Admin (full control) · Teacher (enroll + scan) · Viewer (read-only reports) |
| **Live Webcam Scanning** | Real-time face detection loop marks attendance automatically |
| **Multi-Institute / Multi-Class** | Hierarchical: Institute → Department → Class → Student |
| **Excel Export** | Download attendance sheet as `.xlsx` per class per date |
| **JWT Auth** | Stateless Spring Security with BCrypt-hashed passwords |
| **14 REST Endpoints** | Across 7 controllers covering full CRUD |

---

## Tech Stack

**Backend** — Spring Boot 3 · Spring Security · JPA/Hibernate · PostgreSQL · JWT (jjwt)
**Frontend** — React 18 · TypeScript · Tailwind CSS · face-api.js · Vite · Framer Motion

---

## Project Structure

```
SmartAttendenceSystem/
├── backend/                    # Spring Boot API (port 8081)
│   └── src/main/java/
│       ├── controller/         # Auth, Student, Attendance, Class, Institute...
│       ├── service/
│       ├── model/              # Student, AttendanceRecord, ClassGroup, User
│       └── config/             # SecurityConfig, JwtAuthFilter
└── frontend/                   # React app (port 5173)
    └── src/
        ├── components/
        │   ├── FaceEnrollment/
        │   └── LiveScanner/
        └── pages/
            ├── Dashboard/
            ├── Students/
            └── Reports/
```

---

## Getting Started

### Prerequisites
- Java 21+, Maven 3.9+
- Node.js 18+
- PostgreSQL running on port 5432

### 1. Database Setup

```sql
CREATE DATABASE smartattend;
```

### 2. Backend

```bash
cd backend
mvn spring-boot:run
# API at http://localhost:8081
```

**.env configuration:**
```
DB_URL=jdbc:postgresql://localhost:5432/smartattend
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## How Face Recognition Works

1. **Enrollment** — Teacher opens webcam, face-api.js extracts a 128-dimension descriptor from 5 captures, stores the averaged vector in the database as JSON.
2. **Live Scan** — Webcam feed is processed every 300ms. Each detected face is compared against all enrolled students using Euclidean distance (threshold 0.5).
3. **Mark Attendance** — On match, the student ID is POSTed to `/api/attendance/mark`. UI confirms with the student's name in green.

No images are ever stored — only numeric vectors.

---

## Roles & Permissions

| Action | Admin | Teacher | Viewer |
|---|:---:|:---:|:---:|
| Enroll students | ✅ | ✅ | ❌ |
| Run live scanner | ✅ | ✅ | ❌ |
| View reports | ✅ | ✅ | ✅ |
| Export Excel | ✅ | ✅ | ✅ |
| Manage institutes | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register admin/teacher |
| POST | `/api/auth/login` | Login, returns JWT |

### Attendance

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/attendance/mark` | Mark student present |
| GET | `/api/attendance/class/{classId}` | All records for a class |
| GET | `/api/attendance/student/{studentId}` | Student's full history |
| GET | `/api/attendance/export/{classId}` | Download Excel report |

### Students

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/students` | Enroll student |
| GET | `/api/students/class/{classId}` | List by class |
| PUT | `/api/students/{id}/descriptor` | Update face descriptor |
| DELETE | `/api/students/{id}` | Remove student (Admin) |

---

## License

MIT
