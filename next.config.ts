import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tambahkan blok images ini:
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nduapvhjlkamllqfnpyj.supabase.co', // Domain Supabase-mu dari pesan error
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;