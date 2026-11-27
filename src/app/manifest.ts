import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NustWeShare — NUST past papers",
    short_name: "NustWeShare",
    description: "Search, read and download NUST past papers shared by students.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#0f2a4f",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Search", url: "/search" },
      { name: "Upload", url: "/upload" },
      { name: "My library", url: "/library" },
    ],
  };
}
