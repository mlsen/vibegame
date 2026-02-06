import * as THREE from 'three';
import { mat, getTerrainHeight, randomRange } from './utils.js';

const MONSTER_TYPES = [
  {
    name: 'Wütender Pilz',
    bodyColor: 0xcc4444,
    capColor: 0xee6644,
    spotColor: 0xffeecc,
    hp: 60,
    damage: 5,
    size: 2.0,
    speed: 2,
    create: createMushroom,
  },
  {
    name: 'Giftiger Schleim',
    bodyColor: 0x44cc55,
    capColor: 0x66ee77,
    spotColor: 0xbbffbb,
    hp: 45,
    damage: 3,
    size: 1.8,
    speed: 1.5,
    create: createSlime,
  },
  {
    name: 'Böser Käfer',
    bodyColor: 0x664488,
    capColor: 0x885599,
    spotColor: 0xffcc44,
    hp: 50,
    damage: 4,
    size: 1.6,
    speed: 3,
    create: createBeetle,
  },
];

/**
 * Spawn a set of monsters around the world.
 * Returns { monsters[], update(delta, playerPos), checkAttackHits(playerPos, range) }
 */
export function createMonsterSystem(scene) {
  const monsters = [];
  const AGGRO_RANGE = 12;
  const ATTACK_RANGE = 2;
  const ATTACK_COOLDOWN = 1.5;

  // Spawn 5 normal monsters
  for (let i = 0; i < 5; i++) {
    spawnMonster(scene, monsters);
  }

  // Spawn Boss: Migge
  spawnBoss(scene, monsters);

  function spawnMonster(scene, list) {
    const type = MONSTER_TYPES[Math.floor(Math.random() * MONSTER_TYPES.length)];

    const angle = Math.random() * Math.PI * 2;
    const dist = randomRange(20, 60);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = getTerrainHeight(x, z);

    if (y < 0.3) return spawnMonster(scene, list); // retry if underwater

    const { group, updateAnim } = type.create(type);
    group.position.set(x, y, z);
    scene.add(group);

    // HP bar (counter-scale so it stays readable)
    const hpBar = createHPBar();
    const invScale = 1 / type.size;
    hpBar.scale.setScalar(invScale);
    hpBar.position.y = 1.2 + 0.3 / type.size;
    group.add(hpBar);

    list.push({
      group,
      updateAnim,
      type,
      hp: type.hp,
      maxHp: type.hp,
      hpBar,
      hpBarFill: hpBar.children[1],
      state: 'idle', // idle, chase, attack, dead
      time: Math.random() * 10,
      attackCooldown: 0,
      idleTarget: new THREE.Vector3(x, y, z),
      deathTime: 0,
    });
  }

  function spawnBoss(scene, list) {
    const bossX = 55, bossZ = 55;
    const bossY = getTerrainHeight(bossX, bossZ);

    const { group, updateAnim } = createMigge();
    group.position.set(bossX, bossY, bossZ);
    scene.add(group);

    list.push({
      group,
      updateAnim,
      type: { name: 'Migge', size: 5, speed: 4, damage: 15 },
      hp: 500,
      maxHp: 500,
      hpBar: null,
      hpBarFill: null,
      state: 'idle',
      time: 0,
      attackCooldown: 0,
      idleTarget: new THREE.Vector3(bossX, bossY, bossZ),
      deathTime: 0,
      isBoss: true,
    });
  }

  function update(delta, playerPos) {
    for (let i = monsters.length - 1; i >= 0; i--) {
      const m = monsters[i];
      m.time += delta;

      if (m.state === 'dead') {
        m.deathTime += delta;
        const deathSpeed = m.isBoss ? 0.5 : 2;
        // Sink and fade
        m.group.position.y -= delta * (m.isBoss ? 0.3 : 0.5);
        m.group.scale.setScalar(Math.max(0, m.type.size * (1 - m.deathTime * deathSpeed)));
        const removeTime = m.isBoss ? 4 : 1.5;
        if (m.deathTime > removeTime) {
          scene.remove(m.group);
          monsters.splice(i, 1);
          // Only respawn non-bosses
          if (!m.isBoss) {
            setTimeout(() => spawnMonster(scene, monsters), 5000);
          }
        }
        continue;
      }

      const dx = playerPos.x - m.group.position.x;
      const dz = playerPos.z - m.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      m.attackCooldown = Math.max(0, m.attackCooldown - delta);

      const aggroRange = m.isBoss ? 40 : AGGRO_RANGE;
      const attackRange = m.isBoss ? 8 : ATTACK_RANGE;

      if (dist < aggroRange) {
        // Face player
        const angle = Math.atan2(dx, dz);
        m.group.rotation.y = THREE.MathUtils.lerp(
          m.group.rotation.y, angle, Math.min(1, 5 * delta)
        );

        if (dist < attackRange) {
          m.state = 'attack';
        } else {
          m.state = 'chase';
          // Move toward player
          const speed = m.type.speed;
          m.group.position.x += (dx / dist) * speed * delta;
          m.group.position.z += (dz / dist) * speed * delta;
        }
      } else {
        m.state = 'idle';
        // Wander slowly
        if (m.time % 4 < delta) {
          m.idleTarget.set(
            m.group.position.x + randomRange(-3, 3),
            0,
            m.group.position.z + randomRange(-3, 3)
          );
        }
        const idx = m.idleTarget.x - m.group.position.x;
        const idz = m.idleTarget.z - m.group.position.z;
        const idist = Math.sqrt(idx * idx + idz * idz);
        if (idist > 0.5) {
          m.group.position.x += (idx / idist) * 0.5 * delta;
          m.group.position.z += (idz / idist) * 0.5 * delta;
          const wanderAngle = Math.atan2(idx, idz);
          m.group.rotation.y = THREE.MathUtils.lerp(
            m.group.rotation.y, wanderAngle, Math.min(1, 2 * delta)
          );
        }
      }

      // Terrain following
      const ty = getTerrainHeight(m.group.position.x, m.group.position.z);
      m.group.position.y = THREE.MathUtils.lerp(m.group.position.y, ty, Math.min(1, 6 * delta));

      // Animation
      m.updateAnim(delta, m.state, m.time);

      // Update HP bar (boss uses UI bar, not floating)
      if (m.hpBar) {
        const hpRatio = m.hp / m.maxHp;
        m.hpBarFill.scale.x = Math.max(0.001, hpRatio);
        m.hpBarFill.position.x = -(1 - hpRatio) * 0.75;
        m.hpBar.visible = true;
      }
    }

    return monsters;
  }

  /**
   * Check if player attack hits any monster.
   * Returns damage dealt to player from nearby attacking monsters.
   */
  function checkPlayerDamage(playerPos) {
    let totalDamage = 0;
    for (const m of monsters) {
      if (m.state !== 'attack' || m.attackCooldown > 0) continue;
      const dx = playerPos.x - m.group.position.x;
      const dz = playerPos.z - m.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const atkRange = m.isBoss ? 8 : ATTACK_RANGE;
      if (dist < atkRange) {
        totalDamage += m.type.damage;
        m.attackCooldown = ATTACK_COOLDOWN;
      }
    }
    return totalDamage;
  }

  /**
   * Deal damage to monsters in range of player attack.
   */
  function attackMonstersInRange(playerPos, playerAngle, range, damage) {
    let hitAny = false;
    for (const m of monsters) {
      if (m.state === 'dead') continue;
      const dx = m.group.position.x - playerPos.x;
      const dz = m.group.position.z - playerPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > range) continue;

      // Check if monster is roughly in front of player
      const angleToMonster = Math.atan2(dx, dz);
      let angleDiff = angleToMonster - playerAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) < Math.PI / 2) {
        m.hp -= damage;
        hitAny = true;

        // Knockback
        if (dist > 0.1) {
          m.group.position.x += (dx / dist) * 0.8;
          m.group.position.z += (dz / dist) * 0.8;
        }

        if (m.hp <= 0) {
          m.hp = 0;
          m.state = 'dead';
          m.deathTime = 0;
        }
      }
    }
    return hitAny;
  }

  return { monsters, update, checkPlayerDamage, attackMonstersInRange };
}

