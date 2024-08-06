// popup.js
document.getElementById('start').addEventListener('click', () => {
  document.getElementById('status').textContent = 'Bot started!';
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      function: startBot
    });
  });
});

function startBot() {
  console.log('Bot started!');
  // Bot logic will go here
}
