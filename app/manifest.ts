import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SyncTyre Gym Management",
    short_name: "SyncTyre",
    description: "Gym operations, member management, attendance, and finance.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#071d38",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}