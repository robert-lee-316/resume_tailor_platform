import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuruCorp | Resume Builder",
  applicationName: "GuruCorp Resume Builder",
  icons: { icon: "/icon.png" },
  description: "Craft a resume in your own Word template, preview it, and export a professional DOCX or PDF.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
