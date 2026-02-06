import * as THREE from 'three';

/**
 * Third-person camera system that orbits behind the character.
 * Returns { camera, update(delta, characterPos, yaw, pitch) }
 */
export function createCamera(aspect) {
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 500);

  const DISTANCE = 6;
  const HEIGHT_OFFSET = 2.2; // Look at head height
  const FOLLOW_LERP = 8;    // Camera follow smoothness

  const currentPos = new THREE.Vector3(0, 5, 10);
  const targetPos = new THREE.Vector3();
  const lookAtPos = new THREE.Vector3();

  function update(delta, characterPos, yaw, pitch) {
    // Calculate desired camera position on orbit sphere
    const horizontalDist = DISTANCE * Math.cos(pitch);
    const verticalDist = DISTANCE * Math.sin(pitch);

    targetPos.set(
      characterPos.x - Math.sin(yaw) * horizontalDist,
      characterPos.y + HEIGHT_OFFSET + verticalDist,
      characterPos.z - Math.cos(yaw) * horizontalDist
    );

    // Smooth follow
    const lerpFactor = 1 - Math.exp(-FOLLOW_LERP * delta);
    currentPos.lerp(targetPos, lerpFactor);

    camera.position.copy(currentPos);

    // Look at character's head
    lookAtPos.set(
      characterPos.x,
      characterPos.y + HEIGHT_OFFSET,
      characterPos.z
    );
    camera.lookAt(lookAtPos);
  }

  function resize(newAspect) {
    camera.aspect = newAspect;
    camera.updateProjectionMatrix();
  }

  return { camera, update, resize };
}
