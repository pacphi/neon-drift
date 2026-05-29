export function createAudio() {
  let ctx, engine;
  function ensure() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function blip(freq, dur = 0.12, type = 'square', gain = 0.12) {
    const c = ensure(); const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(c.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur); o.stop(c.currentTime + dur);
  }
  return {
    resume() { ensure().resume?.(); },
    pickup() { blip(880, 0.1); blip(1320, 0.12); },
    boost() { blip(220, 0.3, 'sawtooth', 0.18); },
    hit() { blip(120, 0.2, 'square', 0.2); },
    startEngine() {
      const c = ensure(); engine = c.createOscillator(); const g = c.createGain();
      engine.type = 'sawtooth'; engine.frequency.value = 60; g.gain.value = 0.04;
      engine.connect(g).connect(c.destination); engine.start(); engine._g = g;
    },
    setRpm(speed01) { if (engine) engine.frequency.value = 60 + speed01 * 140; },
    stopEngine() { engine?.stop(); engine = null; },
  };
}
