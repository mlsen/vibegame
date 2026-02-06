import * as THREE from 'three';

/**
 * Input controller: WASD movement + mouse look with pointer lock.
 * Returns { update(delta), moveDirection, isMoving, speed, yaw }
 */
export function createControls(canvas) {
  const state = {
    // Key state
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,

    // Mouse
    yaw: 0,       // horizontal rotation (radians)
    pitch: 0.3,   // vertical rotation (radians), slightly looking down
    mouseSensitivity: 0.002,

    // Output
    moveDirection: new THREE.Vector3(),
    isMoving: false,
    speed: 0,
    locked: false,
  };

  const WALK_SPEED = 5;
  const SPRINT_SPEED = 10;
  const PITCH_MIN = -0.5;
  const PITCH_MAX = 1.2;

  // ─── Keyboard ──────────────────────────────────────────────────────────

  function onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    state.forward = true; break;
      case 'KeyS': case 'ArrowDown':  state.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  state.left = true; break;
      case 'KeyD': case 'ArrowRight': state.right = true; break;
      case 'ShiftLeft': case 'ShiftRight': state.sprint = true; break;
      case 'Space': state.jump = true; break;
    }
  }

  function onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    state.forward = false; break;
      case 'KeyS': case 'ArrowDown':  state.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  state.left = false; break;
      case 'KeyD': case 'ArrowRight': state.right = false; break;
      case 'ShiftLeft': case 'ShiftRight': state.sprint = false; break;
      case 'Space': state.jump = false; break;
    }
  }

  // ─── Mouse ─────────────────────────────────────────────────────────────

  function onMouseMove(e) {
    if (!state.locked) return;
    state.yaw -= e.movementX * state.mouseSensitivity;
    state.pitch += e.movementY * state.mouseSensitivity;
    state.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, state.pitch));
  }

  // ─── Pointer Lock ──────────────────────────────────────────────────────

  function onPointerLockChange() {
    state.locked = document.pointerLockElement === canvas;
  }

  function requestLock() {
    canvas.requestPointerLock();
  }

  // ─── Event Binding ─────────────────────────────────────────────────────

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onPointerLockChange);

  // ─── Update ────────────────────────────────────────────────────────────

  function update(delta) {
    // Build move direction relative to camera yaw
    const dir = new THREE.Vector3();

    if (state.forward) dir.z += 1;
    if (state.backward) dir.z -= 1;
    if (state.left) dir.x += 1;
    if (state.right) dir.x -= 1;

    state.isMoving = dir.lengthSq() > 0;

    if (state.isMoving) {
      dir.normalize();

      // Rotate direction by camera yaw
      const rotMatrix = new THREE.Matrix4().makeRotationY(state.yaw);
      dir.applyMatrix4(rotMatrix);

      state.speed = state.sprint ? SPRINT_SPEED : WALK_SPEED;
      state.moveDirection.copy(dir);
    } else {
      state.speed = 0;
      state.moveDirection.set(0, 0, 0);
    }
  }

  return {
    update,
    requestLock,
    get moveDirection() { return state.moveDirection; },
    get isMoving() { return state.isMoving; },
    get speed() { return state.speed; },
    get yaw() { return state.yaw; },
    get pitch() { return state.pitch; },
    get locked() { return state.locked; },
    get jumpPressed() { return state.jump; },
  };
}
