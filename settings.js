const toggles = ['enabled', 'noAI', 'cleanYouTube', 'timedSessions'];
const lists = ['blockedSites', 'goodSites'];

const $ = (id) => document.getElementById(id);

const toLines = (text) => [...new Set(text.split('\n').map((line) => line.trim()).filter(Boolean))];

const fillChips = (listId, countId, sites) => {
  $(countId).textContent = sites.length;
  $(listId).replaceChildren(...sites.map((site) => {
    const li = document.createElement('li');
    li.textContent = site;
    return li;
  }));
}

let statusTimer;
const showStatus = (message, sticky = false) => {
  clearTimeout(statusTimer);
  $('status').textContent = message;
  if (!sticky) statusTimer = setTimeout(() => ($('status').textContent = ''), 2500);
}

fillChips('dopamine-defaults', 'dopamine-count', DOPAMINE_SITES);
fillChips('ai-defaults', 'ai-count', AI_SITES);
fillChips('good-defaults', 'good-count', GOOD_SITES);

chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  toggles.forEach((key) => ($(key).checked = settings[key]));
  lists.forEach((key) => ($(key).value = settings[key].join('\n')));
});

toggles.forEach((key) => {
  $(key).addEventListener('change', (event) => {
    chrome.storage.sync.set({ [key]: event.target.checked }, () => showStatus('Saved'));
  });
});

// Lists save on click, not while typing: a half-typed word like "red" would already block every domain containing it.
lists.forEach((key) => $(key).addEventListener('input', () => showStatus('Unsaved changes', true)));

$('save').addEventListener('click', () => {
  const data = {};
  const skipped = [];

  const validators = { blockedSites: parseEntry, goodSites: isValidGoodSite };

  lists.forEach((key) => {
    const lines = toLines($(key).value);
    skipped.push(...lines.filter((line) => !validators[key](line)));
    data[key] = lines.filter((line) => validators[key](line));
  });

  chrome.storage.sync.set(data, () => {
    if (chrome.runtime.lastError) {
      showStatus(`Could not save: ${chrome.runtime.lastError.message}`, true);
      return;
    }
    lists.forEach((key) => ($(key).value = data[key].join('\n')));
    showStatus(skipped.length > 0 ? `Saved. Skipped: ${skipped.join(', ')}` : 'Saved');
  });
});

// Keep toggles in sync when they're flipped from the popup.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  toggles.forEach((key) => {
    if (changes[key]) $(key).checked = changes[key].newValue ?? DEFAULT_SETTINGS[key];
  });
});

// Timed sessions: length input, lock while a session runs, and today's completed sessions.
const clampMinutes = (value) => Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(Number(value)) || DEFAULT_SETTINGS.sessionMinutes));

const formatTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const renderSessions = async () => {
  const [{ enabled, timedSessions, sessionMinutes }, { session, history }] = await Promise.all([
    chrome.storage.sync.get(DEFAULT_SETTINGS),
    chrome.storage.local.get({ session: null, history: [] }),
  ]);

  // Turning things off from here would sidestep hold-to-end, so lock them while a session runs.
  const locked = enabled && isSessionActive(session);
  $('enabled').disabled = locked;
  $('timedSessions').disabled = locked;
  $('sessionMinutes').disabled = locked || !timedSessions;
  if (document.activeElement !== $('sessionMinutes')) $('sessionMinutes').value = sessionMinutes;

  const today = new Date().toDateString();
  const done = history.filter((entry) => new Date(entry.end).toDateString() === today);
  const total = done.reduce((sum, entry) => sum + entry.minutes, 0);

  const parts = [];
  if (locked) parts.push(`${session.name ? `"${session.name}"` : 'Session'} running until ${formatTime(session.end)}. Focus is locked.`);
  if (done.length > 0) parts.push(`Today: ${done.length} session${done.length === 1 ? '' : 's'}, ${total} min.`);
  $('session-status').textContent = parts.join(' ');

  $('history').replaceChildren(...done.map((entry) => {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = entry.name || 'Untitled session';
    const meta = document.createElement('small');
    meta.textContent = `${entry.minutes} min · ${formatTime(entry.end)}`;
    li.append(name, meta);
    return li;
  }));
}

$('sessionMinutes').addEventListener('change', (event) => {
  const minutes = clampMinutes(event.target.value);
  event.target.value = minutes;
  chrome.storage.sync.set({ sessionMinutes: minutes }, () => showStatus('Saved'));
});

renderSessions();
chrome.storage.onChanged.addListener(renderSessions);
// The lock lifts on its own when a session ends; this just keeps the text fresh in between.
setInterval(renderSessions, 30000);
