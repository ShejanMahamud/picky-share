# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-25

### Added

- Initial release of Picky Share
- Text selection detection and inline share button
- Integration with paste.rs API for creating shareable links
- Extension popup with share history
- Toast notifications for user feedback
- Comprehensive error handling and logging
- Support for HTTPS websites
- Storage of share history (last 50 items)
- Chrome background service worker for API calls
- Production-grade code with TypeScript support

### Features

- Select text on any HTTPS website
- Click button to create shareable link
- One-click copy to clipboard
- View recent shares in history
- Automatic retry on failed uploads
- Request timeout handling (30s)
- Size validation (max 500KB)
- Graceful error messages

### Tech Stack

- React 19.1.0
- TypeScript 5.8.3
- Vite 7.0.5
- CRXJS 2.0.3
- Chrome Extension Manifest V3

### Known Limitations

- Only works on HTTPS websites
- paste.rs has rate limiting
- Shared content is publicly accessible
- History stored in browser local storage (not synced)

## Future Roadmap

- [ ] HTTP website support
- [ ] Custom formatting options
- [ ] Dark mode UI
- [ ] Multiple pastebin service support
- [ ] Keyboard shortcuts
- [ ] Advanced share settings
- [ ] Analytics dashboard
- [ ] Browser sync of history
