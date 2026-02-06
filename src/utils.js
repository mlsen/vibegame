import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

// Seeded noise instances
const noise2D = createNoise2D();
const noise2D_2 = createNoise2D(() => 0.5);
const noise2D_3 = createNoise2D(() => 0.8);

// WoW-inspired color palette
export const COLORS = {
  // Terrain
  grass: 0x4a8c3f,
  grassDark: 0x3a7030,
  dirt: 0x8b6d45,

  // Trees
  trunk: 0x6b4226,
  trunkDark: 0x4a2e18,
  leaves: 0x2d8a4e,
  leavesDark: 0x1f6b38,
  leavesLight: 0x5cb85c,
  pine: 0x1a5c32,
  pineDark: 0x0f4025,

  // Rocks
  rock: 0x7a7a7a,
  rockDark: 0x5a5a5a,
  rockLight: 0x9a9a9a,

  // Water
  water: 0x3a8fbf,

  // Sky / Fog
  skyTop: 0x87ceeb,
  skyBottom: 0xb0d4e8,
  fog: 0xc8dff0,

  // Flowers
  flowerRed: 0xe74c3c,
  flowerYellow: 0xf1c40f,
  flowerPurple: 0x9b59b6,
  flowerWhite: 0xecf0f1,
  flowerPink: 0xff69b4,
  flowerOrange: 0xff8c00,

  // Character
  skin: 0xf5c6a0,
  hairPink: 0xff69b4,
  eyeGreen: 0x2ecc71,
  eyeWhite: 0xffffff,
  pupil: 0x1a1a2e,
  tunicBlue: 0x3a6fb5,
  belt: 0x8b5e3c,
  pantsGreen: 0x5a8a4a,
  boots: 0x5c3a1e,

  // Lighting
  sunLight: 0xffeedd,
  ambient: 0x6688cc,
  skyLight: 0x87ceeb,
  groundLight: 0x4a7a3a,
};

// Terrain configuration
export const TERRAIN_SIZE = 200;
export const TERRAIN_SEGMENTS = 128;
const TERRAIN_HEIGHT_SCALE = 8;
const FLAT_ZONE_RADIUS = 15;

/**
 * Multi-octave noise for terrain heightmap
 */
export function terrainNoise(x, z) {
  const scale1 = 0.02;
  const scale2 = 0.05;
  const scale3 = 0.1;

  let height = 0;
  height += noise2D(x * scale1, z * scale1) * 1.0;
  height += noise2D_2(x * scale2, z * scale2) * 0.5;
  height += noise2D_3(x * scale3, z * scale3) * 0.2;

  // Normalize to [0, 1] range roughly
  height = (height + 1.7) / 3.4;

  // Apply height scale
  height *= TERRAIN_HEIGHT_SCALE;

  // Flatten center zone for spawn area
  const distFromCenter = Math.sqrt(x * x + z * z);
  if (distFromCenter < FLAT_ZONE_RADIUS) {
    const t = distFromCenter / FLAT_ZONE_RADIUS;
    const flatBlend = smoothstep(0, 1, t);
    height = THREE.MathUtils.lerp(1.0, height, flatBlend);
  }

  return height;
}

/**
 * Get terrain height at world position (x, z).
 * Uses bilinear interpolation over the terrain grid.
 */
export function getTerrainHeight(x, z) {
  return terrainNoise(x, z);
}

/**
 * Smoothstep helper
 */
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Random float in range
 */
export function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Create standard material with given color
 */
export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0.1,
    flatShading: opts.flatShading ?? false,
    ...opts,
  });
}
