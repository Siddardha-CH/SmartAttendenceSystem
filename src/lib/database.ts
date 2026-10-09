/**
 * API client for the Spring Boot backend.
 *
 * Every function here makes one HTTP call. They all go through `request()`, which:
 *   - prefixes the backend URL,
 *   - attaches the login token ("Authorization: Bearer ...") saved at login,
 *   - throws an ApiError with the server's message when the response is not 2xx,
 *   - logs the user out automatically if the server says the token is no longer valid (401).
 */

// Backend URL. Set VITE_API_URL at build time, e.g. https://smartattend-backend.onrender.com
// ("/api" is added automatically if you leave it off).
function resolveApiUrl(): string {
  const raw = ((import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8081/api').trim().replace(/\/+$/, '');
  const withProtocol = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withProtocol.endsWith('/api') ? withProtocol : `${withProtocol}/api`;
}
export const API_URL = resolveApiUrl();

const TOKEN_KEY = 'authToken';

export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage unavailable (private mode) - the session just won't survive a reload */ }
}

/** Called when the server rejects our token; AuthContext registers a handler that logs out. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. It may be starting up - please try again in a minute.');
  }

  const text = await res.text();
  let body: unknown = undefined;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/users/login') onUnauthorized?.();
    const serverMessage = body && typeof body === 'object' && 'error' in body ? (body as { error: unknown }).error : null;
    const message = typeof serverMessage === 'string' ? serverMessage : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, body);
  }
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

// ── Types (mirror the Java entities in backend/src/main/java/.../model) ─────

export interface Institute {
  id: string;
  name: string;
  address: string;
  createdAt: string | Date;
}

export interface ClassEntity {
  id: string;
  name: string;
  instituteId: string;
  createdAt: string | Date;
}

export interface Student {
  id: string;            // internal UUID
  name: string;
  studentId: string;     // the school's roll number, e.g. STU001
  className: string;
  section: string;
  email: string;
  phone: string;
  faceDescriptor: number[] | null;  // 128 numbers, or null if no face registered
  /** Only included when fetching a single student; the list endpoint leaves the images out. */
  faceImages?: string[] | null;
  /** Number of registration photos stored for this student. */
  faceImageCount?: number;
  createdAt: string | Date;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;     // roll number (Student.studentId), not the UUID
  studentName: string;
  date: string;          // yyyy-MM-dd
  time: string;          // HH:mm:ss
  status: 'present' | 'late' | 'absent';
  confidence: number;    // 0-100
  markedBy: 'face-recognition' | 'manual';
}

export interface User {
  id: string;
  email: string;
  name: string;
  /** Only ever sent TO the server (create / change password). The server never returns it. */
  password?: string;
  role: 'admin' | 'teacher' | 'viewer';
  status: 'active' | 'disabled';
  lastLogin: string | Date | null;
  createdAt: string | Date;
}

export interface Settings {
  id: string;
  recognitionThreshold: number;   // max face distance counted as a match (lower = stricter)
  faceMatchTolerance: number;     // min detector confidence for a face to be used
  requiredFaceSamples: number;
  enableFaceQualityCheck: boolean;
  selectedCamera: string;
  cameraResolution: 'low' | 'medium' | 'high';
  mirrorCamera: boolean;
  lateThreshold: string;          // HH:mm
  scanInterval: number;           // ms
  duplicateProtection: boolean;
  allowManualOverride: boolean;
  theme: 'light' | 'dark' | 'system';
  compactLayout: boolean;
  enableAnimations: boolean;
  academicYear: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  compactLayout: boolean;
  enableAnimations: boolean;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  user: User;
}

