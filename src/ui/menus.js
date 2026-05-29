import { TRACKS } from '../game/tracks.js';

function screen(html) {
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(6,0,15,.82);color:#18f0ff;font-family:"Courier New",monospace;text-align:center;z-index:10;';
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}
const neonBtn =
  'cursor:pointer;pointer-events:auto;background:transparent;border:2px solid #ff2bd6;color:#fff;padding:12px 26px;font-size:20px;font-family:inherit;text-shadow:0 0 8px #ff2bd6;';

export function titleScreen() {
  return new Promise((res) => {
    const el =
      screen(`<h1 style="font-size:64px;color:#ff2bd6;text-shadow:0 0 18px #ff2bd6;letter-spacing:6px;">NEON DRIFT</h1>
      <p style="color:#aaff00;">Arrows / WASD to steer · Space to drift · Shift to use item · press L for controls</p>
      <button id="go" style="${neonBtn}">START</button>`);
    /** @type {HTMLElement} */ (el.querySelector('#go')).onclick = () => {
      el.remove();
      res();
    };
  });
}

export function trackSelect() {
  return new Promise((res) => {
    const cards = TRACKS.map(
      (t, i) =>
        `<button class="tk" data-i="${i}" style="${neonBtn};border-color:#${t.color.toString(16).padStart(6, '0')};display:flex;flex-direction:column;gap:4px;">
        <span>${t.name}</span>
        <span style="font-size:13px;color:#aaff00;">${t.laps} LAPS</span>
      </button>`,
    ).join('');
    const el = screen(
      `<h2 style="color:#18f0ff;font-size:40px;">SELECT TRACK</h2><div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">${cards}</div>`,
    );
    el.querySelectorAll('.tk').forEach((b) => {
      const btn = /** @type {HTMLElement} */ (b);
      btn.onclick = () => {
        el.remove();
        res(Number(btn.dataset.i));
      };
    });
  });
}

export function resultsScreen(order) {
  return new Promise((res) => {
    const rows = order
      .map((r, i) => {
        const total = r.finishTime != null ? r.finishTime.toFixed(1) + 's' : 'DNF';
        const best = r.bestLap != null ? `best ${r.bestLap.toFixed(1)}s` : '';
        return `<div style="font-size:22px;color:${i === 0 ? '#aaff00' : '#18f0ff'};">
        ${i + 1}. ${r.name} &nbsp; ${total} &nbsp; <span style="font-size:15px;color:#ff7b00;">${best}</span>
      </div>`;
      })
      .join('');
    const el = screen(
      `<h2 style="color:#ff2bd6;font-size:48px;">RESULTS</h2>${rows}<button id="again" style="${neonBtn}">RACE AGAIN</button>`,
    );
    /** @type {HTMLElement} */ (el.querySelector('#again')).onclick = () => {
      el.remove();
      res();
    };
  });
}
