import * as THREE from 'three';
import { mat } from './utils.js';

/**
 * Create "Sven Botschnig" - a hilariously dumb-looking robot NPC.
 * Returns { group, update(delta) }
 */
export function createSvenBotschnig() {
  const group = new THREE.Group();
  const animState = { time: 0 };

  // ─── Colors ────────────────────────────────────────────────────────────
  const METAL_GREY = 0x8899aa;
  const METAL_DARK = 0x556677;
  const RUST = 0xb5651d;
  const RUST_LIGHT = 0xd4874e;
  const YELLOW_WARN = 0xf5c542;
  const RED_EYE = 0xff2222;
  const GREEN_EYE = 0x22ff66;
  const BLUE_SCREEN = 0x3388ff;

  // ─── Body (dented trash-can shape, asymmetric) ─────────────────────────
  const bodyGeo = new THREE.CylinderGeometry(0.55, 0.7, 1.6, 7);
  // Dent the body by deforming vertices
  const bodyPos = bodyGeo.attributes.position;
  for (let i = 0; i < bodyPos.count; i++) {
    const x = bodyPos.getX(i);
    const y = bodyPos.getY(i);
    const z = bodyPos.getZ(i);
    // Random dents
    const dent = Math.sin(x * 5 + z * 3) * 0.06;
    bodyPos.setX(i, x + dent);
    bodyPos.setZ(i, z + dent * 0.5);
  }
  bodyGeo.computeVertexNormals();

  const body = new THREE.Mesh(bodyGeo, mat(METAL_GREY, { flatShading: true, roughness: 0.6 }));
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);

  // Rusty belly panel
  const panelGeo = new THREE.BoxGeometry(0.5, 0.4, 0.1);
  const panel = new THREE.Mesh(panelGeo, mat(RUST, { flatShading: true }));
  panel.position.set(0, 1.1, 0.6);
  group.add(panel);

  // Belly "screen" (always shows :P)
  const screenGeo = new THREE.PlaneGeometry(0.35, 0.25);
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 128;
  screenCanvas.height = 64;
  const sctx = screenCanvas.getContext('2d');
  sctx.fillStyle = '#112233';
  sctx.fillRect(0, 0, 128, 64);
  sctx.font = 'bold 36px monospace';
  sctx.fillStyle = '#33ff88';
  sctx.textAlign = 'center';
  sctx.fillText(':P', 64, 44);
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.set(0, 1.15, 0.66);
  group.add(screen);

  // ─── Head (box, tilted, too small for the body) ────────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.y = 2.3;
  headGroup.rotation.z = 0.15; // permanent tilt - looks dumb

  const headGeo = new THREE.BoxGeometry(0.65, 0.5, 0.55, 1, 1, 1);
  const head = new THREE.Mesh(headGeo, mat(METAL_DARK, { flatShading: true, roughness: 0.5 }));
  head.castShadow = true;
  headGroup.add(head);

  // Left eye - BIG red lens
  const leftEyeGeo = new THREE.SphereGeometry(0.15, 8, 6);
  const leftEye = new THREE.Mesh(leftEyeGeo, mat(RED_EYE, { roughness: 0.2, metalness: 0.8, emissive: RED_EYE, emissiveIntensity: 0.3 }));
  leftEye.position.set(-0.18, 0.05, 0.28);
  headGroup.add(leftEye);

  // Right eye - tiny green, way too small, placed wrong
  const rightEyeGeo = new THREE.SphereGeometry(0.07, 6, 4);
  const rightEye = new THREE.Mesh(rightEyeGeo, mat(GREEN_EYE, { roughness: 0.2, metalness: 0.8, emissive: GREEN_EYE, emissiveIntensity: 0.3 }));
  rightEye.position.set(0.2, -0.05, 0.28); // offset lower - asymmetric
  headGroup.add(rightEye);

  // Mouth - crooked metal strip smile
  const mouthGeo = new THREE.BoxGeometry(0.35, 0.04, 0.05);
  const mouth = new THREE.Mesh(mouthGeo, mat(0x222222));
  mouth.position.set(0.03, -0.15, 0.28);
  mouth.rotation.z = -0.2; // crooked
  headGroup.add(mouth);

  // ─── Antenna (bent, with a bobble) ─────────────────────────────────────
  const antennaGroup = new THREE.Group();
  antennaGroup.position.set(0.1, 0.25, 0);

  const antennaStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.5, 4),
    mat(METAL_GREY)
  );
  antennaStick.position.y = 0.25;
  antennaStick.rotation.z = 0.3; // bent
  antennaGroup.add(antennaStick);

  // Bobble on top
  const bobble = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 6, 4),
    mat(YELLOW_WARN, { emissive: YELLOW_WARN, emissiveIntensity: 0.4 })
  );
  bobble.position.set(0.15, 0.52, 0);
  antennaGroup.add(bobble);

  headGroup.add(antennaGroup);
  group.add(headGroup);

  // ─── Arms (comically different sizes) ──────────────────────────────────

  // Left arm - long noodle arm
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.7, 1.7, 0);

  const leftArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.08, 1.2, 5),
    mat(RUST_LIGHT, { flatShading: true })
  );
  leftArm.position.y = -0.6;
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);

  // Claw hand (just a box)
  const leftClaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.12, 0.15),
    mat(METAL_DARK, { flatShading: true })
  );
  leftClaw.position.y = -1.2;
  leftArmGroup.add(leftClaw);

  group.add(leftArmGroup);

  // Right arm - stubby little arm
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.7, 1.6, 0);

  const rightArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.45, 5),
    mat(RUST, { flatShading: true })
  );
  rightArm.position.y = -0.22;
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);

  // Tiny pincer
  const rightPincer = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.15, 4),
    mat(METAL_DARK, { flatShading: true })
  );
  rightPincer.position.y = -0.5;
  rightPincer.rotation.x = Math.PI;
  rightArmGroup.add(rightPincer);

  group.add(rightArmGroup);

  // ─── Legs (one thick, one thin, different heights) ─────────────────────

  // Left leg - thick piston
  const leftLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.5, 6),
    mat(METAL_GREY, { flatShading: true })
  );
  leftLeg.position.set(-0.3, 0.25, 0);
  leftLeg.castShadow = true;
  group.add(leftLeg);

  // Left foot - big flat box
  const leftFoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.1, 0.45),
    mat(METAL_DARK, { flatShading: true })
  );
  leftFoot.position.set(-0.3, 0.0, 0.05);
  leftFoot.castShadow = true;
  group.add(leftFoot);

  // Right leg - thin stick
  const rightLeg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.55, 4),
    mat(RUST_LIGHT, { flatShading: true })
  );
  rightLeg.position.set(0.25, 0.27, 0);
  rightLeg.castShadow = true;
  group.add(rightLeg);

  // Right foot - tiny circle
  const rightFoot = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 5, 3),
    mat(METAL_DARK, { flatShading: true })
  );
  rightFoot.position.set(0.25, 0.02, 0);
  rightFoot.scale.y = 0.4;
  group.add(rightFoot);

  // ─── Name Tag ──────────────────────────────────────────────────────────
  const nameTag = createNameTag('Sven Botschnig');
  nameTag.position.y = 3.2;
  group.add(nameTag);

  // ─── Idle Animation ───────────────────────────────────────────────────

  function update(delta) {
    animState.time += delta;
    const t = animState.time;

    // Head wobble (looks around stupidly)
    headGroup.rotation.y = Math.sin(t * 0.7) * 0.4;
    headGroup.rotation.x = Math.sin(t * 0.5 + 1) * 0.1;

    // Antenna spring wobble
    antennaGroup.rotation.z = Math.sin(t * 3) * 0.2 + Math.sin(t * 7) * 0.05;
    antennaGroup.rotation.x = Math.sin(t * 2.3) * 0.1;

    // Bobble glow pulse
    bobble.material.emissiveIntensity = 0.3 + Math.sin(t * 4) * 0.3;

    // Eye glow pulse (unsynchronized - looks broken)
    leftEye.material.emissiveIntensity = 0.2 + Math.sin(t * 2) * 0.3;
    rightEye.material.emissiveIntensity = 0.2 + Math.sin(t * 3.7) * 0.3;

    // Arms dangle
    leftArmGroup.rotation.x = Math.sin(t * 0.8) * 0.15;
    leftArmGroup.rotation.z = Math.sin(t * 0.6) * 0.05 - 0.05;
    rightArmGroup.rotation.x = Math.sin(t * 1.1 + 2) * 0.2;
    rightArmGroup.rotation.z = Math.sin(t * 0.9) * 0.05 + 0.05;

    // Body slight sway (drunk robot)
    body.rotation.z = Math.sin(t * 0.4) * 0.03;

    // Name tag always faces camera (billboard) - handled in main loop
  }

  return { group, update, nameTag };
}

function createNameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.roundRect(0, 0, 512, 64, 10);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#ffcc00';
  ctx.lineWidth = 3;
  ctx.roundRect(4, 4, 504, 56, 8);
  ctx.stroke();

  // Text
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#ffdd44';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 34);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(2.5, 0.35, 1);

  return sprite;
}
