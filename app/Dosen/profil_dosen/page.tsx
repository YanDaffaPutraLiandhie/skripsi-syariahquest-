"use client";

import Sidebar from "@/app/component/sidebar";

export default function ProfilDosen() {
  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      <Sidebar activeLabel="Profil" />

      {/* Main */}
      <main className="flex-1 p-8">
        {/* Topbar */}
        <div className="mb-8 flex justify-end">
          <button aria-label="Profile" className="text-[#5c5775]">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            </svg>
          </button>
        </div>

        {/* Header: avatar + name + stat */}
        <div className="mb-6 flex items-start gap-8">
          <div className="flex h-[178px] w-[178px] items-center justify-center rounded-2xl bg-[#4a3f7a]">
            <svg className="h-20 w-20 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20a8 8 0 0 1 16 0" />
            </svg>
          </div>

          <div className="flex-1">
            <div className="mb-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#3d3466]">Moch Zacky Yudha</h1>
              <button
                aria-label="Edit profil"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4a3f7a] text-white hover:bg-[#3d3466]"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>
            </div>
            <p className="mb-4 text-sm text-[#a79fd6]">Dosen Politeknik Negeri Malang</p>

            <div className="flex items-center gap-3 rounded-xl bg-[#4a3f7a] px-5 py-4 w-fit">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-extrabold text-white">5</p>
                <p className="text-xs text-[#c9c3e6]">Modul Anda</p>
              </div>
            </div>
          </div>
        </div>

        {/* Riwayat pendidikan + Modul yang anda buat */}
        <div className="grid grid-cols-2 gap-6">
          <div className="flex h-[240px] flex-col rounded-2xl bg-[#8a80b8] p-6 text-white">
            <h2 className="mb-6 text-lg font-bold">Riwayat pendidikan</h2>
            <div className="mt-auto border-t border-white/30 pt-3 text-center">
              <a href="#" className="text-sm font-medium hover:underline">
                Lihat Semua
              </a>
            </div>
          </div>

          <div className="flex h-[240px] flex-col rounded-2xl bg-[#8a80b8] p-6 text-white">
            <h2 className="text-lg font-bold">Modul Yang Anda Buat</h2>
          </div>
        </div>
      </main>
    </div>
  );
}