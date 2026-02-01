import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { loadFaceModels, detectSingleFace, areModelsLoaded, canvasToBase64, FaceDetection } from '@/lib/faceRecognition';
import { getAllStudents, updateStudent, Student } from '@/lib/database';
import { Camera, Save, RefreshCw, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const REQUIRED_SAMPLES = 5;

interface CapturedSample {
  id: string;
  descriptor: number[];
  thumbnail: string;
}

export default function RegisterFacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [capturedSamples, setCapturedSamples] = useState<CapturedSample[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDetection, setCurrentDetection] = useState<FaceDetection | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
    const studentParam = searchParams.get('student');
    if (studentParam) setSelectedStudentId(studentParam);
    if (areModelsLoaded()) setModelsLoaded(true);
  }, [searchParams]);

  async function loadStudents() {
    const data = await getAllStudents();
    setStudents(data); // Allow re-registering too, or filter if needed
  }

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleLoadModels = async () => {
    setModelsLoading(true);
    try {
      await loadFaceModels();
      setModelsLoaded(true);
      toast({ title: 'Models Loaded' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load face models.', variant: 'destructive' });
    } finally {
      setModelsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      toast({ title: 'Camera Error', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
    setCurrentDetection(null);
  };

  const detectFaceLoop = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded || !isStreaming) return;
    try {
      const detection = await detectSingleFace(videoRef.current);
      setCurrentDetection(detection);

      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (detection) {
            const { x, y, width, height } = detection.box;
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);
          }
        }
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, [modelsLoaded, isStreaming]);

  useEffect(() => {
    if (!isStreaming || !modelsLoaded) return;
    const interval = setInterval(detectFaceLoop, 200);
    return () => clearInterval(interval);
  }, [isStreaming, modelsLoaded, detectFaceLoop]);

  const captureSample = async () => {
    if (!videoRef.current || !currentDetection || capturedSamples.length >= REQUIRED_SAMPLES) return;
    setIsCapturing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const { x, y, width, height } = currentDetection.box;
        const faceCanvas = document.createElement('canvas');
        faceCanvas.width = 100;
        faceCanvas.height = 100;
        const faceCtx = faceCanvas.getContext('2d');
        if (faceCtx) faceCtx.drawImage(canvas, x, y, width, height, 0, 0, 100, 100);

        const sample: CapturedSample = {
          id: Math.random().toString(36).substring(2, 15),
          descriptor: currentDetection.descriptor,
          thumbnail: canvasToBase64(faceCanvas),
        };
        setCapturedSamples(prev => [...prev, sample]);
        toast({ title: `Sample captured (${capturedSamples.length + 1}/${REQUIRED_SAMPLES})` });
      }
    } catch (error) {
      toast({ title: 'Capture Failed', variant: 'destructive' });
    } finally {
      setIsCapturing(false);
    }
  };

  const removeSample = (id: string) => {
    setCapturedSamples(prev => prev.filter(s => s.id !== id));
  };

  const saveRegistration = async () => {
    if (!selectedStudent || capturedSamples.length < REQUIRED_SAMPLES) return;
    setIsSaving(true);
    try {
      const avgDescriptor = new Float32Array(128);
      capturedSamples.forEach(s => s.descriptor.forEach((v, i) => avgDescriptor[i] += v / capturedSamples.length));
      await updateStudent(selectedStudent.id, {
        faceDescriptor: avgDescriptor,
        faceImages: capturedSamples.map(s => s.thumbnail),
      });
      toast({ title: 'Registration Successful', description: `${selectedStudent.name} can now use face attendance.` });
      stopCamera();
      navigate('/students');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save registration.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  return (
    <div className="space-y-8 p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Face Registration</h1>
          <p className="text-muted-foreground mt-1">Enroll students for biometric attendance</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera Feed */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Camera Feed</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.studentId}) {student.faceDescriptor ? '✓' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <p>Camera is off</p>
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

              {isStreaming && (
                <div className={`absolute bottom-4 left-4 px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm transition-colors ${currentDetection ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {currentDetection ? 'Face Detected' : 'No Face Detected'}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {!modelsLoaded && (
                <Button onClick={handleLoadModels} disabled={modelsLoading} variant="secondary" className="w-full">
                  {modelsLoading ? 'Loading Models...' : 'Load Face Models'}
                </Button>
              )}

              {modelsLoaded && !isStreaming && (
                <Button onClick={startCamera} disabled={!selectedStudentId} className="w-full">
                  <Camera className="mr-2 h-4 w-4" /> Start Camera
                </Button>
              )}

              {isStreaming && (
                <div className="flex gap-2 w-full">
                  <Button
                    onClick={captureSample}
                    disabled={!currentDetection || isCapturing || capturedSamples.length >= REQUIRED_SAMPLES}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Capture ({capturedSamples.length}/{REQUIRED_SAMPLES})
                  </Button>
                  <Button variant="destructive" onClick={stopCamera}>
                    Stop
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round((capturedSamples.length / REQUIRED_SAMPLES) * 100)}%</span>
              </div>
              <Progress value={(capturedSamples.length / REQUIRED_SAMPLES) * 100} className="h-2" />
            </div>

          </CardContent>
        </Card>

        {/* Samples Grid */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Captured Samples</CardTitle>
            {capturedSamples.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCapturedSamples([])}>
                <RefreshCw className="mr-2 h-4 w-4" /> Reset
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            {capturedSamples.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
                <Camera className="h-12 w-12 mb-3 opacity-20" />
                <p>No samples captured</p>
                <p className="text-xs mt-1">Select a student and start camera</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {capturedSamples.map((sample, i) => (
                  <div key={sample.id} className="relative group aspect-square">
                    <img src={sample.thumbnail} className="w-full h-full object-cover rounded-md border-2 border-primary/20" alt={`sample ${i}`} />
                    <button
                      onClick={() => removeSample(sample.id)}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      #{i + 1}
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, REQUIRED_SAMPLES - capturedSamples.length) }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-md border-2 border-dashed flex items-center justify-center text-muted-foreground/30 text-sm">
                    {capturedSamples.length + i + 1}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-100">
                <h4 className="flex items-center gap-2 font-medium mb-2">
                  <AlertCircle className="h-4 w-4" /> Instructions
                </h4>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>Ensure the face is clearly visible and well-lit.</li>
                  <li>Capture different angles (front, slight left, slight right).</li>
                  <li>School ID cards should not be in the frame.</li>
                </ul>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={saveRegistration}
                disabled={capturedSamples.length < REQUIRED_SAMPLES || isSaving}
              >
                {isSaving ? (
                  <>Saving Registration...</>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Complete Registration
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