// ─── Monster Builders ──────────────────────────────────────────────────────

function createMushroom(type) {
  const group = new THREE.Group();

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.15, 0.5, 6),
    mat(0xeeddbb, { flatShading: true })
  );
  stem.position.y = 0.25;
  stem.castShadow = true;
  group.add(stem);

  // Cap
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6),
    mat(type.capColor, { flatShading: true })
  );
  cap.position.y = 0.5;
  cap.castShadow = true;
  group.add(cap);

  // Spots on cap
  for (let i = 0; i < 4; i++) {
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 4, 3),
      mat(type.spotColor)
    );
    const a = (i / 4) * Math.PI * 2 + 0.3;
    spot.position.set(Math.cos(a) * 0.25, 0.6 + Math.sin(i) * 0.05, Math.sin(a) * 0.25);
    group.add(spot);
  }

  // Angry eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), mat(0xff0000, { emissive: 0xff0000, emissiveIntensity: 0.5 }));
  eyeL.position.set(-0.12, 0.4, 0.15);
  group.add(eyeL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), mat(0xff0000, { emissive: 0xff0000, emissiveIntensity: 0.5 }));
  eyeR.position.set(0.12, 0.4, 0.15);
  group.add(eyeR);

  // Angry mouth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.03), mat(0x220000));
  mouth.position.set(0, 0.3, 0.16);
  mouth.rotation.z = 0.15;
  group.add(mouth);

  group.scale.setScalar(type.size);

  function updateAnim(delta, state, time) {
    // Wobble
    const wobble = state === 'chase' ? 0.15 : 0.05;
    cap.rotation.z = Math.sin(time * (state === 'chase' ? 8 : 3)) * wobble;
    group.position.y += Math.sin(time * 4) * 0.002 * (state === 'chase' ? 2 : 1);

    // Attack: cap slam
    if (state === 'attack') {
      cap.position.y = 0.5 + Math.sin(time * 10) * 0.15;
    } else {
      cap.position.y = 0.5;
    }
  }

  return { group, updateAnim };
}

