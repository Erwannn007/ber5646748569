'use strict';
// =====================================================================
//  ENTRÉES — clavier/souris (codes physiques : marche en AZERTY et QWERTY)
//  + contrôles tactiles iPhone
// =====================================================================
const Input = {
  k: {}, look: 0, atkP: false, hvP: false, hvH: false, dashP: false, rageP: false, mapP: false, anyP: false,
  mx: 0, my: 0, touch: false, locked: false, sens: .0026
};
function initInput() {
  const view = document.getElementById('view');
  addEventListener('keydown', e => {
    Input.k[e.code] = true; Sfx.init();
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ShiftLeft') { Input.dashP = true; e.preventDefault(); }
    if (e.code === 'KeyR' || e.code === 'KeyF') Input.rageP = true;
    if (e.code === 'KeyM' || e.code === 'Tab') { Input.mapP = true; e.preventDefault(); }
    if (e.code === 'KeyE' || e.code === 'KeyJ') Input.atkP = true;
    if (e.code === 'KeyK' || e.code === 'KeyC') { Input.hvP = true; Input.hvH = true; }
    if (e.code === 'Enter') Input.anyP = true;
  });
  addEventListener('keyup', e => { Input.k[e.code] = false; if (e.code === 'KeyK' || e.code === 'KeyC') Input.hvH = false; });
  addEventListener('mousedown', e => {
    if (Input.touch) return;
    Sfx.init(); Input.anyP = true;
    if (!Input.locked && (G.state === 'play' || G.state === 'pause' || G.state === 'title')) { view.requestPointerLock && view.requestPointerLock(); }
    if (e.button === 0) Input.atkP = true;
    if (e.button === 2) { Input.hvP = true; Input.hvH = true; }
  });
  addEventListener('mouseup', e => { if (e.button === 2) Input.hvH = false; });
  addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('mousemove', e => { if (Input.locked) Input.look += e.movementX * Input.sens; });
  document.addEventListener('pointerlockchange', () => {
    Input.locked = document.pointerLockElement === view;
    if (!Input.locked && G.state === 'play' && !Input.touch) G.state = 'pause';
  });
  addEventListener('wheel', e => { Input.sens = clamp(Input.sens * (e.deltaY < 0 ? 1.1 : .9), .0008, .008); G.msg && G.msg('SENSIBILITE ' + Math.round(Input.sens * 1000), 1, '#ccc'); }, { passive: true });

  // ---------- tactile ----------
  const stick = document.getElementById('stick'), knob = document.getElementById('knob');
  let stickId = null, sox = 0, soy = 0, lookId = null, lastX = 0, lastY = 0;
  const isBtn = t => t && t.closest && t.closest('.btn');
  addEventListener('touchstart', e => {
    if (!Input.touch) { Input.touch = true; document.body.classList.add('touch'); }
    Sfx.init(); Input.anyP = true;
    for (const t of e.changedTouches) {
      if (isBtn(t.target)) continue;
      if (t.clientX < innerWidth * .45 && stickId === null) {
        stickId = t.identifier; sox = t.clientX; soy = t.clientY;
        stick.style.left = (sox - 65) + 'px'; stick.style.top = (soy - 65) + 'px'; stick.classList.add('on');
      } else if (lookId === null) { lookId = t.identifier; lastX = t.clientX; lastY = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) {
        let dx = t.clientX - sox, dy = t.clientY - soy; const d = Math.hypot(dx, dy), m = 55;
        if (d > m) { dx = dx / d * m; dy = dy / d * m; }
        Input.mx = dx / m; Input.my = dy / m; knob.style.transform = `translate(${dx}px,${dy}px)`;
      } else if (t.identifier === lookId) { Input.look += (t.clientX - lastX) * .0068; lastX = t.clientX; lastY = t.clientY; }
    }
    e.preventDefault();
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === stickId) { stickId = null; Input.mx = Input.my = 0; knob.style.transform = ''; stick.classList.remove('on'); }
      if (t.identifier === lookId) lookId = null;
    }
  };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  const btn = (id, down, up) => {
    const b = document.getElementById(id);
    b.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); Sfx.init(); b.classList.add('on'); down(); }, { passive: false });
    const u = e => { e.preventDefault(); b.classList.remove('on'); up && up(); };
    b.addEventListener('touchend', u, { passive: false }); b.addEventListener('touchcancel', u, { passive: false });
  };
  btn('bAtk', () => { Input.atkP = true; Input.anyP = true; });
  btn('bHeavy', () => { Input.hvP = true; Input.hvH = true; }, () => { Input.hvH = false; });
  btn('bDash', () => { Input.dashP = true; });
  btn('bRage', () => { Input.rageP = true; });
  btn('bMap', () => { Input.mapP = true; });
}
