if (typeof importScripts === 'function') importScripts('shared.js');

const getBookmarksByFolder = async (folderName) => {
  const tree = await chrome.bookmarks.getTree();
  const urls = [];

  const search = (node) => {
    if (node.title === folderName && node.children) {
      for (const child of node.children) {
        if (child.url) urls.push(child.url);
      }
    } else if (node.children) {
      for (const child of node.children) search(child);
    }
  }

  tree.forEach(search);
  return urls;
}

const loadRules = async () => {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const [dopamineBookmarks, goodBookmarks] = await Promise.all([
    getBookmarksByFolder('Dopamine Sites'),
    getBookmarksByFolder('Good Sources'),
  ]);

  const blocked = [
    ...DOPAMINE_SITES,
    ...dopamineBookmarks,
    ...settings.blockedSites,
    ...(settings.noAI ? AI_SITES : []),
  ];

  const customGood = [...goodBookmarks, ...settings.goodSites];
  const good = (customGood.length > 0 ? customGood : GOOD_SITES)
    .filter(isValidGoodSite)
    .map(toUrl)
    .filter((site) => !blocked.some((entry) => matchesSite(site, entry)));

  return { enabled: settings.enabled, blocked, good };
}

const redirectIfBlocked = (tabId, url, rules) => {
  if (!rules.enabled || !/^https?:/.test(url)) return;
  if (!rules.blocked.some((entry) => matchesSite(url, entry))) return;

  const target = rules.good.length > 0
    ? rules.good[Math.floor(Math.random() * rules.good.length)]
    : 'about:blank';
  chrome.tabs.update(tabId, { url: target }).catch(() => {});
}

const onNavigate = async ({ tabId, frameId, url }) => {
  if (frameId !== 0) return;
  redirectIfBlocked(tabId, url, await loadRules());
}

chrome.webNavigation.onBeforeNavigate.addListener(onNavigate);
chrome.webNavigation.onHistoryStateUpdated.addListener(onNavigate);

chrome.tabs.onUpdated.addListener(async (tabId, { url }) => {
  if (url) redirectIfBlocked(tabId, url, await loadRules());
});

const iconPaths = (state) => Object.fromEntries([16, 32, 48, 128].map((size) => [size, `icons/icon${size}_${state}.png`]));

const updateIcon = (enabled) => {
  chrome.action.setIcon({ path: iconPaths(enabled ? 'on' : 'off') });
}

const SESSION_ALARM = 'focus-session-end';
const BADGE_ALARM = 'focus-session-badge';

const getSession = async () => (await chrome.storage.local.get({ session: null })).session;

const updateBadge = (session) => {
  const minutesLeft = Math.max(0, Math.ceil((session.end - Date.now()) / 60000));
  chrome.action.setBadgeText({ text: String(minutesLeft) });
}

const scheduleSession = (session) => {
  chrome.alarms.create(SESSION_ALARM, { when: session.end });
  chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 1 });
  updateBadge(session);
}

const startSession = async (minutes) => {
  const length = Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Number(minutes) || DEFAULT_SETTINGS.sessionMinutes));
  const { sessionName } = await chrome.storage.local.get({ sessionName: '' });
  const start = Date.now();
  const session = { start, end: start + length * 60000, name: sessionName.trim() };
  await chrome.storage.local.set({ session });
  scheduleSession(session);
}

const clearSession = async () => {
  await chrome.storage.local.set({ session: null });
  chrome.alarms.clear(SESSION_ALARM);
  chrome.alarms.clear(BADGE_ALARM);
  chrome.action.setBadgeText({ text: '' });
}

let completing = false;
const completeSession = async () => {
  if (completing) return;
  completing = true;
  const session = await getSession();
  if (!session) {
    completing = false;
    return;
  }
  await clearSession();
  completing = false;

  const minutes = Math.round((session.end - session.start) / 60000);
  const { history } = await chrome.storage.local.get({ history: [] });
  const entry = { name: session.name, minutes, end: session.end };
  await chrome.storage.local.set({ history: [entry, ...history].slice(0, MAX_HISTORY) });
  await chrome.storage.sync.set({ enabled: false });

  const length = `${minutes} minute${minutes === 1 ? '' : 's'} of focus`;
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128_on.png',
    title: session.name ? `Done: ${session.name}` : 'Focus session done',
    message: `${length}. Take a break.`,
  });
}

chrome.alarms.onAlarm.addListener(async ({ name }) => {
  if (name === SESSION_ALARM) completeSession();
  if (name === BADGE_ALARM) {
    const session = await getSession();
    if (session) updateBadge(session);
  }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'sync') return;

  if (changes.enabled) {
    const enabled = changes.enabled.newValue ?? true;
    updateIcon(enabled);

    const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    if (!enabled) await clearSession();
    else if (settings.timedSessions && !(await getSession())) await startSession(settings.sessionMinutes);
  }

  const rules = await loadRules();
  const tabs = await chrome.tabs.query({});
  tabs.forEach((tab) => tab.url && redirectIfBlocked(tab.id, tab.url, rules));
});

chrome.action.setBadgeBackgroundColor({ color: '#7aa2f7' });
chrome.action.setBadgeTextColor?.({ color: '#1a1b26' });

chrome.storage.sync.get(DEFAULT_SETTINGS).then(({ enabled }) => updateIcon(enabled));

getSession().then((session) => {
  if (!session) return;
  if (isSessionActive(session)) scheduleSession(session);
  else completeSession();
});
