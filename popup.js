document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById('toggle-btn');

  chrome.storage.sync.get(['enabled'], (result) => {
    const isEnabled = result.enabled ?? true;
    updateButton(isEnabled);
  });

  btn.addEventListener('click', () => {
    chrome.storage.sync.get(['enabled'], (result) => {
      const newValue = !(result.enabled ?? true);
      chrome.storage.sync.set({ enabled: newValue }, () => {
        updateButton(newValue);
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });
        });
      });
    });
  });

  function updateButton(enabled) {
    btn.style.color = 'white';
    btn.style.fontSize = '1.2rem';
    btn.textContent = enabled ? "End" : "Start";
    btn.style.backgroundColor = enabled ? "#965027" : "#bb9af7";
  }
});
