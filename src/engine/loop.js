// Fixed-timestep accumulator. update(dt) called at fixed 60Hz; render(alpha) every frame.
export function createLoop(update, render, step = 1 / 60) {
  let acc = 0,
    last = 0,
    raf = 0,
    running = false;
  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    let dt = t - last;
    last = t;
    if (dt > 0.25) dt = 0.25; // clamp after tab-out
    acc += dt;
    while (acc >= step) {
      update(step);
      acc -= step;
    }
    render(acc / step);
    raf = requestAnimationFrame(frame);
  }
  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now() / 1000;
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
