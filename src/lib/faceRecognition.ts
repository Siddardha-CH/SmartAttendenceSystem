/**
 * Face recognition helpers built on face-api.js (TensorFlow.js running in the browser).
 *
 * How recognition works:
 *  1. A detector (SSD MobileNet v1) finds faces in a video frame -> bounding boxes + a confidence score.
 *  2. A landmark model finds 68 points (eyes, nose, mouth...) used to align each face.
 *  3. A recognition network turns each aligned face into a "descriptor": 128 numbers.
 *     Photos of the same person give descriptors that are close together; different people are far apart.
 *  4. To identify someone we measure the Euclidean distance between the live descriptor and each
 *     registered student's descriptor. The closest one wins, if it is under the threshold (default 0.6).
 *
 * Everything runs on the user's device - video never leaves the browser; only the 128 numbers
 * (and small thumbnails at registration) are sent to the backend.
 */
import * as faceapi from 'face-api.js';
import type { Settings } from './database';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

/** Downloads the three neural networks (~12 MB, cached by the browser). Safe to call repeatedly. */
export function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return Promise.resolve();
  if (!loadingPromise) {
    loadingPromise = Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
      .then(() => { modelsLoaded = true; })
      .catch((err) => { loadingPromise = null; throw err; }); // allow a retry after a network error
  }
  return loadingPromise;
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
  /** Detector confidence that this really is a face, 0-1. */
  score: number;
  descriptor: number[];
  landmarks?: faceapi.FaceLandmarks68;
}

type MediaInput = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

function toFaceDetection(d: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>): FaceDetection {
  return {
    box: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
    score: d.detection.score,
    descriptor: Array.from(d.descriptor),
    landmarks: d.landmarks,
  };
}

/** Finds every face in the frame. `minConfidence` filters out weak detections (0-1). */
export async function detectFaces(input: MediaInput, minConfidence = 0.5): Promise<FaceDetection[]> {
  if (!modelsLoaded) throw new Error('Face models not loaded');
  const detections = await faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence }))
    .withFaceLandmarks()
    .withFaceDescriptors();
  return detections.map(toFaceDetection);
}

/** Finds the single most confident face in the frame, or null. */
export async function detectSingleFace(input: MediaInput, minConfidence = 0.5): Promise<FaceDetection | null> {
  if (!modelsLoaded) throw new Error('Face models not loaded');
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection ? toFaceDetection(detection) : null;
}

/** Euclidean distance between two descriptors. 0 = identical; > 0.6 usually means a different person. */
export function calculateFaceDistance(descriptor1: number[], descriptor2: number[]): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Descriptor lengths do not match');
  }
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Averages several descriptors of the same person into one (a more stable "template"). */
export function averageDescriptors(descriptors: number[][]): number[] {
  if (descriptors.length === 0) return [];
  const avg = new Array<number>(descriptors[0].length).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < d.length; i++) avg[i] += d[i] / descriptors.length;
  }
  return avg; // a plain array - a Float32Array would JSON-serialise as {"0":..,"1":..} and be rejected by the API
}

export interface RecognitionResult {
  studentId: string;
  studentName: string;
  confidence: number; // 0-100
  distance: number;
}

/** Returns the registered face closest to `faceDescriptor`, if that distance is below `threshold`. */
export function findBestMatch(
  faceDescriptor: number[],
  knownFaces: { id: string; name: string; descriptors: number[][] }[],
  threshold: number = 0.6
): RecognitionResult | null {
  let bestMatch: RecognitionResult | null = null;
  let bestDistance = Infinity;

  for (const known of knownFaces) {
    for (const knownDescriptor of known.descriptors) {
      if (knownDescriptor.length !== faceDescriptor.length) continue; // corrupt/old data - skip, don't crash
      const distance = calculateFaceDistance(faceDescriptor, knownDescriptor);
      if (distance < bestDistance && distance < threshold) {
        bestDistance = distance;
        bestMatch = {
          studentId: known.id,
          studentName: known.name,
          confidence: Math.max(0, Math.round((1 - distance) * 100)),
          distance,
        };
      }
    }
  }

  return bestMatch;
}

/**
 * Basic quality gate for registration photos: the face must be detected confidently and be
 * reasonably large in the frame (small faces give noisy descriptors). Returns a reason if rejected.
 */
export function checkFaceQuality(detection: FaceDetection, frameWidth: number): string | null {
  if (detection.score < 0.8) return 'Face not clear enough - improve lighting or look at the camera';
  if (frameWidth > 0 && detection.box.width < frameWidth * 0.15) return 'Face too small - move closer to the camera';
  return null;
}

const RESOLUTIONS: Record<Settings['cameraResolution'], { width: number; height: number }> = {
  low: { width: 640, height: 480 },
  medium: { width: 1280, height: 720 },
  high: { width: 1920, height: 1080 },
};

/** Builds getUserMedia() constraints from the admin's camera settings. */
export function getCameraConstraints(settings?: Partial<Settings> | null): MediaStreamConstraints {
  const size = RESOLUTIONS[settings?.cameraResolution ?? 'medium'] ?? RESOLUTIONS.medium;
  const video: MediaTrackConstraints = { width: { ideal: size.width }, height: { ideal: size.height } };
  if (settings?.selectedCamera) video.deviceId = { exact: settings.selectedCamera };
  else video.facingMode = 'user';
  return { video, audio: false };
}

/**
 * Opens the camera. If the saved camera no longer exists (unplugged, different computer),
 * falls back to the default camera instead of failing.
 */
export async function openCamera(settings?: Partial<Settings> | null): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia(getCameraConstraints(settings));
  } catch (err) {
    if (settings?.selectedCamera) {
      return navigator.mediaDevices.getUserMedia(getCameraConstraints({ ...settings, selectedCamera: '' }));
    }
    throw err;
  }
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
