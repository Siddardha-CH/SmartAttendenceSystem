import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadFaceModels, detectFaces, findBestMatch, FaceDetection } from '@/lib/faceRecognition';
import { getAllStudents, addAttendance, checkDuplicateAttendance, getAttendanceByDate, Student, AttendanceRecord, getSettings } from '@/lib/database';
import { format } from 'date-fns';
import { Camera, StopCircle, Play, Loader2, UserCheck, AlertCircle } from 'lucide-react';

interface RecognizedFace {
  detection: FaceDetection;
  studentId?: string;
  studentName?: string;
  confidence?: number;
  isRecognized: boolean;
}

export default function AttendancePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [recognizedFaces, setRecognizedFaces] = useState<RecognizedFace[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState({ recognitionThreshold: 0.6, scanInterval: 3000, lateThreshold: '09:00' });
  const recognitionIntervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      const [studentsData, settingsData] = await Promise.all([
        getAllStudents(),
        getSettings(),
      ]);
      setStudents(studentsData);
      setSettings(settingsData);
      const today = format(new Date(), 'yyyy-MM-dd');
      const attendance = await getAttendanceByDate(today);
      setTodayAttendance(attendance);
    }
    loadData();
  }, []);

  const handleLoadModels = async () => {
    setModelsLoading(true);
    try {
      await loadFaceModels();
      setModelsLoaded(true);
      toast({ title: 'Models Loaded', description: 'Face recognition models are ready.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load face recognition models.', variant: 'destructive' });
    } finally {
      setModelsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      toast({ title: 'Camera Error', description: 'Could not access camera.', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    stopRecognition();
  };

  const performRecognition = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return;

    try {
      const detections = await detectFaces(videoRef.current);
      const knownFaces = students
        .filter(s => s.faceDescriptor)
        .map(s => ({
          id: s.id,
          name: s.name,
          descriptors: s.faceDescriptor ? [Array.from(s.faceDescriptor)] : [],
        }));

      const recognized: RecognizedFace[] = detections.map(detection => {
        const match = findBestMatch(detection.descriptor, knownFaces, settings.recognitionThreshold);
        if (match) {
          return { detection, studentId: match.studentId, studentName: match.studentName, confidence: match.confidence, isRecognized: true };
        }
        return { detection, isRecognized: false };
      });

      setRecognizedFaces(recognized);

      const today = format(new Date(), 'yyyy-MM-dd');
      const currentTime = format(new Date(), 'HH:mm:ss');
      const isLate = currentTime > settings.lateThreshold;

      for (const face of recognized) {
        if (face.isRecognized && face.studentId) {
          const student = students.find(s => s.id === face.studentId);
          if (!student) continue;
          const alreadyMarked = await checkDuplicateAttendance(student.studentId, today);
          if (alreadyMarked) continue;

          const record = await addAttendance({
            studentId: student.studentId,
            studentName: student.name,
            date: today,
            time: currentTime,
            status: isLate ? 'late' : 'present',
            confidence: face.confidence || 0,
            markedBy: 'face-recognition',
          });

          if (record) {
            setTodayAttendance(prev => [...prev, record]);
            toast({ title: 'Attendance Marked', description: `${student.name} marked ${isLate ? 'late' : 'present'}` });
          }
        }
      }

      drawDetections(recognized);
    } catch (error) {
      console.error('Recognition error:', error);
    }
  }, [students, modelsLoaded, settings, toast]);

  const drawDetections = (faces: RecognizedFace[]) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach(face => {
      const { x, y, width, height } = face.detection.box;
      ctx.strokeStyle = face.isRecognized ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      const label = face.isRecognized ? `${face.studentName} (${face.confidence}%)` : 'Unknown';
      ctx.font = 'bold 14px sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = face.isRecognized ? '#22c55e' : '#ef4444';
      ctx.fillRect(x, y - 22, textWidth + 10, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 5, y - 7);
    });
  };

  const startRecognition = () => {
    if (!modelsLoaded) {
      toast({ title: 'Models Not Loaded', description: 'Please load face recognition models first.', variant: 'destructive' });
      return;
    }
    setIsRecognizing(true);
    performRecognition();
    recognitionIntervalRef.current = window.setInterval(performRecognition, settings.scanInterval);
  };

  const stopRecognition = () => {
    if (recognitionIntervalRef.current) {
      clearInterval(recognitionIntervalRef.current);
      recognitionIntervalRef.current = null;
    }
    setIsRecognizing(false);
    setRecognizedFaces([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  const presentCount = todayAttendance.filter(a => a.status === 'present').length;
  const lateCount = todayAttendance.filter(a => a.status === 'late').length;

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
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
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Camera Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-4">
              {!modelsLoaded && !isStreaming && (
                <Button onClick={handleLoadModels} disabled={modelsLoading} variant="secondary" size="sm">
                  {modelsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Load Models'}
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

        {/* Sidebar: Recent & Detected */}
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
                      <span className="text-xs opacity-70">{face.confidence ? Math.round(face.confidence * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                          {record.studentName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium leading-none">{record.studentName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{record.time}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${record.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
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
