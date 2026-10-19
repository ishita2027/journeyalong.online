import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${BRAND.name}: three promises a day, self-trust not streaks`,
  description:
    "An AI accountability journal for people who struggle with consistency and procrastination. Make three daily promises, check in, write, and read a weekly Mind Mirror.",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fbf7f3",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Microsoft Clarity project ID. Override with NEXT_PUBLIC_CLARITY_ID in Vercel, or set it to "off" to disable.
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "z01pb1x5hz";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..700&family=Fraunces:ital,opsz,wght,SOFT@0,9..144,400..600,0..100;1,9..144,400..600,0..100&family=Sacramento&display=swap"
        />
      </head>
      <body>
        {children}
        {CLARITY_ID !== "off" && /^[a-z0-9]+$/i.test(CLARITY_ID) && (
          <Script id="ms-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        )}
      </body>
    </html>
  );
}
