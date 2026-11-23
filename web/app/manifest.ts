import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rafa Studio",
    short_name: "Rafa Studio",
    description: "Da ideia ao próximo take.",
    start_url: "/",
    display: "standalone",
    background_color: "#120F17",
    theme_color: "#120F17",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
