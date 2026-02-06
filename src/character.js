import * as THREE from 'three';
import { COLORS, mat } from './utils.js';

/**
 * Create a WoW-style female gnome character built from primitives.
 * Returns { group, update(delta, isMoving, speed) }
 */
export function createCharacter() {
  const group = new THREE.Group();

  // Animation state
  const anim = {
    walkTime: 0,
    breatheTime: 0,
    isMoving: false,
    speed: 0,
  };

  // ─── Body parts ────────────────────────────────────────────────────────

  // Torso / Tunic
  const torsoGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.0, 8);
  const torso = new THREE.Mesh(torsoGeo, mat(COLORS.tunicBlue));
  torso.position.y = 1.3;
  torso.castShadow = true;
  group.add(torso);

  // Belt
  const beltGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 8);
  const belt = new THREE.Mesh(beltGeo, mat(COLORS.belt));
  belt.position.y = 0.95;
  belt.castShadow = true;
  group.add(belt);

  // ─── Head ──────────────────────────────────────────────────────────────

  const headGroup = new THREE.Group();
  headGroup.position.y = 2.2;

  // Head sphere (big for gnome proportions)
  const headGeo = new THREE.SphereGeometry(0.45, 12, 10);
  const head = new THREE.Mesh(headGeo, mat(COLORS.skin));
  head.castShadow = true;
  headGroup.add(head);

  // Hair cap
  const hairCapGeo = new THREE.SphereGeometry(0.47, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hairCap = new THREE.Mesh(hairCapGeo, mat(COLORS.hairPink));
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  // Left pigtail bun
  const leftBun = createBun();
  leftBun.position.set(-0.45, 0.1, 0);
  headGroup.add(leftBun);

  // Right pigtail bun
  const rightBun = createBun();
  rightBun.position.set(0.45, 0.1, 0);
  headGroup.add(rightBun);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const pupilGeo = new THREE.SphereGeometry(0.06, 6, 4);

  // Left eye
  const leftEyeWhite = new THREE.Mesh(eyeGeo, mat(COLORS.eyeWhite));
  leftEyeWhite.position.set(-0.15, 0.05, 0.38);
  headGroup.add(leftEyeWhite);

  const leftIris = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 6, 4),
    mat(COLORS.eyeGreen, { roughness: 0.3 })
  );
  leftIris.position.set(-0.15, 0.05, 0.43);
  headGroup.add(leftIris);

  const leftPupil = new THREE.Mesh(pupilGeo, mat(COLORS.pupil));
  leftPupil.position.set(-0.15, 0.05, 0.47);
  headGroup.add(leftPupil);

  // Right eye
  const rightEyeWhite = new THREE.Mesh(eyeGeo, mat(COLORS.eyeWhite));
  rightEyeWhite.position.set(0.15, 0.05, 0.38);
  headGroup.add(rightEyeWhite);

  const rightIris = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 6, 4),
    mat(COLORS.eyeGreen, { roughness: 0.3 })
  );
  rightIris.position.set(0.15, 0.05, 0.43);
  headGroup.add(rightIris);

  const rightPupil = new THREE.Mesh(pupilGeo, mat(COLORS.pupil));
  rightPupil.position.set(0.15, 0.05, 0.47);
  headGroup.add(rightPupil);

  // Nose
  const noseGeo = new THREE.SphereGeometry(0.06, 5, 4);
  const nose = new THREE.Mesh(noseGeo, mat(COLORS.skin));
  nose.position.set(0, -0.05, 0.44);
  headGroup.add(nose);

  // Mouth (small smile line)
  const mouthGeo = new THREE.BoxGeometry(0.12, 0.02, 0.02);
  const mouth = new THREE.Mesh(mouthGeo, mat(0xcc7777));
  mouth.position.set(0, -0.15, 0.42);
  headGroup.add(mouth);

  // Ears (pointed gnome ears)
  const earGeo = new THREE.ConeGeometry(0.08, 0.25, 4);

  const leftEar = new THREE.Mesh(earGeo, mat(COLORS.skin));
  leftEar.position.set(-0.42, -0.05, 0.1);
  leftEar.rotation.z = Math.PI / 2 + 0.3;
  leftEar.rotation.y = 0.3;
  headGroup.add(leftEar);

  const rightEar = new THREE.Mesh(earGeo, mat(COLORS.skin));
  rightEar.position.set(0.42, -0.05, 0.1);
  rightEar.rotation.z = -(Math.PI / 2 + 0.3);
  rightEar.rotation.y = -0.3;
  headGroup.add(rightEar);

  group.add(headGroup);

  // ─── Arms ──────────────────────────────────────────────────────────────

  // Left arm group (pivot at shoulder)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.5, 1.7, 0);

  const leftUpperArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.08, 0.5, 6),
    mat(COLORS.tunicBlue)
  );
  leftUpperArm.position.y = -0.25;
  leftUpperArm.castShadow = true;
  leftArmGroup.add(leftUpperArm);

  const leftHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 4),
    mat(COLORS.skin)
  );
  leftHand.position.y = -0.55;
  leftArmGroup.add(leftHand);

  group.add(leftArmGroup);

  // Right arm group
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.5, 1.7, 0);

  const rightUpperArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.08, 0.5, 6),
    mat(COLORS.tunicBlue)
  );
  rightUpperArm.position.y = -0.25;
  rightUpperArm.castShadow = true;
  rightArmGroup.add(rightUpperArm);

  const rightHand = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 6, 4),
    mat(COLORS.skin)
  );
  rightHand.position.y = -0.55;
  rightArmGroup.add(rightHand);

  group.add(rightArmGroup);

  // ─── Legs ──────────────────────────────────────────────────────────────

  // Left leg group (pivot at hip)
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.18, 0.8, 0);

  const leftThigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.45, 6),
    mat(COLORS.pantsGreen)
  );
  leftThigh.position.y = -0.22;
  leftThigh.castShadow = true;
  leftLegGroup.add(leftThigh);

  const leftBoot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 0.35, 6),
    mat(COLORS.boots)
  );
  leftBoot.position.y = -0.6;
  leftBoot.castShadow = true;
  leftLegGroup.add(leftBoot);

  // Boot toe
  const leftToe = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 5, 4),
    mat(COLORS.boots)
  );
  leftToe.position.set(0, -0.75, 0.05);
  leftToe.scale.set(1, 0.5, 1.3);
  leftLegGroup.add(leftToe);

  group.add(leftLegGroup);

  // Right leg group
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.18, 0.8, 0);

  const rightThigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.45, 6),
    mat(COLORS.pantsGreen)
  );
  rightThigh.position.y = -0.22;
  rightThigh.castShadow = true;
  rightLegGroup.add(rightThigh);

  const rightBoot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.13, 0.35, 6),
    mat(COLORS.boots)
  );
  rightBoot.position.y = -0.6;
  rightBoot.castShadow = true;
  rightLegGroup.add(rightBoot);

  const rightToe = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 5, 4),
    mat(COLORS.boots)
  );
  rightToe.position.set(0, -0.75, 0.05);
  rightToe.scale.set(1, 0.5, 1.3);
  rightLegGroup.add(rightToe);

  group.add(rightLegGroup);

  // ─── Animation Update ─────────────────────────────────────────────────

  function update(delta, isMoving, speed = 1, isGrounded = true) {
    anim.isMoving = isMoving;
    anim.speed = speed;
    anim.breatheTime += delta;

    if (!isGrounded) {
      // ─── Jump pose ──────────────────────────────────────────────────
      // Legs tucked, arms up
      leftLegGroup.rotation.x = -0.5;
      rightLegGroup.rotation.x = -0.5;
      leftArmGroup.rotation.x = -0.8;
      rightArmGroup.rotation.x = -0.8;

      // Pigtails fly up
      leftBun.position.y = 0.3;
      rightBun.position.y = 0.3;
      leftBun.rotation.z = 0.2;
      rightBun.rotation.z = -0.2;

      torso.scale.set(1, 1, 1);
      headGroup.rotation.z = 0;
      return;
    }

    if (isMoving) {
      anim.walkTime += delta * speed * 8;
    } else {
      // Smoothly return to idle
      anim.walkTime *= 0.9;
    }

    const walkPhase = anim.walkTime;
    const walkIntensity = isMoving ? 1 : Math.min(Math.abs(Math.sin(anim.walkTime)) * 0.1, 0.1);

    // Leg swing
    const legSwing = Math.sin(walkPhase) * 0.6 * walkIntensity;
    leftLegGroup.rotation.x = legSwing;
    rightLegGroup.rotation.x = -legSwing;

    // Arm swing (opposite to legs)
    const armSwing = Math.sin(walkPhase) * 0.5 * walkIntensity;
    leftArmGroup.rotation.x = -armSwing;
    rightArmGroup.rotation.x = armSwing;

    // Body bob
    const bob = Math.abs(Math.sin(walkPhase * 2)) * 0.08 * walkIntensity;
    torso.position.y = 1.3 + bob;
    headGroup.position.y = 2.2 + bob;
    belt.position.y = 0.95 + bob;

    // Head slight tilt during walk
    headGroup.rotation.z = Math.sin(walkPhase) * 0.05 * walkIntensity;

    // Pigtail bounce (bouncy with slight delay)
    const bunBounce = Math.sin(walkPhase * 2 + 0.5) * 0.15 * walkIntensity;
    leftBun.position.y = 0.1 + bunBounce;
    rightBun.position.y = 0.1 - bunBounce;
    leftBun.rotation.z = bunBounce * 0.5;
    rightBun.rotation.z = -bunBounce * 0.5;

    // Idle breathing
    if (!isMoving) {
      const breathe = Math.sin(anim.breatheTime * 2) * 0.02;
      torso.scale.set(1, 1 + breathe, 1);
      headGroup.position.y = 2.2 + breathe * 2;
    } else {
      torso.scale.set(1, 1, 1);
    }
  }

  // Set default position so feet are near y=0
  group.position.y = 0;

  return { group, update };
}

function createBun() {
  const bun = new THREE.Group();

  // Connection strand
  const strandGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.2, 4);
  const strand = new THREE.Mesh(strandGeo, mat(COLORS.hairPink));
  strand.rotation.z = Math.PI / 2;
  bun.add(strand);

  // Bun ball
  const bunGeo = new THREE.SphereGeometry(0.15, 7, 5);
  const bunBall = new THREE.Mesh(bunGeo, mat(COLORS.hairPink));
  bunBall.castShadow = true;
  bun.add(bunBall);

  return bun;
}
