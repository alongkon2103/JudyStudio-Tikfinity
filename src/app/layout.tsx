import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Sans_Thai_Looped } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

/**
 * Type stack — Inter + IBM Plex Sans Thai Looped, both free for
 * commercial use. Browsers do per-glyph fallback so Latin chars
 * route to Inter and Thai chars to Plex automatically without us
 * swapping font families per element.
 */
const latin = Inter({
  subsets: ["latin"],
  weight:  ["400", "500", "600", "700", "800"],
  variable: "--font-latin",
  display:  "swap",
});

const thai = IBM_Plex_Sans_Thai_Looped({
  subsets: ["thai"],
  weight:  ["400", "500", "600", "700"],
  variable: "--font-thai",
  display:  "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const TITLE       = "JudyShop Tikfinity — Extend your Tikfinity Pro";
const DESCRIPTION =
  "Extend Tikfinity Pro at a great price — instant activation after payment. Cards and PromptPay supported via Stripe Checkout.";
// Until launch we keep noindex on; flip NEXT_PUBLIC_ALLOW_INDEX=1 in
// production env to let search engines pick the site up.
const ALLOW_INDEX = process.env.NEXT_PUBLIC_ALLOW_INDEX === "1";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default:  TITLE,
    template: "%s — JudyShop Tikfinity",
  },
  description:     DESCRIPTION,
  applicationName: "JudyShop Tikfinity",
  authors:         [{ name: "Judy Studio" }],
  creator:         "Judy Studio",
  publisher:       "Judy Studio",
  keywords: [
    "Tikfinity",
    "Tikfinity Pro",
    "Extend Tikfinity Pro",
    "Tikfinity reseller",
    "TikTok",
    "PromptPay",
    "Stripe Checkout",
    "JudyShop",
    "Judy Studio",
    "ต่ออายุ Tikfinity",
  ],
  alternates: {
    canonical: "/",
    languages: { "en-US": "/", "th-TH": "/" },
  },
  openGraph: {
    type:        "website",
    siteName:    "JudyShop Tikfinity",
    url:         SITE_URL,
    title:       TITLE,
    description: DESCRIPTION,
    locale:      "en_US",
    alternateLocale: ["th_TH"],
    // images is auto-derived from src/app/opengraph-image.png
  },
  twitter: {
    card:        "summary_large_image",
    title:       TITLE,
    description: DESCRIPTION,
    // images is auto-derived from src/app/twitter-image.png
  },
  formatDetection: {
    telephone: false,
    email:     false,
    address:   false,
  },
  robots: ALLOW_INDEX
    ? {
        index:    true,
        follow:   true,
        nocache:  false,
        googleBot: {
          index:           true,
          follow:          true,
          "max-image-preview": "large",
          "max-snippet":       -1,
          "max-video-preview": -1,
        },
      }
    : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdf2f8" },
    { media: "(prefers-color-scheme: dark)",  color: "#180d2e" },
  ],
  colorScheme: "light dark",
  width:       "device-width",
  initialScale: 1,
};

/**
 * Pre-paint script — reads theme cookie BEFORE the body renders so
 * users on dark mode don't flash a white screen. Reading from a
 * cookie (not localStorage) so the same value is available SSR-side
 * via getLocale()/cookies(), keeping server + client in sync.
 */
const THEME_INIT_SCRIPT = `
try {
  var m = document.cookie.match(/(?:^|; )judytik_theme=([^;]*)/);
  var t = m ? decodeURIComponent(m[1]) : 'dark';
  if (t !== 'light' && t !== 'dark') t = 'dark';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
`;

const FONT_VARS = [latin.variable, thai.variable].join(" ");

/**
 * Schema.org Organization JSON-LD — gives Google a clean knowledge-
 * graph entry so brand searches show the right logo and link.
 */
const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type":    "Organization",
  name:       "Judy Studio",
  url:        SITE_URL,
  logo:       `${SITE_URL}/icon.png`,
  sameAs:     [] as string[],
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type":    "WebSite",
  name:       "JudyShop Tikfinity",
  url:        SITE_URL,
  inLanguage: ["en-US", "th-TH"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale  = getLocale();
  const htmlLng = locale === "en" ? "en" : "th";
  return (
    <html lang={htmlLng} className={FONT_VARS}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }}
        />
      </head>
      <body className="font-sans">
        {/* Theme-aware wallpaper. Two stacked fixed layers — the image
            sits on the bottom, a tint overlay tones it down so body
            text stays readable. Both layers cross-fade on theme flip
            via the .app-bg / .app-bg-overlay transition rules.
            Admin pages override z-index so the dense management UI
            doesn't show the kawaii wallpaper behind it. */}
        <div aria-hidden className="app-bg pointer-events-none fixed inset-0 z-0" />
        <div aria-hidden className="app-bg-overlay pointer-events-none fixed inset-0 z-0" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
