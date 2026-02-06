import * as THREE from 'three';
import { mat } from './utils.js';

/**
 * Spell system with projectiles and AoE effects.
 * Returns { update(delta), castSpell(name, casterPos, casterAngle), spells }
 */
export function createSpellSystem(scene, monsterSystem) {
  const projectiles = [];
  const effects = [];

  const spells = {
    frostbolt: {
      name: 'Frostbolt',
      key: '1',
      cooldown: 0,
      currentCd: 0,
      castTime: 1.5,
      damage: 25,
      range: 40,
      speed: 25,
      slowDuration: 3,
      icon: drawFrostboltIcon,
    },
    frostNova: {
      name: 'Frost Nova',
      key: '2',
      cooldown: 8,
      currentCd: 0,
      damage: 15,
      range: 6,
      slowDuration: 4,
      icon: drawFrostNovaIcon,
    },
  };

  function castSpell(name, casterPos, casterAngle, casterPitch) {
    const spell = spells[name];
    if (!spell || spell.currentCd > 0) return false;

    spell.currentCd = spell.cooldown;

    if (name === 'frostbolt') {
      spawnFrostbolt(casterPos, casterAngle, casterPitch || 0, spell);
    } else if (name === 'frostNova') {
      spawnFrostNova(casterPos, spell);
    }

    return true;
  }

  // ─── Frostbolt ──────────────────────────────────────────────────────

  function spawnFrostbolt(casterPos, angle, pitch, spell) {
    const group = new THREE.Group();

    // Core
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshStandardMaterial({
        color: 0x44aaff,
        emissive: 0x2288ff,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
      })
    );
    group.add(core);

    // Outer glow
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.3,
      })
    );
    group.add(glow);

    // Frost particles (small trailing spheres)
    const particles = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 4, 3),
        new THREE.MeshBasicMaterial({
          color: 0xccddff,
          transparent: true,
          opacity: 0.6,
        })
      );
      group.add(p);
      particles.push(p);
    }

    // Point light
    const light = new THREE.PointLight(0x44aaff, 2, 8);
    group.add(light);

    group.position.set(casterPos.x, casterPos.y + 1.5, casterPos.z);

    const dir = new THREE.Vector3(
      Math.sin(angle) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(angle) * Math.cos(pitch)
    ).normalize();

    scene.add(group);

    projectiles.push({
      group,
      dir,
      speed: spell.speed,
      damage: spell.damage,
      slowDuration: spell.slowDuration,
      range: spell.range,
      traveled: 0,
      time: 0,
      particles,
      core,
      glow,
      light,
    });
  }

  // ─── Frost Nova ─────────────────────────────────────────────────────

  function spawnFrostNova(casterPos, spell) {
    // Ice ring expanding outward
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 1.0, 24),
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(casterPos.x, casterPos.y + 0.1, casterPos.z);
    scene.add(ring);

    // Ice spikes around player
    const spikes = [];
    const spikeCount = 12;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.15, 0.8, 4),
        new THREE.MeshStandardMaterial({
          color: 0xaaddff,
          emissive: 0x4488cc,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8,
        })
      );
      const dist = 1.5;
      spike.position.set(
        casterPos.x + Math.cos(angle) * dist,
        casterPos.y,
        casterPos.z + Math.sin(angle) * dist
      );
      spike.rotation.set(
        (Math.random() - 0.5) * 0.3,
        angle,
        (Math.random() - 0.5) * 0.3
      );
      scene.add(spike);
      spikes.push(spike);
    }

    // Flash light
    const flash = new THREE.PointLight(0x88ccff, 5, 15);
    flash.position.set(casterPos.x, casterPos.y + 1, casterPos.z);
    scene.add(flash);

    // Apply damage + slow to all monsters in range
    for (const m of monsterSystem.monsters) {
      if (m.state === 'dead') continue;
      const dx = m.group.position.x - casterPos.x;
      const dz = m.group.position.z - casterPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < spell.range) {
        m.hp -= spell.damage;
        m.slowUntil = performance.now() / 1000 + spell.slowDuration;
        if (m.hp <= 0) {
          m.hp = 0;
          m.state = 'dead';
          m.deathTime = 0;
        }
      }
    }

    effects.push({
      type: 'frostNova',
      ring,
      spikes,
      flash,
      time: 0,
      maxTime: 1.5,
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────

  function update(delta) {
    // Update cooldowns
    for (const key in spells) {
      const s = spells[key];
      s.currentCd = Math.max(0, s.currentCd - delta);
    }

    // Update projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.time += delta;

      // Move
      const move = p.dir.clone().multiplyScalar(p.speed * delta);
      p.group.position.add(move);
      p.traveled += p.speed * delta;

      // Rotate core
      p.core.rotation.y += delta * 8;
      p.glow.scale.setScalar(1 + Math.sin(p.time * 10) * 0.15);

      // Trail particles
      for (let j = 0; j < p.particles.length; j++) {
        const pp = p.particles[j];
        const offset = (j / p.particles.length) * Math.PI * 2 + p.time * 5;
        pp.position.set(
          Math.cos(offset) * 0.2,
          Math.sin(offset) * 0.2,
          -(j + 1) * 0.12
        );
        pp.material.opacity = 0.5 - j * 0.07;
      }

      // Light flicker
      p.light.intensity = 2 + Math.sin(p.time * 15) * 0.5;

      // Hit detection
      let hit = false;
      for (const m of monsterSystem.monsters) {
        if (m.state === 'dead') continue;
        const dx = m.group.position.x - p.group.position.x;
        const dz = m.group.position.z - p.group.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const hitRange = m.isBoss ? 4 : 1.5;
        if (dist < hitRange) {
          m.hp -= p.damage;
          m.slowUntil = performance.now() / 1000 + p.slowDuration;

          if (m.hp <= 0) {
            m.hp = 0;
            m.state = 'dead';
            m.deathTime = 0;
          }
          hit = true;
          break;
        }
      }

      // Impact effect
      if (hit) {
        spawnImpact(p.group.position);
      }

      // Remove if hit or out of range
      if (hit || p.traveled > p.range) {
        scene.remove(p.group);
        projectiles.splice(i, 1);
      }
    }

    // Update effects
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      e.time += delta;
      const t = e.time / e.maxTime;

      if (e.type === 'frostNova') {
        // Expand ring
        const ringScale = 1 + t * 8;
        e.ring.scale.set(ringScale, ringScale, 1);
        e.ring.material.opacity = 0.8 * (1 - t);

        // Spikes grow then fade
        for (const spike of e.spikes) {
          const spikeScale = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
          spike.scale.setScalar(Math.max(0.01, spikeScale));
          spike.material.opacity = spikeScale * 0.8;
        }

        // Flash fade
        e.flash.intensity = 5 * (1 - t);
      }

      if (e.time > e.maxTime) {
        if (e.ring) scene.remove(e.ring);
        if (e.flash) scene.remove(e.flash);
        if (e.spikes) e.spikes.forEach(s => scene.remove(s));
        if (e.particles) e.particles.forEach(p => scene.remove(p));
        effects.splice(i, 1);
      }
    }
  }

  function spawnImpact(pos) {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 3),
        new THREE.MeshBasicMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.8,
        })
      );
      p.position.copy(pos);
      p.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      );
      scene.add(p);
      particles.push(p);
    }

    effects.push({
      type: 'impact',
      particles,
      time: 0,
      maxTime: 0.6,
    });
  }

  // Apply freeze: stop movement + blue tint
  const origUpdate = monsterSystem.update;
  const frozenMaterials = new Map();

  monsterSystem.update = function(delta, playerPos) {
    const now = performance.now() / 1000;

    // Before update: freeze monsters that are slowed
    for (const m of monsterSystem.monsters) {
      const isFrozen = m.slowUntil && now < m.slowUntil && m.state !== 'dead';

      if (isFrozen && !m._frozen) {
        // Save original materials and swap in frozen copies
        m._frozen = true;
        if (!frozenMaterials.has(m)) {
          const entries = [];
          m.group.traverse((child) => {
            if (child.isMesh && child.material) {
              entries.push({ mesh: child, origMat: child.material });
              const frozenMat = child.material.clone();
              if (frozenMat.color) frozenMat.color.lerp(new THREE.Color(0x6699ff), 0.6);
              frozenMat.emissive = new THREE.Color(0x2244aa);
              frozenMat.emissiveIntensity = 0.3;
              child.material = frozenMat;
            }
          });
          frozenMaterials.set(m, entries);
        }
      } else if (!isFrozen && m._frozen) {
        // Restore original materials
        m._frozen = false;
        const entries = frozenMaterials.get(m);
        if (entries) {
          for (const { mesh, origMat } of entries) {
            mesh.material = origMat;
          }
          frozenMaterials.delete(m);
        }
      }

      // Prevent movement while frozen
      if (m._frozen) {
        m._frozenPos = m._frozenPos || { x: m.group.position.x, z: m.group.position.z };
      } else {
        m._frozenPos = null;
      }
    }

    const result = origUpdate(delta, playerPos);

    // Snap frozen monsters back to frozen position
    for (const m of monsterSystem.monsters) {
      if (m._frozen && m._frozenPos) {
        m.group.position.x = m._frozenPos.x;
        m.group.position.z = m._frozenPos.z;
      }
    }

    return result;
  };

  function canCast(name) {
    const spell = spells[name];
    return spell && spell.currentCd <= 0;
  }

  return { update, castSpell, canCast, spells };
}

