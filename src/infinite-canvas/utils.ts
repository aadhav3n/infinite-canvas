import * as THREE from "three";
import { CHUNK_SIZE, ITEMS_PER_CHUNK } from "./constants";
import type { PlaneData } from "./types";

// Seeded random for deterministic generation
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

export const hashString = (str: string): number => {
  let h = 0;

  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }

  return Math.abs(h);
};

export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Checks if enough time has passed since the last update for throttling.
 * @param lastUpdateTime - The last update time (from a ref)
 * @param throttleMs - Minimum milliseconds between updates
 * @param currentTime - Current time (usually performance.now())
 * @returns true if the throttle allows an update, false otherwise
 */
export const shouldThrottleUpdate = (
  lastUpdateTime: number,
  throttleMs: number,
  currentTime: number
): boolean => {
  return currentTime - lastUpdateTime >= throttleMs;
};

/**
 * Calculates throttle duration based on zoom state.
 * More aggressive throttling during rapid zoom to prevent lag.
 * @param isZooming - Whether the camera is currently zooming
 * @param zoomSpeed - Current zoom velocity magnitude
 * @returns Throttle duration in milliseconds
 */
export const getChunkUpdateThrottleMs = (isZooming: boolean, zoomSpeed: number): number => {
  const isVeryFastZoom = zoomSpeed > 1.0;
  if (isVeryFastZoom) return 500;
  if (isZooming) return 400;
  return 100;
};

export const getMediaDimensions = (media: HTMLImageElement | HTMLVideoElement | undefined) => {
  const width =
    media instanceof HTMLVideoElement
      ? media.videoWidth
      : media instanceof HTMLImageElement
        ? media.naturalWidth || media.width
        : undefined;

  const height =
    media instanceof HTMLVideoElement
      ? media.videoHeight
      : media instanceof HTMLImageElement
        ? media.naturalHeight || media.height
        : undefined;

  return { width, height };
};

// Generate planes for a chunk
export const generateChunkPlanes = (cx: number, cy: number, cz: number): PlaneData[] => {
  const planes: PlaneData[] = [];
  const seed = hashString(`${cx},${cy},${cz}`);

  for (let i = 0; i < ITEMS_PER_CHUNK; i++) {
    const s = seed + i * 1000;
    const r = (n: number) => seededRandom(s + n);

    const size = 12 + r(4) * 8;

    planes.push({
      id: `${cx}-${cy}-${cz}-${i}`,
      position: new THREE.Vector3(
        cx * CHUNK_SIZE + r(0) * CHUNK_SIZE,
        cy * CHUNK_SIZE + r(1) * CHUNK_SIZE,
        cz * CHUNK_SIZE + r(2) * CHUNK_SIZE
      ),
      scale: new THREE.Vector3(size, size, 1),
      // Assign a stable, large random index.
      // The Scene component will modulo this by the actual media length.
      mediaIndex: Math.floor(r(5) * 1000000),
    });
  }

  return planes;
};
