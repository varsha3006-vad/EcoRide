import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ecoride",
    short_name: "Ecoride",
    description: "Smart Corporate Carpooling & ESG Portal",
    start_url: "/",
    display: "standalone",
    background_color: "#090d16",
    theme_color: "#059669",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/globe.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/globe.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      }
    ],
  };
}
