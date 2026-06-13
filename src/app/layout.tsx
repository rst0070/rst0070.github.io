import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer } from "./components";

export const metadata: Metadata = {
  title: "rst0070 - notes",
  description: "Notes from rst0070",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