/** Returns the token + user on success, or null if the email/password is wrong. */
export async function authenticateUser(email: string, password: string): Promise<LoginResponse | null> {
  try {
    return await request<LoginResponse>('/users/login', json('POST', { email, password }));
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export const getCurrentUser = () => request<User>('/users/me');

// ── Students ────────────────────────────────────────────────────────────────

export const getAllStudents = () => request<Student[]>('/students');
export const getStudent = (id: string) => request<Student>(`/students/${id}`);
export const addStudent = (student: Omit<Student, 'id' | 'createdAt'>) => request<Student>('/students', json('POST', student));
export const updateStudent = (id: string, updates: Partial<Student>) => request<Student>(`/students/${id}`, json('PUT', updates));
export const deleteStudent = (id: string) => request<void>(`/students/${id}`, { method: 'DELETE' });

// ── Attendance ──────────────────────────────────────────────────────────────

export const getAllAttendance = () => request<AttendanceRecord[]>('/attendance');
export const getAttendanceByDate = (date: string) => request<AttendanceRecord[]>(`/attendance/date/${date}`);

/**
 * Saves an attendance record. Returns null (instead of throwing) when the server answers
 * 409 Conflict, which means "this student is already marked for that day".
 */
export async function addAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord | null> {
  try {
    return await request<AttendanceRecord>('/attendance', json('POST', record));
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return null;
    throw e;
  }
}

export async function checkDuplicateAttendance(studentId: string, date: string): Promise<boolean> {
  const data = await request<{ exists: boolean }>('/attendance/check-duplicate', json('POST', { studentId, date }));
  return data.exists;
}

export const clearAttendanceHistory = () => request<void>('/attendance/clear-history', { method: 'DELETE' });

// ── Users (admin only) ──────────────────────────────────────────────────────

export const getAllUsers = () => request<User[]>('/users');
export const getUser = (id: string) => request<User>(`/users/${id}`);
export const addUser = (user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => request<User>('/users', json('POST', user));
export const updateUser = (id: string, updates: Partial<User>) => request<User>(`/users/${id}`, json('PUT', updates));
export const deleteUser = (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' });

// ── Institutes & classes ────────────────────────────────────────────────────

export const getInstitutes = () => request<Institute[]>('/institutes');
export const addInstitute = (institute: Omit<Institute, 'id' | 'createdAt'>) => request<Institute>('/institutes', json('POST', institute));
export const updateInstitute = (id: string, updates: Partial<Institute>) => request<Institute>(`/institutes/${id}`, json('PUT', updates));
export const deleteInstitute = (id: string) => request<void>(`/institutes/${id}`, { method: 'DELETE' });

export const getClasses = () => request<ClassEntity[]>('/classes');
export const addClass = (classEntity: Omit<ClassEntity, 'id' | 'createdAt'>) => request<ClassEntity>('/classes', json('POST', classEntity));
export const updateClass = (id: string, updates: Partial<ClassEntity>) => request<ClassEntity>(`/classes/${id}`, json('PUT', updates));
export const deleteClass = (id: string) => request<void>(`/classes/${id}`, { method: 'DELETE' });

// ── Settings & preferences ──────────────────────────────────────────────────

export const getSettings = () => request<Settings>('/settings');
/** Partial update - only the fields you pass are changed. */
export const updateSettings = (updates: Partial<Settings>) => request<Settings>('/settings', json('PUT', updates));

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    return await request<UserPreferences>(`/preferences/${userId}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null; // user has never saved preferences
    throw e;
  }
}

export const saveUserPreferences = (userId: string, prefs: Partial<UserPreferences>) =>
  request<UserPreferences>(`/preferences/${userId}`, json('PUT', prefs));

// ── Admin tools ─────────────────────────────────────────────────────────────

export async function exportAllData(): Promise<{
  students: Student[];
  attendance: AttendanceRecord[];
  users: User[];
  settings: Settings;
}> {
  const [students, attendance, users, settings] = await Promise.all([
    getAllStudents(),
    getAllAttendance(),
    getAllUsers(),
    getSettings(),
  ]);
  return { students, attendance, users, settings };
}

/** Deletes all attendance, students, classes, institutes and preferences; resets settings. Keeps user accounts. */
export const factoryReset = () => request<void>('/admin/reset', { method: 'POST' });
