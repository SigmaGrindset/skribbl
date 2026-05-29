import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

// Fredoka: rounded, chunky, friendly — reads instantly as a playful game font.
const display = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "SigmaSkribbl — draw & guess",
  description: "Room-wide skribbl-style draw-and-guess game.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen font-body">{children}</body>
    </html>
  );
}
