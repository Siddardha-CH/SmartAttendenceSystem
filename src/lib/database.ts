// API Base URL — override with VITE_API_URL env var in production
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8081/api';

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
  id: string;
  name: string;
  studentId: string;
  className: string; // Updated from 'class' to 'className' to match backend
  section: string;
  email: string;
  phone: string;
  faceDescriptor: number[] | null;
  faceImages: string[];
  createdAt: string | Date;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  status: 'present' | 'late' | 'absent';
  confidence: number;
  markedBy: 'face-recognition' | 'manual';
}

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'teacher' | 'viewer';
  status: 'active' | 'disabled';
  lastLogin: string | Date | null;
  createdAt: string | Date;
}

export interface Settings {
  id: string;
  recognitionThreshold: number;
  faceMatchTolerance: number;
  requiredFaceSamples: number;
  enableFaceQualityCheck: boolean;
  selectedCamera: string;
  cameraResolution: 'low' | 'medium' | 'high';
  mirrorCamera: boolean;
  lateThreshold: string;
  scanInterval: number;
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

// Student operations
export async function getAllStudents(): Promise<Student[]> {
  try {
    const res = await fetch(`${API_URL}/students`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function getStudent(id: string): Promise<Student | undefined> {
  const res = await fetch(`${API_URL}/students/${id}`);
  if (!res.ok) return undefined;
  return res.json();
}

export async function addStudent(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
  const res = await fetch(`${API_URL}/students`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(student)
  });
  return res.json();
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const res = await fetch(`${API_URL}/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteStudent(id: string): Promise<void> {
  await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
}

// Attendance operations
export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch(`${API_URL}/attendance`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch(`${API_URL}/attendance/date/${date}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function addAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
  const res = await fetch(`${API_URL}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record)
  });
  return res.json();
}

export async function checkDuplicateAttendance(studentId: string, date: string): Promise<boolean> {
  const res = await fetch(`${API_URL}/attendance/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, date })
  });
  const data = await res.json();
  return data.exists;
}

export async function clearAttendanceHistory(): Promise<void> {
  await fetch(`${API_URL}/attendance/clear-history`, { method: 'DELETE' });
}

// User operations
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const res = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (res.ok) {
    return res.json();
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const res = await fetch(`${API_URL}/users`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function getUser(id: string): Promise<User | undefined> {
  const res = await fetch(`${API_URL}/users/${id}`);
  if (!res.ok) return undefined;
  return res.json();
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const res = await fetch(`${API_URL}/users/email/${email}`);
  if (!res.ok) return undefined;
  return res.json();
}

export async function addUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user)
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to add user');
  }
  return res.json();
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  const res = await fetch(`${API_URL}/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Failed to update user');
  }
  return res.json();
}

export async function deleteUser(id: string): Promise<void> {
  await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
}

// Institute operations
export async function getInstitutes(): Promise<Institute[]> {
  try {
    const res = await fetch(`${API_URL}/institutes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function addInstitute(institute: Omit<Institute, 'id' | 'createdAt'>): Promise<Institute> {
  const res = await fetch(`${API_URL}/institutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(institute)
  });
  return res.json();
}

export async function updateInstitute(id: string, updates: Partial<Institute>): Promise<Institute> {
  const res = await fetch(`${API_URL}/institutes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteInstitute(id: string): Promise<void> {
  await fetch(`${API_URL}/institutes/${id}`, { method: 'DELETE' });
}

// Class operations
export async function getClasses(): Promise<ClassEntity[]> {
  try {
    const res = await fetch(`${API_URL}/classes`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function addClass(classEntity: Omit<ClassEntity, 'id' | 'createdAt'>): Promise<ClassEntity> {
  const res = await fetch(`${API_URL}/classes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classEntity)
  });
  return res.json();
}

export async function updateClass(id: string, updates: Partial<ClassEntity>): Promise<ClassEntity> {
  const res = await fetch(`${API_URL}/classes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteClass(id: string): Promise<void> {
  await fetch(`${API_URL}/classes/${id}`, { method: 'DELETE' });
}

// Settings operations
export async function getSettings(): Promise<Settings> {
  const res = await fetch(`${API_URL}/settings`);
  return res.json();
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const res = await fetch(`${API_URL}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

// User Preferences operations
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const res = await fetch(`${API_URL}/preferences/${userId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const res = await fetch(`${API_URL}/preferences/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs)
  });
  return res.json();
}

// Export all data
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

// Factory reset (Not very applicable for a real backend but kept for compatibility)
export async function factoryReset(): Promise<void> {
  console.warn("Factory reset is not implemented for the live server backend.");
}
