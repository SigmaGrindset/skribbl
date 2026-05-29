import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
