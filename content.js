const ytShorts = {
    header: 'ytd-reel-section-renderer',
    shelf: 'ytd-reel-shelf-renderer',
}  

const ytPlayAbles = {
    header: 'rich-shelf-header',
    shelf: 'ytd-rich-shelf-renderer',
}

const hideYTSection = (sections) => {

    document.querySelectorAll(sections.header).forEach(element => {
	const title = element.querySelector('h2');
	 if (title?.textContent?.toLowerCase()?.includes("shorts" || "Shorts")) {
         element.style.display = 'none';
      }
    });
    
    
    document.querySelectorAll(sections.shelf)
    .forEach(el => el.style.display = 'none');
}


function observeShorts() {
  const observer = new MutationObserver(() => hideYTSection(ytShorts));
  observer.observe(document.body, { childList: true, subtree: true });
}


const hideFeed = () => {
    if (location.pathname === "/" || location.pathname === "/feed/" || location.pathname.startsWith === "/shorts/") {
    location.replace("/feed/subscriptions");
    }
}

chrome.storage.sync.get(['enabled'], (result) => {
  if (result.enabled === false) return;
    hideFeed();
    hideYTSection(ytShorts);
    hideYTSection(ytPlayAbles)
    observeShorts();
});