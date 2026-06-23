import type { MetadataRoute } from "next";

/**
 * PWA-style web manifest. Lets the site be "Add to Home Screen"-able
 * on mobile and gives Chrome a proper splash colour while the app
 * loads. Icons reference /icon — Next.js serves the file-based
 * src/app/icon.png at that URL automatically.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "JudyShop Tikfinity",
    short_name:       "Tikfinity",
    description:      "ต่ออายุ Tikfinity Pro ราคาดี รับสิทธิ์ทันทีหลังชำระเงิน",
    start_url:        "/",
    display:          "standalone",
    background_color: "#180d2e",
    theme_color:      "#180d2e",
    orientation:      "portrait",
    icons: [
      {
        src:   "/icon.png",
        sizes: "512x512",
        type:  "image/png",
        purpose: "any",
      },
      {
        src:   "/apple-icon.png",
        sizes: "180x180",
        type:  "image/png",
        purpose: "any",
      },
    ],
  };
}
