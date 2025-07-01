const dopamineWebsites = [
  'https://www.tiktok.com/',
  'https://www.tiktok.com/explore',
  'https://www.instagram.com',
];

const goodSources = [
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
]

const ytShorts = {
    header: 'ytd-reel-section-renderer',
    shelf: 'ytd-reel-shelf-renderer',
};

const ytPlayAbles = {
    header: 'rich-shelf-header',
    shelf: 'ytd-rich-shelf-renderer',
};

const hideYTSection = (sections) => {

  document.querySelectorAll(sections.header).forEach(element => {
	const title = element.querySelector('h2');
	 if (title?.textContent?.toLowerCase()?.includes("shorts" || "Shorts")) {
         element.style.display = 'none';
      }
    });
    
    document.querySelectorAll(sections.shelf)
    .forEach(el => el.style.display = 'none');
};


function observeShorts() {
  const observer = new MutationObserver(() => hideYTSection(ytShorts));
  observer.observe(document.body, { childList: true, subtree: true });
};


const hideYTFeed = () => {
  if (
  location.pathname === "/" ||
  location.pathname === "/feed/" ||
  location.pathname.startsWith("/shorts/")
  ) {
    location.replace("/feed/subscriptions");
  }
};


const goLearnInstead = () => {
  // Go to a random learning OR Good Thing
  const select = Math.floor(Math.random() * (goodSources.length));
  const youGo = goodSources[select];
  location.replace(youGo);
}


const skipDopamineWebsites = () => {
  if (dopamineWebsites.some(site => location.href.startsWith(site))) {
    goLearnInstead()
  }
}

chrome.storage.sync.get(['enabled'], (result) => {
  if (result.enabled === false) return;
    skipDopamineWebsites();
    hideYTFeed();
    hideYTSection(ytShorts);
    hideYTSection(ytPlayAbles)
    observeShorts();
});