import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Student {
  id: string;
  name: string;
  studentId: string;
  class: string;
  section: string;
  email: string;
  phone: string;
  faceDescriptor: Float32Array | null;
  faceImages: string[];
  createdAt: Date;
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
  lastLogin: Date | null;
  createdAt: Date;
}

export interface Settings {
  id: string;
  // Face Recognition
  recognitionThreshold: number;
  faceMatchTolerance: number;
  requiredFaceSamples: number;
  enableFaceQualityCheck: boolean;
  // Camera
  selectedCamera: string;
  cameraResolution: 'low' | 'medium' | 'high';
  mirrorCamera: boolean;
  // Attendance Rules
  lateThreshold: string;
  scanInterval: number;
  duplicateProtection: boolean;
  allowManualOverride: boolean;
  // UI
  theme: 'light' | 'dark' | 'system';
  compactLayout: boolean;
  enableAnimations: boolean;
  // System
  academicYear: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  compactLayout: boolean;
  enableAnimations: boolean;
}

interface AttendanceDB extends DBSchema {
  students: {
    key: string;
    value: Student;
    indexes: { 'by-studentId': string };
  };
  attendance: {
    key: string;
    value: AttendanceRecord;
    indexes: { 
      'by-studentId': string;
      'by-date': string;
      'by-date-studentId': [string, string];
    };
  };
  users: {
    key: string;
    value: User;
    indexes: { 'by-email': string };
  };
  settings: {
    key: string;
    value: Settings;
  };
  userPreferences: {
    key: string;
    value: UserPreferences;
    indexes: { 'by-userId': string };
  };
}

let dbInstance: IDBPDatabase<AttendanceDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<AttendanceDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AttendanceDB>('smart-attendance-db', 2, {
    upgrade(db, oldVersion) {
      // Students store
      if (!db.objectStoreNames.contains('students')) {
        const studentStore = db.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('by-studentId', 'studentId', { unique: true });
      }

      // Attendance store
      if (!db.objectStoreNames.contains('attendance')) {
        const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
        attendanceStore.createIndex('by-studentId', 'studentId');
        attendanceStore.createIndex('by-date', 'date');
        attendanceStore.createIndex('by-date-studentId', ['date', 'studentId'], { unique: true });
      }

      // Users store
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-email', 'email', { unique: true });
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }

      // User Preferences store (new in v2)
      if (!db.objectStoreNames.contains('userPreferences')) {
        const prefStore = db.createObjectStore('userPreferences', { keyPath: 'id' });
        prefStore.createIndex('by-userId', 'userId', { unique: true });
      }
    },
  });

  // Initialize default admin if no users exist
  const users = await dbInstance.getAll('users');
  if (users.length === 0) {
    await dbInstance.add('users', {
      id: crypto.randomUUID(),
      email: 'admin@school.edu',
      name: 'Administrator',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      lastLogin: null,
      createdAt: new Date(),
    });
  }

  // Initialize default settings
  const settings = await dbInstance.get('settings', 'default');
  if (!settings) {
    await dbInstance.add('settings', {
      id: 'default',
      recognitionThreshold: 0.6,
      faceMatchTolerance: 0.5,
      requiredFaceSamples: 5,
      enableFaceQualityCheck: true,
      selectedCamera: '',
      cameraResolution: 'high',
      mirrorCamera: false,
      lateThreshold: '09:00',
      scanInterval: 3000,
      duplicateProtection: true,
      allowManualOverride: true,
      theme: 'light',
      compactLayout: false,
      enableAnimations: true,
      academicYear: '2024-2025',
    });
  }

  return dbInstance;
}

// Student operations
export async function getAllStudents(): Promise<Student[]> {
  const db = await getDB();
  return db.getAll('students');
}

export async function getStudent(id: string): Promise<Student | undefined> {
  const db = await getDB();
  return db.get('students', id);
}

