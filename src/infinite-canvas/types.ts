import type * as THREE from "three";

export type MediaItem = {
  url: string;
  type: "image" | "video";
};

export type InfiniteCanvasProps = {
  media: MediaItem[];
};

export type ChunkData = {
  key: string;
  cx: number;
  cy: number;
  cz: number;
  visibility: number;
};

export type PlaneData = {
  id: string;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  mediaIndex: number;
};
