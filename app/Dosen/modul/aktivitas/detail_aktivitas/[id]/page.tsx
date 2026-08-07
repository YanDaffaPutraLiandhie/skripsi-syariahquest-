"use client";

type ModulDone = {
  no: number;
  name: string;
  badge: string;
  badgeColor: string;
  score: number;
};

const MODUL_DONE: ModulDone[] = [
  { no: 1, name: "Keuangan Syariah", badge: "E", badgeColor: "bg-emerald-500", score: 80 },
  { no: 2, name: "Keuangan Syariah 1", badge: "E", badgeColor: "bg-emerald-500", score: 80 },
  { no: 3, name: "Keuangan Syariah 2", badge: "M", badgeColor: "bg-amber-400", score: 80 },
  { no: 4, name: "Keuangan Syariah 3", badge: "M", badgeColor: "bg-amber-400", score: 80 },
  { no: 5, name: "Keuangan Syariah 4", badge: "M", badgeColor: "bg-amber-400", score: 80 },
  { no: 6, name: "Keuangan Syariah 5", badge: "H", badgeColor: "bg-red-600", score: 80 },
  { no: 7, name: "Keuangan Syariah 6", badge: "H", badgeColor: "bg-red-600", score: 80 },
  { no: 8, name: "Keuangan Syariah 7", badge: "H", badgeColor: "bg-red-600", score: 80 },
];

const NAV_ITEMS = [
  { label: "Dashboard", icon: "home", active: false },
  { label: "Modul Pembelajaran", icon: "book", active: true },
  { label: "Bank Soal", icon: "help", active: false },
  { label: "Leaderboard", icon: "chart", active: false },
  { label: "Profil", icon: "user", active: false },
];

function NavIcon({ name }: { name: string }) {
  const common = "h-[18px] w-[18px] shrink-0";
  switch (name) {
    case "home":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" />
        </svg>
      );
    case "book":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13zM20 5.5A1.5 1.5 0 0 0 18.5 4H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      );
    case "user":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.2a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.5" />
          <circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export default function DetailMahasiswa() {
  return (
    <div className="flex min-h-screen bg-white text-[#2b2540]">
      {/* Sidebar */}
      <aside className="flex w-[220px] shrink-0 flex-col justify-between border-r border-[#ececf3] bg-white p-6">
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                item.active
                  ? "bg-[#f2effa] font-semibold text-[#4a3f7a]"
                  : "text-[#c9c6d6] hover:bg-[#f7f6fb] hover:text-[#4a3f7a]"
              }`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>

        <button className="flex items-center justify-center gap-2 rounded-xl bg-[#f2effa] px-4 py-2.5 text-sm font-semibold text-[#4a3f7a]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          LogOut
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        {/* Topbar */}
        <div className="mb-6 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search"
            className="w-64 rounded-lg border border-[#e4e2ee] bg-white px-4 py-2.5 text-sm text-[#a3a0b5] outline-none focus:border-[#4a3f7a]"
          />
          <div className="flex items-center gap-5 text-[#5c5775]">
            <button aria-label="Mail">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </button>
            <button aria-label="Notifications">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" />
                <path d="M10 20a2 2 0 0 0 4 0" />
              </svg>
            </button>
            <button aria-label="Profile">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Purple panel */}
        <div className="rounded-[24px] bg-[#4a3f7a] px-10 pb-8 pt-10 text-white">
          {/* Profile */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#dcdae3]">
              <svg className="h-10 w-10 text-[#a3a0b5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
              </svg>
            </div>
            <h1 className="mb-4 text-2xl font-bold">Mahasiswa A</h1>
            <h2 className="text-base font-semibold">Modul Yang Telah diselesaikan</h2>
          </div>

          {/* List */}
          <div className="flex flex-col gap-3">
            {MODUL_DONE.map((row) => (
              <div
                key={row.no}
                className="grid grid-cols-[60px_1fr_90px] items-center gap-4"
              >
                <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                  {row.no}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    defaultValue={row.name}
                    readOnly
                    className="h-9 w-full rounded-full border-none bg-white px-4 pr-10 text-sm text-[#2b2540] outline-none"
                  />
                  <span
                    className={`absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white ${row.badgeColor}`}
                  >
                    {row.badge}
                  </span>
                </div>
                <div className="flex h-9 w-16 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#2b2540]">
                  {row.score}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button className="rounded-full bg-emerald-400 px-8 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-300">
              Ekspor
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}