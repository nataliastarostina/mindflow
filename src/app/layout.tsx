import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LanguageSync from '@/components/common/LanguageSync';
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MindFlow — Visual Mind Map Editor",
  description: "A fast, beautiful mind map editor for organizing your thoughts visually on an infinite canvas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ margin: 0, padding: 0 }}>
        <LanguageSync />
        {children}
      </body>
    </html>
  );
}
