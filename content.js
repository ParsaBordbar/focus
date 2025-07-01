const defaultDopamine = [
  'https://www.tiktok.com/explore',
  'https://www.instagram.com',
  'porn',
];

const defaultGood = [
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

const ytShorts = {
  header: 'ytd-reel-section-renderer',
  shelf: 'ytd-reel-shelf-renderer',
};

const ytPlayAbles = {
  header: 'rich-shelf-header',
  shelf: 'ytd-rich-shelf-renderer',
};


const getBookmarksByFolderName = (folderName) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getBookmarksByFolder', folderName }, (response) => {
      resolve(response?.urls || []);
    });
  });
}

// Load Websites from book marks
const loadCustomSites= async() => {
  const [dopamine, good] = await Promise.all([
    getBookmarksByFolderName('Dopamine Sites'),
    getBookmarksByFolderName('Good Sources'),
  ]);

  return {
    dopamineWebsites: dopamine.length > 0 ? dopamine : defaultDopamine,
    goodSources: good.length > 0 ? good : defaultGood,
  };
}

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
  const observer = new MutationObserver(() => hideYTSection(ytShorts));
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

chrome.storage.sync.get(['enabled'], async (result) => {
  if (result.enabled === false) return;

  const { dopamineWebsites, goodSources } = await loadCustomSites();

  if (dopamineWebsites.some((site) => location.href.startsWith(site))) {
    const index = Math.floor(Math.random() * goodSources.length);
    location.replace(goodSources[index]);
    return;
  }

  hideYTFeed();
  hideYTSection(ytShorts);
  hideYTSection(ytPlayAbles);
  observeShorts();
});
