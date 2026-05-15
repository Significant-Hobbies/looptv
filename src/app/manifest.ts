import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LoopTV",
    short_name: "LoopTV",
    description: "TV-style random YouTube channel surfer.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#fbbf24",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
