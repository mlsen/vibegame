import * as THREE from 'three';
import {
  COLORS, TERRAIN_SIZE, TERRAIN_SEGMENTS,
  terrainNoise, getTerrainHeight, randomRange, mat,
} from './utils.js';

/**
 * Create the entire world and return a group + helpers
 */
export function createWorld(scene) {
  const world = new THREE.Group();

  const terrain = createTerrain();
  const water = createWater();
  const trees = createTrees();
  const rocks = createRocks();
  const flowers = createFlowers();

  world.add(terrain);
  world.add(water);
  world.add(trees);
  world.add(rocks);
  world.add(flowers);

  scene.add(world);

  return { world, terrain };
}

// ─── Terrain ────────────────────────────────────────────────────────────────

function createTerrain() {
  const geo = new THREE.PlaneGeometry(
    TERRAIN_SIZE, TERRAIN_SIZE,
    TERRAIN_SEGMENTS, TERRAIN_SEGMENTS
  );
  geo.rotateX(-Math.PI / 2);

  const positions = geo.attributes.position;
  const colors = [];

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = terrainNoise(x, z);
    positions.setY(i, y);

    // Vertex coloring based on height and slope
    const color = new THREE.Color();
    if (y < 0) {
      color.setHex(COLORS.dirt);
    } else if (y < 2) {
      color.lerpColors(
        new THREE.Color(COLORS.grass),
        new THREE.Color(COLORS.grassDark),
        y / 2
      );
    } else {
      color.lerpColors(
        new THREE.Color(COLORS.grassDark),
        new THREE.Color(COLORS.dirt),
        Math.min((y - 2) / 6, 1)
      );
    }

    // Add slight random variation
    const variation = randomRange(-0.03, 0.03);
    color.r = Math.max(0, Math.min(1, color.r + variation));
    color.g = Math.max(0, Math.min(1, color.g + variation));
    color.b = Math.max(0, Math.min(1, color.b + variation));

    colors.push(color.r, color.g, color.b);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: false,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Water ──────────────────────────────────────────────────────────────────

function createWater() {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE);
  geo.rotateX(-Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    color: COLORS.water,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.3,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.position.y = -0.5;
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Trees ──────────────────────────────────────────────────────────────────

function createTrees() {
  const group = new THREE.Group();
  const treeCount = Math.floor(randomRange(80, 120));

  for (let i = 0; i < treeCount; i++) {
    const x = randomRange(-TERRAIN_SIZE / 2 + 10, TERRAIN_SIZE / 2 - 10);
    const z = randomRange(-TERRAIN_SIZE / 2 + 10, TERRAIN_SIZE / 2 - 10);

    // Skip trees too close to center (spawn area)
    if (Math.sqrt(x * x + z * z) < 12) continue;

    const y = getTerrainHeight(x, z);
    // Skip underwater positions
    if (y < 0.2) continue;

    const tree = Math.random() > 0.4 ? createDeciduousTree() : createPineTree();
    tree.position.set(x, y, z);
    tree.rotation.y = randomRange(0, Math.PI * 2);

    const scale = randomRange(0.7, 1.3);
    tree.scale.setScalar(scale);

    group.add(tree);
  }

  return group;
}

function createDeciduousTree() {
  const tree = new THREE.Group();

  // Trunk
  const trunkHeight = randomRange(2, 3.5);
  const trunkRadius = randomRange(0.15, 0.25);
  const trunkGeo = new THREE.CylinderGeometry(
    trunkRadius * 0.7, trunkRadius, trunkHeight, 6
  );
  const trunk = new THREE.Mesh(trunkGeo, mat(COLORS.trunk));
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // Crown (2-3 overlapping spheres)
  const crownLayers = Math.floor(randomRange(2, 4));
  const crownColor = [COLORS.leaves, COLORS.leavesDark, COLORS.leavesLight][
    Math.floor(Math.random() * 3)
  ];

  for (let i = 0; i < crownLayers; i++) {
    const radius = randomRange(1.2, 2.0);
    const crownGeo = new THREE.SphereGeometry(radius, 7, 5);
    const crown = new THREE.Mesh(crownGeo, mat(crownColor, { flatShading: true }));
    crown.position.y = trunkHeight + randomRange(0.3, 1.0);
    crown.position.x = randomRange(-0.5, 0.5);
    crown.position.z = randomRange(-0.5, 0.5);
    crown.castShadow = true;
    tree.add(crown);
  }

  return tree;
}

function createPineTree() {
  const tree = new THREE.Group();

  const trunkHeight = randomRange(3, 5);
  const trunkRadius = randomRange(0.12, 0.2);
  const trunkGeo = new THREE.CylinderGeometry(
    trunkRadius * 0.5, trunkRadius, trunkHeight, 6
  );
  const trunk = new THREE.Mesh(trunkGeo, mat(COLORS.trunkDark));
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // Cone layers
  const layers = Math.floor(randomRange(3, 5));
  const pineColor = Math.random() > 0.5 ? COLORS.pine : COLORS.pineDark;

  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const coneRadius = randomRange(1.0, 1.8) * (1 - t * 0.4);
    const coneHeight = randomRange(1.5, 2.5);
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 6);
    const cone = new THREE.Mesh(coneGeo, mat(pineColor, { flatShading: true }));
    cone.position.y = trunkHeight * 0.5 + i * (coneHeight * 0.5);
    cone.castShadow = true;
    tree.add(cone);
  }

  return tree;
}

