import * as THREE from 'three';
export function neon(color, intensity = 1.4) {
  return new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: color,
    emissiveIntensity: intensity,
    metalness: 0.2,
    roughness: 0.4,
  });
}
export function neonLine(color) {
  return new THREE.LineBasicMaterial({ color });
}
