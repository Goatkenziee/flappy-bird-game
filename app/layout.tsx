import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flappy Bird",
  description: "A Flappy Bird clone built with Next.js + Canvas",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}