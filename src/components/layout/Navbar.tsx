"use client";

import { usePathname, useRouter } from 'next/navigation';
import { useState, FormEvent, ChangeEvent } from 'react';
import MiniProfile from "@/components/layout/MiniProfile";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState("");

  const showSearch = pathname === '/modul';

  // FUNGSI BARU: Mendeteksi setiap ketikan user
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Jika user menghapus teks sampai KOSONG, langsung kembalikan ke awal
    if (value.trim() === "") {
      router.push(pathname); // Menghapus '?q=...' dari URL
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault(); 
    if (searchQuery.trim() !== "") {
      router.push(`${pathname}?q=${encodeURIComponent(searchQuery)}`);
    } else {
      // Jaga-jaga kalau user iseng tekan Enter pas kosong
      router.push(pathname); 
    }
  };

  return (
    <header className="h-24 bg-background flex items-center justify-between px-8">
      
      {/* BAGIAN KIRI: Search Bar */}
      <div className="flex-1">
        {showSearch && (
          <form 
            onSubmit={handleSearch}
            className="flex items-center border border-gray-300 rounded-full px-4 py-2 w-80 bg-white focus-within:border-primary transition-colors shadow-sm"
          >
            <input 
              type="text" 
              value={searchQuery}
              onChange={handleSearchChange} // <-- Pakai fungsi baru di sini
              placeholder="Search..." 
              className="outline-none bg-transparent w-full text-sm text-gray-700 placeholder-gray-400"
            />
            <button type="submit" className="text-gray-800 hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        )}
      </div>

      {/* BAGIAN KANAN: Mini Profile */}
      <div className="flex items-center gap-4">
        <MiniProfile />
      </div>

    </header>
  );
}