function createSlime(type) {
  const group = new THREE.Group();

  // Body blob
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 8, 6),
    mat(type.bodyColor, { flatShading: true, transparent: true, opacity: 0.8 })
  );
  body.position.y = 0.3;
  body.scale.set(1, 0.7, 1);
  body.castShadow = true;
  group.add(body);

  // Inner glow
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 6, 4),
    mat(type.capColor, { transparent: true, opacity: 0.5, emissive: type.capColor, emissiveIntensity: 0.3 })
  );
  inner.position.y = 0.25;
  group.add(inner);

  // Eyes
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat(0xffffff));
  eyeL.position.set(-0.12, 0.35, 0.3);
  group.add(eyeL);
  const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), mat(0x111111));
  pupilL.position.set(-0.12, 0.35, 0.35);
  group.add(pupilL);

  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat(0xffffff));
  eyeR.position.set(0.12, 0.35, 0.3);
  group.add(eyeR);
  const pupilR = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 3), mat(0x111111));
  pupilR.position.set(0.12, 0.35, 0.35);
  group.add(pupilR);

  group.scale.setScalar(type.size);

  function updateAnim(delta, state, time) {
    // Squish bounce
    const squish = state === 'chase' ? 0.15 : 0.05;
    body.scale.y = 0.7 + Math.abs(Math.sin(time * (state === 'chase' ? 6 : 2))) * squish;
    body.scale.x = 1 - Math.abs(Math.sin(time * (state === 'chase' ? 6 : 2))) * squish * 0.5;
    body.scale.z = body.scale.x;

    if (state === 'attack') {
      body.scale.y = 0.7 + Math.sin(time * 12) * 0.2;
    }
  }

  return { group, updateAnim };
}

