import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Header, Footer } from "./components";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "rst0070 - notes",
  description: "Notes from rst0070",
  icons: {
    icon: "/favicon.ico"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/default.min.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <script>{`
            if (typeof mermaid !== 'undefined') {
              mermaid.initialize({
                startOnLoad: true,
                theme: 'neutral',
                // Add more configuration options as needed
              });
            }
          `}</script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Header />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
