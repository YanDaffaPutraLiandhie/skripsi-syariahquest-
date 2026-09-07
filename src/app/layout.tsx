import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
// Cukup import wrapper yang tadi kita buat
import ClientLayout from "@/components/layout/ClientLayout";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "SyariahQuest - Game Based Learning",
  description: "Platform pembelajaran interaktif berbasis game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${nunito.variable} font-sans bg-background text-gray-800`}>
        {/* Semua layouting ditangani oleh ClientLayout */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}