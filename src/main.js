import * as THREE from 'three';
import { createWorld } from './world.js';
import { createCharacter } from './character.js';
import { createControls } from './controls.js';
import { createCamera } from './camera.js';
import { COLORS, getTerrainHeight } from './utils.js';
import { createSvenBotschnig } from './npc.js';

// ─── Renderer ────────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ─── Scene ───────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.fog);
scene.fog = new THREE.FogExp2(COLORS.fog, 0.012);

// ─── Lighting ────────────────────────────────────────────────────────────────

// Warm ambient
const ambient = new THREE.AmbientLight(COLORS.ambient, 0.4);
scene.add(ambient);

// Sky/ground hemisphere
const hemi = new THREE.HemisphereLight(COLORS.skyLight, COLORS.groundLight, 0.5);
scene.add(hemi);

// Main directional (sun)
const sun = new THREE.DirectionalLight(COLORS.sunLight, 1.2);
sun.position.set(30, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.width = 2048;
sun.shadow.mapSize.height = 2048;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.001;
scene.add(sun);

// ─── World ───────────────────────────────────────────────────────────────────

createWorld(scene);

// ─── Character ───────────────────────────────────────────────────────────────

const character = createCharacter();
scene.add(character.group);

// Place character at center
const spawnY = getTerrainHeight(0, 0);
character.group.position.set(0, spawnY, 0);

// ─── NPC: Sven Botschnig ─────────────────────────────────────────────────────

const sven = createSvenBotschnig();
const svenX = 6, svenZ = 4;
const svenY = getTerrainHeight(svenX, svenZ);
sven.group.position.set(svenX, svenY, svenZ);
scene.add(sven.group);

// ─── Camera ──────────────────────────────────────────────────────────────────

const cam = createCamera(window.innerWidth / window.innerHeight);

// ─── Controls ────────────────────────────────────────────────────────────────

const controls = createControls(canvas);

// ─── Overlay / Pointer Lock ──────────────────────────────────────────────────

const overlay = document.getElementById('overlay');

overlay.addEventListener('click', () => {
  controls.requestLock();
});

document.addEventListener('pointerlockchange', () => {
  if (controls.locked) {
    overlay.classList.add('hidden');
  } else {
    overlay.classList.remove('hidden');
  }
});

// ─── Resize ──────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  cam.resize(window.innerWidth / window.innerHeight);
});

// ─── Dialogue System ─────────────────────────────────────────────────────────

const INTERACT_DISTANCE = 5;
const interactPrompt = document.getElementById('interact-prompt');
const dialogueBox = document.getElementById('dialogue-box');
const dialogueText = document.getElementById('dialogue-text');

const svenLines = [
  'Hallo! Ich bin Sven. Ich hab mal versucht, eine Tür zu hacken. Eine echte Tür. Mit einer Axt. Hat nicht kompiliert.',
  'Wusstest du, dass Bäume eigentlich nur große Stöcke sind, die sich nicht entscheiden konnten, wann sie aufhören sollen zu wachsen?',
  'Ich hab letzte Nacht 8 Stunden geschlafen. Also... standby. Gleiche Sache.',
  'Mein Lieblingsbuch ist das Telefonbuch. So viele Charaktere, aber die Handlung ist schwach.',
  'Ich wollte mal ein Sandwich machen, aber ich hatte nur zwei Brote und nichts dazwischen. Hab trotzdem draufgebissen. War ein Luftsandwich. 3 von 10.',
  'Wenn man "Sven Botschnig" rückwärts liest, kommt... ähm... *rechnet 45 Sekunden* ...ich hab mich verrechnet.',
  'Mein Therapeut sagt, ich soll mehr unter Leute gehen. Aber ich BIN Leute. Schachmatt.',
  'Ich hab gestern eine Wolke gesehen, die aussah wie ein Fehler in der Matrix. Oder wie ein Schaf. Bin mir nicht sicher.',
  'Fun Fact: Wenn du alle meine Schaltkreise aneinanderlegst, hast du... einen kaputten Roboter. Bitte mach das nicht.',
  'Ich hab mal versucht Vögeln beim Fliegen zuzugucken und bin gegen einen Baum gelaufen. Der Baum hat sich nicht entschuldigt.',
  'Weißt du was geil wäre? Kniescheiben die leuchten. Denk mal drüber nach.',
  'Mein Passwort ist "passwort". Warte... hätte ich das laut sagen sollen?',
  'Ich hab 47 Tabs im Kopf offen und keiner davon spielt Musik. Was für eine Verschwendung.',
  'Letztens hat mich jemand gefragt ob ich intelligent bin. Ich hab 20 Minuten gebraucht um "Ja" zu sagen. Das war wohl die falsche Antwort.',
];

