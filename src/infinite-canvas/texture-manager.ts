import * as THREE from "three";
import type { MediaItem } from "./types";

// Media texture cache
const textureCache = new Map<string, THREE.Texture>();
const videoElements = new Map<string, HTMLVideoElement>();

export const getTexture = (item: MediaItem): THREE.Texture | null => {
  const cachedTexture = textureCache.get(item.url);

  if (cachedTexture) {
    return cachedTexture;
  }

  if (item.type === "video") {
    let video = videoElements.get(item.url);

    if (!video) {
      video = document.createElement("video");
      video.src = item.url;
      video.crossOrigin = "anonymous";
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      video.play().catch(() => {});
      videoElements.set(item.url, video);
    }

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    textureCache.set(item.url, texture);
    return texture;
  }

  const texture = new THREE.TextureLoader().load(item.url);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  textureCache.set(item.url, texture);
  return texture;
};
