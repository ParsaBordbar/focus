const ytShorts = {
  header: 'ytd-reel-section-renderer',
  shelf: 'ytd-reel-shelf-renderer',
};

const ytPlayAbles = {
  header: 'rich-shelf-header',
  shelf: 'ytd-rich-shelf-renderer',
};

let active = false;
let observer = null;

const hideYTSection = (sections) => {
  document.querySelectorAll(sections.header).forEach((element) => {
    const title = element.querySelector('h2');
    if (title?.textContent?.toLowerCase().includes('shorts')) {
      element.style.display = 'none';
    }
  });

  document.querySelectorAll(sections.shelf).forEach((el) => (el.style.display = 'none'));
}

const observeShorts = () => {
  if (observer) return;
  observer = new MutationObserver(() => active && hideYTSection(ytShorts));
  observer.observe(document.body, { childList: true, subtree: true });
}

const hideYTFeed = () => {
  if (
    location.pathname === '/' ||
    location.pathname === '/feed/' ||
    location.pathname.startsWith('/shorts/')
  ) {
    location.replace('/feed/subscriptions');
  }
}

const tidyYouTube = () => {
  hideYTFeed();
  hideYTSection(ytShorts);
  hideYTSection(ytPlayAbles);
  observeShorts();
}

const applySettings = ({ enabled, cleanYouTube }) => {
  active = enabled && cleanYouTube;
  if (active) tidyYouTube();
}

chrome.storage.sync.get(DEFAULT_SETTINGS, applySettings);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') chrome.storage.sync.get(DEFAULT_SETTINGS, applySettings);
});

document.addEventListener('yt-navigate-finish', () => active && tidyYouTube());
