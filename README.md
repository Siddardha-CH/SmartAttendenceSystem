# Smart Attendance System

This project is a complete Smart Attendance System that uses real-time Face Recognition. The architecture features a full client-server model using a Java Spring Boot backend and a React (Vite) frontend.

## 🏗️ Architecture: How It Works

### Frontend (User Interface & ML)
Built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**. 
The frontend handles both the UI and the heavy lifting for machine learning:
*   **Machine Learning (`face-api.js`)**: Instead of sending heavy video streams to the server, the frontend accesses the user's webcam and runs lightweight neural networks directly in the browser.
*   **Face Registration**: When adding a student's face, the ML model extracts unique facial "descriptors" (a mathematical array representing the face) and sends just these numbers to the backend.
*   **Attendance Scanning**: During attendance, the live camera feed is continuously analyzed. When a face is detected, its descriptor is compared against the database of known student descriptors. If a match exceeds the confidence threshold, an API call is made to mark them as `present` or `late`.
*   **State Management**: It uses React Context (`AuthContext`) to manage user sessions and RBAC (Role-Based Access Control).

### Backend (API & Data)
Built with **Java 17** and **Spring Boot 3.2**.
The backend acts as the secure source of truth:
*   **REST API**: It exposes endpoints to manage Users, Students, Classes, Institutes, and Attendance Records.
*   **Local Database (H2)**: By default, it uses a lightweight file-based SQL database (`H2`) located in `backend/data/attendance`. This requires zero setup for local development.
*   **Production Database (PostgreSQL)**: Fully configured to switch to robust PostgreSQL simply by setting environment variables (`DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`) and activating the `prod` profile.
*   **CORS**: It accepts secure cross-origin requests from the React frontend, allowing the two completely separate apps to communicate.

---

## 🚀 1. How to Run Locally

You must run BOTH the backend and the frontend in separate terminals.

### Step A: Run the Backend
1. Open a new terminal.
2. Navigate to the backend folder:
   ```bash
   cd backend
   ```
3. Run the Spring Boot application using the Maven wrapper:
   - On **Windows**: `.\mvnw spring-boot:run`
   - On **macOS/Linux**: `./mvnw spring-boot:run`
4. **Verification**: The backend will start on `http://localhost:8081`. 
   _Note: On its very first run, it automatically seeds an Admin user (`admin@school.edu` / `admin123`) and default system settings._

### Step B: Run the Frontend
1. Open a separate, second terminal.
2. Navigate to the root directory of the project.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. **Verification**: Open your web browser and go to `http://localhost:8080` (or the port Vite outputs).

---

## ☁️ 2. How to Deploy (Render)

The project includes a `render.yaml` Blueprint file, which allows you to deploy the entire stack to [Render.com](https://render.com) for free.

1. **Push to GitHub**: Make sure your code is pushed to a GitHub repository.
2. **Create Database**: Go to Render, create a New **PostgreSQL** database (Free tier). Copy its "Internal Database URL".
3. **Deploy via Blueprint**: Go to Render, create New **Blueprint**, and connect your GitHub repo. It will automatically detect the `render.yaml` file and create two Web Services:
   * `smartattend-frontend`
   * `smartattend-backend`
4. **Set Environment Variables**:
   * For backend, go to its Environment tab and set `DATABASE_URL` (the internal URL from step 2), `DB_USERNAME`, and `DB_PASSWORD`.
   * For frontend, go to its Environment tab and set `VITE_API_URL` to your backend's public Render URL (e.g., `https://smartattend-backend.onrender.com/api`).

---

## 🔐 System Access, Roles & User Management

The system uses strict Role-Based Access Control (RBAC). 

### Default Login
*   **Email**: `admin@school.edu`
*   **Password**: `admin123`

### Role Permissions
*   **Admin Mode (Full Access)**
    *   Manage **Institutes** & **Classes**.
    *   Manage **Users**: Add new system users (Teachers, Viewers, or other Admins), change passwords, disable accounts.
    *   Manage **System Settings**: Adjust face recognition tolerances (e.g., how strict the matching is), late thresholds, and UI themes.
*   **Teacher Mode (Daily Operations)**
    *   Manage **Students**: Add their details and associate them with existing Classes.
    *   **Register Faces**: Use a webcam to scan and save a student's facial map.
    *   **Take Attendance**: Turn on the live camera to instantly detect faces and mark attendance.
    *   *(Teachers cannot edit the system settings, users, or institutes).*
*   **Viewer Mode (Read-Only)**
    *   Can view the **Dashboard** analytics and download **Reports** (Excel exports).

---

## 📡 Backend API Endpoints

The backend is available at `http://localhost:8081/api` locally.

### Key Endpoints
- `POST /api/users/login` - Authenticate a user
- `GET /api/users` - Get all staff users
- `POST /api/students` - Add a new student (including face descriptors)
- `GET /api/attendance/date/{date}` - Get attendance for a specific day `YYYY-MM-DD`
- `POST /api/attendance` - Record a new attendance entry

### Direct Database Access (H2 Console)
You can directly inspect or query the local development database tables:
1. Ensure the backend is running.
2. Go to: **`http://localhost:8081/h2-console`**
3. Use these credentials:
   - **JDBC URL**: `jdbc:h2:file:./data/attendance`
   - **User Name**: `sa`
   - **Password**: *(leave blank)*
4. Click **Connect** to view tables like `APP_USERS`, `STUDENTS`, and `ATTENDANCE_RECORDS`.
