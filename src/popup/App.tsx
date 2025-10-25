import Toast, { useToast } from "@/components/Toast";
import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [shareHistory, setShareHistory] = useState<any[]>([]);
  const toast = useToast();

  useEffect(() => {
    loadShareHistory();
    // Refresh history every 2 seconds
    const interval = setInterval(loadShareHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadShareHistory = () => {
    chrome.runtime.sendMessage({ action: "getShareHistory" }, (response) => {
      if (response?.success && response?.history) {
        setShareHistory(response.history);
      }
    });
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const handleOpenLink = (link: string) => {
    chrome.tabs.create({ url: link });
  };

  const handleClearHistory = () => {
    chrome.runtime.sendMessage({ action: "clearShareHistory" }, (response) => {
      if (response?.success) {
        setShareHistory([]);
        toast.info("History cleared");
      }
    });
  };

  return (
    <div className="popup-app">
      <div className="popup-header">
        <div className="header-content">
          <h1>Picky Share</h1>
          <p>Select text on any page to create a shareable link</p>
        </div>
        {shareHistory.length > 0 && (
          <button
            className="clear-all-button"
            onClick={handleClearHistory}
            title="Clear all history"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="popup-content">
        {shareHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">∅</div>
            <h2>No shares yet</h2>
            <p>
              Select text on any webpage and use the floating button to create a
              shareable link
            </p>
          </div>
        ) : (
          <div className="history-section">
            <div className="history-list">
              {shareHistory.map((item, index) => (
                <div key={index} className="history-item">
                  <div className="item-content">
                    <div className="item-text">{item.text}</div>
                    <div className="item-footer">
                      <span className="item-date">
                        {new Date(item.timestamp).toLocaleDateString()} at{" "}
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="item-link">{item.link}</span>
                    </div>
                  </div>
                  <div className="item-actions">
                    <button
                      className="action-button copy-button"
                      onClick={() => handleCopyLink(item.link)}
                      title="Copy link"
                    >
                      Copy
                    </button>
                    <button
                      className="action-button open-button"
                      onClick={() => handleOpenLink(item.link)}
                      title="Open link"
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Toast messages={toast.messages} onDismiss={toast.dismiss} />
    </div>
  );
}
