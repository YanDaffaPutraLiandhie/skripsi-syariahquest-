export type MentorCharacter = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatar: string;
  description: string;
  greeting: string;
  congratsMessage: string;
  remedialMessage: string;
};

export const MENTORS: MentorCharacter[] = [
  {
    id: "aisyah",
    name: "Aisyah, S.E.Sy",
    role: "Konsultan Madya & Mentor Lapangan",
    specialty: "Spesialis Akad Muamalah, Praktik Pasar & Analisis Transaksi Nyata",
    avatar: "/game/npc-2.png",
    description: "Mentor yang ramah, solutif, dan aktif mendampingi mahasiswa memecahkan studi kasus transaksi syariah di dunia nyata.",
    greeting: "Assalamu’alaikum! Saya Aisyah, siap menemanimu belajar muamalah dan menyelesaikan berbagai misi kasus syariah.",
    congratsMessage: "Masya Allah, pilihan dan analisismu sangat cermat! Mari lanjutkan ke tantangan berikutnya.",
    remedialMessage: "Jangan berkecil hati. Setiap konsultan berproses dari pemahaman yang mendalam. Yuk kita tinjau kembali kaidahnya bersama!"
  },
  {
    id: "ustadz_rayhan",
    name: "Ustadz Rayhan, M.E.Sy",
    role: "Konsultan Senior & Pengajar Muamalah",
    specialty: "Spesialis Fiqih Akad & Analisis Keuangan Syariah Kontemporer",
    avatar: "/game/npc-1.png",
    description: "Pembimbing yang teliti, metodologis, dan selalu membantu menganalisis setiap transaksi berdasarkan rukun dan syarat syariah.",
    greeting: "Ahlan wa sahlan! Saya siap membimbingmu menyelesaikan setiap misi konsultasi keuangan syariah.",
    congratsMessage: "Alhamdulillah, analisis dan keputusanmu sangat tepat sesuai kaidah fiqih! Pertahankan prestasimu.",
    remedialMessage: "Tenang saja, mari pelajari materi penguatan (remedial) ini secara runtut agar pemahaman akadmu semakin kokoh."
  }
];

export const DEFAULT_MENTOR = MENTORS[0];

export function getSelectedMentor(): MentorCharacter {
  if (typeof window === "undefined") return DEFAULT_MENTOR;
  try {
    const savedId = localStorage.getItem("syariah_selected_mentor_id");
    const found = MENTORS.find((m) => m.id === savedId);
    return found || DEFAULT_MENTOR;
  } catch {
    return DEFAULT_MENTOR;
  }
}

export function saveSelectedMentor(mentorId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("syariah_selected_mentor_id", mentorId);
  } catch (e) {
    console.error("Gagal menyimpan mentor:", e);
  }
}
