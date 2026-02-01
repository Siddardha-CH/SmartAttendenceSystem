import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadFaceModels, detectFaces, findBestMatch, FaceDetection } from '@/lib/faceRecognition';
import { getAllStudents, addAttendance, checkDuplicateAttendance, getAttendanceByDate, Student, AttendanceRecord, getSettings } from '@/lib/database';
import { format } from 'date-fns';

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Take Attendance</h1>
          <p className="text-muted-foreground">Real-time face recognition</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Present: {presentCount}</span>
          <span className="text-sm">Late: {lateCount}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Camera View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Camera Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {!isStreaming && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <p className="text-muted-foreground">Camera not started</p>
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {isRecognizing && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded text-sm">
                  Recording
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {!modelsLoaded && (
                <Button onClick={handleLoadModels} disabled={modelsLoading}>
                  {modelsLoading ? 'Loading Models...' : 'Load Face Models'}
                </Button>
              )}
              
              {!isStreaming ? (
                <Button onClick={startCamera} disabled={!modelsLoaded}>Start Camera</Button>
              ) : (
                <Button variant="destructive" onClick={stopCamera}>Stop Camera</Button>
              )}

              {isStreaming && !isRecognizing && (
                <Button onClick={startRecognition} className="bg-green-600 hover:bg-green-700">Start Recognition</Button>
              )}

              {isRecognizing && (
                <Button variant="outline" onClick={stopRecognition}>Stop Recognition</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Recognition Feed */}
        <Card>
          <CardHeader>
            <CardTitle>Detected Faces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recognizedFaces.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">No faces detected</p>
            ) : (
              recognizedFaces.map((face, index) => (
                <div key={index} className={`p-3 rounded-lg border ${face.isRecognized ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <p className="font-medium">{face.isRecognized ? face.studentName : 'Unknown'}</p>
                  {face.isRecognized && <p className="text-xs text-muted-foreground">Confidence: {face.confidence}%</p>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance ({format(new Date(), 'MMM d, yyyy')})</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No attendance records yet</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {todayAttendance.map((record) => (
                <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{record.studentName}</p>
                    <p className="text-xs text-muted-foreground">{record.time}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${record.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
