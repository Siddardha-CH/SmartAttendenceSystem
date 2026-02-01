import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { loadFaceModels, detectSingleFace, areModelsLoaded, canvasToBase64, FaceDetection } from '@/lib/faceRecognition';
import { getAllStudents, updateStudent, Student } from '@/lib/database';

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
    setStudents(data.filter(s => !s.faceDescriptor));
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
          id: crypto.randomUUID(),
          descriptor: currentDetection.descriptor,
          thumbnail: canvasToBase64(faceCanvas),
        };
        setCapturedSamples(prev => [...prev, sample]);
        toast({ title: `Sample ${capturedSamples.length + 1}/${REQUIRED_SAMPLES} captured` });
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
      toast({ title: 'Face Registered', description: `${selectedStudent.name}'s face has been registered.` });
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Register Face</h1>
        <p className="text-muted-foreground">Capture face samples for attendance recognition</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Camera Section */}
        <Card>
          <CardHeader>
            <CardTitle>Face Capture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Student</label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.studentId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {students.length === 0 && (
                <p className="text-sm text-muted-foreground">All students have face registration.</p>
              )}
            </div>

            <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted-foreground">Camera not started</p>
                </div>
              )}
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
              {isStreaming && (
                <div className={`absolute bottom-4 left-4 px-3 py-1 rounded text-sm text-white ${currentDetection ? 'bg-green-500' : 'bg-yellow-500'}`}>
                  {currentDetection ? 'Face Detected' : 'No Face'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Samples captured</span>
                <span className="font-medium">{capturedSamples.length}/{REQUIRED_SAMPLES}</span>
              </div>
              <Progress value={(capturedSamples.length / REQUIRED_SAMPLES) * 100} />
            </div>

            <div className="flex flex-wrap gap-3">
              {!modelsLoaded && (
                <Button onClick={handleLoadModels} disabled={modelsLoading}>
                  {modelsLoading ? 'Loading...' : 'Load Face Models'}
                </Button>
              )}
              {modelsLoaded && !isStreaming && (
                <Button onClick={startCamera} disabled={!selectedStudentId}>Start Camera</Button>
              )}
              {isStreaming && (
                <>
                  <Button variant="destructive" onClick={stopCamera}>Stop Camera</Button>
                  <Button
                    onClick={captureSample}
                    disabled={!currentDetection || isCapturing || capturedSamples.length >= REQUIRED_SAMPLES}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Capture Sample
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Captured Samples */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Captured Samples</span>
              {capturedSamples.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCapturedSamples([])}>Reset</Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {capturedSamples.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No samples captured yet</p>
                <p className="text-sm mt-1">Start the camera and capture face samples</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-3">
                  {capturedSamples.map((sample, index) => (
                    <div key={sample.id} className="relative group">
                      <img src={sample.thumbnail} alt={`Sample ${index + 1}`} className="w-full aspect-square object-cover rounded-lg border-2 border-green-500" />
                      <button
                        onClick={() => removeSample(sample.id)}
                        className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                      <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">{index + 1}</span>
                    </div>
                  ))}
                  {Array.from({ length: REQUIRED_SAMPLES - capturedSamples.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground/30">
                      {capturedSamples.length + i + 1}
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <h4 className="font-medium text-sm">Tips:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Look directly at the camera</li>
                    <li>• Capture with slight head turns</li>
                    <li>• Ensure good lighting</li>
                  </ul>
                </div>

                {capturedSamples.length >= REQUIRED_SAMPLES && (
                  <Button className="w-full" size="lg" onClick={saveRegistration} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Face Registration'}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