function createBeetle(type) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 7, 5),
    mat(type.bodyColor, { flatShading: true })
  );
  body.position.y = 0.2;
  body.scale.set(1, 0.6, 1.3);
  body.castShadow = true;
  group.add(body);

  // Shell
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mat(type.capColor, { flatShading: true })
  );
  shell.position.y = 0.22;
  shell.scale.set(1, 0.6, 1.3);
  group.add(shell);

  // Eyes (glowing)
  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 5, 4),
    mat(type.spotColor, { emissive: type.spotColor, emissiveIntensity: 0.6 })
  );
  eyeL.position.set(-0.15, 0.25, 0.35);
  group.add(eyeL);

  const eyeR = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 5, 4),
    mat(type.spotColor, { emissive: type.spotColor, emissiveIntensity: 0.6 })
  );
  eyeR.position.set(0.15, 0.25, 0.35);
  group.add(eyeR);

  // Pincers
  const pincerGeo = new THREE.ConeGeometry(0.04, 0.2, 4);
  const pincerL = new THREE.Mesh(pincerGeo, mat(0x332244));
  pincerL.position.set(-0.1, 0.15, 0.45);
  pincerL.rotation.x = Math.PI / 2 + 0.3;
  group.add(pincerL);

  const pincerR = new THREE.Mesh(pincerGeo, mat(0x332244));
  pincerR.position.set(0.1, 0.15, 0.45);
  pincerR.rotation.x = Math.PI / 2 - 0.3;
  group.add(pincerR);

  // Legs (3 per side)
  const legs = [];
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.015, 0.2, 3),
        mat(0x332244)
      );
      leg.position.set(side * 0.3, 0.08, -0.1 + i * 0.2);
      leg.rotation.z = side * 0.8;
      group.add(leg);
      legs.push(leg);
    }
  }

  group.scale.setScalar(type.size);

  function updateAnim(delta, state, time) {
    // Leg scuttle
    const legSpeed = state === 'chase' ? 12 : 3;
    legs.forEach((leg, i) => {
      leg.rotation.x = Math.sin(time * legSpeed + i * 1.2) * 0.3;
    });

    // Pincer snap on attack
    if (state === 'attack') {
      const snap = Math.sin(time * 10) * 0.4;
      pincerL.rotation.x = Math.PI / 2 + 0.3 + snap;
      pincerR.rotation.x = Math.PI / 2 - 0.3 - snap;
    }
  }

  return { group, updateAnim };
}

// ─── BOSS: Migge ───────────────────────────────────────────────────────────

