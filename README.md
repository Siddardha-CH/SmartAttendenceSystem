# Smart Attendance System

> Real-time face recognition attendance platform with 3-role RBAC, institute management, and live scanning.

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?logo=springboot)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![face-api.js](https://img.shields.io/badge/face--api.js-Powered-FF6B6B)

## What It Does

A full-stack attendance management platform where:

- **Admins** manage institutes, users, and class schedules
- **Teachers** enroll student faces and run live attendance scans via webcam
- **Viewers** can see reports and attendance records

Face recognition runs entirely in the **browser** via face-api.js — no server-side image processing needed.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Spring Boot, Spring Security, JPA/Hibernate |
| Auth | JWT, 3-role RBAC (Admin / Teacher / Viewer) |
| Database | PostgreSQL 16 |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Face Recognition | face-api.js (browser-side, TensorFlow.js) |
| Build | Maven, Vite |

## Architecture

```
SmartAttendenceSystem/
├── backend/                    # Spring Boot (Java 17)
│   └── src/main/java/com/smartattendance/
│       ├── controller/         # 7 REST controllers (14+ endpoints)
│       ├── model/              # User, Student, ClassEntity, Institute, AttendanceRecord
│       ├── repository/         # JPA repositories
│       └── config/             # CORS, database init
└── src/                        # React frontend
    ├── pages/                  # Dashboard, Attendance, Classes, Students, Institutes, Reports
    ├── components/             # Sidebar, layout, UI components
    └── lib/
        └── faceRecognition.ts  # face-api.js integration
```

## REST API (14 Endpoints)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/users/login` | Public | Login, get JWT |
| POST | `/api/users/register` | Admin | Create user |
| GET | `/api/institutes` | Any | List institutes |
| POST | `/api/institutes` | Admin | Create institute |
| GET | `/api/classes` | Any | List classes |
| POST | `/api/classes` | Admin/Teacher | Create class |
| GET | `/api/students` | Any | List students |
| POST | `/api/students` | Teacher | Enroll student + face |
| POST | `/api/attendance/mark` | Teacher | Mark attendance |
| GET | `/api/attendance` | Any | Attendance records |
| GET | `/api/attendance/reports` | Any | Aggregate reports |

## Running Locally

### Prerequisites
- Java 17+, Maven 3.9+
- PostgreSQL 16 on `localhost:5432`
- Node.js 18+

### 1. Database
```sql
CREATE DATABASE smartattend;
```

### 2. Backend
```bash
cd backend
mvn spring-boot:run
# Starts on http://localhost:8081
```

### 3. Frontend
```bash
npm install
npm run dev
# Starts on http://localhost:5173
```

### Environment Variables (backend/.env)
```properties
DB_URL=jdbc:postgresql://localhost:5432/smartattend
DB_USERNAME=postgres
DB_PASSWORD=postgres
```

## Key Features

- **Real-time face enrollment** — teachers capture face descriptors via webcam
- **Live attendance scanning** — continuous webcam feed matches enrolled faces
- **Multi-institute support** — isolated data per institution
- **Excel export** — attendance reports downloadable as spreadsheet
- **Responsive UI** — works on desktop and tablet
