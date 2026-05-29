function fmt(t) {
  if (t == null || !isFinite(t)) return '—';
  return t.toFixed(1) + 's';
}

export function createHUD(root = document.body) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;pointer-events:none;font-family:"Courier New",monospace;text-shadow:0 0 8px currentColor;';
  el.innerHTML = `
    <div id="lap"  style="position:absolute;top:14px;left:18px;color:#18f0ff;font-size:28px;"></div>
    <div id="pos"  style="position:absolute;top:14px;right:18px;color:#ff2bd6;font-size:28px;"></div>
    <div id="time" style="position:absolute;top:52px;left:18px;color:#aaff00;font-size:18px;line-height:1.5;"></div>
    <div id="left" style="position:absolute;top:52px;right:18px;color:#ff7b00;font-size:16px;text-align:right;line-height:1.5;"></div>
    <div id="spd"  style="position:absolute;bottom:18px;right:24px;color:#18f0ff;font-size:34px;"></div>
    <div id="item" style="position:absolute;bottom:18px;left:24px;color:#fff;font-size:20px;border:2px solid #ff2bd6;padding:6px 12px;min-width:120px;text-align:center;line-height:1.3;"></div>
    <div id="hint" style="position:absolute;bottom:18px;left:50%;transform:translateX(-50%);color:#7a18ff;font-size:13px;opacity:.8;">[L] CONTROLS</div>`;
  root.appendChild(el);
  const $ = (id) => el.querySelector('#' + id);

  // Controls legend overlay, toggled with the L key.
  const legend = document.createElement('div');
  legend.style.cssText =
    'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(6,0,15,.8);color:#18f0ff;font-family:"Courier New",monospace;z-index:9;pointer-events:none;';
  legend.innerHTML = `
    <div style="border:2px solid #ff2bd6;padding:26px 40px;text-shadow:0 0 8px currentColor;line-height:2;">
      <div style="color:#ff2bd6;font-size:26px;margin-bottom:10px;">CONTROLS</div>
      <div>STEER &nbsp;&nbsp; &larr; &rarr; / A D &nbsp;&middot;&nbsp; mouse (hold click)</div>
      <div>THROTTLE &nbsp; &uarr; / W &nbsp;&middot;&nbsp; left-click</div>
      <div>BRAKE / REVERSE &nbsp; &darr; / S</div>
      <div>DRIFT &nbsp; SPACE</div>
      <div>USE ITEM &nbsp; SHIFT / CTRL &nbsp;&middot;&nbsp; right-click</div>
      <div>PAUSE &nbsp; ESC &nbsp;&middot;&nbsp; TOGGLE THIS &nbsp; L</div>
    </div>`;
  root.appendChild(legend);
  let legendOn = false;
  const setLegend = (on) => {
    legendOn = on;
    legend.style.display = on ? 'flex' : 'none';
  };

  return {
    update({ lap, laps, place, total, time, curLap, bestLap, timeLeft, speed, item }) {
      $('lap').textContent = `LAP ${Math.min(lap + 1, laps)}/${laps}`;
      $('pos').textContent = `${place}/${total}`;
      $('time').innerHTML = `TOTAL ${fmt(time)}<br>THIS LAP ${fmt(curLap)}<br>BEST ${fmt(bestLap)}`;
      $('left').innerHTML = `TIME LEFT<br>${fmt(timeLeft)}`;
      $('spd').textContent = Math.round(speed * 3.6) + ' km/h';
      $('item').innerHTML = item
        ? `${item.toUpperCase()}<br><span style="font-size:12px;color:#aaff00;">SHIFT / R-CLICK</span>`
        : 'NO ITEM';
    },
    toggleLegend() {
      setLegend(!legendOn);
    },
    show(v) {
      el.style.display = v ? 'block' : 'none';
      if (!v) setLegend(false);
    },
    destroy() {
      el.remove();
      legend.remove();
    },
  };
}
