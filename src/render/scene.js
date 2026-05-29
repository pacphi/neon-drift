import * as THREE from 'three';
import { PALETTE } from '../config.js';
export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(PALETTE.bg, 120, 420);
  const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 2000);
  scene.add(new THREE.AmbientLight(0x4040ff, 0.6));
  const dir = new THREE.DirectionalLight(0xff66ff, 0.8); dir.position.set(0, 100, -50); scene.add(dir);
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
  // chase camera: follows target {pos,heading} with smoothing
  const camPos = new THREE.Vector3();
  function follow(target, dt) {
    const back = 16, up = 7;
    const tx = target.pos.x - Math.sin(target.heading) * back;
    const tz = target.pos.z - Math.cos(target.heading) * back;
    camPos.set(tx, up, tz);
    camera.position.lerp(camPos, Math.min(1, dt * 6));
    camera.lookAt(target.pos.x, 2, target.pos.z);
  }
  return { renderer, scene, camera, follow };
}
