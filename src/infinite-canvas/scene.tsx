import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { useIsTouchDevice } from "~/src/use-is-touch-device";

import {
  CHUNK_FADE_MARGIN,
  CHUNK_OFFSETS,
  CHUNK_SIZE,
  DEPTH_FADE_END,
  DEPTH_FADE_START,
  MAX_VELOCITY,
  RENDER_DISTANCE,
  VISIBILITY_LERP,
} from "./constants";
import { getTexture } from "./texture-manager";
import type { ChunkData, InfiniteCanvasProps, MediaItem } from "./types";
import { clamp, generateChunkPlanes, getMediaDimensions, lerp } from "./utils";

// Single media plane component
const MediaPlane = ({
  position,
  scale,
  media,
  visibility,
}: {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  media: MediaItem;
  visibility: number;
}) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const [isReady, setIsReady] = React.useState(false);
  const readyRef = React.useRef(false);

  const displayScale = React.useMemo(() => {
    if (!texture) {
      return scale;
    }

    const mediaEl = texture.image as (HTMLImageElement | HTMLVideoElement | undefined) | undefined;
    const { width: naturalWidth, height: naturalHeight } = getMediaDimensions(mediaEl);

    if (!naturalWidth || !naturalHeight) {
      return scale;
    }

    const aspect = naturalWidth / naturalHeight || 1;
    return new THREE.Vector3(scale.y * aspect, scale.y, 1);
  }, [scale, texture]);

  React.useEffect(() => {
    if (!readyRef.current || !texture || !materialRef.current || !isReady) {
      return;
    }

    materialRef.current.color.set("#ffffff");
    materialRef.current.map = texture;
    materialRef.current.opacity = visibility;
    meshRef.current?.scale.set(displayScale.x, displayScale.y, displayScale.z);
  }, [displayScale.x, displayScale.y, displayScale.z, texture, visibility, isReady]);

  React.useEffect(() => {
    setIsReady(false);
    readyRef.current = false;

    if (materialRef.current) {
      materialRef.current.opacity = 0;
      materialRef.current.color.set("#ffffff");
      materialRef.current.map = null;
    }

    const tex = getTexture(media);
    setTexture(tex);

    const mediaEl = tex?.image as HTMLImageElement | HTMLVideoElement | undefined;

    const markReady = () => {
      readyRef.current = true;
      setIsReady(true);
    };

    if (mediaEl instanceof HTMLImageElement) {
      if (mediaEl.complete && mediaEl.naturalWidth > 0 && mediaEl.naturalHeight > 0) {
        markReady();
      } else {
        const handleLoad = () => {
          markReady();
        };

        mediaEl.addEventListener("load", handleLoad, { once: true });

        return () => {
          mediaEl.removeEventListener("load", handleLoad);
        };
      }
    }

    if (mediaEl instanceof HTMLVideoElement) {
      if (mediaEl.videoWidth > 0 && mediaEl.videoHeight > 0) {
        markReady();
      } else {
        const handleMetadata = () => {
          markReady();
        };

        mediaEl.addEventListener("loadedmetadata", handleMetadata, {
          once: true,
        });

        return () => {
          mediaEl.removeEventListener("loadedmetadata", handleMetadata);
        };
      }
    }

    if (!mediaEl) {
      markReady();
    }
  }, [media]);

  if (!texture || !isReady) {
    return null;
  }

  return (
    <mesh ref={meshRef} position={position} scale={displayScale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent opacity={0} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Chunk component
const Chunk = ({
  cx,
  cy,
  cz,
  media,
  visibility,
}: {
  cx: number;
  cy: number;
  cz: number;
  media: MediaItem[];
  visibility: number;
}) => {
  const planes = React.useMemo(() => generateChunkPlanes(cx, cy, cz, media.length), [cx, cy, cz, media.length]);

  return (
    <group>
      {planes.map((plane) => {
        const mediaItem = media[plane.mediaIndex % media.length];

        if (!mediaItem) {
          return null;
        }

        return (
          <MediaPlane key={plane.id} position={plane.position} scale={plane.scale} media={mediaItem} visibility={visibility} />
        );
      })}
    </group>
  );
};

// Main scene controller
const SceneController = ({ media, onFpsUpdate }: { media: MediaItem[]; onFpsUpdate?: (fps: number) => void }) => {
  const { camera, gl } = useThree();
  const [chunks, setChunks] = React.useState<ChunkData[]>([]);
  const lastChunkKey = React.useRef("");

  const velocity = React.useRef({ x: 0, y: 0, z: 0 });
  const targetVel = React.useRef({ x: 0, y: 0, z: 0 });
  const scrollAccum = React.useRef(0);
  const keys = React.useRef(new Set<string>());
  const isDragging = React.useRef(false);
  const lastMouse = React.useRef({ x: 0, y: 0 });
  const lastTouches = React.useRef<Touch[]>([]);
  const lastTouchDist = React.useRef(0);
  const frames = React.useRef(0);
  const lastTime = React.useRef(performance.now());

  const getTouchDistance = React.useCallback((touches: Touch[]): number => {
    if (touches.length < 2) {
      return 0;
    }

    const [firstTouch, secondTouch] = touches;

    if (!firstTouch || !secondTouch) {
      return 0;
    }

    const dx = firstTouch.clientX - secondTouch.clientX;
    const dy = firstTouch.clientY - secondTouch.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Input handlers
  React.useEffect(() => {
    const canvas = gl.domElement;
    const originalCursor = canvas.style.cursor;
    canvas.style.cursor = "grab";

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current.add(e.key.toLowerCase());

      if (e.key === " ") {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current.delete(e.key.toLowerCase());
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = "grabbing";
    };

    const onMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = "grab";
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) {
        return;
      }

      targetVel.current.x -= (e.clientX - lastMouse.current.x) * 0.012;
      targetVel.current.y += (e.clientY - lastMouse.current.y) * 0.012;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollAccum.current += e.deltaY * 0.006;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      lastTouches.current = Array.from(e.touches) as Touch[];
      lastTouchDist.current = getTouchDistance(lastTouches.current);
      canvas.style.cursor = "grabbing";
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      const touches = Array.from(e.touches) as Touch[];

      if (touches.length === 1 && lastTouches.current.length >= 1) {
        const [touch] = touches;
        const [lastTouch] = lastTouches.current;

        if (!touch || !lastTouch) {
          lastTouches.current = touches;

          return;
        }

        targetVel.current.x -= (touch.clientX - lastTouch.clientX) * 0.02;
        targetVel.current.y += (touch.clientY - lastTouch.clientY) * 0.02;
        lastTouches.current = touches;

        return;
      }

      if (touches.length === 2) {
        const dist = getTouchDistance(touches);

        if (lastTouchDist.current > 0) {
          scrollAccum.current += (lastTouchDist.current - dist) * 0.006;
        }

        lastTouchDist.current = dist;
      }

      lastTouches.current = touches;
    };

    const onTouchEnd = (e: TouchEvent) => {
      lastTouches.current = Array.from(e.touches) as Touch[];
      lastTouchDist.current = getTouchDistance(lastTouches.current);
      canvas.style.cursor = "grab";
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.style.cursor = originalCursor;
    };
  }, [gl, getTouchDistance]);

  // Animation loop
  useFrame(() => {
    frames.current += 1;
    const now = performance.now();

    if (now - lastTime.current >= 400) {
      const fps = Math.round(frames.current / ((now - lastTime.current) / 1000));
      onFpsUpdate?.(fps);
      frames.current = 0;
      lastTime.current = now;
    }

    const k = keys.current;
    const speed = 0.18;

    if (k.has("w") || k.has("arrowup")) {
      targetVel.current.z -= speed;
    }

    if (k.has("s") || k.has("arrowdown")) {
      targetVel.current.z += speed;
    }

    if (k.has("a") || k.has("arrowleft")) {
      targetVel.current.x -= speed;
    }

    if (k.has("d") || k.has("arrowright")) {
      targetVel.current.x += speed;
    }

    if (k.has("q")) {
      targetVel.current.y -= speed;
    }

    if (k.has("e")) {
      targetVel.current.y += speed;
    }

    if (k.has(" ")) {
      targetVel.current.z -= speed * 1.5;
    }

    targetVel.current.z += scrollAccum.current;
    scrollAccum.current *= 0.8;

    targetVel.current.x = clamp(targetVel.current.x, -MAX_VELOCITY, MAX_VELOCITY);
    targetVel.current.y = clamp(targetVel.current.y, -MAX_VELOCITY, MAX_VELOCITY);
    targetVel.current.z = clamp(targetVel.current.z, -MAX_VELOCITY, MAX_VELOCITY);

    velocity.current.x = lerp(velocity.current.x, targetVel.current.x, 0.16);
    velocity.current.y = lerp(velocity.current.y, targetVel.current.y, 0.16);
    velocity.current.z = lerp(velocity.current.z, targetVel.current.z, 0.16);

    camera.position.x += velocity.current.x;
    camera.position.y += velocity.current.y;
    camera.position.z += velocity.current.z;

    targetVel.current.x *= 0.9;
    targetVel.current.y *= 0.9;
    targetVel.current.z *= 0.9;

    // Update chunks
    const cx = Math.floor(camera.position.x / CHUNK_SIZE);
    const cy = Math.floor(camera.position.y / CHUNK_SIZE);
    const cz = Math.floor(camera.position.z / CHUNK_SIZE);
    const key = `${cx},${cy},${cz}`;

    if (key !== lastChunkKey.current) {
      lastChunkKey.current = key;
    }

    setChunks((prev) => {
      const prevMap = new Map<string, ChunkData>();
      prev.forEach((c) => {
        prevMap.set(c.key, c);
      });

      const next: ChunkData[] = [];

      for (const offset of CHUNK_OFFSETS) {
        const gridTarget =
          offset.dist <= RENDER_DISTANCE
            ? 1
            : Math.max(0, 1 - (offset.dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001));

        const chunkCenterZ = (cz + offset.dz + 0.5) * CHUNK_SIZE;
        const absDepth = Math.abs(chunkCenterZ - camera.position.z);
        const depthLinear =
          absDepth <= DEPTH_FADE_START
            ? 1
            : Math.max(0, 1 - (absDepth - DEPTH_FADE_START) / Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001));
        const depthTarget = depthLinear * depthLinear;

        const targetVisibility = Math.min(gridTarget, depthTarget);

        const keyChunk = `${cx + offset.dx},${cy + offset.dy},${cz + offset.dz}`;
        const prevChunk = prevMap.get(keyChunk);
        const currentVisibility = prevChunk?.visibility ?? 0;
        const visibility = lerp(currentVisibility, targetVisibility, VISIBILITY_LERP);

        if (visibility < 0.01 && targetVisibility === 0) {
          continue;
        }

        next.push({
          key: keyChunk,
          cx: cx + offset.dx,
          cy: cy + offset.dy,
          cz: cz + offset.dz,
          visibility,
        });
      }

      return next;
    });
  });

  // Initial chunks
  React.useEffect(() => {
    const initialChunks: ChunkData[] = CHUNK_OFFSETS.map((offset) => {
      const gridTarget =
        offset.dist <= RENDER_DISTANCE
          ? 1
          : Math.max(0, 1 - (offset.dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001));

      const chunkCenterZ = (offset.dz + 0.5) * CHUNK_SIZE;
      const absDepth = Math.abs(chunkCenterZ);
      const depthLinear =
        absDepth <= DEPTH_FADE_START
          ? 1
          : Math.max(0, 1 - (absDepth - DEPTH_FADE_START) / Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001));
      const depthTarget = depthLinear * depthLinear;

      const easedVisibility = Math.min(gridTarget, depthTarget);

      return {
        key: `${offset.dx},${offset.dy},${offset.dz}`,
        cx: offset.dx,
        cy: offset.dy,
        cz: offset.dz,
        visibility: easedVisibility,
      };
    });

    setChunks(initialChunks);
  }, []);

  return chunks.map((chunk) => (
    <Chunk key={chunk.key} cx={chunk.cx} cy={chunk.cy} cz={chunk.cz} media={media} visibility={chunk.visibility} />
  ));
};

