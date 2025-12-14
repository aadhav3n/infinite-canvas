import { useProgress } from "@react-three/drei";
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
import { clamp, generateChunkPlanes, getChunkUpdateThrottleMs, getMediaDimensions, lerp, shouldThrottleUpdate } from "./utils";

// Single media plane component
const MediaPlane = React.memo(
  ({
    position,
    scale,
    media,
    chunkCx,
    chunkCy,
    chunkCz,
  }: {
    position: THREE.Vector3;
    scale: THREE.Vector3;
    media: MediaItem;
    chunkCx: number;
    chunkCy: number;
    chunkCz: number;
  }) => {
    const meshRef = React.useRef<THREE.Mesh>(null);
    const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
    const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
    const [isReady, setIsReady] = React.useState(false);
    const readyRef = React.useRef(false);
    const opacityRef = React.useRef(0);

    // Animate visibility/opacity locally to avoid re-renders
    const frameSkipRef = React.useRef(0);
    useFrame(({ camera }) => {
      if (!materialRef.current || !meshRef.current) return;

      // Skip calculations for fully invisible planes every other frame to reduce CPU load
      // This is safe because opacity changes are already smooth via lerp
      frameSkipRef.current = (frameSkipRef.current + 1) % 2;
      if (opacityRef.current < 0.01 && !meshRef.current.visible && frameSkipRef.current === 0) {
        return;
      }

      const cameraCx = Math.floor(camera.position.x / CHUNK_SIZE);
      const cameraCy = Math.floor(camera.position.y / CHUNK_SIZE);
      const cameraCz = Math.floor(camera.position.z / CHUNK_SIZE);

      const dist = Math.max(Math.abs(chunkCx - cameraCx), Math.abs(chunkCy - cameraCy), Math.abs(chunkCz - cameraCz));

      // Grid fade
      const gridTarget =
        dist <= RENDER_DISTANCE ? 1 : Math.max(0, 1 - (dist - RENDER_DISTANCE) / Math.max(CHUNK_FADE_MARGIN, 0.0001));

      // Depth fade - use actual plane position for more accurate culling
      const absDepth = Math.abs(position.z - camera.position.z);

      // Early exit: if depth is way beyond fade end, skip expensive calculations
      if (absDepth > DEPTH_FADE_END + 50) {
        opacityRef.current = 0;
        materialRef.current.opacity = 0;
        meshRef.current.visible = false;
        return;
      }

      const depthLinear =
        absDepth <= DEPTH_FADE_START
          ? 1
          : Math.max(0, 1 - (absDepth - DEPTH_FADE_START) / Math.max(DEPTH_FADE_END - DEPTH_FADE_START, 0.0001));
      const depthTarget = depthLinear * depthLinear;

      const targetVisibility = Math.min(gridTarget, depthTarget);

      // Early exit if target is 0 and we're already very close to 0
      if (targetVisibility < 0.01 && opacityRef.current < 0.01) {
        opacityRef.current = 0;
        materialRef.current.opacity = 0;
        meshRef.current.visible = false;
        return;
      }

      // Smooth lerp
      opacityRef.current = lerp(opacityRef.current, targetVisibility, VISIBILITY_LERP);

      // Apply to material
      materialRef.current.opacity = opacityRef.current;

      // Optimization: hide mesh if fully invisible to save draw calls
      // Increased threshold for better performance
      meshRef.current.visible = opacityRef.current > 0.01;
    });

    const displayScale = React.useMemo(() => {
      // If we have dimensions from the API, use them immediately to set the correct aspect ratio
      if (media.width && media.height) {
        const aspect = media.width / media.height;
        return new THREE.Vector3(scale.y * aspect, scale.y, 1);
      }

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
    }, [scale, texture, media.width, media.height]);

    React.useEffect(() => {
      if (!readyRef.current || !texture || !materialRef.current || !isReady) {
        return;
      }

      materialRef.current.color.set("#ffffff");
      materialRef.current.map = texture;
      materialRef.current.opacity = opacityRef.current; // Use current ref value
      meshRef.current?.scale.set(displayScale.x, displayScale.y, displayScale.z);
    }, [displayScale.x, displayScale.y, displayScale.z, texture, isReady]);

    React.useEffect(() => {
      setIsReady(false);
      readyRef.current = false;
      opacityRef.current = 0; // Reset opacity for new media

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
  }
);

// Chunk component
const Chunk = React.memo(({ cx, cy, cz, media }: { cx: number; cy: number; cz: number; media: MediaItem[] }) => {
  // Generate planes lazily to avoid blocking render
  const [planes, setPlanes] = React.useState<ReturnType<typeof generateChunkPlanes> | null>(null);

  React.useEffect(() => {
    // Defer plane generation to avoid blocking the render phase
    // Use requestIdleCallback if available, otherwise setTimeout
    const generatePlanes = () => {
      setPlanes(generateChunkPlanes(cx, cy, cz));
    };

    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(generatePlanes, { timeout: 100 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(generatePlanes, 0);
    return () => clearTimeout(id);
  }, [cx, cy, cz]);

  if (!planes) {
    return null; // Don't render anything until planes are generated
  }

  return (
    <group>
      {planes.map((plane) => {
        const mediaItem = media[plane.mediaIndex % media.length];

        if (!mediaItem) {
          return null;
        }

        return (
          <MediaPlane
            key={plane.id}
            position={plane.position}
            scale={plane.scale}
            media={mediaItem}
            chunkCx={cx}
            chunkCy={cy}
            chunkCz={cz}
          />
        );
      })}
    </group>
  );
});

// Main scene controller
const SceneController = React.memo(
  ({ media, onFpsUpdate, onReady }: { media: MediaItem[]; onFpsUpdate?: (fps: number) => void; onReady?: () => void }) => {
    const { camera, gl } = useThree();
    const isTouchDevice = useIsTouchDevice();
    const [chunks, setChunks] = React.useState<ChunkData[]>([]);
    const lastChunkKey = React.useRef("");
    const readySent = React.useRef(false);
    const pendingChunkUpdate = React.useRef<{ cx: number; cy: number; cz: number } | null>(null);
    const lastChunkUpdateTime = React.useRef(0);

    // Use drei's useProgress to track loading state
    const { active, progress } = useProgress();

    // Consider "ready" when chunks are generated for the first time
    // AND textures have finished loading (active === false and progress === 100)
    React.useEffect(() => {
      if (chunks.length > 0 && !readySent.current) {
        // Wait until no active downloads and progress is 100%
        if (!active && progress === 100) {
          // Small timeout to ensure everything is mounted
          const timeoutId = setTimeout(() => {
            if (!readySent.current) {
              readySent.current = true;
              onReady?.();
            }
          }, 100);
          return () => clearTimeout(timeoutId);
        }
      }
    }, [chunks, onReady, active, progress]);

    const velocity = React.useRef({ x: 0, y: 0, z: 0 });
    const targetVel = React.useRef({ x: 0, y: 0, z: 0 });
    const scrollAccum = React.useRef(0);
    const keys = React.useRef(new Set<string>());
    const isDragging = React.useRef(false);
    const mousePosition = React.useRef({ x: 0, y: 0 });
    const driftOffset = React.useRef({ x: 0, y: 0 });
    const basePosition = React.useRef({ x: 0, y: 0, z: 50 }); // Track "true" navigation position
    const lastMouse = React.useRef({ x: 0, y: 0 });
    const lastTouches = React.useRef<Touch[]>([]);
    const lastTouchDist = React.useRef(0);
    const frames = React.useRef(0);
    const lastTime = React.useRef(performance.now());

    const getTouchDistance = React.useCallback((touches: Touch[]) => {
      if (touches.length < 2) return 0;
      const [t1, t2] = touches;
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }, []);

    // Input handlers
    React.useEffect(() => {
      const canvas = gl.domElement;
      const originalCursor = canvas.style.cursor;
      canvas.style.cursor = "grab";

      const onKeyDown = (e: KeyboardEvent) => {
        keys.current.add(e.key.toLowerCase());
        if (e.key === " ") e.preventDefault();
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

      const onMouseLeave = () => {
        mousePosition.current = { x: 0, y: 0 };
        isDragging.current = false;
        canvas.style.cursor = "grab";
      };

      const onMouseMove = (e: MouseEvent) => {
        // Update mouse position normalized (-1 to 1) for drift
        const { innerWidth, innerHeight } = window;
        mousePosition.current = {
          x: (e.clientX / innerWidth) * 2 - 1,
          y: -(e.clientY / innerHeight) * 2 + 1,
        };

        if (!isDragging.current) return;
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
          if (touch && lastTouch) {
            targetVel.current.x -= (touch.clientX - lastTouch.clientX) * 0.02;
            targetVel.current.y += (touch.clientY - lastTouch.clientY) * 0.02;
          }
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
      canvas.addEventListener("mouseleave", onMouseLeave);
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
        canvas.removeEventListener("mouseleave", onMouseLeave);
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

      if (k.has("w") || k.has("arrowup")) targetVel.current.z -= speed;
      if (k.has("s") || k.has("arrowdown")) targetVel.current.z += speed;
      if (k.has("a") || k.has("arrowleft")) targetVel.current.x -= speed;
      if (k.has("d") || k.has("arrowright")) targetVel.current.x += speed;
      if (k.has("q")) targetVel.current.y -= speed;
      if (k.has("e")) targetVel.current.y += speed;
      if (k.has(" ")) targetVel.current.z -= speed * 1.5;

      // Dampen drift when moving quickly in Z (zooming) to prevent "fighting" sensation
      // If velocity.z is high, we reduce the max drift allowed
      const isZooming = Math.abs(velocity.current.z) > 0.05;

      // Calculate drift offset based on mouse position (parallax effect)
      // Limits the drift to a maximum distance from the base position
      const MAX_DRIFT = 3.0;

      // If zooming, target drift becomes 0 to center the view
      const targetDriftX = !isDragging.current && !isTouchDevice && !isZooming ? mousePosition.current.x * MAX_DRIFT : 0;

      const targetDriftY = !isDragging.current && !isTouchDevice && !isZooming ? mousePosition.current.y * MAX_DRIFT : 0;

      // Smoothly interpolate current drift to target
      // We use a slightly faster lerp when returning to 0 (zooming) for responsiveness
      const driftLerpFactor = isZooming ? 0.1 : 0.05;
      driftOffset.current.x = lerp(driftOffset.current.x, targetDriftX, driftLerpFactor);
      driftOffset.current.y = lerp(driftOffset.current.y, targetDriftY, driftLerpFactor);

      targetVel.current.z += scrollAccum.current;
      scrollAccum.current *= 0.8;

      targetVel.current.x = clamp(targetVel.current.x, -MAX_VELOCITY, MAX_VELOCITY);
      targetVel.current.y = clamp(targetVel.current.y, -MAX_VELOCITY, MAX_VELOCITY);
      targetVel.current.z = clamp(targetVel.current.z, -MAX_VELOCITY, MAX_VELOCITY);

      velocity.current.x = lerp(velocity.current.x, targetVel.current.x, 0.16);
      velocity.current.y = lerp(velocity.current.y, targetVel.current.y, 0.16);
      velocity.current.z = lerp(velocity.current.z, targetVel.current.z, 0.16);

      // Apply velocity to BASE position
      basePosition.current.x += velocity.current.x;
      basePosition.current.y += velocity.current.y;
      basePosition.current.z += velocity.current.z;

      // Camera position is Base + Drift
      camera.position.x = basePosition.current.x + driftOffset.current.x;
      camera.position.y = basePosition.current.y + driftOffset.current.y;
      camera.position.z = basePosition.current.z; // We don't drift Z

      targetVel.current.x *= 0.9;
      targetVel.current.y *= 0.9;
      targetVel.current.z *= 0.9;

      // Update chunks based on BASE position (so chunks don't jitter with drift)
      const cx = Math.floor(basePosition.current.x / CHUNK_SIZE);
      const cy = Math.floor(basePosition.current.y / CHUNK_SIZE);
      const cz = Math.floor(basePosition.current.z / CHUNK_SIZE);
      const key = `${cx},${cy},${cz}`;

      if (key !== lastChunkKey.current) {
        // Store the pending update
        pendingChunkUpdate.current = { cx, cy, cz };
        lastChunkKey.current = key;
      }

      // Throttle chunk updates: use time-based throttling to prevent lag during rapid zoom
      // This prevents expensive React re-renders from blocking the animation
      const zoomSpeed = Math.abs(velocity.current.z);
      const throttleMs = getChunkUpdateThrottleMs(isZooming, zoomSpeed);

      if (pendingChunkUpdate.current && shouldThrottleUpdate(lastChunkUpdateTime.current, throttleMs, now)) {
        lastChunkUpdateTime.current = now;
        const { cx: updateCx, cy: updateCy, cz: updateCz } = pendingChunkUpdate.current;
        pendingChunkUpdate.current = null;

        // Defer chunk update to next idle period to avoid blocking animation
        // Use double deferral: startTransition + setTimeout to ensure it's truly non-blocking
        React.startTransition(() => {
          // Further defer with setTimeout to let the current frame complete
          setTimeout(() => {
            setChunks(() => {
              const nextChunks: ChunkData[] = [];
              for (const offset of CHUNK_OFFSETS) {
                const keyChunk = `${updateCx + offset.dx},${updateCy + offset.dy},${updateCz + offset.dz}`;
                nextChunks.push({
                  key: keyChunk,
                  cx: updateCx + offset.dx,
                  cy: updateCy + offset.dy,
                  cz: updateCz + offset.dz,
                });
              }
              return nextChunks;
            });
          }, 0);
        });
      }
    });

    // Initial chunks
    React.useEffect(() => {
      // Sync base position with initial camera position
      basePosition.current.x = camera.position.x;
      basePosition.current.y = camera.position.y;
      basePosition.current.z = camera.position.z;

      // Force initial load
      const initialChunks: ChunkData[] = CHUNK_OFFSETS.map((offset) => {
        return {
          key: `${offset.dx},${offset.dy},${offset.dz}`,
          cx: offset.dx,
          cy: offset.dy,
          cz: offset.dz,
        };
      });
      setChunks(initialChunks);
      // We only want to run this once on mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <>
        {chunks.map((chunk) => (
          <Chunk key={chunk.key} cx={chunk.cx} cy={chunk.cy} cz={chunk.cz} media={media} />
        ))}
      </>
    );
  }
);

export function InfiniteCanvasScene({ media, onReady }: InfiniteCanvasProps) {
  const [fps, setFps] = React.useState(0);
  const isTouchDevice = useIsTouchDevice();

  // Read the CSS variable for background color
  const bgColor = React.useMemo(() => {
    if (typeof window === "undefined") return "#d6c8ad";
    const styles = getComputedStyle(document.body);
    return styles.getPropertyValue("--color-background").trim() || "#d6c8ad";
  }, []);

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
        style={{ backgroundColor: bgColor }}
      >
        <color attach="background" args={[bgColor]} />
        <fog attach="fog" args={[bgColor, 120, 320]} />
        <SceneController media={media} onFpsUpdate={setFps} onReady={onReady} />
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
        <b>{fps} FPS</b> | {media.length} Artworks
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