export async function addStudent(student: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
  const db = await getDB();
  const newStudent: Student = {
    ...student,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };
  await db.add('students', newStudent);
  return newStudent;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const db = await getDB();
  const student = await db.get('students', id);
  if (!student) throw new Error('Student not found');
  const updated = { ...student, ...updates };
  await db.put('students', updated);
  return updated;
}

export async function deleteStudent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('students', id);
}

// Attendance operations
export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAll('attendance');
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('attendance', 'by-date', date);
}

export async function addAttendance(record: Omit<AttendanceRecord, 'id'>): Promise<AttendanceRecord> {
  const db = await getDB();
  const newRecord: AttendanceRecord = {
    ...record,
    id: crypto.randomUUID(),
  };
  await db.add('attendance', newRecord);
  return newRecord;
}

export async function checkDuplicateAttendance(studentId: string, date: string): Promise<boolean> {
  const db = await getDB();
  const existing = await db.getFromIndex('attendance', 'by-date-studentId', [date, studentId]);
  return !!existing;
}

export async function clearAttendanceHistory(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('attendance', 'readwrite');
  await tx.objectStore('attendance').clear();
  await tx.done;
}

// User operations
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const db = await getDB();
  const user = await db.getFromIndex('users', 'by-email', email);
  if (user && user.password === password && user.status === 'active') {
    // Update last login
    const updated = { ...user, lastLogin: new Date() };
    await db.put('users', updated);
    return updated;
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDB();
  return db.getAll('users');
}

export async function getUser(id: string): Promise<User | undefined> {
  const db = await getDB();
  return db.get('users', id);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDB();
  return db.getFromIndex('users', 'by-email', email);
}

export async function addUser(user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): Promise<User> {
  const db = await getDB();
  
  // Check for duplicate email
  const existing = await db.getFromIndex('users', 'by-email', user.email);
  if (existing) {
    throw new Error('A user with this email already exists');
  }
  
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    lastLogin: null,
    createdAt: new Date(),
  };
  await db.add('users', newUser);
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  const db = await getDB();
  const user = await db.get('users', id);
  if (!user) throw new Error('User not found');
  
  // Check email uniqueness if changing email
  if (updates.email && updates.email !== user.email) {
    const existing = await db.getFromIndex('users', 'by-email', updates.email);
    if (existing) {
      throw new Error('A user with this email already exists');
    }
  }
  
  const updated = { ...user, ...updates };
  await db.put('users', updated);
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('users', id);
}

// Settings operations
export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const settings = await db.get('settings', 'default');
  return settings!;
}

export async function updateSettings(updates: Partial<Settings>): Promise<Settings> {
  const db = await getDB();
  const settings = await db.get('settings', 'default');
  const updated = { ...settings!, ...updates };
  await db.put('settings', updated);
  return updated;
}

// User Preferences operations
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const db = await getDB();
  const pref = await db.getFromIndex('userPreferences', 'by-userId', userId);
  return pref || null;
}

export async function saveUserPreferences(userId: string, prefs: Partial<UserPreferences>): Promise<UserPreferences> {
  const db = await getDB();
  const existing = await db.getFromIndex('userPreferences', 'by-userId', userId);
  
  if (existing) {
    const updated = { ...existing, ...prefs };
    await db.put('userPreferences', updated);
    return updated;
  }
  
  const newPref: UserPreferences = {
    id: crypto.randomUUID(),
    userId,
    theme: prefs.theme || 'system',
    compactLayout: prefs.compactLayout || false,
    enableAnimations: prefs.enableAnimations ?? true,
  };
  await db.add('userPreferences', newPref);
  return newPref;
}

// Export all data
export async function exportAllData(): Promise<{
  students: Student[];
  attendance: AttendanceRecord[];
  users: User[];
  settings: Settings;
}> {
  const db = await getDB();
  return {
    students: await db.getAll('students'),
    attendance: await db.getAll('attendance'),
    users: await db.getAll('users'),
    settings: (await db.get('settings', 'default'))!,
  };
}

// Factory reset
export async function factoryReset(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
  await indexedDB.deleteDatabase('smart-attendance-db');
}