// ─── Rocks ──────────────────────────────────────────────────────────────────

function createRocks() {
  const group = new THREE.Group();
  const rockCount = Math.floor(randomRange(40, 60));

  for (let i = 0; i < rockCount; i++) {
    const x = randomRange(-TERRAIN_SIZE / 2 + 5, TERRAIN_SIZE / 2 - 5);
    const z = randomRange(-TERRAIN_SIZE / 2 + 5, TERRAIN_SIZE / 2 - 5);

    if (Math.sqrt(x * x + z * z) < 8) continue;

    const y = getTerrainHeight(x, z);

    const rockColor = [COLORS.rock, COLORS.rockDark, COLORS.rockLight][
      Math.floor(Math.random() * 3)
    ];

    const geo = Math.random() > 0.5
      ? new THREE.DodecahedronGeometry(randomRange(0.3, 1.2), 0)
      : new THREE.IcosahedronGeometry(randomRange(0.3, 1.0), 0);

    // Deform vertices slightly for organic look
    const positions = geo.attributes.position;
    for (let j = 0; j < positions.count; j++) {
      positions.setX(j, positions.getX(j) * randomRange(0.8, 1.2));
      positions.setY(j, positions.getY(j) * randomRange(0.6, 1.0));
      positions.setZ(j, positions.getZ(j) * randomRange(0.8, 1.2));
    }
    geo.computeVertexNormals();

    const rock = new THREE.Mesh(geo, mat(rockColor, { flatShading: true, roughness: 0.95 }));
    rock.position.set(x, y - 0.1, z);
    rock.rotation.set(
      randomRange(0, Math.PI),
      randomRange(0, Math.PI),
      randomRange(0, Math.PI)
    );
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  return group;
}

// ─── Flowers ────────────────────────────────────────────────────────────────

function createFlowers() {
  const group = new THREE.Group();
  const flowerCount = Math.floor(randomRange(100, 200));

  const flowerColors = [
    COLORS.flowerRed, COLORS.flowerYellow, COLORS.flowerPurple,
    COLORS.flowerWhite, COLORS.flowerPink, COLORS.flowerOrange,
  ];

  for (let i = 0; i < flowerCount; i++) {
    const x = randomRange(-TERRAIN_SIZE / 2 + 5, TERRAIN_SIZE / 2 - 5);
    const z = randomRange(-TERRAIN_SIZE / 2 + 5, TERRAIN_SIZE / 2 - 5);
    const y = getTerrainHeight(x, z);

    if (y < 0.3) continue;

    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 3);
    const stem = new THREE.Mesh(stemGeo, mat(0x2d5a1e));
    stem.position.set(x, y + 0.15, z);
    group.add(stem);

    // Flower head
    const headGeo = new THREE.SphereGeometry(randomRange(0.06, 0.12), 5, 4);
    const head = new THREE.Mesh(headGeo, mat(color, { roughness: 0.5 }));
    head.position.set(x, y + 0.3 + randomRange(0, 0.1), z);
    group.add(head);
  }

  return group;
}
