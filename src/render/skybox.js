import * as THREE from 'three';
export function createSky() {
  const uniforms = {
    top: { value: new THREE.Color(0x1b0a40) },
    mid: { value: new THREE.Color(0xff2bd6) },
    bot: { value: new THREE.Color(0xff7b00) },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 top,mid,bot;
      void main(){ float h=normalize(vP).y; vec3 c = h>0.0 ? mix(mid,top,h) : mix(mid,bot,-h);
      // a soft glowing sun band near the horizon — kept below bloom threshold so it doesn't blow out
      float sun = smoothstep(0.12,0.0,abs(h-0.04));
      c += sun*vec3(1.0,0.55,0.2)*0.35;
      gl_FragColor=vec4(min(c,vec3(0.85)),1.0); }`,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat);
}
