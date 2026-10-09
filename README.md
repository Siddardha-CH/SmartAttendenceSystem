# SmartAttend — Face Recognition Attendance System

> Take class attendance by pointing a webcam at the room. Faces are recognised **in the browser**; the server only stores 128-number face "fingerprints", small registration thumbnails, and attendance records.

![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?style=flat&logo=spring)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=flat&logo=postgresql)
![face-api.js](https://img.shields.io/badge/face--api.js-Browser%20ML-FF6B35?style=flat)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript)

📘 **New to the code? Read [PROJECT_GUIDE.md](PROJECT_GUIDE.md)**: a complete walkthrough of every part of the project.

---

## Features

| Feature | Detail |
|---|---|
| **Browser-side recognition** | face-api.js (TensorFlow.js) runs on the user's device. Video never leaves the browser. |
| **Auto attendance** | Live webcam scan marks each recognised student *present* or *late* (after a configurable time) |
| **Manual override** | Teachers can mark a student by hand (can be disabled in Settings) |
| **3 roles** | Admin (everything) · Teacher (students, face registration, attendance) · Viewer (read-only) |
| **Secure login** | BCrypt-hashed passwords, HMAC-signed session tokens, role checks on every API call |
| **Reports & export** | Daily report and full history as `.xlsx`, full JSON backup |
| **Institutes & classes** | Admins define institutes and classes; classes appear in the student form |
| **One-click deploy** | `render.yaml` deploys database + API + website on Render's free tier |

---

## Tech stack

**Backend:** Java 17 · Spring Boot 3.5 (Web, Data JPA, Validation) · Hibernate · PostgreSQL · spring-security-crypto (BCrypt)
**Frontend:** React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix) · face-api.js · SheetJS (xlsx)

---

## Project structure

```
SmartAttendenceSystem/
├── src/                         # React frontend (Vite)
│   ├── lib/database.ts          #   API client: every HTTP call to the backend
│   ├── lib/faceRecognition.ts   #   face-api.js wrapper: detect, describe, match
│   ├── contexts/AuthContext.tsx #   login state, token, roles
│   ├── pages/                   #   one file per screen
│   └── components/              #   layout, route guards, shadcn/ui widgets
├── backend/                     # Spring Boot API
│   └── src/main/java/com/smartattendance/backend/
│       ├── controller/          #   REST endpoints (/api/...)
│       ├── model/               #   JPA entities = database tables
│       ├── repository/          #   database queries (Spring Data)
│       ├── security/            #   token signing + permission checks
│       └── config/              #   CORS, startup data, error handling
├── render.yaml                  # Render Blueprint (DB + API + static site)
├── Dockerfile, nginx.conf       # optional: frontend as a Docker image
└── .github/workflows/ci.yml     # tests + build on every push
```

---

## Run it locally

**Prerequisites:** Java 17+, Maven 3.9+ (or use `backend/mvnw`), Node.js 18+, PostgreSQL.

### 1. Database

```sql
CREATE DATABASE smartattend;
```

Tables are created automatically on first start.

### 2. Backend (port 8081)

```bash
cd backend
cp .env.example .env      # then put your PostgreSQL password in .env
mvn spring-boot:run
```

Check it: <http://localhost:8081/api/health> → `{"status":"UP"}`

### 3. Frontend (port 8080)

```bash
npm install
npm run dev
```

Open <http://localhost:8080> and sign in with **admin@school.edu / admin123**. Change this password on the Users page.

> The camera only works on `localhost` or over HTTPS. That's a browser rule, not an app limitation.

### Tests

```bash
cd backend && mvn test        # 11 API tests on an in-memory database
npx tsc -p tsconfig.app.json --noEmit && npm run lint && npm run build
```

---

## Deploying (Render, free tier)

