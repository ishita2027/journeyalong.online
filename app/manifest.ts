import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Journey Along",
    short_name: "Journey Along",
    description: "Three promises a day. Self-trust, not streaks.",
    start_url: "/app",
    display: "standalone",
    background_color: "#fbf7f3",
    theme_color: "#fbf7f3",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
