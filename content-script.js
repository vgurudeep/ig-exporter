// This script runs in the "Isolated World" and talks to the Popup.

let collectedPosts = [];
let isScrolling = false;
let scrollInterval = null;

// Listen for the data coming from interceptor.js
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "IG_SAVED_INTERCEPT") {
    const data = event.data.payload;
    processInstagramData(data);
  }
});

// Listen for popup commands
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_SCROLL") {
    startAutoScroll();
    sendResponse({ status: "started" });
  } else if (request.action === "STOP_SCROLL") {
    stopAutoScroll();
    sendResponse({ status: "stopped" });
  } else if (request.action === "GET_COUNT") {
    sendResponse({ count: collectedPosts.length });
  } else if (request.action === "CLEAR_DATA") {
    collectedPosts = [];
    sendResponse({ status: "cleared" });
  }
  // NEW: Handle downloads directly here to avoid message size limits
  else if (request.action === "DOWNLOAD_JSON") {
    triggerDownload(
      JSON.stringify(collectedPosts, null, 2),
      "instagram_saved.json",
      "application/json"
    );
    sendResponse({ status: "success" });
  } else if (request.action === "DOWNLOAD_CSV") {
    const csvContent = generateCSV(collectedPosts);
    triggerDownload(csvContent, "instagram_saved.csv", "text/csv");
    sendResponse({ status: "success" });
  }
});

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function generateCSV(data) {
  const headers = ["Link", "Username", "Caption", "Image URL", "Timestamp"];
  const rows = data.map((row) => {
    const cleanCaption = row.caption
      ? `"${row.caption.replace(/"/g, '""').replace(/\n/g, " ")}"`
      : '""';
    return [
      row.link,
      row.username,
      cleanCaption,
      row.image_url,
      row.timestamp,
    ].join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

function startAutoScroll() {
  if (isScrolling) return;
  isScrolling = true;
  scrollInterval = setInterval(() => {
    window.scrollTo(0, document.body.scrollHeight);
    setTimeout(() => {
      window.scrollTo(0, document.body.scrollHeight - 100);
    }, 500);
  }, 2500);
}

function stopAutoScroll() {
  isScrolling = false;
  clearInterval(scrollInterval);
}

function processInstagramData(json) {
  let newItems = [];
  if (json.data && json.data.user && json.data.user.edge_saved_media) {
    newItems = json.data.user.edge_saved_media.edges.map((e) => e.node);
  } else if (
    json.data &&
    json.data.viewer &&
    json.data.viewer.edge_saved_media
  ) {
    newItems = json.data.viewer.edge_saved_media.edges.map((e) => e.node);
  } else if (json.items) {
    newItems = json.items.map((item) => (item.media ? item.media : item));
  }

  if (newItems.length > 0) {
    let countBefore = collectedPosts.length;
    newItems.forEach((media) => {
      if (collectedPosts.find((p) => p.id === media.id || p.id === media.pk))
        return;

      let captionText = "";
      if (media.caption && media.caption.text) captionText = media.caption.text;
      else if (
        media.edge_media_to_caption &&
        media.edge_media_to_caption.edges.length > 0
      )
        captionText = media.edge_media_to_caption.edges[0].node.text;

      let imageUrl = media.display_url;
      if (!imageUrl && media.image_versions2)
        imageUrl = media.image_versions2.candidates[0].url;

      let username = "unknown";
      if (media.owner) username = media.owner.username;
      else if (media.user) username = media.user.username;

      collectedPosts.push({
        id: media.id || media.pk,
        code: media.code || media.shortcode,
        link: `https://www.instagram.com/p/${media.code || media.shortcode}/`,
        caption: captionText,
        username: username,
        timestamp: media.taken_at_timestamp || media.taken_at,
        image_url: imageUrl,
      });
    });

    if (collectedPosts.length > countBefore) {
      chrome.runtime
        .sendMessage({
          action: "UPDATE_COUNT",
          count: collectedPosts.length,
        })
        .catch(() => {});
    }
  }
}
