import * as THREE from "three";
import type { MediaItem } from "./types";

const textureCache = new Map<string, THREE.Texture>();
const loadCallbacks = new Map<string, Set<(tex: THREE.Texture) => void>>();
const loader = new THREE.TextureLoader();

const isTextureLoaded = (tex: THREE.Texture): boolean => {
  const img = tex.image as HTMLImageElement | undefined;
  return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
};

const getIsTouchDevice = (): boolean => {
  const hasTouchEvent = "ontouchstart" in window;
  const hasTouchPoints = navigator.maxTouchPoints > 0;
  const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return hasTouchEvent || hasTouchPoints || hasCoarsePointer;
};

const resizeImageForMobile = (image: HTMLImageElement, maxDimension: number): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        resolve(image);
        return;
      }

      const { width, height } = image;
      
      // If image is already small enough, return as-is
      if (width <= maxDimension && height <= maxDimension) {
        resolve(image);
        return;
      }
      
      const aspectRatio = width / height;
      
      let newWidth = width;
      let newHeight = height;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          newWidth = maxDimension;
          newHeight = Math.round(maxDimension / aspectRatio);
        } else {
          newHeight = maxDimension;
          newWidth = Math.round(maxDimension * aspectRatio);
        }
      }
      
      // Ensure dimensions are valid
      if (newWidth <= 0 || newHeight <= 0 || !Number.isFinite(newWidth) || !Number.isFinite(newHeight)) {
        resolve(image);
        return;
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      ctx.drawImage(image, 0, 0, newWidth, newHeight);
      
      const resizedImage = new Image();
      resizedImage.onload = () => resolve(resizedImage);
      resizedImage.onerror = () => {
        // If canvas resize fails, return original image
        resolve(image);
      };
      
      try {
        resizedImage.src = canvas.toDataURL("image/jpeg", 0.9);
      } catch (err) {
        // If toDataURL fails, return original image
        resolve(image);
      }
    } catch (err) {
      // If anything fails, return original image
      resolve(image);
    }
  });
};

export const getTexture = (item: MediaItem, onLoad?: (texture: THREE.Texture) => void): THREE.Texture => {
  const key = item.url;
  const existing = textureCache.get(key);

  if (existing) {
    if (onLoad) {
      if (isTextureLoaded(existing)) {
        onLoad(existing);
      } else {
        loadCallbacks.get(key)?.add(onLoad);
      }
    }
    return existing;
  }

  const callbacks = new Set<(tex: THREE.Texture) => void>();
  if (onLoad) callbacks.add(onLoad);
  loadCallbacks.set(key, callbacks);

  const isMobile = getIsTouchDevice();
  const maxDimension = isMobile ? 1080 : Infinity;

  // If mobile and image dimensions exceed max, we need to resize
  // Only attempt resize if we have valid dimensions and they exceed the limit
  const needsResize = isMobile && 
    typeof item.width === 'number' && 
    typeof item.height === 'number' && 
    item.width > 0 && 
    item.height > 0 &&
    (item.width > maxDimension || item.height > maxDimension);

  if (needsResize) {
    // Load image first, then resize for mobile
    const texture = new THREE.Texture();
    textureCache.set(key, texture);
    
    const img = new Image();
    // Don't set crossOrigin for same-origin images - it can cause CORS issues
    // Only set it if the URL is from a different origin
    try {
      const urlObj = new URL(key, window.location.href);
      if (urlObj.origin !== window.location.origin) {
        img.crossOrigin = "anonymous";
      }
    } catch {
      // If URL parsing fails, assume same origin
    }
    
    img.onload = async () => {
      try {
        const resizedImage = await resizeImageForMobile(img, maxDimension);
        
        texture.image = resizedImage;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 4;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.needsUpdate = true;

        loadCallbacks.get(key)?.forEach((cb) => {
          try {
            cb(texture);
          } catch (err) {
            console.error(`Callback failed: ${JSON.stringify(err)}`);
          }
        });
        loadCallbacks.delete(key);
      } catch (err) {
        console.error("Failed to resize image:", err);
        // Fallback to regular loading
        loader.load(
          key,
          (tex) => {
            texture.image = tex.image;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            texture.anisotropy = 4;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.needsUpdate = true;

            loadCallbacks.get(key)?.forEach((cb) => {
              try {
                cb(texture);
              } catch (callbackErr) {
                console.error(`Callback failed: ${JSON.stringify(callbackErr)}`);
              }
            });
            loadCallbacks.delete(key);
          },
          undefined,
          (loadErr) => console.error("Texture load failed:", key, loadErr)
        );
      }
    };

    img.onerror = (error) => {
      console.error("Image load failed, falling back to regular loader:", key, error);
      // Fallback to regular loader if image load fails
      loader.load(
        key,
        (tex) => {
          texture.image = tex.image;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          texture.anisotropy = 4;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;

          loadCallbacks.get(key)?.forEach((cb) => {
            try {
              cb(texture);
            } catch (err) {
              console.error(`Callback failed: ${JSON.stringify(err)}`);
            }
          });
          loadCallbacks.delete(key);
        },
        undefined,
        (err) => console.error("Texture load failed:", key, err)
      );
    };

    // Handle relative URLs properly
    const imageUrl = key.startsWith('/') || key.startsWith('http') ? key : `/${key}`;
    img.src = imageUrl;
    
    return texture;
  } else {
    // Regular loading for desktop or images that don't need resizing
    const texture = loader.load(
      key,
      (tex) => {
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = 4;
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;

        textureCache.set(key, tex);

        loadCallbacks.get(key)?.forEach((cb) => {
          try {
            cb(tex);
          } catch (err) {
            console.error(`Callback failed: ${JSON.stringify(err)}`);
          }
        });
        loadCallbacks.delete(key);
      },
      undefined,
      (err) => console.error("Texture load failed:", key, err)
    );

    textureCache.set(key, texture);
    return texture;
  }
};
