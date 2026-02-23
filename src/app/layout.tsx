import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const excalifont = localFont({
  src: "../../public/font/Excalifont-Regular.ttf",
  variable: "--font-excalifont",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl =
  typeof process.env.NEXT_PUBLIC_APP_URL === "string" &&
  process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
    : "https://tracex.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "TraceX — Track Your Expense",
    template: "%s | TraceX",
  },
  description:
    "Professional expense tracking. Track spending, manage categories, set budgets, and export data. Built by Alfayad S.",
  keywords: [
    "expense tracker",
    "track expenses",
    "budget",
    "spending",
    "personal finance",
    "TraceX",
  ],
  authors: [
    {
      name: "Alfayad S",
      url: "https://alfayad.vercel.app",
    },
  ],
  creator: "Alfayad S",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "TraceX",
    title: "TraceX — Track Your Expense",
    description:
      "Professional expense tracking. Track spending, manage categories, set budgets. By Alfayad S.",
    images: [
      {
        url: "/meta.png",
        width: 1200,
        height: 630,
        alt: "TraceX — Track Your Expense",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TraceX — Track Your Expense",
    description: "Professional expense tracking. By Alfayad S.",
    images: ["/meta.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: appUrl,
  },
};

const themeScript = `
(function() {
  var key = 'tracex_theme';
  var stored = localStorage.getItem(key);
  var dark = stored === 'dark' || (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TraceX",
    description:
      "Professional expense tracking. Track spending, manage categories, set budgets.",
    url: appUrl,
    author: {
      "@type": "Person",
      name: "Alfayad S",
      url: "https://alfayad.vercel.app",
      sameAs: [
        "https://www.linkedin.com/in/alfayad",
        "https://github.com/Alfayad-s",
        "https://alfayad.vercel.app",
      ],
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${excalifont.className} ${excalifont.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <Script
          src="https://cdn.lordicon.com/lordicon.js"
          strategy="beforeInteractive"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
