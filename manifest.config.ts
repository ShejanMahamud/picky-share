import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: "Select text and share as public URL",
  icons: {
    48: "public/logo.png",
  },
  action: {
    default_icon: {
      48: "public/logo.png",
    },
    default_popup: "src/popup/index.html",
  },
  permissions: [
    "sidePanel",
    "contentSettings",
    "storage",
    "contextMenus",
    "notifications",
  ],
  host_permissions: ["https://*/*"],
  content_scripts: [
    {
      js: ["src/content/main.tsx"],
      matches: ["https://*/*"],
    },
  ],
  background: {
    service_worker: "src/background/worker.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  ...({
    browser_specific_settings: {
      gecko: { id: "picky-share@johuniq.com", strict_min_version: "109.0" },
    },
  } as any),
});