1. Push this repository to GitHub.
2. On [render.com](https://render.com): **New → Blueprint**, pick the repo. Render reads `render.yaml` and creates:
   - `smartattend-db`: PostgreSQL
   - `smartattend-backend`: the API (Docker)
   - `smartattend-frontend`: the website (static site)
3. When asked, enter **ADMIN_PASSWORD** (the password for `admin@school.edu`). Leave **VITE_API_URL** blank for now.
4. Wait for the backend to go live, then copy its URL (e.g. `https://smartattend-backend-xxxx.onrender.com`).
5. Open **smartattend-frontend → Environment**, set `VITE_API_URL` to that URL, then run **Manual Deploy → Clear build cache & deploy**. (Vite bakes the URL into the JavaScript at build time, so a rebuild is required.)
6. Optional hardening: on the backend, set `CORS_ALLOWED_ORIGINS` to your frontend URL.

**Free-tier notes:** the backend sleeps after 15 minutes idle, so the first request after that takes ~1 minute. Render deletes free PostgreSQL databases after 30 days unless you upgrade. Use *Settings → Export All Data* for backups.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DB_HOST` `DB_PORT` `DB_NAME` `DB_USERNAME` `DB_PASSWORD` | backend (prod) | Set automatically by Render from the database |
| `DB_URL` | backend (local) | Full JDBC URL for local development |
| `APP_TOKEN_SECRET` | backend | Signs login tokens. Render generates it. If unset, users are logged out on restart. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | backend | First admin account (only used when there are no users yet) |
| `CORS_ALLOWED_ORIGINS` | backend | Comma-separated allowed frontend origins (default `*`) |
| `VITE_API_URL` | frontend (build time) | Backend URL; `/api` is appended if missing |

---

## How face recognition works

1. **Registration:** the camera captures N photos (N = *Required Face Samples*, default 5). For each, face-api.js finds the face and computes a **descriptor**: 128 numbers summarising the face. The samples are averaged into one descriptor and saved with the student.
2. **Live scan:** every *Scan Interval* (default 3 s), every face in the frame gets a descriptor. It is compared to every registered student using **Euclidean distance**. The closest student under the *Recognition Threshold* (default 0.6) is a match.
3. **Marking:** a match is sent to `POST /api/attendance` with status *late* if the time is past the *Late Arrival Threshold*. The server refuses a second record for the same student on the same day.

---

## Roles & permissions

Enforced by the server (`AuthInterceptor`), not only hidden in the UI.

| Action | Admin | Teacher | Viewer |
|---|:---:|:---:|:---:|
| View dashboard, students, reports | ✅ | ✅ | ✅ |
| Add/edit students, register faces | ✅ | ✅ | ❌ |
| Take attendance (auto + manual) | ✅ | ✅ | ❌ |
| Institutes, classes, settings | ✅ | ❌ | ❌ |
| Users, clear history, factory reset | ✅ | ❌ | ❌ |

---

## API reference

All endpoints are under `/api` and require `Authorization: Bearer <token>` except the two marked public.

| Method | Endpoint | Who | Description |
|---|---|---|---|
| GET | `/health` | public | Liveness check |
| POST | `/users/login` | public | `{email,password}` → `{token,user}` |
| GET | `/users/me` | any | The logged-in user |
| GET/POST | `/users` | admin | List / create users |
| GET/PUT/DELETE | `/users/{id}` | admin | Read / update / delete a user |
| GET | `/students` | any | All students (without images) |
| GET | `/students/{id}` | any | One student, with face images |
| POST | `/students` | teacher+ | Create student |
| PUT | `/students/{id}` | teacher+ | Partial update (also saves face registration) |
| DELETE | `/students/{id}` | teacher+ | Delete student |
| GET | `/attendance` | any | All records |
| GET | `/attendance/date/{yyyy-MM-dd}` | any | Records for one day |
| POST | `/attendance` | teacher+ | Mark attendance (409 if already marked) |
| POST | `/attendance/check-duplicate` | teacher+ | `{studentId,date}` → `{exists}` |
| DELETE | `/attendance/clear-history` | admin | Delete all attendance |
| GET / PUT | `/settings` | any / admin | Read / partially update settings |
| GET / PUT | `/preferences/{userId}` | self or admin | Theme preferences |
| GET/POST, PUT/DELETE `/{id}` | `/institutes`, `/classes` | any (read) / admin | Institutes & classes |
| POST | `/admin/reset` | admin | Factory reset (keeps user accounts) |

Errors come back as `{"error": "message"}` with a matching HTTP status (400, 401, 403, 404, 409).

---

## License

MIT
