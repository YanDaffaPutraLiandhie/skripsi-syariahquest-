import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/modul',
        destination: '/mahasiswa/modul',
        permanent: false,
      },
      {
        source: '/modul/:id',
        destination: '/mahasiswa/modul/:id',
        permanent: false,
      },
      {
        source: '/kuis',
        destination: '/mahasiswa/kuis',
        permanent: false,
      },
      {
        source: '/kuis/:id',
        destination: '/mahasiswa/kuis/:id',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/mahasiswa/dashboard',
        permanent: false,
      },
      {
        source: '/arena',
        destination: '/mahasiswa/arena',
        permanent: false,
      },
      {
        source: '/profile',
        destination: '/mahasiswa/profile',
        permanent: false,
      },
      {
        source: '/leaderboard',
        destination: '/mahasiswa/leaderboard',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;