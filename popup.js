document.addEventListener("DOMContentLoaded", () => {
  const btnStart = document.getElementById("btnStart");
  const btnStop = document.getElementById("btnStop");
  const btnJson = document.getElementById("btnJson");
  const btnCsv = document.getElementById("btnCsv");
  const btnClear = document.getElementById("btnClear");
  const countDisplay = document.getElementById("postCount");
  const msgDisplay = document.getElementById("message");

  // Initialize: Ask content script for current count
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "GET_COUNT" },
        (response) => {
          if (response && response.count !== undefined) {
            countDisplay.innerText = response.count;
          }
        }
      );
    }
  });

  // Listen for updates from content script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "UPDATE_COUNT") {
      countDisplay.innerText = request.count;
    }
  });

  btnStart.addEventListener("click", () => {
    sendCommand("START_SCROLL");
    btnStart.classList.add("hidden");
    btnStop.classList.remove("hidden");
    msgDisplay.innerText = "Scrolling... Keep tab open!";
  });

  btnStop.addEventListener("click", () => {
    sendCommand("STOP_SCROLL");
    btnStop.classList.add("hidden");
    btnStart.classList.remove("hidden");
    msgDisplay.innerText = "Stopped.";
  });

  btnClear.addEventListener("click", () => {
    sendCommand("CLEAR_DATA");
    countDisplay.innerText = "0";
    msgDisplay.innerText = "Data cleared.";
  });

  // UPDATED: Triggers download inside content script
  btnJson.addEventListener("click", () => {
    msgDisplay.innerText = "Generating JSON...";
    sendCommand("DOWNLOAD_JSON");
  });

  // UPDATED: Triggers download inside content script
  btnCsv.addEventListener("click", () => {
    msgDisplay.innerText = "Generating CSV...";
    sendCommand("DOWNLOAD_CSV");
  });

  function sendCommand(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: action }, (response) => {
          // Check if there was an error
          if (chrome.runtime.lastError) {
            msgDisplay.innerText = "Error: Please refresh page";
          }
        });
      }
    });
  }
});
