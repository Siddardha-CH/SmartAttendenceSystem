# SmartAttend: The Complete Project Guide

This guide explains **every part of the SmartAttend codebase**: what each file does, why it is written that way, and how the pieces work together. It is meant to be read from top to bottom the first time and used as a reference afterwards.

You don't need to be an expert. Every technology is introduced before it is used. Where code is quoted, it is the real code from this repository (sometimes shortened with `...`).

---

## Table of contents

1. [The big picture](#1-the-big-picture)
2. [The technologies and why they were chosen](#2-the-technologies-and-why-they-were-chosen)
3. [A tour of the folders](#3-a-tour-of-the-folders)
4. [Life of a request: three journeys through the code](#4-life-of-a-request-three-journeys-through-the-code)
5. [Backend deep dive (Spring Boot)](#5-backend-deep-dive-spring-boot)
6. [Frontend deep dive (React)](#6-frontend-deep-dive-react)
7. [Face recognition explained properly](#7-face-recognition-explained-properly)
8. [The database](#8-the-database)
9. [Security model](#9-security-model)
10. [Deployment explained](#10-deployment-explained)
11. [Testing and CI](#11-testing-and-ci)
12. [Bugs that were fixed, and what they teach](#12-bugs-that-were-fixed-and-what-they-teach)
13. [How to extend the project (exercises)](#13-how-to-extend-the-project-exercises)
14. [Glossary](#14-glossary)
15. [Interview questions you should be able to answer](#15-interview-questions-you-should-be-able-to-answer)

---

## 1. The big picture

### What the app does

SmartAttend replaces a paper register. A teacher opens the **Attendance** page on a laptop with a webcam. Students walk past. The app recognises each face and records "present" (or "late" after a configured time). Everything is stored in a database so admins can see reports and export them to Excel.

Before a student can be recognised, they must be **registered**: a teacher takes ~5 photos of them on the **Register Face** page.

### The three parts

```
┌──────────────────────────────┐        HTTPS + JSON        ┌───────────────────────────┐        SQL        ┌──────────────┐
│  FRONTEND (browser)          │  ───────────────────────▶  │  BACKEND (server)         │  ──────────────▶  │  DATABASE    │
│  React + TypeScript          │                            │  Java + Spring Boot       │                   │  PostgreSQL  │
│                              │  ◀───────────────────────  │                           │  ◀──────────────  │              │
│  • shows the screens         │    {"token": ..., ...}     │  • checks who you are     │                   │  • tables:   │
│  • runs the webcam           │                            │  • checks permissions     │                   │    students, │
│  • runs face recognition AI  │                            │  • validates data         │                   │    users,    │
│    (face-api.js)             │                            │  • reads/writes database  │                   │    attendance│
└──────────────────────────────┘                            └───────────────────────────┘                   └──────────────┘
```

**Key design decision:** face recognition runs **in the browser**, not on the server.

- **Privacy:** the video stream never leaves the device.
- **Cost:** the free server has 512 MB of RAM, far too little to run neural networks for many users. Each user's own computer does the heavy work.
- **Speed:** no uploading of video frames, so results appear instantly.

The trade-off: the browser must download about 12 MB of model files once (cached afterwards), and recognition speed depends on the user's computer.

### What travels over the network

| From → To | What | Example |
|---|---|---|
| Browser → Server | Login | `{"email":"admin@school.edu","password":"..."}` |
| Server → Browser | Token + user | `{"token":"dXNl...","user":{"id":"...","role":"admin"}}` |
| Browser → Server | A face "fingerprint" | `{"faceDescriptor":[0.012,-0.087, ... 128 numbers]}` |
| Browser → Server | An attendance mark | `{"studentId":"STU001","date":"2026-10-09","time":"08:55:12","status":"present"}` |

The server never receives video. At registration it receives small 100×100 thumbnail photos, which are stored for reference.

---

## 2. The technologies and why they were chosen

### Backend

| Technology | What it is | Why it's here |
|---|---|---|
| **Java 17** | A compiled, strongly typed language | Very common for backends; strong typing catches mistakes at compile time |
| **Spring Boot 3.5** | A framework that sets up a web server, database access, JSON handling etc. with almost no configuration | You write a class with `@RestController` and it becomes an HTTP endpoint |
| **Spring Web (MVC)** | The part of Spring that handles HTTP requests | Maps URLs like `GET /api/students` to Java methods |
| **Spring Data JPA** | Database access by writing *interfaces*, not SQL | `findByEmailIgnoreCase(email)`: Spring writes the SQL for you |
| **Hibernate** | The JPA implementation; turns Java objects into table rows and back (an **ORM**) | You save a `Student` object, Hibernate runs `INSERT INTO students ...` |
| **PostgreSQL** | A relational (SQL) database | Free, reliable, offered free by Render |
| **H2** | A tiny database that lives in memory | Used **only in tests** so they run without installing PostgreSQL |
| **spring-security-crypto** | Just the password-hashing part of Spring Security | Provides **BCrypt** without pulling in all of Spring Security |
| **Maven** | Build tool: downloads libraries, compiles, runs tests, packages a JAR | `pom.xml` lists everything the project needs |

### Frontend

| Technology | What it is | Why it's here |
|---|---|---|
| **React 18** | A library for building UIs from *components* (functions that return HTML-like JSX) | Industry standard; state changes re-render the screen automatically |
| **TypeScript** | JavaScript plus types | Catches bugs before running (it caught the `Float32Array` bug, see §12) |
| **Vite** | Dev server + build tool | Instant reload while coding; produces optimised files for production |
| **React Router** | Maps URLs (`/students`) to page components | Lets a single-page app have real URLs |
| **Tailwind CSS** | Styling by small utility classes (`p-4`, `text-sm`, `bg-green-100`) | Fast to write, no separate CSS files |
| **shadcn/ui + Radix** | Pre-built accessible components (Button, Dialog, Select...) copied into `src/components/ui` | Good-looking, keyboard-accessible UI without writing it from scratch |
| **face-api.js** | Face detection + recognition neural networks, running on **TensorFlow.js** | Does the AI in the browser |
| **SheetJS (`xlsx`)** | Creates Excel files in the browser | The export buttons |
| **date-fns** | Date formatting | `format(new Date(), 'yyyy-MM-dd')` |
| **lucide-react** | Icon set | All icons |

### Hosting

| Technology | What it is |
|---|---|
| **Render** | Cloud host with a free tier for web services, static sites and PostgreSQL |
| **Docker** | Packages the backend with its exact Java version into an "image" so it runs the same everywhere |
| **GitHub Actions** | Runs tests automatically on every push |

---

## 3. A tour of the folders

```
SmartAttendenceSystem/
│
├── index.html                  ← the single HTML page; React mounts into <div id="root">
├── package.json                ← frontend dependencies and scripts (npm run dev / build / lint)
├── vite.config.ts              ← dev server port 8080, "@/..." import alias, bundle splitting
├── tailwind.config.ts          ← theme colours, animations
├── tsconfig*.json              ← TypeScript settings
├── eslint.config.js            ← lint rules
├── .env.development            ← VITE_API_URL for `npm run dev` (points at localhost:8081)
├── .env.example                ← template documenting frontend env vars
│
├── src/                        ← FRONTEND SOURCE
│   ├── main.tsx                ← entry point: renders <App/> inside an ErrorBoundary
│   ├── App.tsx                 ← the router: which URL shows which page, and who may see it
│   ├── index.css               ← Tailwind + colour variables (light/dark)
│   ├── lib/
│   │   ├── database.ts         ← ★ API client: every call to the backend
│   │   ├── faceRecognition.ts  ← ★ face-api.js wrapper
│   │   ├── excelExport.ts      ← builds .xlsx files
│   │   └── utils.ts            ← cn() helper for merging Tailwind classes
│   ├── contexts/
│   │   └── AuthContext.tsx     ← ★ who is logged in, their role, login/logout
│   ├── components/
│   │   ├── auth/ProtectedRoute.tsx   ← redirects if not logged in / wrong role
│   │   ├── layout/DashboardLayout.tsx← sidebar + page area (+ mobile menu)
│   │   ├── layout/AppSidebar.tsx     ← navigation links, user name, logout
│   │   ├── ErrorBoundary.tsx         ← "Something went wrong" screen instead of a blank page
│   │   └── ui/                       ← shadcn/ui building blocks (button, card, dialog...)
│   ├── hooks/                  ← use-toast (notifications), use-mobile
│   └── pages/                  ← one component per screen
│       ├── LoginPage.tsx
│       ├── DashboardPage.tsx
│       ├── AttendancePage.tsx  ← ★ live recognition
│       ├── RegisterFacePage.tsx← ★ face registration
│       ├── StudentsPage.tsx
│       ├── ReportsPage.tsx
│       ├── InstitutesPage.tsx, ClassesPage.tsx, UsersPage.tsx, SettingsPage.tsx
│       └── NotFound.tsx
│
├── backend/                    ← BACKEND
│   ├── pom.xml                 ← Java dependencies
│   ├── Dockerfile              ← how to build the production image
│   ├── .env.example            ← template for local DB settings (copy to .env)
│   └── src/
│       ├── main/java/com/smartattendance/backend/
│       │   ├── BackendApplication.java   ← main()
│       │   ├── model/          ← entities (= tables)
│       │   ├── repository/     ← database access interfaces
│       │   ├── controller/     ← HTTP endpoints
│       │   ├── security/       ← tokens and permission checks
│       │   └── config/         ← CORS, startup data, error handling
│       ├── main/resources/
│       │   ├── application.properties       ← settings for local dev
│       │   └── application-prod.properties  ← overrides for production
│       └── test/               ← automated tests (+ test settings using H2)
│
├── render.yaml                 ← deploy everything on Render with one click
├── Dockerfile + nginx.conf     ← optional: run the frontend in Docker
├── vercel.json, public/_redirects ← single-page-app routing for Vercel / Netlify
└── .github/workflows/ci.yml    ← automatic tests on every push
```

The ★ files are the heart of the project. If you only have an hour, read those.

---

## 4. Life of a request: three journeys through the code

Following real flows end to end is the fastest way to understand a codebase.

### Journey A: logging in

1. **`LoginPage.tsx`**: the user types an email and password and presses *Sign In*. `handleSubmit` calls `login(email, password)` from `useAuth()`.
2. **`AuthContext.tsx` → `login()`**: calls `authenticateUser(email, password)`.
3. **`database.ts` → `authenticateUser()`**: calls `request('/users/login', { method: 'POST', body: ... })`.
4. **`database.ts` → `request()`**: builds the full URL (`http://localhost:8081/api/users/login`), sets `Content-Type: application/json`, and calls the browser's `fetch()`.
5. **Network**: the browser first sends a CORS *preflight* (`OPTIONS`) because the frontend (port 8080) and backend (port 8081) are different origins. `WebConfig.addCorsMappings` answers "yes, that origin may call me". (§5.8)
6. **Backend, `AuthInterceptor.preHandle()`**: runs before every `/api/**` request. `POST /api/users/login` is in `isPublic()`, so it is let through without a token.
7. **`UserController.login()`**: normalises the email to lowercase, finds the user with `repository.findByEmailIgnoreCase(email)`, checks they are `active`, and checks the password with `passwordEncoder.matches(raw, storedHash)` (BCrypt).
8. On success it updates `lastLogin`, then returns `{"token": tokenService.issue(user), "user": user}`. Jackson (Spring's JSON library) turns the `User` object into JSON. The `password` field is **not** included because of `@JsonProperty(access = WRITE_ONLY)`.
9. **Back in `AuthContext.login()`**: saves the token with `setAuthToken(result.token)` (into `localStorage`), stores the user in React state with `setUser(...)`, and loads theme preferences.
10. **`LoginPage`**: `navigate('/dashboard')`. `App.tsx`'s router shows `DashboardLayout` + `DashboardPage`. `ProtectedRoute` lets it through because `user` is now set.

**On a page reload**, React state is lost, but the token is still in `localStorage`. `AuthContext`'s `useEffect` sees it and calls `GET /api/users/me`. If the server accepts the token, the user is restored. If not (expired, forged, user disabled), it logs out. The server is the source of truth.

### Journey B: registering a face

1. **`StudentsPage`**: the teacher clicks *Register Face* on a student → navigates to `/register-face?student=<id>`.
2. **`RegisterFacePage`**: on load it fetches students and settings. It reads `?student=` from the URL to pre-select the student.
3. *Load Face Models* → `loadFaceModels()` downloads three neural networks from a CDN.
4. *Start Camera* → `openCamera(settings)` → `navigator.mediaDevices.getUserMedia(...)`. The browser asks the user for camera permission.
5. A loop runs `detectSingleFace(video)` about 5 times a second and draws a green box around the face.
6. Each *Capture* click saves `{descriptor: number[128], thumbnail: base64 JPEG}`. If *Face Quality Checks* is on, blurry or too-small faces are rejected by `checkFaceQuality()`.
7. After N samples, *Complete Registration* averages them with `averageDescriptors()` and calls `updateStudent(id, { faceDescriptor, faceImages })` → `PUT /api/students/{id}`.
8. **`AuthInterceptor`**: token valid? Role is admin or teacher (`canTakeAttendance`)? Yes → continue.
9. **`StudentController.updateStudent()`**: checks the descriptor has exactly 128 numbers, copies the non-null fields onto the stored student, and saves.
10. **Hibernate**: `FloatListConverter` turns the 128 numbers into one text value `"0.0123,-0.0871,..."` stored in the `face_descriptor` column. Thumbnails go to the `student_face_images` table.

### Journey C: automatic attendance

1. **`AttendancePage`** loads students (with their descriptors), settings and today's records. It fills `markedRef` with the roll numbers already marked today.
2. *Start Auto-Attendance* → `startRecognition()` → `loop()`.
3. `loop()` calls `scanOnce()`, then schedules itself again after `scanInterval` ms with `setTimeout`. A new scan only starts after the previous one finishes, so slow computers never run two scans at once.
4. `scanOnce()`:
   - `detectFaces(video, minConfidence)` → a descriptor for every face in the frame.
   - For each face, `findBestMatch(descriptor, knownFaces, threshold)` → the nearest registered student, if close enough.
   - Draws green (known) and red (unknown) boxes.
   - For each recognised student **not** in `markedRef`: `markAttendance()`.
5. `markAttendance()` adds the student to `markedRef` *immediately* (so the next scan, 3 s later, won't try again), works out present/late by comparing the time with `lateThreshold`, and calls `addAttendance(...)` → `POST /api/attendance`.
6. **`AttendanceController.addAttendance()`** validates the fields, checks *Manual Override* if it's a manual mark, then, inside `synchronized (insertLock)`, checks for an existing record that day. Already there → **409 Conflict**. Otherwise → save, **200 OK**.
7. Back in the browser, `addAttendance()` turns a 409 into `null` ("already marked", not an error). A real record gets appended to *Today's Log*, and a toast says "Ravi marked present".

---

## 5. Backend deep dive (Spring Boot)

### 5.1 Spring Boot in five minutes

Spring is built around **beans** and **dependency injection**.

- A **bean** is an object that Spring creates and manages. Classes annotated with `@RestController`, `@Service`, `@Component`, `@Configuration` or `@Repository` become beans, as do methods annotated `@Bean`.
- **Dependency injection**: if a bean needs another bean, it asks for it in its constructor and Spring passes it in:

```java
public StudentController(StudentRepository repository) {   // Spring passes the repository in
    this.repository = repository;
}
```

You never write `new StudentRepository()`. Spring builds the whole object graph at startup. This makes classes easy to test, because you can pass in fakes.

(Some older controllers use `@Autowired` on a field instead. It works the same way, but constructor injection is preferred because the dependency can't be missing.)

**Key annotations used in this project:**

| Annotation | Meaning |
|---|---|
| `@SpringBootApplication` | "This is the app; scan this package for beans and auto-configure everything" |
| `@RestController` | This class handles HTTP requests; return values become JSON |
| `@RequestMapping("/api/students")` | URL prefix for every method in the class |
| `@GetMapping`, `@PostMapping`, `@PutMapping`, `@DeleteMapping` | Handle that HTTP method at that path |
| `@PathVariable("id")` | Take a value from the URL: `/students/{id}` |
| `@RequestBody` | Parse the JSON body into this Java object |
| `@RequestAttribute` | Read a value an interceptor attached to the request (we use it for the logged-in user) |
| `@Entity`, `@Table`, `@Id`, `@Column` | JPA: this class is a table, this field is the primary key/column |
| `@Transactional` | Run the method inside one database transaction |
| `@Value("${app.x:default}")` | Inject a configuration value |
| `@Configuration` + `@Bean` | Define beans with code |
| `@RestControllerAdvice` + `@ExceptionHandler` | Central place to turn exceptions into HTTP responses |

### 5.2 `BackendApplication.java`

```java
@SpringBootApplication
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

This is all it takes. `SpringApplication.run` starts an embedded Tomcat web server, connects to the database, creates all beans, runs `CommandLineRunner`s (our `DatabaseInitConfig`), and starts listening on the configured port.

### 5.3 Configuration files

#### `application.properties` (local development)

```properties
server.port=${PORT:8081}
spring.config.import=optional:file:.env[.properties]
spring.datasource.url=${DB_URL:jdbc:postgresql://localhost:5432/smartattend}
...
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
app.auth.token-secret=${APP_TOKEN_SECRET:}
app.admin.password=${ADMIN_PASSWORD:admin123}
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:*}
```

- `${NAME:default}` means "use the environment variable `NAME`, or `default` if it isn't set". The same file works on your laptop and on a server; only the environment differs.
- `spring.config.import=optional:file:.env[.properties]` reads `backend/.env` as if it were a properties file. That's how your local DB password gets in **without being committed to Git** (`backend/.env` is in `.gitignore`).
- `ddl-auto=update`: on startup Hibernate compares the entity classes with the database and **creates missing tables and columns**. It never drops anything. Convenient for a project this size. Large production systems use migration tools (Flyway/Liquibase) instead (§13).
- `open-in-view=false`: closes the database session when the controller method returns. With it on (Spring's default), touching a lazy collection while writing JSON silently runs extra queries. Turning it off makes those cases fail loudly, so we load what we need explicitly (see `Hibernate.initialize` in `StudentController`).
- `app.*` properties are **our own** settings, read with `@Value`.

#### `application-prod.properties`

Activated by `-Dspring.profiles.active=prod` (set in the backend `Dockerfile`). Spring loads `application.properties` first, then this file **overrides** matching keys. It builds the JDBC URL from the pieces Render provides (`DB_HOST`, `DB_PORT`, ...), sizes the connection pool for the free tier, and stops stack traces from appearing in error responses.

#### `src/test/resources/application.properties`

Used only when running tests. It points at an in-memory H2 database (`MODE=PostgreSQL` makes H2 imitate Postgres) and sets a fixed token secret.

### 5.4 Models (entities) = database tables

An **entity** is a Java class whose objects are stored as rows. Hibernate maps field names to column names: by default `studentName` → `student_name`.

#### `User` → table `app_users`

```java
@Entity
@Table(name = "app_users")            // "user" is a reserved word in PostgreSQL
public class User {
    @Id private String id;            // UUID string
    @Column(unique = true) private String email;
    private String name;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;          // BCrypt hash, never sent back to clients
    private String role;              // admin | teacher | viewer
    private String status;            // active | disabled
    private Date lastLogin;
    private Date createdAt;
    ...getters/setters
}
```

`WRITE_ONLY` means Jackson will **read** `password` from incoming JSON (when creating a user) but never **write** it into responses. Before this fix, `GET /api/users` returned every user's password in plain text.

#### `Student` → table `students` (+ `student_face_images`)

```java
@Column(unique = true) private String studentId;     // roll number "STU001"
@Column(name = "class_name") private String className; // "class" is reserved in Java and SQL

@Convert(converter = FloatListConverter.class)
@Column(name = "face_descriptor", columnDefinition = "TEXT")
private List<Float> faceDescriptor;                  // 128 numbers in ONE text column

@ElementCollection(fetch = FetchType.LAZY)
@CollectionTable(name = "student_face_images", joinColumns = @JoinColumn(name = "student_id"))
@Column(name = "image_data", columnDefinition = "TEXT")
private List<String> faceImages;                      // base64 thumbnails, separate table

@Transient private Integer faceImageCount;            // not stored; filled for list responses
```

Things to notice:

- **Two IDs.** `id` is an internal UUID (never changes, used in URLs). `studentId` is the school's roll number (human-friendly, could be edited). Attendance records store the **roll number**.
- **`@ElementCollection`** stores a list of simple values in a child table. `LAZY` means "don't load the images unless asked", because the list endpoint doesn't need them.
- **`@Convert`** uses a custom converter (next section).
- **`withoutImages(int count)`** builds a lightweight copy for the student list.

#### `FloatListConverter`

```java
public String convertToDatabaseColumn(List<Float> values)   // [0.1, 0.2] → "0.1,0.2"
public List<Float> convertToEntityAttribute(String column)  // "0.1,0.2" → [0.1, 0.2]
```

Why not a separate table with one row per number, as before? Two reasons:

1. **Order.** SQL tables have no inherent order. Without an `ORDER BY`, the database may return the 128 rows in any order. A descriptor with shuffled numbers describes a different face, so recognition would fail at random.
2. **Speed.** One column instead of 128 rows per student.

#### `AttendanceRecord` → table `attendance_records`

```java
@Table(name = "attendance_records",
       indexes = @Index(name = "idx_attendance_date_student", columnList = "attendance_date, student_id"))
public class AttendanceRecord {
    @Id private String id;
    @Column(name = "student_id") private String studentId;   // roll number
    private String studentName;                              // copied so reports survive student deletion
    @Column(name = "attendance_date") private String date;   // "yyyy-MM-dd"
    @Column(name = "attendance_time") private String time;   // "HH:mm:ss"
    @Column(name = "attendance_status") private String status;  // present | late | absent
    private float confidence;                                // 0-100
    private String markedBy;                                 // face-recognition | manual
}
```

- `date`, `time` and `status` are SQL keywords, so the columns get safe names.
- Dates are stored as strings in `yyyy-MM-dd` format. That sorts correctly as text and avoids time-zone surprises: "today" is whatever day it is on the teacher's computer.
- The **index** makes "has STU001 been marked on 2026-10-09?" fast. That question is asked for every recognised face.
- `studentName` is **denormalised** (copied) on purpose, so old reports still show names after a student is deleted.

#### `Settings` → table `settings` (exactly one row, id `"default"`)

All fields use **wrapper types** (`Float`, `Integer`, `Boolean`) instead of primitives (`float`, `int`, `boolean`). A primitive can't be `null`, so a missing JSON field would arrive as `0` or `false` and overwrite real values. With wrappers, a missing field is `null`, which `applyUpdates()` treats as "leave unchanged". See §12, bug #3.

`Settings.defaults()` is the single source of default values, used at startup and by factory reset.

#### `UserPreferences`, `Institute`, `ClassEntity`

Small entities. `UserPreferences` is one row per user (theme etc.). `ClassEntity` has an `instituteId`, a simple foreign key by value: there is no JPA relationship annotation, and `InstituteController.delete` removes the institute's classes by hand.

### 5.5 Repositories: database access without SQL

```java
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailIgnoreCase(String email);
}
```

That is the whole file. There is **no implementation class**. At startup, Spring Data generates one:

- `JpaRepository<User, String>` provides `findAll()`, `findById()`, `save()`, `deleteById()`, `count()`, `existsById()`, ...
- **Derived queries:** Spring reads the method name. `findByEmailIgnoreCase` → `SELECT ... WHERE lower(email) = lower(?)`. Others in this project:
  - `findFirstByDateAndStudentId(date, studentId)` → `WHERE date = ? AND student_id = ? LIMIT 1`
  - `findByDateOrderByTimeAsc(date)` → `WHERE date = ? ORDER BY time`
  - `findByInstituteId(id)`
- **Custom queries** with `@Query`, written in JPQL (SQL over entity names, not table names):

```java
@Query("SELECT s.id, SIZE(s.faceImages) FROM Student s")
List<Object[]> countFaceImagesPerStudent();
```

This counts each student's images **without loading them**, so the student list can show "5 images" cheaply.

`Optional<T>` is Java's "maybe a value": use `.map(...)`, `.orElse(...)`, `.isPresent()` instead of checking for `null`.

### 5.6 Controllers: the API

A controller method = one endpoint. Return values are converted to JSON. `ResponseEntity` lets you pick the HTTP status:

```java
return ResponseEntity.ok(student);                          // 200 + JSON
return ResponseEntity.notFound().build();                   // 404, no body
return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "..."));  // 409
```

**Convention:** errors are always `{"error": "human-readable message"}`. The frontend's `request()` shows that message in a toast.

#### `HealthController`

`GET /api/health` → `{"status":"UP"}`. Public and cheap. Render calls it to know the server is alive (`healthCheckPath` in `render.yaml`). Before, the health check called `GET /api/users`, which leaked user data and loaded the whole table every few seconds.

#### `UserController`

| Method | What it does / important logic |
|---|---|
| `login` | Public. Lower-cases the email, finds the user, requires `active`, compares the password with BCrypt, returns `{token, user}` or 401. It deliberately returns the same 401 for "no such email" and "wrong password", so attackers can't tell which emails exist. |
| `me` | Returns the user owning the token. `@RequestAttribute(AuthUser.REQUEST_ATTRIBUTE) AuthUser auth` receives what `AuthInterceptor` stored. |
| `getAllUsers`, `getUser` | Admin only (enforced by the interceptor). |
| `addUser` | Validates name/email/password (≥6 chars)/role/status, rejects duplicate emails, **hashes the password**, saves. |
| `updateUser` | Partial update. Prevents: removing your **own** admin rights, and removing/disabling the **last** active admin (otherwise nobody could manage the system). A new password is hashed. |
| `deleteUser` | Can't delete yourself or the last admin. |

#### `StudentController`

| Method | Notes |
|---|---|
| `getAllStudents` | `@Transactional(readOnly = true)`. Gets image counts with one query, then returns `withoutImages(...)` copies. Keeps the list small: 500 students × 5 thumbnails would otherwise be megabytes on every page load. |
| `getStudent` | Includes images. `Hibernate.initialize(s.getFaceImages())` loads the lazy list *inside* the transaction. |
| `addStudent` | Requires name + studentId; trims the ID; 409 if the roll number exists; checks the descriptor is empty or exactly 128 numbers. |
| `updateStudent` | Partial update ("only fields present in the body change"). Used both for editing details and saving face registration. Renaming the roll number checks for duplicates. |
| `deleteStudent` | Deletes the student. The images go too, since an element collection is owned by its entity. Attendance history stays (it holds the name). |

#### `AttendanceController`

```java
synchronized (insertLock) {
    if (!Boolean.FALSE.equals(settings.getDuplicateProtection())) {
        Optional<AttendanceRecord> existing = repository.findFirstByDateAndStudentId(...);
        if (existing.isPresent()) return 409 ...;
    }
    record.setId(UUID.randomUUID().toString());
    return ResponseEntity.ok(repository.save(record));
}
```

- **Validation** with regular expressions: date must look like `2026-10-09`, time like `08:55` or `08:55:12`, status must be present/late/absent.
- **`synchronized`**: "check, then insert" is a classic **race condition**. If two requests for the same student arrive together, both checks can pass before either insert happens. `synchronized` makes the second request wait until the first finishes. This works because there is one server instance. With several instances you would use a database UNIQUE constraint instead (§13).
- `!Boolean.FALSE.equals(x)` means "unless explicitly turned off". It treats `null` as on, the safe default.
- Manual marks are refused (403) if *Manual Override* is disabled.

#### `SettingsController`

`GET` returns the single row (recreating it if someone deleted it). `PUT` calls `existing.applyUpdates(updates)`, which only copies non-null fields.

#### `UserPreferencesController`

Users may read/write only **their own** preferences (admins may access anyone's). The check `requireSelfOrAdmin` throws a `ResponseStatusException(FORBIDDEN)`, which `GlobalExceptionHandler` turns into a 403 JSON response.

#### `InstituteController`, `ClassController`

Plain CRUD. Writes are admin-only. Deleting an institute also deletes its classes, so none are left pointing at a missing institute.

#### `AdminController`

`POST /api/admin/reset` deletes attendance, students (with images), classes, institutes and preferences in one `@Transactional` method, and restores default settings. **User accounts are kept** so the admin isn't locked out. Note the use of `deleteAll()` for students rather than `deleteAllInBatch()`: the batch version runs one `DELETE FROM students` and would fail because the child `student_face_images` rows still reference those students.

### 5.7 Security package

#### Passwords: BCrypt

A **hash** is a one-way function: easy to compute `hash("admin123")`, practically impossible to reverse. We store only the hash. At login we hash the attempt and compare.

BCrypt adds two important properties:

- **Salt:** a random value mixed in, so two users with the same password get different hashes. Precomputed "rainbow tables" are useless against it.
- **Slowness:** deliberately ~100 ms per hash. Irrelevant for one login, crippling for an attacker trying billions of guesses.

A BCrypt hash looks like `$2a$10$N9qo8uLOickgx2ZMRZoMye...`. `$2a$` is the algorithm version, `10` is the cost, then the salt and the hash. `DatabaseInitConfig` hashes any old plain-text passwords at startup by checking for the `$2` prefix.

#### Tokens: `TokenService`

After login, the browser needs to prove who it is on every request without sending the password each time. We give it a **signed token**:

```
token = base64url("userId|role|expiry") + "." + base64url(HMAC_SHA256(secret, thatFirstPart))
```

- **HMAC-SHA256** is a "keyed hash". Only someone who knows `secret` can produce the right signature for a given payload.
- If a user edits the payload (say, changes `teacher` to `admin`), the signature no longer matches and `verify()` rejects it.
- The **expiry** (default 12 hours) limits how long a stolen token works.
- `MessageDigest.isEqual` compares signatures in **constant time**. A normal `equals` stops at the first different byte, and an attacker could time that to guess the signature byte by byte.

This is the same idea as a **JWT** (JSON Web Token), written by hand in ~80 lines so you can see exactly how it works. In a bigger project you'd use a library like `jjwt`.

The secret comes from `APP_TOKEN_SECRET`. If it's missing, a random secret is generated at startup. That works, but every restart logs everyone out (old signatures stop matching), which is why `render.yaml` sets it with `generateValue: true`.

#### Permission checks: `AuthInterceptor`

A Spring MVC **interceptor** runs code before (and after) controller methods. `WebConfig` registers ours for `/api/**`. `preHandle()` does four things:

1. Let `OPTIONS` (CORS preflight) and public endpoints (`/api/health`, `POST /api/users/login`) through.
2. Read `Authorization: Bearer <token>` and `verify` it.
3. Load the user from the database and require `status = active`. Disabling a user therefore takes effect **immediately**, even if their token hasn't expired. We also use the **database** role, not the role in the token, so role changes apply at once.
4. Call `isAllowed(user, method, path)`: the permission table in one readable function:

```java
if (path.equals("/api/users/me")) return true;
if (path.startsWith("/api/users")) return user.isAdmin();
if (path.startsWith("/api/admin")) return user.isAdmin();
if (path.startsWith("/api/settings")) return isRead || user.isAdmin();
if (path.startsWith("/api/institutes") || path.startsWith("/api/classes")) return isRead || user.isAdmin();
if (path.equals("/api/attendance/clear-history")) return user.isAdmin();
if (path.startsWith("/api/attendance") || path.startsWith("/api/students")) return isRead || user.canTakeAttendance();
return true;
```

On success it stores an `AuthUser(id, role)` on the request. Controllers read it with `@RequestAttribute`.

**Why the server must check permissions:** the frontend hides admin pages from teachers, but anyone can open the browser's developer tools or use `curl` and call the API directly. **Hiding a button is not security.** Before this update, the API had no checks at all.

#### `AuthUser`

A Java `record`: a compact immutable class with `id()` and `role()` accessors generated automatically. It also holds the role-name constants and helpers like `isAdmin()`.

### 5.8 Config package

#### `WebConfig`

- **CORS (Cross-Origin Resource Sharing).** Browsers block JavaScript on `https://site-a.com` from reading responses from `https://site-b.com` unless site B says it's allowed. Our frontend and backend are on different origins, so the backend must allow it. `allowedOriginPatterns(...)` reads `CORS_ALLOWED_ORIGINS`. `*` allows any site, which is acceptable here because authentication is a header token, not a cookie a malicious site could ride on. Locking it to your frontend URL is still better practice.
- Registers `AuthInterceptor`.
- Defines the `PasswordEncoder` bean (BCrypt) used by `UserController` and `DatabaseInitConfig`.

#### `DatabaseInitConfig`

A `CommandLineRunner` bean runs once after startup:

1. If there are **no users**, create `admin@school.edu` with `ADMIN_PASSWORD` (default `admin123`, which logs a warning).
2. Hash any legacy plain-text passwords.
3. Make sure the settings row exists.

#### `GlobalExceptionHandler`

`@RestControllerAdvice` catches exceptions thrown by **any** controller:

| Exception | Becomes |
|---|---|
| `ResponseStatusException` | its status + `{"error": reason}` |
| `DataIntegrityViolationException` (e.g. duplicate unique value) | 409 Conflict |
| `MethodArgumentNotValidException` | 400 with the first field error |
| `HttpMessageNotReadableException` (bad JSON) | 400 "Malformed JSON request body" |

Without it, these would be 500 errors with stack traces.

### 5.9 `pom.xml`

- `<parent>spring-boot-starter-parent 3.5.14</parent>` pins compatible versions of every Spring library, so dependencies below don't need version numbers.
- **Starters** are bundles: `spring-boot-starter-web` = Tomcat + Spring MVC + Jackson.
- `<scope>runtime</scope>` (postgresql): needed when running, not when compiling.
- `<scope>test</scope>` (h2, starter-test): only on the test classpath, not in the production JAR.
- `spring-boot-maven-plugin` makes `mvn package` produce a single runnable "fat JAR" containing all dependencies.

---

## 6. Frontend deep dive (React)

### 6.1 React in five minutes

- A **component** is a function that returns JSX (HTML-like syntax):

```tsx
function Greeting({ name }: { name: string }) {
  return <p>Hello {name}</p>;
}
```

- **State** (`useState`) is data that, when changed, makes React re-render the component:

```tsx
const [students, setStudents] = useState<Student[]>([]);
setStudents(data);       // → the table re-renders with the new rows
```

- **Effects** (`useEffect`) run code after rendering, e.g. loading data when a page opens. The dependency array says when to re-run: `[]` means once, `[x]` means whenever `x` changes. The returned function is the **cleanup**, which runs when the component disappears (we stop the camera there).
- **Refs** (`useRef`) hold a value that survives re-renders **without** causing one. Used for DOM elements (`videoRef`) and for values a timer loop must read fresh (`studentsRef`, `markedRef`).
- **`useCallback`** keeps the same function object between renders so effects that depend on it don't re-run needlessly.
- **Context** (`createContext` + `useContext`) shares data with every component without passing props down manually. We use it for the logged-in user.

### 6.2 Startup: `index.html` → `main.tsx` → `App.tsx`

`index.html` has `<div id="root">` and loads `/src/main.tsx`. `main.tsx` renders `<App/>` wrapped in an `ErrorBoundary`, a class component that catches rendering crashes and shows a "Something went wrong / Reload" card instead of a blank white page.

`App.tsx` stacks the **providers** (react-query, tooltips, `AuthProvider`, toast containers) and defines the **routes**:

```tsx
<Route path="/login" element={<LoginPage />} />
<Route path="/" element={<Navigate to="/dashboard" replace />} />
<Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/attendance" element={<AttendanceRoute><AttendancePage /></AttendanceRoute>} />
  ...
  <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
</Route>
<Route path="*" element={<NotFound />} />
```

The middle `<Route>` has no path. It's a **layout route**: every child page renders inside `DashboardLayout`'s `<Outlet />`, and the whole group is guarded by `ProtectedRoute`.

### 6.3 `lib/database.ts`: the API client

Every network call in the app goes through one function:

```ts
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try { res = await fetch(`${API_URL}${path}`, { ...init, headers }); }
  catch { throw new ApiError(0, 'Cannot reach the server. It may be starting up...'); }

  // parse body (JSON or text) ...
  if (!res.ok) {
    if (res.status === 401 && path !== '/users/login') onUnauthorized?.();   // auto-logout
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body);
  }
  return body as T;
}
```

Why centralise this?

- The token is attached in **one** place.
- **Errors are never silently ignored.** The old code often did `const res = await fetch(...); return res.json();` without checking `res.ok`, so a failed save looked like a success (see §12).
- A 401 anywhere logs the user out.
- `<T>` is a TypeScript **generic**: `request<Student[]>('/students')` is typed as returning `Promise<Student[]>`.

`API_URL` comes from `VITE_API_URL`. `resolveApiUrl()` tolerates missing `https://` and missing `/api`, because those are the most common deployment mistakes. Vite replaces `import.meta.env.VITE_API_URL` with the literal value **at build time** (§10).

The rest of the file is the TypeScript `interface`s mirroring the Java entities, plus one-line wrappers:

```ts
export const getAllStudents = () => request<Student[]>('/students');
export const updateStudent = (id: string, updates: Partial<Student>) =>
  request<Student>(`/students/${id}`, json('PUT', updates));
```

`Partial<Student>` means "a Student where every field is optional", which is exactly a partial update.

Two functions translate "expected" errors into values:

- `authenticateUser` → `null` on 401 (wrong password isn't an exception, just a failed login).
- `addAttendance` → `null` on 409 (already marked today).

### 6.4 `contexts/AuthContext.tsx`

Holds `user`, `preferences` and `isLoading`, and exposes `login`, `logout`, `updatePreferences` plus role flags (`isAdmin`, `canTakeAttendance`, ...).

On mount:

```tsx
useEffect(() => {
  setUnauthorizedHandler(logout);           // database.ts will call this on any 401
  (async () => {
    if (getAuthToken()) {
      try { const me = await getCurrentUser(); setUser(me); ... }
      catch { logout(); }
    }
    setIsLoading(false);
  })();
}, [...]);
```

`isLoading` matters: without it, `ProtectedRoute` would see `user === null` for a split second on reload and bounce you to the login page.

`applyTheme` toggles the `dark` class on `<html>`. Tailwind's `dark:` styles and the CSS variables in `index.css` respond to it.

The role flags in the frontend are **for display only** (which links to show). Real enforcement is on the server (§5.7).

### 6.5 `components/auth/ProtectedRoute.tsx`

```tsx
if (isLoading) return <Spinner/>;
if (!user) return <Navigate to="/login" replace />;
if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
if (requireAttendance && !canTakeAttendance) return <Navigate to="/dashboard" replace />;
return <>{children}</>;
```

`AdminRoute` and `AttendanceRoute` are shortcuts that pass these flags.

### 6.6 Layout: `DashboardLayout` + `AppSidebar`

On screens wider than Tailwind's `md` breakpoint (768 px), the sidebar is always visible (`hidden md:flex`). On phones, a header with a ☰ button opens the same `AppSidebar` inside a `Sheet` (slide-in drawer). `onNavigate` closes the drawer after a link is tapped.

`AppSidebar` filters the links by role and highlights the active one by comparing `location.pathname`.

### 6.7 `lib/faceRecognition.ts`

The full theory is in §7. The code:

| Function | Purpose |
|---|---|
| `loadFaceModels()` | Downloads 3 networks once. Caches the *promise*, so two pages calling it at the same time don't download twice. Resets on failure so you can retry. |
| `detectFaces(input, minConfidence)` | All faces → `FaceDetection[]` (box, score, 128-number descriptor) |
| `detectSingleFace(input, minConfidence)` | The most confident face, or `null` |
| `calculateFaceDistance(a, b)` | Euclidean distance |
| `averageDescriptors(list)` | Element-wise mean, returns a **plain array** |
| `findBestMatch(desc, known, threshold)` | Nearest registered student under the threshold |
| `checkFaceQuality(det, frameWidth)` | Rejects low-score or too-small faces at registration |
| `getCameraConstraints(settings)` / `openCamera(settings)` | Uses the chosen camera and resolution; falls back to the default camera if the saved one is gone |

### 6.8 The pages

#### `LoginPage`
A form. On submit: `login()` → success toast + go to the dashboard, or "Invalid email or password". Network errors show the real message (e.g. "Cannot reach the server. It may be starting up", which is common on Render's free tier).

#### `DashboardPage`
Loads students and today's attendance. Shows four counts (total, present, late, absent = total − present − late, never negative) and the five most recent records.

#### `AttendancePage` ★
Walked through in Journey C. Details worth studying:

- **Refs for the loop.** `loop` runs on timers. If it read `students` from state directly, it would see the value from when the loop *started* (a "stale closure"). Writing `studentsRef.current = students` on every render and reading the ref inside the loop always gives fresh data.
- **`setTimeout` chain instead of `setInterval`.** `setInterval` fires every N ms even if the previous scan hasn't finished. On a slow laptop, scans pile up and the same student can be submitted twice. Chaining `setTimeout` after each scan prevents overlap.
- **`markedRef`** is reserved *before* the network call and released if the call fails, so retries still happen.
- **Mirroring.** With *Mirror Camera* on, the video is flipped with CSS (`scale-x-[-1]`). The canvas is **not** flipped, otherwise the name labels would be backwards. Instead, each box's x is computed as `canvas.width - x - width`.
- **`object-contain` on both video and canvas** keeps the overlay aligned. With `object-cover`, the video gets cropped but the canvas doesn't, so boxes drift.
- **Manual marking** appears when *Manual Override* is enabled and lists only students not yet marked today.

#### `RegisterFacePage` ★
Walked through in Journey B. It uses `requiredFaceSamples`, `faceMatchTolerance`, `enableFaceQualityCheck`, the camera settings and mirroring from Settings. The live box loop uses the same "detect, then wait, then detect" pattern.

#### `StudentsPage`
Table with search and class filter, an add/edit dialog, and per-row actions (Register Face / Edit / Delete). The class dropdown uses classes from the **Classes** page when any exist, falling back to "Class 1–12". Search uses `(student.email ?? '')` because older records can have `null` fields, and calling `.toLowerCase()` on `null` crashes the page.

#### `ReportsPage`
Loads all attendance + students, filters by the chosen date, shows counts and a table, and offers two Excel exports.

#### `InstitutesPage`, `ClassesPage`, `UsersPage`
Standard admin CRUD screens: a table, an add/edit `Dialog`, a delete confirmation `AlertDialog`. Errors show the server's message, e.g. "There must be at least one active admin".

#### `SettingsPage`
Every control calls `handleUpdateSettings({ oneField: value })`, a **partial** update. Sliders save on `onValueCommit` (when released), and the late-threshold time input saves on `blur`, not on every keystroke. The danger zone has *Export All Data (JSON)*, *Clear Attendance History* and *Factory Reset*, each behind a confirmation dialog.

### 6.9 `lib/excelExport.ts`

Uses SheetJS: `json_to_sheet(rows)` turns an array of objects into a worksheet (object keys become column headers), `book_append_sheet` adds it to a workbook, and `writeFile` triggers the download. Column widths are computed from the longest value. The daily report has two sheets: *Summary* and *Attendance*.

### 6.10 Styling: Tailwind, shadcn/ui, `cn()`

- Tailwind classes like `flex items-center gap-2 px-4 py-2 rounded-lg` are tiny single-purpose styles. `md:` means "on screens ≥768 px", `dark:` means "in dark mode".
- `src/components/ui/*` are shadcn/ui components: copied source code built on Radix primitives, which handle focus, keyboard navigation and screen readers.
- Colours like `bg-primary` and `text-muted-foreground` refer to CSS variables in `index.css`, redefined for `.dark`. That's how one class works in both themes.
- `cn(...classes)` (in `lib/utils.ts`) = `clsx` (conditional classes) + `tailwind-merge` (later classes override earlier conflicting ones).

---

## 7. Face recognition explained properly

### 7.1 Three neural networks

face-api.js runs three pre-trained networks in sequence:

1. **SSD MobileNet v1 (detector).** Finds rectangles that contain faces, each with a **score** (0–1, how sure it is). `minConfidence` (our *Minimum Detection Confidence* setting, default 0.5) discards weak detections.
2. **68-point landmark model.** Locates eyes, eyebrows, nose, mouth and jaw. Used to **align** the face (rotate/scale it to a standard pose) so the next step sees a consistent image.
3. **Face recognition network** (a ResNet-34-style model). Turns an aligned face into a **descriptor**: 128 numbers.

### 7.2 What is a descriptor?

The recognition network was trained on millions of faces with one goal: **photos of the same person should produce descriptors that are close together, and different people's should be far apart.** Nobody designed what each of the 128 numbers means; the network learned a "face space" by itself.

Think of each descriptor as a point in 128-dimensional space. You can't picture 128 dimensions, but the maths is the same as in 2D or 3D.

### 7.3 Euclidean distance

The distance between two points generalises Pythagoras:

```
2D:   d = √((x₁−x₂)² + (y₁−y₂)²)
128D: d = √( Σᵢ (aᵢ − bᵢ)² )      for i = 1..128
```

```ts
for (let i = 0; i < a.length; i++) { const diff = a[i] - b[i]; sum += diff * diff; }
return Math.sqrt(sum);
```

**Worked mini-example** (pretend descriptors have 3 numbers):

```
Registered Ravi:  [0.10, 0.50, -0.20]
Live face:        [0.12, 0.47, -0.25]
differences:      [-0.02, 0.03, 0.05]
squares:          [0.0004, 0.0009, 0.0025]  → sum 0.0038 → √ = 0.062   ← very close: same person
```

### 7.4 The threshold

For face-api.js descriptors, the same person is typically **< 0.4–0.5** apart, and different people **> 0.6**. `findBestMatch` keeps the nearest student and accepts them only if `distance < recognitionThreshold` (default 0.6).

- **Lower threshold** (e.g. 0.45) = **stricter**: fewer wrong matches, but genuine students are more often "Unknown" (especially in bad light).
- **Higher threshold** (e.g. 0.7) = **looser**: recognises more easily but risks marking the wrong person.

(The old Settings page said "Higher = stricter", which was backwards. It's fixed now.)

The displayed **confidence** is `(1 − distance) × 100`, a friendly rescaling, not a true probability. Distance 0.35 shows as 65%.

### 7.5 Why average several samples?

A single photo includes noise: lighting, a slight head turn, a blink. Averaging 5 descriptors cancels much of that noise and gives a more central "template" for the person. That's also why the registration tips say to capture slightly different angles.

### 7.6 Limitations you should know (and mention in interviews)

- **Spoofing:** a printed photo or a phone screen showing a student's face can be recognised. Real systems add **liveness detection** (blink detection, depth cameras, challenge-response).
- **Bias & lighting:** accuracy varies with lighting, camera quality, and has been shown to vary across demographic groups for many models. Good lighting matters a lot.
- **Twins / look-alikes** can fall under the threshold.
- **Scaling:** comparing with every student is O(students × faces). Fine for hundreds; thousands would want an index (e.g. a vector database).
- **Privacy law:** face descriptors are biometric data. Many places (e.g. GDPR in the EU, India's DPDP Act) require consent and careful handling.

---

## 8. The database

Tables Hibernate creates (PostgreSQL types):

```
app_users            id (PK) | email (UNIQUE) | name | password (bcrypt) | role | status | last_login | created_at
students             id (PK) | name | student_id (UNIQUE) | class_name | section | email | phone | face_descriptor (TEXT) | created_at
student_face_images  student_id (→ students.id) | image_data (TEXT)
attendance_records   id (PK) | student_id | student_name | attendance_date | attendance_time | attendance_status | confidence | marked_by
                     INDEX idx_attendance_date_student (attendance_date, student_id)
settings             id (PK = 'default') | recognition_threshold | face_match_tolerance | required_face_samples | ... | academic_year
user_preferences     id (PK) | user_id (UNIQUE) | theme | compact_layout | enable_animations
institutes           id (PK) | name | address | created_at
classes              id (PK) | name | institute_id | created_at
```

Notes:

- Primary keys are **UUID strings** generated in Java (`UUID.randomUUID()`), not auto-increment numbers. They're safe to generate anywhere and don't reveal how many records exist.
- `student_face_descriptors` (one row per number) may still exist in older databases. It's no longer used and can be dropped manually.
- To look inside your local DB: `psql -U postgres -d smartattend`, then `\dt` (list tables) and `SELECT * FROM students;`.

---

## 9. Security model

| Threat | Mitigation in this project |
|---|---|
| Database leak exposes passwords | BCrypt hashes with salt; plain text never stored |
| API returns passwords | `@JsonProperty(WRITE_ONLY)` |
| Anyone calls the API directly | Every endpoint except login/health needs a valid signed token |
| Teacher calls admin endpoints | `AuthInterceptor.isAllowed` checks the role **on the server** |
| User edits their saved session to become admin | The browser only stores the token; the user comes from `/users/me`, and the token's signature can't be forged without the secret |
| Disabled user keeps using an old token | Interceptor re-checks `status = active` on every request |
| Admin locks everyone out | Can't delete/demote yourself or the last admin |
| Secrets in Git | `backend/.env` ignored; `.env.example` templates committed; Render generates `APP_TOKEN_SECRET` |
| Stack traces leak internals | `GlobalExceptionHandler` + `server.error.include-stacktrace=never` |
| Duplicate attendance from racing scans | `synchronized` check-and-insert + client-side `markedRef` |

**Known gaps (good next steps, see §13):** no login rate limiting (brute force), tokens can't be revoked before expiry except by disabling the user, the token lives in `localStorage` (readable by any script injected via XSS; React's escaping makes XSS unlikely but not impossible), and there is no liveness detection.

> ⚠️ After deploying, **change the admin password** (Users → Edit Administrator), or set `ADMIN_PASSWORD` before the first deploy.

---

## 10. Deployment explained

### 10.1 What `render.yaml` creates

A **Render Blueprint** is infrastructure-as-code: one file describes all services.

- **`smartattend-db`**: managed PostgreSQL. Its host, port, name, user and password are injected into the backend via `fromDatabase`.
- **`smartattend-backend`**: `runtime: docker`. Render builds `backend/Dockerfile` and runs it. `healthCheckPath: /api/health`. Env vars: DB connection, `APP_TOKEN_SECRET` (`generateValue: true` = random, created once), `ADMIN_PASSWORD` (`sync: false` = you're asked for it), `CORS_ALLOWED_ORIGINS`.
- **`smartattend-frontend`**: `runtime: static`. Render runs `npm ci && npm run build` and serves `dist/` from a global CDN. The `rewrite /* → /index.html` route is essential (next section).

### 10.2 Why single-page apps need a rewrite rule

There is only one HTML file. When you open `https://site/students` directly or press reload, the server looks for a file called `students`, finds nothing, and would return 404. The rewrite says "for any path, serve `index.html`". React Router then reads the URL and shows the right page. `vercel.json`, `public/_redirects` (Netlify) and `nginx.conf`'s `try_files ... /index.html` do the same job on other hosts.

### 10.3 Why `VITE_API_URL` is a *build-time* variable

The frontend is just static files in the user's browser. There is no server process that could read an environment variable at runtime. So Vite **replaces** `import.meta.env.VITE_API_URL` with the actual string while building. Consequences:

- Changing it requires a **rebuild** (Render: *Clear build cache & deploy*).
- The value is visible to anyone who views the JavaScript. Never put secrets in `VITE_*` variables.
- In the Docker variant, it must be passed as `--build-arg` (`ARG VITE_API_URL` in the `Dockerfile`).

`.env.development` is only read by `npm run dev`, so a production build can't accidentally point at `localhost`. That was a real bug before: the committed `.env` contained the localhost URL and was copied into the Docker image.

### 10.4 The backend Dockerfile (multi-stage build)

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS builder   # stage 1: big image with Maven + JDK
COPY pom.xml . ; RUN mvn dependency:go-offline  # cached layer: only re-runs if pom.xml changes
COPY src ./src ; RUN mvn -DskipTests clean package

FROM eclipse-temurin:17-jre-alpine              # stage 2: small image, only a JRE
RUN addgroup -S app && adduser -S app -G app    # non-root user
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
USER app
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70.0", "-XX:+UseSerialGC", "-Xss512k", ..., "-Dspring.profiles.active=prod", "-jar", "app.jar"]
```

- **Multi-stage**: the final image doesn't contain Maven or the JDK, so it's smaller and has less attack surface.
- **Layer caching**: copying `pom.xml` before `src` means editing code doesn't re-download every dependency.
- **JVM flags for 512 MB**: heap capped at 70% of container memory, the Serial garbage collector (lowest overhead), and smaller thread stacks.

### 10.5 Free-tier realities

- The backend **sleeps after 15 minutes** without traffic, and the first request then takes ~30–60 s. The frontend shows "Cannot reach the server. It may be starting up". Wait and retry.
- Free PostgreSQL databases are **deleted after 30 days** unless upgraded. Export your data regularly (Settings → Export All Data).
- The camera requires **HTTPS**. Render provides it automatically.

---

## 11. Testing and CI

### Backend tests (`BackendApplicationTests.java`)

`@SpringBootTest` starts the **entire application** (against H2), and `@AutoConfigureMockMvc` provides `MockMvc`, a fake HTTP client that calls controllers without a real network. Each test reads like a scenario:

```java
@Test
void attendanceIsOnlyMarkedOncePerDay() throws Exception {
    mvc.perform(auth(post("/api/attendance"), adminToken)...content(record)).andExpect(status().isOk());
    mvc.perform(auth(post("/api/attendance"), adminToken)...content(record)).andExpect(status().isConflict());
}
```

The 11 tests cover: health is public; API requires a token; forged tokens are rejected; wrong password → 401; passwords are hashed and never returned; viewer can read but not write or see users; settings partial update keeps other fields; the face descriptor round-trips **in order** and list responses omit images; wrong descriptor length → 400; duplicate roll number → 409; one attendance per day; admin can't delete themselves.

Run them: `cd backend && mvn test`.

### Frontend checks

- `npx tsc -p tsconfig.app.json --noEmit`: type-checks everything.
- `npm run lint`: ESLint for common React mistakes.
- `npm run build`: production build.

### GitHub Actions (`.github/workflows/ci.yml`)

On every push or pull request, GitHub starts two fresh Linux machines. One runs `mvn test`, the other runs `npm ci`, type-check, lint and build. A red ✗ on a commit means something broke, before anyone deploys it. (The old workflow deployed a broken copy of the site to GitHub Pages on every push; it was replaced.)

---

## 12. Bugs that were fixed, and what they teach

Studying real bugs is one of the best ways to learn. Each entry: **symptom → cause → fix → lesson.**

**1. Face registration never actually saved.**
*Symptom:* "Registration Successful", but no student ever got a face. *Cause:* the average was built in a `Float32Array`. `JSON.stringify(new Float32Array([1,2]))` gives `{"0":1,"1":2}` (an object, not an array). Jackson couldn't turn that into `List<Float>` and returned 400, and the old `updateStudent` never checked `res.ok`, so the UI showed success. *Fix:* `averageDescriptors()` returns a plain array; `request()` throws on non-2xx. *Lessons:* typed arrays don't serialise like arrays; **always check HTTP status codes**; TypeScript had flagged this exact line as an error, so don't ignore compiler errors.

**2. Descriptor numbers could come back shuffled.**
*Cause:* one row per number in a child table with no order column, and SQL doesn't guarantee row order. *Fix:* `FloatListConverter` stores one ordered string. *Lesson:* if order matters, it must be stored explicitly.

**3. Moving one setting slider switched other settings off.**
*Cause:* `boolean` fields default to `false`, so a body like `{"recognitionThreshold":0.5}` was read as "and also duplicateProtection=false, mirrorCamera=false...". *Fix:* wrapper types (`Boolean`) where `null` means "not sent". *Lesson:* for partial updates, distinguish "absent" from "false/0".

**4. Anyone could do anything via the API.** No authentication on the server; plain-text passwords returned by `GET /api/users` (which was also the public health check). *Fix:* §5.7 and §9. *Lesson:* security must live on the server.

**5. Overlapping scans could double-mark a student.** `setInterval` plus check-then-insert in two separate requests. *Fix:* `setTimeout` chain, `markedRef`, server-side `synchronized` check. *Lesson:* look for race conditions whenever you "check, then act".

**6. Confidence showed as e.g. "8500%".** Confidence was already 0–100 and was multiplied by 100 again. *Lesson:* agree on units, and write them in comments (`// 0-100`).

**7. Production frontend pointed at `localhost`.** The committed `.env` was copied into the Docker build, and the Dockerfile didn't declare `ARG VITE_API_URL`. *Fix:* `.env.development`, `.dockerignore`, `ARG`, a static-site deploy. *Lesson:* understand build time vs. run time configuration.

**8. Factory Reset did nothing but said "complete".** *Fix:* a real `POST /api/admin/reset`. *Lesson:* never show success for something that didn't happen.

**9. `@Lob` on a `TEXT` column (PostgreSQL).** Hibernate treats `@Lob String` as a large-object type on PostgreSQL, which conflicts with a `TEXT` column. *Fix:* remove `@Lob`; `columnDefinition = "TEXT"` already allows long strings.

**10. Smaller ones:** the camera/resolution/mirror/required-samples/quality settings were saved but never used (now wired in); the Settings label said "Higher = stricter" (backwards); a division by zero in the daily report with 0 students; the student search crashed on a `null` email; the sidebar covered the whole screen on phones; boxes misaligned with `object-cover`; the class list was hard-coded; deleting an institute left orphan classes.

---

## 13. How to extend the project (exercises)

Ordered roughly from easy to hard. Each one teaches something specific.

1. **Show the face thumbnails** on a student's detail view. Call `getStudent(id)` (it includes `faceImages`) and render `<img src={...}>`. *Learn:* fetching on demand.
2. **Attendance by date range:** add `GET /api/attendance?from=&to=` using a derived query `findByDateBetween(String from, String to)`. Strings in `yyyy-MM-dd` format compare correctly. *Learn:* Spring Data query derivation, `@RequestParam`.
3. **Mark absentees at end of day:** a button that creates `absent` records for every student without one today. *Learn:* set difference, batch inserts.
4. **Per-student history page** with a chart (`recharts` is already installed). *Learn:* data aggregation, charts.
5. **Login rate limiting:** count failed logins per email/IP in a `ConcurrentHashMap` and reject after 5 attempts in 15 minutes. *Learn:* brute-force protection.
6. **Database UNIQUE constraint** on `(attendance_date, student_id)` instead of `synchronized`, catching `DataIntegrityViolationException` → 409. *Learn:* why constraints beat application locks when you run multiple servers.
7. **Flyway migrations:** replace `ddl-auto=update` with versioned SQL files (`V1__init.sql`, ...). *Learn:* how production schemas evolve safely.
8. **Store several descriptors per student** (all samples, not just the average) and match against the closest one. `findBestMatch` already accepts `descriptors: number[][]`. *Learn:* recognition accuracy trade-offs.
9. **Liveness check:** require a blink (eye-aspect-ratio from the 68 landmarks drops below ~0.2 for a frame or two) before marking. *Learn:* anti-spoofing.
10. **Swap the hand-written token for Spring Security + JWT** (`spring-boot-starter-security`, `jjwt`). Compare the amount of code and configuration. *Learn:* framework security.

---

## 14. Glossary

| Term | Meaning |
|---|---|
| **API** | The set of URLs the backend answers (`/api/...`) |
| **REST** | Style of API: resources (`/students/42`) + HTTP verbs (GET read, POST create, PUT update, DELETE remove) |
| **JSON** | Text format for data: `{"name":"Ravi","age":12}` |
| **HTTP status** | 200 OK, 400 bad input, 401 not logged in, 403 not allowed, 404 not found, 409 conflict, 500 server bug |
| **CORS** | Browser rule controlling which websites may call an API on another origin |
| **Preflight** | The `OPTIONS` request a browser sends first to ask CORS permission |
| **ORM** | Object-Relational Mapping: objects ↔ table rows (Hibernate) |
| **Entity** | A class mapped to a table |
| **Repository** | An object that loads/saves entities |
| **Transaction** | A group of DB operations that all succeed or all fail |
| **Lazy loading** | Loading related data only when it's accessed |
| **Bean / DI** | Spring-managed object / Spring passing dependencies into constructors |
| **Interceptor** | Code that runs before/after controller methods |
| **Hash / Salt** | One-way fingerprint of data / random value mixed in to make identical inputs hash differently |
| **HMAC** | A hash keyed with a secret: proves who created a message and that it wasn't modified |
| **Token / Bearer** | A string proving identity; "Bearer" = "whoever bears (holds) this" |
| **Descriptor / embedding** | Vector of numbers summarising something (here a face) so similar things are close |
| **Euclidean distance** | Straight-line distance between two points |
| **Threshold** | Cut-off value for deciding yes/no |
| **SPA** | Single-Page Application: one HTML page, JavaScript swaps the content |
| **Build time vs run time** | When code is compiled/bundled vs when it's executing for a user |
| **Race condition** | A bug where the result depends on the timing of concurrent operations |
| **Stale closure** | A function still seeing old variable values captured when it was created |
| **CI** | Continuous Integration: automatic tests on every change |
| **Docker image / container** | A packaged app with its runtime / a running instance of it |
| **Cold start** | The delay while a sleeping free-tier server wakes up |

---

## 15. Interview questions you should be able to answer

1. **Why run face recognition in the browser instead of on the server?** Privacy (video never leaves the device), cost (no GPU server, free tier), latency. Trade-off: model download, depends on the client's hardware.
2. **How does recognition decide who someone is?** 128-D descriptor → Euclidean distance to each registered descriptor → nearest one if under the threshold (0.6).
3. **What happens if you lower the threshold?** Stricter: fewer false accepts, more false rejects.
4. **How are passwords stored? Why BCrypt and not SHA-256?** Salted, deliberately slow hash; SHA-256 is fast, which helps attackers brute-force it.
5. **How does authentication work?** Login → HMAC-signed token with user id, role, expiry → sent as `Authorization: Bearer` → interceptor verifies the signature and expiry, loads the user, checks active status and role.
6. **Why check roles on the server if the UI already hides pages?** Anyone can call the API directly; the UI isn't a security boundary.
7. **How do you prevent duplicate attendance?** Client-side set of marked students, sequential scans, server-side synchronized check-then-insert returning 409. Better at scale: a DB unique constraint.
8. **What is CORS and why did you need it?** The frontend and API are on different origins; the browser blocks cross-origin reads unless the server sends `Access-Control-Allow-Origin`.
9. **What's the difference between `ddl-auto=update` and migrations?** Auto-update is convenient but uncontrolled (never drops or renames, can't transform data); migrations are versioned, reviewable and repeatable.
10. **Why does changing `VITE_API_URL` need a rebuild?** Vite inlines env vars into the static JS at build time; there's no server at runtime to read them.
11. **What does `@Transactional` do, and why use `Hibernate.initialize` in `getStudent`?** Wraps the method in a DB transaction; with open-in-view disabled, lazy collections must be loaded before the transaction ends.
12. **What weaknesses does the system have?** Photo spoofing (no liveness), no login rate limiting, tokens in localStorage, the single-instance `synchronized` lock, free-tier DB expiry, biometric privacy obligations.
13. **Walk me through a bug you fixed.** Pick one from §12. The `Float32Array` one is a great story: symptom, root cause, why it was hidden, fix, and prevention.

---

*Happy learning! The best next step is to run the app locally (README → "Run it locally"), put a breakpoint or `console.log` in `scanOnce()` and in `AttendanceController.addAttendance`, and watch Journey C happen live.*
