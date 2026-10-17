import type { MetadataRoute } from "next";

/** Lets people add Simple Retro to their home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Simple Retro",
    short_name: "Simple Retro",
    description: "A simple, friendly way for teams and couples to look back together and decide what to change.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f4ee",
    theme_color: "#fdfcf8",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
