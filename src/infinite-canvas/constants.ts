export const CHUNK_SIZE = 110;
export const ITEMS_PER_CHUNK = 5;
export const RENDER_DISTANCE = 2;
export const CHUNK_FADE_MARGIN = 1;
export const MAX_VELOCITY = 3.2;
export const VISIBILITY_LERP = 0.18;
export const DEPTH_FADE_START = 140;
export const DEPTH_FADE_END = 260;
export const MAX_DIST = RENDER_DISTANCE + CHUNK_FADE_MARGIN;

export type ChunkOffset = {
  dx: number;
  dy: number;
  dz: number;
  dist: number;
};

export const CHUNK_OFFSETS: ChunkOffset[] = (() => {
  const offsets: ChunkOffset[] = [];
  for (let dx = -MAX_DIST; dx <= MAX_DIST; dx++) {
    for (let dy = -MAX_DIST; dy <= MAX_DIST; dy++) {
      for (let dz = -MAX_DIST; dz <= MAX_DIST; dz++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
        if (dist > MAX_DIST) continue;
        offsets.push({ dx, dy, dz, dist });
      }
    }
  }
  return offsets;
})();
