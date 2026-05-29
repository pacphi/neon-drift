import * as THREE from 'three';
import { PALETTE } from '../config.js';
export function createGrid() {
  const g = new THREE.GridHelper(2000, 200, PALETTE.cyan, PALETTE.purple);
  g.material.opacity = 0.35; g.material.transparent = true; g.position.y = -0.05;
  return g;
}
