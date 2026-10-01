// Loaded by background.js (importScripts), content.js, popup.html and settings.html.

const DEFAULT_SETTINGS = {
  enabled: true,
  noAI: false,
  cleanYouTube: true,
  blockedSites: [],
  goodSites: [],
  timedSessions: false,
  sessionMinutes: 25,
};

// Timed sessions live in storage.local, not sync: the running `session` ({ start, end, name }),
// `sessionName` (last name typed in the popup) and `history` of completed sessions, newest first.
const HOLD_TO_END_MS = 5000;
const MIN_SESSION_MINUTES = 1;
const MAX_SESSION_MINUTES = 240;
const MAX_HISTORY = 100;

const isSessionActive = (session) => Boolean(session && session.end > Date.now());

// Entries are a domain, a domain + path, or a single word matched against the hostname.
const DOPAMINE_SITES = [
  'tiktok.com',
  'instagram.com',
  'x.com',
  'twitter.com',
  'reddit.com',
  'facebook.com',
  'snapchat.com',
  'tumblr.com',
  'discord.com/channels',
  'discord.com/app',
  'netflix.com',
  'twitch.tv',
  '9gag.com',
  'web.bale.ai',
  'onlyfans.com',
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'porn',
];

const AI_SITES = [
  'chatgpt.com',
  'chat.openai.com',
  'claude.ai',
  'gemini.google.com',
  'aistudio.google.com',
  'notebooklm.google.com',
  'copilot.microsoft.com',
  'perplexity.ai',
  'chat.deepseek.com',
  'grok.com',
  'meta.ai',
  'chat.mistral.ai',
  'poe.com',
  'character.ai',
  'huggingface.co/chat',
  'phind.com',
  'you.com',
  'pi.ai',
  'kimi.com',
  'chat.qwen.ai',
];

const GOOD_SITES = [
  'https://github.com/',
  'https://www.wikipedia.org/',
  'https://go.dev/doc/',
  'https://doc.rust-lang.org/book/title-page.html',
  'https://www.notion.com/',
  'https://www.w3schools.com/',
  'https://www.freecodecamp.org/',
  'https://www.youtube.com/c/LofiGirl',
  'https://www.youtube.com/bpluspodcast',
  'https://channelbpodcast.com/',
  'https://bpluspodcast.com/',
  'https://www.youtube.com/c/jadimirmirani',
  'https://medium.com/@imaginetta/150-educational-websites-for-lifelong-learners-71c1d8e94843',
  'https://linux1st.com/',
];

const stripWww = (host) => host.replace(/^www\./, '');

const toUrl = (entry) => (entry.includes('://') ? entry : `https://${entry}`);

// Returns { keyword } or { host, path }, or null when the entry can't be understood.
const parseEntry = (entry) => {
  const raw = entry.trim().toLowerCase();
  if (!raw) return null;
  if (!raw.includes('.') && !raw.includes('/')) return { keyword: raw };

  try {
    const url = new URL(toUrl(raw));
    return { host: stripWww(url.hostname), path: url.pathname.replace(/\/+$/, '') };
  } catch {
    return null;
  }
};

// Good sources are redirect targets, so they need a real host (no keywords, no bookmarklets).
const isValidGoodSite = (entry) => {
  try {
    const url = new URL(toUrl(entry.trim()));
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.');
  } catch {
    return false;
  }
};

const matchesSite = (href, entry) => {
  const rule = parseEntry(entry);
  if (!rule) return false;

  let url;
  try {
    url = new URL(href);
  } catch {
    return false;
  }

  const host = stripWww(url.hostname);
  if (rule.keyword) return host.includes(rule.keyword);

  const hostMatches = host === rule.host || host.endsWith(`.${rule.host}`);
  const path = url.pathname.toLowerCase();
  const pathMatches = !rule.path || path === rule.path || path.startsWith(`${rule.path}/`);
  return hostMatches && pathMatches;
};
