import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StateProvider } from "@/context/StateContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EcoRide Enterprise | Smart Corporate Commute & ESG Platform",
  description: "Secure, verified carpooling platform for corporate employees. Track CO₂ savings, earn ESG credits, and claim rewards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <StateProvider>
          {children}
        </StateProvider>
      </body>
    </html>
  );
}
