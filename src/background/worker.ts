/**
 * Background service worker for picky-share
 * Production-grade service worker with:
 * - Message passing between content script and popup
 * - Creating share links via paste.rs API
 * - Error handling and logging
 * - Storage management
 */

import { CONFIG } from "@/utils/config";
import { loggerBackground } from "@/utils/logger";
import { uploadToPaste, type PasteResponse } from "@/utils/pasteApi";

/**
 * Handle message from content script or popup
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request.action) {
    loggerBackground.warn("Received message without action", {
      sender: sender.url,
    });
    sendResponse({ success: false, error: "Invalid message format" });
    return true;
  }

  loggerBackground.debug("Message received", {
    action: request.action,
    from: sender.url,
  });

  try {
    if (request.action === "createShareLink") {
      // Validate request
      if (!request.text || typeof request.text !== "string") {
        sendResponse({
          success: false,
          error: "Invalid text provided",
        });
        return true;
      }

      loggerBackground.info("Creating share link", {
        textLength: request.text.length,
      });

      // Upload to paste.rs
      uploadToPaste(request.text)
        .then((result: PasteResponse) => {
          if (result.success) {
            loggerBackground.info("Share link created successfully", {
              pasteId: result.id,
            });

            // Store in history
            storeShareHistory(request.text, result.link as string).catch(
              (err) => {
                loggerBackground.error("Failed to store share history", err);
              }
            );
          } else {
            loggerBackground.warn("Share link creation failed", {
              error: result.error,
            });
          }

          sendResponse({
            success: result.success,
            link: result.link,
            error: result.error,
            statusCode: result.statusCode,
            partialUpload: result.partialUpload,
          });
        })
        .catch((error: Error) => {
          loggerBackground.error("Unexpected error creating share link", error);
          sendResponse({
            success: false,
            error: "Unexpected error occurred",
          });
        });

      // Return true to indicate we'll send response asynchronously
      return true;
    }

    if (request.action === "ping") {
      // Health check - respond immediately
      sendResponse({ success: true, ready: true });
      return true;
    }

    if (request.action === "textSelected") {
      // Store the selected text for the popup to access
      if (!request.text || typeof request.text !== "string") {
        loggerBackground.warn("Invalid text in textSelected message");
        sendResponse({ received: false });
        return true;
      }

      chrome.storage.local.set({
        [CONFIG.STORAGE.KEYS.LAST_SELECTED_TEXT]: request.text,
      });

      loggerBackground.debug("Text stored", {
        textLength: request.text.length,
      });
      sendResponse({ received: true });
      return true;
    }

    if (request.action === "getShareHistory") {
      // Get share history
      chrome.storage.local.get(CONFIG.STORAGE.KEYS.SHARE_HISTORY, (result) => {
        const history = result[CONFIG.STORAGE.KEYS.SHARE_HISTORY] || [];
        loggerBackground.debug("Retrieved share history", {
          count: history.length,
        });
        sendResponse({ success: true, history });
      });
      return true;
    }

    if (request.action === "clearShareHistory") {
      // Clear share history
      chrome.storage.local.remove(CONFIG.STORAGE.KEYS.SHARE_HISTORY, () => {
        loggerBackground.info("Share history cleared");
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.action === "getLogs") {
      // For debugging - get logs
      sendResponse({
        success: true,
        logs: loggerBackground.getLogs(),
      });
      return true;
    }

    loggerBackground.warn("Unknown message action", { action: request.action });
    sendResponse({ success: false, error: "Unknown action" });
    return true;
  } catch (error) {
    loggerBackground.error("Unexpected error in message handler", error);
    sendResponse({
      success: false,
      error: "Internal error",
    });
    return true;
  }
});

/**
 * Store share in history
 */
async function storeShareHistory(text: string, link: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(CONFIG.STORAGE.KEYS.SHARE_HISTORY, (result) => {
      try {
        const history = result[CONFIG.STORAGE.KEYS.SHARE_HISTORY] || [];

        // Add new entry
        history.unshift({
          text: text.substring(0, 100), // Store first 100 chars as preview
          link,
          timestamp: new Date().toISOString(),
        });

        // Keep history size reasonable
        if (history.length > CONFIG.STORAGE.HISTORY_LIMIT) {
          history.pop();
        }

        chrome.storage.local.set(
          {
            [CONFIG.STORAGE.KEYS.SHARE_HISTORY]: history,
          },
          () => {
            loggerBackground.debug("Share stored in history", {
              historySize: history.length,
            });
            resolve();
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Install/Update event
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    loggerBackground.info("Extension installed", {
      version: CONFIG.EXTENSION.VERSION,
    });
    // Could open welcome page here
    // Context menu removed - using only floating button
    chrome.tabs.create({ url: "chrome://newtab/" });
  } else if (details.reason === "update") {
    loggerBackground.info("Extension updated", {
      previousVersion: details.previousVersion,
      version: CONFIG.EXTENSION.VERSION,
    });
  }
});

// Keep service worker alive
let keepAliveInterval: number | undefined;

function keepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  keepAliveInterval = setInterval(() => {
    loggerBackground.debug("Keep-alive ping");
  }, 20000) as unknown as number; // Ping every 20 seconds
}

// Start keep-alive on startup
keepAlive();

// Restart keep-alive on extension startup
chrome.runtime.onStartup.addListener(() => {
  loggerBackground.info("Extension started");
  keepAlive();
});

// Connection handler for content scripts
chrome.runtime.onConnect.addListener((port) => {
  loggerBackground.debug("Port connected", { name: port.name });

  port.onDisconnect.addListener(() => {
    loggerBackground.debug("Port disconnected", { name: port.name });
  });
});

loggerBackground.info("Background service worker initialized", {
  version: CONFIG.EXTENSION.VERSION,
});
