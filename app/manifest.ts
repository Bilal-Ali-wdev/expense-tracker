import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "InDrive Driver Tracker",
    short_name: "InDrive Tracker",
    description: "Track rides, fuel costs, commissions, and daily profit.",
    start_url: "/",
    display: "standalone",
    background_color: "#08100f",
    theme_color: "#d5ff4e",
    orientation: "portrait",
    icons: [
      {
        src: "/indrive-favicon.png",
        sizes: "any",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
