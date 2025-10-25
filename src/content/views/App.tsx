import { useEffect, useState } from "react";
import "./App.css";

/**
 * Toast notification component for content script
 */
function Toast({
  message,
  type = "info",
  visible,
}: {
  message: string;
  type?: "success" | "error" | "info";
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div className={`content-toast content-toast-${type}`}>
      <span className="toast-icon">
        {type === "success" && "✓"}
        {type === "error" && "✕"}
        {type === "info" && "ℹ"}
      </span>
      <span>{message}</span>
    </div>
  );
}

function App() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [showShareButton, setShowShareButton] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [toastType, setToastType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [showToast, setShowToast] = useState(false);
  const [extensionReady, setExtensionReady] = useState(false);

  // Check if extension is ready on mount
  useEffect(() => {
    const checkExtensionReady = async () => {
      try {
        if (!chrome.runtime?.id) {
          console.error("Chrome runtime not available");
          return;
        }

        // Try to ping the background worker
        const response = await chrome.runtime.sendMessage({ action: "ping" });
        if (response) {
          setExtensionReady(true);
          console.log("Extension is ready");
        }
      } catch (error) {
        console.error("Extension not ready:", error);
        // Retry after a short delay
        setTimeout(checkExtensionReady, 1000);
      }
    };

    checkExtensionReady();
  }, []);

  useEffect(() => {
    // Listen for messages from background worker
    const handleMessage = (
      request: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (request.action === "copyToClipboard") {
        navigator.clipboard
          .writeText(request.text)
          .then(() => {
            showToastMessage("✓ Link copied to clipboard!", "success");
            sendResponse({ success: true });
          })
          .catch((err) => {
            console.error("Copy failed:", err);
            showToastMessage("Failed to copy link", "error");
            sendResponse({ success: false });
          });
        return true; // Keep sendResponse valid
      }

      if (request.action === "showToast") {
        showToastMessage(request.message, request.type || "info");
        sendResponse({ success: true });
        return true;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Listen for text selection
    const handleTextSelection = () => {
      // Don't reset selection if we're showing the share link (user might be clicking copy)
      if (shareLink) {
        return;
      }

      const selected = window.getSelection()?.toString().trim();

      if (selected && selected.length > 0) {
        setSelectedText(selected);
        setShowShareButton(true);
        setShareLink("");
        setCopied(false);
        // No toast on selection - just show the button
      } else {
        setShowShareButton(false);
      }
    };

    // Listen for mouse up events to detect text selection
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("touchend", handleTextSelection);

    // Send selected text to popup through message
    if (selectedText && chrome.runtime?.id) {
      try {
        chrome.runtime.sendMessage(
          { action: "textSelected", text: selectedText },
          (_response) => {
            // Response handling - silently fail if extension context is invalid
            if (chrome.runtime.lastError) {
              console.warn(
                "Failed to send textSelected message:",
                chrome.runtime.lastError
              );
            }
          }
        );
      } catch (error) {
        console.warn("Error sending textSelected message:", error);
      }
    }

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("touchend", handleTextSelection);
    };
  }, [selectedText, shareLink]);

  const showToastMessage = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShare = async () => {
    if (!selectedText) return;

    // Check if extension is ready
    if (!extensionReady) {
      showToastMessage(
        "Extension is initializing. Please wait a moment and try again.",
        "error"
      );
      return;
    }

    setIsLoading(true);
    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        showToastMessage(
          "Extension context invalid. Please reload the page.",
          "error"
        );
        setIsLoading(false);
        return;
      }

      const response = await chrome.runtime.sendMessage({
        action: "createShareLink",
        text: selectedText,
      });

      if (response?.success && response?.link) {
        setShareLink(response.link);
      } else {
        showToastMessage(
          response?.error || "Failed to create share link. Please try again.",
          "error"
        );
      }
    } catch (error) {
      console.error("Error creating share link:", error);

      // Handle specific Chrome extension errors
      if (error instanceof Error) {
        if (error.message.includes("Extension context invalidated")) {
          showToastMessage(
            "Extension was reloaded. Please refresh this page.",
            "error"
          );
        } else if (error.message.includes("message port closed")) {
          showToastMessage(
            "Connection lost. Please refresh the page.",
            "error"
          );
        } else if (error.message.includes("Receiving end does not exist")) {
          showToastMessage(
            "Extension not ready. Please refresh the page.",
            "error"
          );
          // Try to reconnect
          setExtensionReady(false);
          setTimeout(async () => {
            try {
              await chrome.runtime.sendMessage({ action: "ping" });
              setExtensionReady(true);
            } catch (e) {
              console.error("Failed to reconnect:", e);
            }
          }, 1000);
        } else {
          showToastMessage(
            "Error creating share link. Please try again.",
            "error"
          );
        }
      } else {
        showToastMessage(
          "Error creating share link. Please try again.",
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      showToastMessage("✓ Link copied to clipboard!", "success");

      // Auto-hide the button after copying
      setTimeout(() => {
        setCopied(false);
        setShareLink(""); // Clear the link to hide the container
        setShowShareButton(false); // Hide the button
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      showToastMessage("Failed to copy link to clipboard", "error");
    }
  };

  if (!showShareButton) {
    return null;
  }

  return (
    <>
      <div className="picky-share-container">
        {!shareLink ? (
          <button
            className="share-button"
            onClick={handleShare}
            disabled={isLoading}
            title="Create a shareable link for this text"
          >
            {isLoading ? "Creating link..." : "Share Text"}
          </button>
        ) : (
          <div className="share-link-container">
            <input
              type="text"
              className="share-link-input"
              value={shareLink}
              readOnly
              title="Your shareable link"
            />
            <button
              className={`copy-button ${copied ? "copied" : ""}`}
              onClick={handleCopy}
              title="Copy link to clipboard"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        )}
      </div>
      <Toast message={toastMessage} type={toastType} visible={showToast} />
    </>
  );
}

export default App;
