import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "./components";
import { ThemeProvider } from "./theme-provider";
import { baseUrl } from "./sitemap";

const siteName = "rst0070 - notes";
const siteDescription =
  "Notes on software engineering, machine learning, and infrastructure by rst0070.";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: siteName,
    template: "%s | rst0070",
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    url: baseUrl,
    images: [{ url: "/og-image.jpg", width: 1254, height: 1254, alt: "rst0070" }],
  },
  twitter: {
    card: "summary",
    title: siteName,
    description: siteDescription,
    images: ["/og-image.jpg"],
  },
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Header />
          <main>
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