export function InfiniteCanvasScene({ media }: InfiniteCanvasProps) {
  const [fps, setFps] = React.useState(0);
  const isTouchDevice = useIsTouchDevice();

  if (!media.length) {
    return null;
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
        touchAction: "none",
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60, near: 1, far: 500 }}
        dpr={window.devicePixelRatio}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
        style={{ backgroundColor: "#ffffff" }}
      >
        <color attach="background" args={["#ffffff"]} />
        <fog attach="fog" args={["#ffffff", 120, 320]} />
        <SceneController media={media} onFpsUpdate={setFps} />
      </Canvas>
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          borderRadius: 8,
          backgroundColor: "#ffffff",
          padding: "12px",
          fontSize: "60%",
          color: "#000000",
          boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        <b>{fps} FPS</b>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 10,
          borderRadius: 8,
          backgroundColor: "#ffffff",
          padding: "12px",
          fontSize: "60%",
          color: "#000000",
          boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.1)",
        }}
      >
        {isTouchDevice ? (
          <>
            <b>Drag</b> Pan · <b>Pinch</b> Zoom
          </>
        ) : (
          <>
            <b>WASD</b> Move · <b>QE</b> Up/Down · <b>Scroll</b> Zoom
          </>
        )}
      </div>
    </div>
  );
}
