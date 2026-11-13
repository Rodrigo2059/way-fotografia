import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
export const metadata: Metadata = { title: "WAY House Church · Equipe de Fotografia", icons: { icon: "/logo.jpeg" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#171717" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="pt-BR"><body className={`${outfit.variable} font-sans min-h-screen`}>{children}</body></html>);
}
