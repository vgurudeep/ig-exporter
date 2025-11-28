const XHR_open = window.XMLHttpRequest.prototype.open;
const XHR_send = window.XMLHttpRequest.prototype.send;
const originalFetch = window.fetch;

// 1. Intercept Fetch Requests (Most common for new IG)
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  const url = args[0] ? args[0].toString() : "";

  // Broad filter: look for graphQL or feed/saved
  if (
    url.includes("/graphql/query") ||
    url.includes("/feed/saved/") ||
    url.includes("saved")
  ) {
    try {
      const clone = response.clone();
      const json = await clone.json();

      // Send to Content Script
      window.postMessage(
        {
          type: "IG_SAVED_INTERCEPT",
          payload: json,
          source: "fetch",
          url: url,
        },
        "*"
      );
    } catch (e) {
      // Not JSON, ignore
    }
  }
  return response;
};

// 2. Intercept XHR Requests (Older method, sometimes used for pagination)
window.XMLHttpRequest.prototype.open = function (method, url) {
  this._url = url;
  return XHR_open.apply(this, arguments);
};

window.XMLHttpRequest.prototype.send = function () {
  this.addEventListener("load", function () {
    if (
      this._url &&
      (this._url.includes("/graphql/query") || this._url.includes("saved"))
    ) {
      try {
        const json = JSON.parse(this.responseText);
        window.postMessage(
          {
            type: "IG_SAVED_INTERCEPT",
            payload: json,
            source: "xhr",
            url: this._url,
          },
          "*"
        );
      } catch (e) {
        // Ignore
      }
    }
  });
  return XHR_send.apply(this, arguments);
};
