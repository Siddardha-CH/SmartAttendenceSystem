import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { loadFaceModels, areModelsLoaded, detectFaces, findBestMatch, openCamera, FaceDetection } from '@/lib/faceRecognition';
import { getAllStudents, addAttendance, getAttendanceByDate, getSettings, Student, AttendanceRecord, Settings } from '@/lib/database';
import { format } from 'date-fns';
import { Camera, StopCircle, Play, Loader2, UserCheck, AlertCircle } from 'lucide-react';

interface RecognizedFace {
  detection: FaceDetection;
  studentId?: string;
  studentName?: string;
  confidence?: number;
  isRecognized: boolean;
}

const DEFAULT_SETTINGS: Pick<Settings, 'recognitionThreshold' | 'faceMatchTolerance' | 'scanInterval' | 'lateThreshold' | 'mirrorCamera' | 'allowManualOverride'> = {
  recognitionThreshold: 0.6,
  faceMatchTolerance: 0.5,
  scanInterval: 3000,
  lateThreshold: '09:00',
  mirrorCamera: false,
  allowManualOverride: true,
};

const today = () => format(new Date(), 'yyyy-MM-dd');

/** "HH:mm:ss" after the "HH:mm" threshold => late. Compares only hours and minutes. */
const isLateAt = (time: string, threshold: string) => time.slice(0, 5) > threshold.slice(0, 5);

