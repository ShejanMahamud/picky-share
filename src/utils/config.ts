/**
 * Configuration and constants for Picky Share extension
 */

export const CONFIG = {
  // API Configuration
  API: {
    BASE_URL: "https://paste.rs/",
    TIMEOUT_MS: 30000,
    MAX_TEXT_LENGTH: 500000, // 500KB limit from paste.rs
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
  },

  // Extension Configuration
  EXTENSION: {
    NAME: "Picky Share",
    VERSION: "1.0.0",
    MIN_TEXT_LENGTH: 1,
    MAX_TEXT_LENGTH: 500000,
  },

  // UI Configuration
  UI: {
    SHARE_BUTTON_POSITION: "top-right",
    TOAST_DURATION_MS: 3000,
    ANIMATION_DURATION_MS: 300,
    POPUP_MIN_WIDTH_PX: 500,
  },

  // Storage Configuration
  STORAGE: {
    KEYS: {
      LAST_SELECTED_TEXT: "lastSelectedText",
      SHARE_HISTORY: "shareHistory",
      SETTINGS: "settings",
    },
    HISTORY_LIMIT: 50,
  },

  // Logging Configuration
  LOG: {
    ENABLED: true,
    LEVEL: "info", // 'debug', 'info', 'warn', 'error'
  },
};

export const MESSAGES = {
  ERROR: {
    NO_TEXT_SELECTED: "No text selected. Please select some text on the page.",
    UPLOAD_FAILED: "Failed to upload text. Please try again.",
    COPY_FAILED: "Failed to copy link to clipboard.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    TIMEOUT: "Request timed out. Please try again.",
    INVALID_TEXT: "Please select valid text to share.",
    SIZE_LIMIT_EXCEEDED: "Selected text is too large (max 500KB).",
  },
  SUCCESS: {
    LINK_CREATED: "Shareable link created successfully!",
    LINK_COPIED: "Link copied to clipboard!",
  },
  INFO: {
    CREATING_LINK: "Creating shareable link...",
    UPLOADING: "Uploading text...",
  },
};

// Permission checks
export const REQUIRED_PERMISSIONS = {
  CONTENT_SCRIPTS: ["https://*/*"],
  API_HOSTS: ["https://paste.rs/"],
};

// Regex patterns for validation
export const VALIDATION = {
  URL_REGEX: /^https?:\/\/.+/,
  TEXT_WHITESPACE_REGEX: /^\s*$/,
};
