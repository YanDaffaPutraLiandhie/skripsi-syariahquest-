import type { Metadata } from "next";
import "./globals.css";
// Cukup import wrapper yang tadi kita buat
import ClientLayout from "@/components/layout/ClientLayout";

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
      <body className="bg-background text-gray-800">
        {/* Semua layouting ditangani oleh ClientLayout */}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}