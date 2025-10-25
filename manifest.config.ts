import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: pkg.name,
  version: pkg.version,
  description: "Select text and share as public URL",
  key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0rUVkKu4b0m8oZ3xj0hJKXpqJxPZcJLmVKcxSGG2p3A9fzVIzLQDM4O1y5zTvBvJmV3D5K8D9X7bZ8bQ0c0eXm5q3vZ3pL7l9j7Q8j9b3pZ8bZ0f9d9bZ8m9b8f9d9bZ8m9bZ8m9bZ8",
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
    scripts: ["src/background/worker.ts"],
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
