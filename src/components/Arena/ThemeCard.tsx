import Image from "next/image";

interface ThemeCardProps {
  id_game: number;
  nama_game: string;
  deskripsi: string;
  thumbnail_url: string;
  onBuatRuang: (id: number) => void;
}

export default function ThemeCard({ id_game, nama_game, deskripsi, thumbnail_url, onBuatRuang }: ThemeCardProps) {
  return (
    <div className="min-w-[320px] max-w-[320px] bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col snap-start">
      <div className="w-full h-48 bg-gray-100 rounded-2xl mb-4 overflow-hidden relative">
        {/* Catatan: Pastikan domain Supabase Storage sudah diizinkan di next.config.js jika menggunakan link eksternal */}
        <Image
          src={thumbnail_url || "/images/placeholder.png"}
          alt={nama_game}
          fill
          className="object-cover hover:scale-105 transition-transform duration-500"
        />
      </div>

      <h4 className="font-bold text-[#5B5288] text-lg">{nama_game}</h4>
      <p className="text-gray-400 text-sm mt-1 mb-4 flex-1 line-clamp-2">{deskripsi}</p>

      <button
        onClick={() => onBuatRuang(id_game)}
        className="w-full py-3 rounded-xl border-2 border-gray-100 font-bold text-gray-400 hover:border-[#5B5288] hover:text-[#5B5288] hover:bg-[#5B5288]/10 transition-all"
      >
        Buat Ruang
      </button>
    </div>
  );
}