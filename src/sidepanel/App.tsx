import Toast, { useToast } from "@/components/Toast";
import { useEffect, useState } from "react";
import "./App.css";

interface ShareItem {
  text: string;
  link: string;
  timestamp: string;
}

interface Stats {
  totalShares: number;
  todayShares: number;
  thisWeekShares: number;
  totalCharacters: number;
}

export default function App() {
  const [shareHistory, setShareHistory] = useState<ShareItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ShareItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "today" | "week"
  >("all");
  const [stats, setStats] = useState<Stats>({
    totalShares: 0,
    todayShares: 0,
    thisWeekShares: 0,
    totalCharacters: 0,
  });
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadShareHistory();
    // Refresh history every 3 seconds
    const interval = setInterval(loadShareHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSearchHistory();
  }, [shareHistory, searchQuery, selectedFilter]);

  const loadShareHistory = () => {
    chrome.runtime.sendMessage({ action: "getShareHistory" }, (response) => {
      if (response?.success && response?.history) {
        setShareHistory(response.history);
        calculateStats(response.history);
        setIsLoading(false);
      }
    });
  };

  const calculateStats = (history: ShareItem[]) => {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayShares = history.filter(
      (item) => new Date(item.timestamp) >= todayStart
    ).length;

    const thisWeekShares = history.filter(
      (item) => new Date(item.timestamp) >= weekStart
    ).length;

    const totalCharacters = history.reduce(
      (sum, item) => sum + item.text.length,
      0
    );

    setStats({
      totalShares: history.length,
      todayShares,
      thisWeekShares,
      totalCharacters,
    });
  };

  const filterAndSearchHistory = () => {
    let filtered = [...shareHistory];

    // Apply time filter
    if (selectedFilter === "today") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      filtered = filtered.filter(
        (item) => new Date(item.timestamp) >= todayStart
      );
    } else if (selectedFilter === "week") {
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(
        (item) => new Date(item.timestamp) >= weekStart
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.text.toLowerCase().includes(query) ||
          item.link.toLowerCase().includes(query)
      );
    }

    setFilteredHistory(filtered);
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const handleOpenLink = (link: string) => {
    chrome.tabs.create({ url: link });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Text copied to clipboard!");
  };

  const handleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredHistory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredHistory.map((_, i) => i)));
    }
  };

  const handleBulkCopy = () => {
    const selectedLinks = filteredHistory
      .filter((_, i) => selectedItems.has(i))
      .map((item) => item.link)
      .join("\n");

    if (selectedLinks) {
      navigator.clipboard.writeText(selectedLinks);
      toast.success(`${selectedItems.size} links copied to clipboard!`);
      setSelectedItems(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;

    const itemsToKeep = shareHistory.filter(
      (_, index) => !selectedItems.has(index)
    );

    chrome.storage.local.set({ shareHistory: itemsToKeep }, () => {
      setShareHistory(itemsToKeep);
      calculateStats(itemsToKeep);
      setSelectedItems(new Set());
      toast.info(`${selectedItems.size} items deleted`);
    });
  };

  const handleClearHistory = () => {
    if (!confirm("Are you sure you want to clear all history?")) return;

    chrome.runtime.sendMessage({ action: "clearShareHistory" }, (response) => {
      if (response?.success) {
        setShareHistory([]);
        setFilteredHistory([]);
        setSelectedItems(new Set());
        calculateStats([]);
        toast.info("History cleared");
      }
    });
  };

  const handleExportHistory = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalItems: shareHistory.length,
      items: shareHistory.map((item) => ({
        text: item.text,
        link: item.link,
        timestamp: item.timestamp,
        date: new Date(item.timestamp).toLocaleString(),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `picky-share-history-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("History exported successfully!");
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="sidepanel-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sidepanel-container">
      <header className="sidepanel-header">
        <div className="header-title">
          <h1>🔗 Picky Share</h1>
          <p>Manage your shared pastes</p>
        </div>
      </header>

      {/* Stats Section */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.totalShares}</div>
          <div className="stat-label">Total Shares</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todayShares}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.thisWeekShares}</div>
          <div className="stat-label">This Week</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {(stats.totalCharacters / 1024).toFixed(1)}KB
          </div>
          <div className="stat-label">Total Size</div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="controls-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search shares..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${selectedFilter === "all" ? "active" : ""}`}
            onClick={() => setSelectedFilter("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${
              selectedFilter === "today" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("today")}
          >
            Today
          </button>
          <button
            className={`filter-btn ${
              selectedFilter === "week" ? "active" : ""
            }`}
            onClick={() => setSelectedFilter("week")}
          >
            This Week
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">
            {selectedItems.size} item{selectedItems.size > 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={handleBulkCopy}>
              Copy Links
            </button>
            <button className="bulk-btn delete-btn" onClick={handleBulkDelete}>
              Delete
            </button>
            <button
              className="bulk-btn"
              onClick={() => setSelectedItems(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* History List */}
      <div className="history-section">
        {filteredHistory.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <div className="empty-icon">🔍</div>
                <h2>No results found</h2>
                <p>Try adjusting your search or filter</p>
              </>
            ) : (
              <>
                <div className="empty-icon">📋</div>
                <h2>No shares yet</h2>
                <p>
                  Select text on any webpage and use the floating button to
                  create your first share
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="history-header">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={
                    selectedItems.size === filteredHistory.length &&
                    filteredHistory.length > 0
                  }
                  onChange={handleSelectAll}
                />
                <span>
                  {filteredHistory.length} share
                  {filteredHistory.length > 1 ? "s" : ""}
                </span>
              </label>
              <div className="history-actions">
                <button
                  className="action-link"
                  onClick={handleExportHistory}
                  title="Export history as JSON"
                >
                  Export
                </button>
                <button
                  className="action-link danger"
                  onClick={handleClearHistory}
                  title="Clear all history"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="history-list">
              {filteredHistory.map((item, index) => (
                <div
                  key={index}
                  className={`history-item ${
                    selectedItems.has(index) ? "selected" : ""
                  }`}
                >
                  <label className="item-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(index)}
                      onChange={() => handleSelectItem(index)}
                    />
                  </label>

                  <div className="item-content">
                    <div className="item-text" title={item.text}>
                      {item.text}
                    </div>
                    <div className="item-footer">
                      <span
                        className="item-date"
                        title={new Date(item.timestamp).toLocaleString()}
                      >
                        {formatDate(item.timestamp)}
                      </span>
                      <span className="item-link" title={item.link}>
                        {item.link}
                      </span>
                    </div>
                  </div>

                  <div className="item-actions">
                    <button
                      className="action-button"
                      onClick={() => handleCopyText(item.text)}
                      title="Copy text"
                    >
                      📄
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleCopyLink(item.link)}
                      title="Copy link"
                    >
                      🔗
                    </button>
                    <button
                      className="action-button"
                      onClick={() => handleOpenLink(item.link)}
                      title="Open link"
                    >
                      🚀
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Toast messages={toast.messages} onDismiss={toast.dismiss} />
    </div>
  );
}
