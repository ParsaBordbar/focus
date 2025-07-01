chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getBookmarksByFolder') {
    chrome.bookmarks.getTree((tree) => {
      const urls = [];

      const search = (node) => {
        if (node.title === message.folderName && node.children) {
          for (const child of node.children) {
            if (child.url) urls.push(child.url);
          }
        } else if (node.children) {
          for (const child of node.children) search(child);
        }
      }

      tree.forEach(search);
      sendResponse({ urls });
    });

    return true;
  }
});

chrome.storage.sync.get('enabled', ({ enabled }) => {
  updateIcon(enabled ?? true);
});

