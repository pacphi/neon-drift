// Unified InputState: { steer:-1..1, throttle:0..1, brake:0..1, drift:bool, useItem:bool, pause:bool }
export function createInput(target = window, canvas = document.body) {
  const keys = new Set();
  let mouseSteer = 0, mouseThrottle = 0, mouseItem = false, pausePressed = false, legendPressed = false;

  const onKey = (e, down) => {
    const k = e.key.toLowerCase();
    if (down) keys.add(k); else keys.delete(k);
    if (down && k === 'escape') pausePressed = true;
    if (down && k === 'l') legendPressed = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
  };
  target.addEventListener('keydown', e => onKey(e, true));
  target.addEventListener('keyup', e => onKey(e, false));
  canvas.addEventListener('mousemove', e => {
    const w = canvas.clientWidth || window.innerWidth;
    mouseSteer = Math.max(-1, Math.min(1, (e.clientX / w) * 2 - 1));
  });
  canvas.addEventListener('mousedown', e => { if (e.button === 0) mouseThrottle = 1; if (e.button === 2) mouseItem = true; });
  canvas.addEventListener('mouseup',   e => { if (e.button === 0) mouseThrottle = 0; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  function sample() {
    const has = (...k) => k.some(x => keys.has(x));
    let steer = 0;
    if (has('arrowleft', 'a')) steer -= 1;
    if (has('arrowright', 'd')) steer += 1;
    // Mouse steering ONLY while mouse-driving (left button held). Otherwise the
    // idle pointer position would constantly pull the kart and you could never
    // hold a straight line with the keyboard. Small center deadzone.
    if (steer === 0 && mouseThrottle) {
      steer = Math.abs(mouseSteer) < 0.08 ? 0 : mouseSteer;
    }
    const throttle = Math.max(has('arrowup', 'w') ? 1 : 0, mouseThrottle);
    const brake = has('arrowdown', 's') ? 1 : 0;
    const drift = has(' ');
    const useItem = has('shift', 'control') || mouseItem;
    const pause = pausePressed;
    const legend = legendPressed;
    pausePressed = false; legendPressed = false; mouseItem = false; // edge-consume
    return { steer, throttle, brake, drift, useItem, pause, legend };
  }
  return { sample };
}