// ─── Icon Drawing ──────────────────────────────────────────────────────────

export function drawFrostboltIcon(ctx, size) {
  // Background
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1a3355');
  gradient.addColorStop(1, '#0a1a33');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Ice bolt shape
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 4);

  // Core bolt
  ctx.fillStyle = '#66bbff';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.35);
  ctx.lineTo(size * 0.1, 0);
  ctx.lineTo(0, size * 0.35);
  ctx.lineTo(-size * 0.1, 0);
  ctx.closePath();
  ctx.fill();

  // Glow
  ctx.fillStyle = '#aaddff';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.2);
  ctx.lineTo(size * 0.05, 0);
  ctx.lineTo(0, size * 0.2);
  ctx.lineTo(-size * 0.05, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Sparkles
  ctx.fillStyle = '#ffffff';
  const sparkles = [[0.3, 0.25], [0.7, 0.35], [0.25, 0.65], [0.75, 0.7]];
  for (const [sx, sy] of sparkles) {
    ctx.beginPath();
    ctx.arc(sx * size, sy * size, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawFrostNovaIcon(ctx, size) {
  // Background
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0, size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, '#2244aa');
  gradient.addColorStop(1, '#0a1133');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Ice ring
  ctx.strokeStyle = '#88ccff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = '#aaddff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.15, 0, Math.PI * 2);
  ctx.stroke();

  // Ice spikes radiating outward
  ctx.fillStyle = '#bbddff';
  const spikeCount = 8;
  for (let i = 0; i < spikeCount; i++) {
    const angle = (i / spikeCount) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.15);
    ctx.lineTo(size * 0.04, -size * 0.35);
    ctx.lineTo(-size * 0.04, -size * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Center flash
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
  ctx.fill();
}
