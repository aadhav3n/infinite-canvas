import * as THREE from "three";
import type { MediaItem } from "./types";

const MAX_TEXTURES = 280;
const lru = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();
loader.setCrossOrigin("anonymous");

const touch = (key: string) => {
  const tex = lru.get(key);
  if (!tex) return;
  lru.delete(key);
  lru.set(key, tex);
};

const evictIfNeeded = () => {
  while (lru.size > MAX_TEXTURES) {
    const [key, texture] = lru.entries().next().value as [string, THREE.Texture];
    lru.delete(key);
    texture.dispose();
  }
};

export const getTexture = (item: MediaItem): THREE.Texture | null => {
  const key = item.url;
  const existing = lru.get(key);
  if (existing) {
    touch(key);
    return existing;
  }

  const texture = loader.load(key);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.colorSpace = THREE.SRGBColorSpace;

  lru.set(key, texture);
  evictIfNeeded();
  return texture;
};
