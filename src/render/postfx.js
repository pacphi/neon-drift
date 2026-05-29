import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const Scanline = {
  uniforms: { tDiffuse: { value: null }, h: { value: window.innerHeight } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float h; varying vec2 vUv;
    void main(){ vec4 c=texture2D(tDiffuse,vUv); float s=sin(vUv.y*h*3.14159)*0.04;
      float v=smoothstep(0.9,0.3,distance(vUv,vec2(0.5))); gl_FragColor=vec4(c.rgb*(1.0-s)*v,1.0); }`,
};

export function createComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 1.1, 0.7, 0.2);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(Scanline));
  addEventListener('resize', () => composer.setSize(innerWidth, innerHeight));
  return composer;
}
