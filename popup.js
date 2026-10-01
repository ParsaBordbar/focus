// Random scribbles, rings and dashes for the "distracted" background.
const drawClutter = () => {
  const svg = document.getElementById('clutter');
  const ns = 'http://www.w3.org/2000/svg';
  const r = (min, max) => min + Math.random() * (max - min);
  const point = () => `${r(-10, 110).toFixed(1)} ${r(-10, 110).toFixed(1)}`;

  const add = (tag, attrs) => {
    const el = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    svg.append(el);
  };

  for (let i = 0; i < 46; i++) {
    const dashed = Math.random() < 0.3;
    const hot = Math.random() < 0.2;
    const classes = [dashed && 'dashed', hot && 'hot'].filter(Boolean).join(' ');
    add('path', {
      d: `M${point()} C${point()}, ${point()}, ${point()}`,
      'stroke-width': r(0.15, 0.9).toFixed(2),
      'stroke-opacity': r(0.15, 0.6).toFixed(2),
      ...(classes && { class: classes }),
      ...(dashed && { 'stroke-dasharray': `${r(0.5, 3).toFixed(1)} ${r(0.5, 3).toFixed(1)}` }),
    });
  }

  for (let i = 0; i < 14; i++) {
    add('circle', {
      cx: r(0, 100).toFixed(1),
      cy: r(0, 100).toFixed(1),
      r: r(2, 18).toFixed(1),
      'stroke-width': r(0.15, 0.6).toFixed(2),
      'stroke-opacity': r(0.15, 0.45).toFixed(2),
    });
  }

  for (let i = 0; i < 30; i++) {
    add('circle', {
      class: 'dot',
      cx: r(0, 100).toFixed(1),
      cy: r(0, 100).toFixed(1),
      r: r(0.2, 0.8).toFixed(2),
      'fill-opacity': r(0.3, 0.8).toFixed(2),
    });
  }
}

const formatLeft = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  if (totalSeconds >= 3600) return `${Math.ceil(totalSeconds / 60)}m`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const btn = document.getElementById('toggle-btn');
  const hint = document.getElementById('hint');
  const progress = document.querySelector('#ring .progress');
  const nameInput = document.getElementById('session-name');
  const nameLabel = document.getElementById('session-label');

  let state = { settings: DEFAULT_SETTINGS, session: null };
  let holdTimer = null;
  let justEnded = false;
  let hintTimer;

  drawClutter();

  const inSession = () => state.settings.enabled && isSessionActive(state.session);

  const showHint = (text) => {
    clearTimeout(hintTimer);
    hint.textContent = text;
    body.classList.add('hinting');
    hintTimer = setTimeout(() => body.classList.remove('hinting'), 2200);
  }

  const render = () => {
    const { enabled } = state.settings;
    const locked = inSession();

    body.classList.toggle('focused', enabled);
    body.classList.toggle('session', locked);
    body.classList.toggle('timed', state.settings.timedSessions);
    nameLabel.textContent = locked ? state.session.name : '';
    btn.setAttribute('aria-pressed', enabled);

    if (locked) {
      const { start, end } = state.session;
      const left = end - Date.now();
      progress.style.strokeDashoffset = 100 * (left / (end - start));
      btn.textContent = holdTimer ? 'Hold' : formatLeft(left);
      btn.title = 'Hold for 5 seconds to end early';
    } else {
      btn.textContent = enabled ? "End" : "Focus";
      btn.title = '';
    }
  }

  const refresh = async () => {
    const [settings, { session }] = await Promise.all([
      chrome.storage.sync.get(DEFAULT_SETTINGS),
      chrome.storage.local.get({ session: null }),
    ]);
    state = { settings, session };
    render();
  }

  chrome.storage.local.get({ sessionName: '' }, ({ sessionName }) => (nameInput.value = sessionName));

  refresh().then(() => {
    // Enable transitions only after the first paint, so opening the popup doesn't animate.
    requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('ready')));
  });

  chrome.storage.onChanged.addListener(refresh);
  setInterval(() => inSession() && render(), 1000);

  // Ending a timed session early takes a deliberate hold, not a click.
  const startHold = () => {
    if (!inSession() || holdTimer) return;
    body.classList.add('holding');
    holdTimer = setTimeout(() => {
      holdTimer = null;
      justEnded = true;
      body.classList.remove('holding');
      chrome.storage.sync.set({ enabled: false });
    }, HOLD_TO_END_MS);
    render();
  }

  const cancelHold = () => {
    if (!holdTimer) return;
    clearTimeout(holdTimer);
    holdTimer = null;
    body.classList.remove('holding');
    render();
  }

  btn.addEventListener('pointerdown', startHold);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => btn.addEventListener(type, cancelHold));

  btn.addEventListener('keydown', (event) => {
    if ((event.key === ' ' || event.key === 'Enter') && inSession()) {
      event.preventDefault();
      if (!event.repeat) startHold();
    }
  });
  btn.addEventListener('keyup', (event) => {
    if (event.key === ' ' || event.key === 'Enter') cancelHold();
  });

  // background.js reacts to the storage change: redirects open tabs and starts the timer if enabled.
  // The session name goes in first so the timer picks it up.
  const toggle = async () => {
    if (!state.settings.enabled) await chrome.storage.local.set({ sessionName: nameInput.value.trim() });
    chrome.storage.sync.set({ enabled: !state.settings.enabled });
  }

  btn.addEventListener('click', () => {
    if (justEnded) {
      justEnded = false;
      return;
    }
    if (inSession()) {
      showHint('Hold for 5 seconds to end early');
      return;
    }
    toggle();
  });

  nameInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !state.settings.enabled) toggle();
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