export function createMigge() {
  const BOSS_SCALE = 5;
  const group = new THREE.Group();

  const bodyGroup = new THREE.Group();
  bodyGroup.position.y = 0.15;

  // ─── Ice Skates ─────────────────────────────────────────────────────
  const skateMat = mat(0x222222);
  const bladeMat = mat(0xccccdd, { metalness: 0.9, roughness: 0.1 });

  // Left skate boot
  const leftBoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.28),
    skateMat
  );
  leftBoot.position.set(-0.12, 0.09, 0);
  bodyGroup.add(leftBoot);
  // Left blade
  const leftBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.06, 0.35),
    bladeMat
  );
  leftBlade.position.set(-0.12, -0.02, 0);
  bodyGroup.add(leftBlade);

  // Right skate boot
  const rightBoot = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.28),
    skateMat
  );
  rightBoot.position.set(0.12, 0.09, 0);
  bodyGroup.add(rightBoot);
  // Right blade
  const rightBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.06, 0.35),
    bladeMat
  );
  rightBlade.position.set(0.12, -0.02, 0);
  bodyGroup.add(rightBlade);

  // ─── Legs (hockey pants - bulky) ────────────────────────────────────
  const pantsMat = mat(0x1a1a2e, { flatShading: true }); // dark hockey pants

  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-0.12, 0.55, 0);
  const leftThigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.45, 6),
    pantsMat
  );
  leftThigh.position.y = -0.22;
  leftThigh.castShadow = true;
  leftLegGroup.add(leftThigh);
  // Shin pad
  const leftShinPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.3, 6),
    mat(0xdddddd, { flatShading: true })
  );
  leftShinPad.position.y = -0.5;
  leftLegGroup.add(leftShinPad);
  bodyGroup.add(leftLegGroup);

  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(0.12, 0.55, 0);
  const rightThigh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.1, 0.45, 6),
    pantsMat
  );
  rightThigh.position.y = -0.22;
  rightThigh.castShadow = true;
  rightLegGroup.add(rightThigh);
  const rightShinPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.1, 0.3, 6),
    mat(0xdddddd, { flatShading: true })
  );
  rightShinPad.position.y = -0.5;
  rightLegGroup.add(rightShinPad);
  bodyGroup.add(rightLegGroup);

  // ─── Torso (hockey jersey) ──────────────────────────────────────────
  const jerseyMat = mat(0xcc2222, { flatShading: true }); // red jersey

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.7, 8),
    jerseyMat
  );
  torso.position.y = 1.0;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Shoulder pads (bulky)
  const shoulderL = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 6, 4),
    jerseyMat
  );
  shoulderL.position.set(-0.32, 1.25, 0);
  shoulderL.scale.set(1, 0.7, 1);
  bodyGroup.add(shoulderL);

  const shoulderR = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 6, 4),
    jerseyMat
  );
  shoulderR.position.set(0.32, 1.25, 0);
  shoulderR.scale.set(1, 0.7, 1);
  bodyGroup.add(shoulderR);

  // Jersey number "69" on chest
  const numCanvas = document.createElement('canvas');
  numCanvas.width = 64;
  numCanvas.height = 64;
  const numCtx = numCanvas.getContext('2d');
  numCtx.font = 'bold 48px Arial';
  numCtx.fillStyle = '#ffffff';
  numCtx.textAlign = 'center';
  numCtx.textBaseline = 'middle';
  numCtx.fillText('69', 32, 32);
  const numTex = new THREE.CanvasTexture(numCanvas);
  const numPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.25, 0.25),
    new THREE.MeshBasicMaterial({ map: numTex, transparent: true })
  );
  numPlane.position.set(0, 0.95, 0.3);
  bodyGroup.add(numPlane);

  // ─── Arms (with gloves) ────────────────────────────────────────────
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.38, 1.25, 0);
  const leftArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.5, 6),
    jerseyMat
  );
  leftArm.position.y = -0.25;
  leftArm.castShadow = true;
  leftArmGroup.add(leftArm);
  // Glove
  const leftGlove = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.14, 0.12),
    mat(0x222222)
  );
  leftGlove.position.y = -0.55;
  leftArmGroup.add(leftGlove);
  bodyGroup.add(leftArmGroup);

  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.38, 1.25, 0);
  const rightArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.07, 0.5, 6),
    jerseyMat
  );
  rightArm.position.y = -0.25;
  rightArm.castShadow = true;
  rightArmGroup.add(rightArm);
  const rightGlove = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.14, 0.12),
    mat(0x222222)
  );
  rightGlove.position.y = -0.55;
  rightArmGroup.add(rightGlove);

  // ─── Hockey Stick (in right hand) ──────────────────────────────────
  const stickGroup = new THREE.Group();
  stickGroup.position.y = -0.55;

  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.2, 5),
    mat(0x222222)
  );
  shaft.position.y = -0.5;
  shaft.rotation.x = 0.15;
  stickGroup.add(shaft);

  // Blade
  const stickBlade = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.12, 0.3),
    mat(0x111111)
  );
  stickBlade.position.set(0, -1.1, 0.1);
  stickGroup.add(stickBlade);

  // Tape on blade
  const tape = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.08, 0.28),
    mat(0xeeeeee)
  );
  tape.position.set(0, -1.08, 0.1);
  stickGroup.add(tape);

  rightArmGroup.add(stickGroup);
  bodyGroup.add(rightArmGroup);

  // ─── Head ───────────────────────────────────────────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.6;

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 8),
    mat(0xf0c090)
  );
  head.castShadow = true;
  headGroup.add(head);

  // Helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65),
    mat(0xcc2222, { flatShading: true }) // matching red
  );
  helmet.position.y = 0.02;
  headGroup.add(helmet);

  // Helmet cage/visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.15, 0.05),
    mat(0x888888, { transparent: true, opacity: 0.4, metalness: 0.8 })
  );
  visor.position.set(0, 0.02, 0.24);
  headGroup.add(visor);

  // Cage bars
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.15, 4),
      mat(0x999999, { metalness: 0.8 })
    );
    bar.position.set(-0.1 + i * 0.065, 0.02, 0.26);
    headGroup.add(bar);
  }

  // Red hair poking out from under helmet (back + sides)
  const hairMat = mat(0xcc3300, { flatShading: true });

  const hairBack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.15, 0.25, 6),
    hairMat
  );
  hairBack.position.set(0, -0.12, -0.12);
  headGroup.add(hairBack);

  const tuftL = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 5, 4),
    hairMat
  );
  tuftL.position.set(-0.25, -0.05, 0.05);
  headGroup.add(tuftL);

  const tuftR = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 5, 4),
    hairMat
  );
  tuftR.position.set(0.25, -0.05, 0.05);
  headGroup.add(tuftR);

  // Eyes (behind cage)
  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 4),
    mat(0xffffff)
  );
  eyeL.position.set(-0.08, 0.02, 0.21);
  headGroup.add(eyeL);
  const pupilL = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 5, 4),
    mat(0x2244aa)
  );
  pupilL.position.set(-0.08, 0.02, 0.24);
  headGroup.add(pupilL);

  const eyeR = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 4),
    mat(0xffffff)
  );
  eyeR.position.set(0.08, 0.02, 0.21);
  headGroup.add(eyeR);
  const pupilR = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 5, 4),
    mat(0x2244aa)
  );
  pupilR.position.set(0.08, 0.02, 0.24);
  headGroup.add(pupilR);

  // Aggressive smirk
  const smirk = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.02, 0.02),
    mat(0x994444)
  );
  smirk.position.set(0.02, -0.08, 0.23);
  smirk.rotation.z = -0.2;
  headGroup.add(smirk);

  bodyGroup.add(headGroup);
  group.add(bodyGroup);

  // ─── Name Tag ─────────────────────────────────────────────────────
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 512;
  nameCanvas.height = 64;
  const nctx = nameCanvas.getContext('2d');
  nctx.fillStyle = 'rgba(80, 0, 0, 0.6)';
  nctx.roundRect(0, 0, 512, 64, 10);
  nctx.fill();
  nctx.strokeStyle = '#ff4444';
  nctx.lineWidth = 3;
  nctx.roundRect(4, 4, 504, 56, 8);
  nctx.stroke();
  nctx.font = 'bold 24px Arial';
  nctx.fillStyle = '#ff6644';
  nctx.textAlign = 'center';
  nctx.textBaseline = 'middle';
  nctx.fillText('Migge', 256, 34);
  const nameTex = new THREE.CanvasTexture(nameCanvas);
  const nameSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: nameTex, depthTest: false })
  );
  nameSprite.scale.set(3, 0.4, 1);
  nameSprite.position.y = 2.2;
  group.add(nameSprite);

  // Scale
  group.scale.setScalar(BOSS_SCALE);

  // ─── Animation ──────────────────────────────────────────────────────
  function updateAnim(delta, state, time) {
    // Skating stride
    const strideSpeed = state === 'chase' ? 4 : 1.5;
    leftLegGroup.rotation.x = Math.sin(time * strideSpeed) * 0.4;
    rightLegGroup.rotation.x = Math.sin(time * strideSpeed + Math.PI) * 0.4;

    // Body lean into movement
    bodyGroup.rotation.z = Math.sin(time * strideSpeed * 0.5) * 0.08;
    bodyGroup.position.y = 0.15 + Math.abs(Math.sin(time * strideSpeed)) * 0.03;

    // Left arm swings for balance
    leftArmGroup.rotation.x = Math.sin(time * strideSpeed + 1) * 0.3;
    leftArmGroup.rotation.z = -0.2;

    // Right arm holds stick - slight movement
    rightArmGroup.rotation.x = -0.3 + Math.sin(time * 1.2) * 0.1;
    rightArmGroup.rotation.z = 0.15;

    // Head look around
    headGroup.rotation.y = Math.sin(time * 0.5) * 0.25;

    // Hair blows
    hairBack.rotation.x = Math.sin(time * 2.5) * 0.15;
    tuftL.rotation.z = Math.sin(time * 3) * 0.2;
    tuftR.rotation.z = Math.sin(time * 3 + 1) * 0.2;

    // Attack: wind up hockey stick and slap
    if (state === 'attack') {
      const slapPhase = (time * 6) % (Math.PI * 2);
      rightArmGroup.rotation.x = -1.5 + Math.sin(slapPhase) * 1.2;
      rightArmGroup.rotation.z = 0.3;
      bodyGroup.rotation.x = 0.15 + Math.sin(slapPhase) * 0.1;
      headGroup.rotation.x = -0.15;
    } else if (state === 'chase') {
      bodyGroup.rotation.x = 0.2; // hockey lean forward
    } else {
      bodyGroup.rotation.x = Math.sin(time * 0.4) * 0.05;
    }
  }

  return { group, updateAnim };
}

// ─── HP Bar (floating above monster) ───────────────────────────────────────

function createHPBar() {
  const group = new THREE.Group();

  // Background (dark)
  const bgGeo = new THREE.PlaneGeometry(1.6, 0.2);
  const bg = new THREE.Mesh(bgGeo, new THREE.MeshBasicMaterial({
    color: 0x222222, transparent: true, opacity: 0.8, depthTest: false,
  }));
  group.add(bg);

  // Fill (red)
  const fillGeo = new THREE.PlaneGeometry(1.5, 0.15);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
    color: 0xcc2222, depthTest: false,
  }));
  fill.position.z = 0.001;
  group.add(fill);

  return group;
}