let dialogueOpen = false;
let currentLineIndex = -1;
let nearSven = false;
let eKeyHandled = false;

document.addEventListener('keydown', (e) => {
  if (e.code !== 'KeyE' || eKeyHandled) return;
  eKeyHandled = true;

  if (dialogueOpen) {
    // Advance or close
    currentLineIndex++;
    if (currentLineIndex >= 3) {
      // Close after 3 lines per conversation
      dialogueOpen = false;
      dialogueBox.classList.add('hidden');
    } else {
      dialogueText.textContent = svenLines[Math.floor(Math.random() * svenLines.length)];
    }
  } else if (nearSven) {
    // Open dialogue
    dialogueOpen = true;
    currentLineIndex = 0;
    dialogueText.textContent = svenLines[Math.floor(Math.random() * svenLines.length)];
    dialogueBox.classList.remove('hidden');
    interactPrompt.classList.add('hidden');
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyE') eKeyHandled = false;
});

// ─── Game Loop ───────────────────────────────────────────────────────────────

const clock = new THREE.Clock();
let targetRotationY = 0;
let velocityY = 0;
let isGrounded = true;
const GRAVITY = -20;
const JUMP_FORCE = 8;

function gameLoop() {
  requestAnimationFrame(gameLoop);

  const delta = Math.min(clock.getDelta(), 0.05); // Cap delta to avoid huge jumps

  // Update controls
  controls.update(delta);

  // Move character
  if (controls.isMoving) {
    const move = controls.moveDirection.clone().multiplyScalar(controls.speed * delta);
    character.group.position.x += move.x;
    character.group.position.z += move.z;

    // Smooth rotate character to face movement direction
    targetRotationY = Math.atan2(controls.moveDirection.x, controls.moveDirection.z);
  }

  // Smooth character rotation
  const currentRot = character.group.rotation.y;
  let diff = targetRotationY - currentRot;

  // Shortest path rotation
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  character.group.rotation.y += diff * Math.min(1, 10 * delta);

  // Jump
  const charX = character.group.position.x;
  const charZ = character.group.position.z;
  const terrainY = getTerrainHeight(charX, charZ);

  if (controls.jumpPressed && isGrounded) {
    velocityY = JUMP_FORCE;
    isGrounded = false;
  }

  if (!isGrounded) {
    // Airborne: apply gravity
    velocityY += GRAVITY * delta;
    character.group.position.y += velocityY * delta;

    // Landing check
    if (character.group.position.y <= terrainY) {
      character.group.position.y = terrainY;
      velocityY = 0;
      isGrounded = true;
    }
  } else {
    // Grounded: smooth terrain following
    character.group.position.y = THREE.MathUtils.lerp(
      character.group.position.y,
      terrainY,
      Math.min(1, 8 * delta)
    );
  }

  // Keep character in bounds
  const halfSize = 95;
  character.group.position.x = THREE.MathUtils.clamp(character.group.position.x, -halfSize, halfSize);
  character.group.position.z = THREE.MathUtils.clamp(character.group.position.z, -halfSize, halfSize);

  // Update character animation
  character.update(delta, controls.isMoving, controls.speed / 5, isGrounded);

  // Update Sven Botschnig
  sven.update(delta);

  // Sven proximity check
  const dx = character.group.position.x - sven.group.position.x;
  const dz = character.group.position.z - sven.group.position.z;
  const distToSven = Math.sqrt(dx * dx + dz * dz);
  nearSven = distToSven < INTERACT_DISTANCE;

  if (nearSven) {
    // Sven turns to face player
    const angle = Math.atan2(dx, dz);
    sven.group.rotation.y = THREE.MathUtils.lerp(sven.group.rotation.y, angle, Math.min(1, 4 * delta));

    if (!dialogueOpen) {
      interactPrompt.classList.remove('hidden');
    }
  } else {
    interactPrompt.classList.add('hidden');
    if (dialogueOpen) {
      dialogueOpen = false;
      dialogueBox.classList.add('hidden');
    }
  }

  // Update shadow camera to follow character
  sun.position.set(
    character.group.position.x + 30,
    40,
    character.group.position.z + 20
  );
  sun.target.position.copy(character.group.position);
  sun.target.updateMatrixWorld();

  // Update camera
  cam.update(delta, character.group.position, controls.yaw, controls.pitch);

  // Render
  renderer.render(scene, cam.camera);
}

gameLoop();