export default function AttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(areModelsLoaded());
  const [modelsLoading, setModelsLoading] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<Partial<Settings>>(DEFAULT_SETTINGS);
  const [manualStudentId, setManualStudentId] = useState('');
  const { toast } = useToast();

  // The scan loop runs on a timer, so it reads the latest data through refs instead of
  // capturing (possibly stale) state when the loop was started.
  const studentsRef = useRef<Student[]>([]);
  const settingsRef = useRef<Partial<Settings>>(DEFAULT_SETTINGS);
  const markedRef = useRef<Set<string>>(new Set()); // roll numbers already marked today
  const loopRef = useRef<number | null>(null);
  const scanningRef = useRef(false);                 // true while the loop should keep going
  studentsRef.current = students;
  settingsRef.current = settings;

  useEffect(() => {
    async function loadData() {
      try {
        const [studentsData, settingsData, attendance] = await Promise.all([
          getAllStudents(),
          getSettings(),
          getAttendanceByDate(today()),
        ]);
        setStudents(studentsData);
        setSettings({ ...DEFAULT_SETTINGS, ...settingsData });
        setTodayAttendance(attendance);
        markedRef.current = new Set(attendance.map(a => a.studentId));
      } catch (error) {
        toast({ title: 'Could not load data', description: (error as Error).message, variant: 'destructive' });
      }
    }
    loadData();
  }, [toast]);

  const handleLoadModels = async () => {
    setModelsLoading(true);
    try {
      await loadFaceModels();
      setModelsLoaded(true);
      toast({ title: 'Models Loaded', description: 'Face recognition models are ready.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to load face recognition models. Check your internet connection.', variant: 'destructive' });
    } finally {
      setModelsLoading(false);
    }
  };

  const clearOverlay = () => {
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const stopRecognition = useCallback(() => {
    scanningRef.current = false;
    if (loopRef.current) {
      clearTimeout(loopRef.current);
      loopRef.current = null;
    }
    setIsRecognizing(false);
    setRecognizedFaces([]);
    clearOverlay();
  }, []);

  const stopCamera = useCallback(() => {
    stopRecognition();
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  }, [stopRecognition]);

  // Release the camera when leaving the page.
  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await openCamera(settings);
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsStreaming(true);
    } catch {
      toast({ title: 'Camera Error', description: 'Could not access the camera. Check browser permissions (HTTPS is required).', variant: 'destructive' });
    }
  };

  const drawDetections = (faces: RecognizedFace[]) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const face of faces) {
      const { y, width, height } = face.detection.box;
      // When the video is shown mirrored, mirror the box position too (but keep the text readable).
      const x = settingsRef.current.mirrorCamera ? canvas.width - face.detection.box.x - width : face.detection.box.x;
      const color = face.isRecognized ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      const label = face.isRecognized ? `${face.studentName} (${face.confidence}%)` : 'Unknown';
      ctx.font = 'bold 14px sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = color;
      ctx.fillRect(x, Math.max(0, y - 22), textWidth + 10, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 5, Math.max(15, y - 7));
    }
  };

  const markAttendance = async (student: Student, confidence: number, markedBy: AttendanceRecord['markedBy']) => {
    const time = format(new Date(), 'HH:mm:ss');
    const late = isLateAt(time, settingsRef.current.lateThreshold ?? '09:00');
    markedRef.current.add(student.studentId); // reserve immediately so the next scan doesn't try again
    try {
      const record = await addAttendance({
        studentId: student.studentId,
        studentName: student.name,
        date: today(),
        time,
        status: late ? 'late' : 'present',
        confidence,
        markedBy,
      });
      if (record) {
        setTodayAttendance(prev => [...prev, record]);
        toast({ title: 'Attendance Marked', description: `${student.name} marked ${late ? 'late' : 'present'}` });
      } else if (markedBy === 'manual') {
        toast({ title: 'Already marked', description: `${student.name} is already marked for today.` });
      }
    } catch (error) {
      markedRef.current.delete(student.studentId); // allow a retry on the next scan
      toast({ title: 'Could not save attendance', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const scanOnce = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return; // no frame yet
    const s = settingsRef.current;

    const detections = await detectFaces(video, s.faceMatchTolerance ?? 0.5);
    const knownFaces = studentsRef.current
      .filter(st => st.faceDescriptor && st.faceDescriptor.length > 0)
      .map(st => ({ id: st.id, name: st.name, descriptors: [st.faceDescriptor as number[]] }));

    const recognized: RecognizedFace[] = detections.map(detection => {
      const match = findBestMatch(detection.descriptor, knownFaces, s.recognitionThreshold ?? 0.6);
      return match
        ? { detection, studentId: match.studentId, studentName: match.studentName, confidence: match.confidence, isRecognized: true }
        : { detection, isRecognized: false };
    });

    if (!scanningRef.current) return; // stopped while we were detecting
    setRecognizedFaces(recognized);
    drawDetections(recognized);

    for (const face of recognized) {
      if (!face.isRecognized || !face.studentId) continue;
      const student = studentsRef.current.find(st => st.id === face.studentId);
      if (!student || markedRef.current.has(student.studentId)) continue;
      await markAttendance(student, face.confidence ?? 0, 'face-recognition');
    }
  };

  // Scan, wait `scanInterval`, scan again... Using setTimeout after each scan finishes (instead of
  // setInterval) guarantees two scans never run at the same time on slow devices.
  const loop = async () => {
    if (!scanningRef.current) return;
    try {
      await scanOnce();
    } catch (error) {
      console.error('Recognition error:', error);
    }
    if (scanningRef.current) {
      loopRef.current = window.setTimeout(loop, settingsRef.current.scanInterval ?? 3000);
    }
  };

  const startRecognition = () => {
    if (!modelsLoaded) {
      toast({ title: 'Models Not Loaded', description: 'Please load face recognition models first.', variant: 'destructive' });
      return;
    }
    if (!students.some(s => s.faceDescriptor?.length)) {
      toast({ title: 'No registered faces', description: 'Register at least one student face first.', variant: 'destructive' });
      return;
    }
    scanningRef.current = true;
    setIsRecognizing(true);
    loop();
  };

  const handleManualMark = async () => {
    const student = students.find(s => s.id === manualStudentId);
    if (!student) return;
    await markAttendance(student, 0, 'manual');
    setManualStudentId('');
  };

  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;
  const markedIds = new Set(todayAttendance.map(a => a.studentId));
  const unmarkedStudents = students.filter(s => !markedIds.has(s.studentId));
  const mirrorClass = settings.mirrorCamera ? 'scale-x-[-1]' : '';

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground mt-1">
            Automated face recognition attendance system
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="font-medium">{presentCount} Present</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="font-medium">{lateCount} Late</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Camera Area */}
        <Card className="lg:col-span-2 overflow-hidden border-2">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/50 py-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <h3 className="font-medium">Live Feed</h3>
            </div>
            {isRecognizing && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </CardHeader>
          <div className="relative aspect-video bg-black">
            {!isStreaming && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
                <Camera className="h-12 w-12 mb-2 opacity-50" />
                <p>Camera is turned off</p>
              </div>
            )}
            {/* object-contain on BOTH video and canvas keeps the boxes aligned with the picture */}
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${mirrorClass}`} />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-contain pointer-events-none" />

            {/* Camera Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex flex-wrap items-center justify-center gap-4">
              {!modelsLoaded && !isStreaming && (
                <Button onClick={handleLoadModels} disabled={modelsLoading} variant="secondary" size="sm">
                  {modelsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {modelsLoading ? 'Loading...' : 'Load Models'}
                </Button>
              )}

              {!isStreaming && (
                <Button onClick={startCamera} disabled={!modelsLoaded} variant="default" size="sm">
                  <Camera className="mr-2 h-4 w-4" /> Start Camera
                </Button>
              )}

              {isStreaming && (
                <Button onClick={stopCamera} variant="destructive" size="sm">
                  <StopCircle className="mr-2 h-4 w-4" /> Stop Camera
                </Button>
              )}

              {isStreaming && !isRecognizing && (
                <Button onClick={startRecognition} className="bg-green-600 hover:bg-green-700" size="sm">
                  <Play className="mr-2 h-4 w-4" /> Start Auto-Attendance
                </Button>
              )}

              {isRecognizing && (
                <Button onClick={stopRecognition} variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20" size="sm">
                  Pause Scan
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Sidebar: Detected, manual, today's log */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Real-time Detections</CardTitle>
            </CardHeader>
            <CardContent className="py-2 min-h-[100px] max-h-[200px] overflow-y-auto">
              {recognizedFaces.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No faces in view</p>
              ) : (
                <div className="space-y-2">
                  {recognizedFaces.map((face, i) => (
                    <div key={i} className={`flex items-center justify-between p-2 rounded text-sm ${face.isRecognized ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
                      <span>{face.isRecognized ? face.studentName : 'Unknown Person'}</span>
                      <span className="text-xs opacity-70">{face.isRecognized ? `${face.confidence}%` : '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {settings.allowManualOverride && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Mark Manually</CardTitle>
              </CardHeader>
              <CardContent className="py-2 flex gap-2">
                <Select value={manualStudentId} onValueChange={setManualStudentId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={unmarkedStudents.length ? 'Select student' : 'Everyone is marked'} /></SelectTrigger>
                  <SelectContent>
                    {unmarkedStudents.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.studentId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleManualMark} disabled={!manualStudentId}>Mark</Button>
              </CardContent>
            </Card>
          )}

          <Card className="flex-1">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Today's Log</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {todayAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No attendance marked yet</p>
                ) : (
                  todayAttendance.slice().reverse().map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-2 border rounded-lg bg-card text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {record.studentName?.charAt(0) ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{record.studentName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {record.time}{record.markedBy === 'manual' ? ' · manual' : ''}
                          </p>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {record.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
