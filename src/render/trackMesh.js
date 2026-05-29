import * as THREE from 'three';
import { neon } from './materials.js';
import { computeTrackData } from '../game/track.js';

// Builds ribbon mesh + glowing edge lines; returns { mesh, waypoints, checkpoints, startPositions, halfWidth }
export function buildTrackMesh(track, { waypointCount = 240, checkpointCount = 12 } = {}) {
  const { waypoints, checkpoints, startPositions, halfWidth } = computeTrackData(track, { waypointCount, checkpointCount });
  const wp = waypoints;
  const hw = halfWidth;
  const verts = [], idx = [];
  wp.forEach((p, i) => {
    const rx = p.tz, rz = -p.tx; // right vector
    verts.push(p.x + rx * hw, 0, p.z + rz * hw);
    verts.push(p.x - rx * hw, 0, p.z - rz * hw);
  });
  const n = wp.length;
  for (let i = 0; i < n; i++) {
    const a = (i * 2) % (n * 2), b = (i * 2 + 1) % (n * 2), c = ((i + 1) % n) * 2, d = ((i + 1) % n) * 2 + 1;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Group();
  const road = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0a0a18, emissive: track.color, emissiveIntensity: 0.12, side: THREE.DoubleSide }));
  mesh.add(road);
  // glowing edge lines
  const edge = (offset) => {
    const pts = wp.map(p => new THREE.Vector3(p.x + p.tz * offset, 0.1, p.z - p.tx * offset));
    pts.push(pts[0].clone());
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: track.color }));
  };
  mesh.add(edge(hw)); mesh.add(edge(-hw));
  return { mesh, waypoints, checkpoints, startPositions, halfWidth };
}
