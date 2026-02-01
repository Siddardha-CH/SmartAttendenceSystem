import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;

  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export interface FaceDetection {
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  descriptor: number[];
  landmarks?: faceapi.FaceLandmarks68;
}

export async function detectFaces(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetection[]> {
  if (!modelsLoaded) {
    throw new Error('Face models not loaded');
  }

  const detections = await faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => ({
    box: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
    descriptor: Array.from(d.descriptor),
    landmarks: d.landmarks,
  }));
}

export async function detectSingleFace(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<FaceDetection | null> {
  if (!modelsLoaded) {
    throw new Error('Face models not loaded');
  }

  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    box: {
      x: detection.detection.box.x,
      y: detection.detection.box.y,
      width: detection.detection.box.width,
      height: detection.detection.box.height,
    },
    descriptor: Array.from(detection.descriptor),
    landmarks: detection.landmarks,
  };
}

export function calculateFaceDistance(descriptor1: number[], descriptor2: number[]): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptor lengths do not match');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }
  return Math.sqrt(sum);
}

export interface RecognitionResult {
  studentId: string;
  studentName: string;
  confidence: number;
  distance: number;
}

export function findBestMatch(
  faceDescriptor: number[],
  knownFaces: { id: string; name: string; descriptors: number[][] }[],
  threshold: number = 0.6
): RecognitionResult | null {
  let bestMatch: RecognitionResult | null = null;
  let bestDistance = Infinity;

  for (const known of knownFaces) {
    for (const knownDescriptor of known.descriptors) {
      const distance = calculateFaceDistance(faceDescriptor, knownDescriptor);
      if (distance < bestDistance && distance < threshold) {
        bestDistance = distance;
        bestMatch = {
          studentId: known.id,
          studentName: known.name,
          confidence: Math.round((1 - distance) * 100),
          distance,
        };
      }
    }
  }

  return bestMatch;
}

export function captureFrameFromVideo(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0);
  }
  return canvas;
}

export function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', 0.8);
}
