import * as THREE from 'three';
import { createKartState } from './physics.js';
import { neon } from '../render/materials.js';

export function createKart(color, startPos) {
  const state = createKartState({ x: startPos.x, z: startPos.z }, startPos.heading);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, 3.4), neon(color, 1.2));
  body.position.y = 0.8; group.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.6), neon(0xffffff, 1.6));
  wing.position.set(0, 1.3, -1.6); group.add(wing);
  [-1, 1].forEach(sx => [-1.2, 1.2].forEach(sz => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12), neon(color, 0.8));
    w.rotation.z = Math.PI / 2; w.position.set(sx * 1.1, 0.5, sz); group.add(w);
  }));
  function sync() { group.position.set(state.pos.x, 0, state.pos.z); group.rotation.y = state.heading; }
  sync();
  return { state, group, sync, effects: null, item: null };
}
