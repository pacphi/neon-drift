export function createHUD(root = document.body) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;font-family:"Courier New",monospace;text-shadow:0 0 8px currentColor;';
  el.innerHTML = `
    <div id="lap"  style="position:absolute;top:14px;left:18px;color:#18f0ff;font-size:28px;"></div>
    <div id="pos"  style="position:absolute;top:14px;right:18px;color:#ff2bd6;font-size:28px;"></div>
    <div id="time" style="position:absolute;top:52px;left:18px;color:#aaff00;font-size:20px;"></div>
    <div id="spd"  style="position:absolute;bottom:18px;right:24px;color:#18f0ff;font-size:34px;"></div>
    <div id="item" style="position:absolute;bottom:18px;left:24px;color:#fff;font-size:22px;border:2px solid #ff2bd6;padding:6px 12px;min-width:80px;text-align:center;"></div>`;
  root.appendChild(el);
  const $ = id => el.querySelector('#' + id);
  return {
    update({ lap, laps, place, total, time, speed, item }) {
      $('lap').textContent = `LAP ${Math.min(lap + 1, laps)}/${laps}`;
      $('pos').textContent = `${place}/${total}`;
      $('time').textContent = (time).toFixed(1) + 's';
      $('spd').textContent = Math.round(speed * 3.6) + ' km/h';
      $('item').textContent = item ? item.toUpperCase() : '—';
    },
    show(v) { el.style.display = v ? 'block' : 'none'; },
    destroy() { el.remove(); },
  };
}
