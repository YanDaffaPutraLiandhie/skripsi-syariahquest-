// src/data/modules.ts
//
// Data dummy terpusat. Nanti tinggal ganti fungsi-fungsi di bawah
// (getAllCourses, getCourseById) dengan pemanggilan API/DB asli.
// Bentuk data sengaja dibuat menyerupai response API supaya gampang diganti.

export type Difficulty = "E" | "M" | "H";
export type SubModuleStatus = "completed" | "active" | "locked";
export type ItemKind = "materi" | "quiz";

export interface SubModuleItem {
  id: string;
  kind: ItemKind;
  title: string;
  status: SubModuleStatus;
  // Video bersifat OPSIONAL — tergantung dosen upload atau tidak
  videoUrl?: string | null;
  content?: {
    heading: string;
    paragraphs: string[];
    bullets?: { title: string; description: string }[];
  };
}

export interface Course {
  id: string;
  title: string;
  diff: Difficulty;
  xp: number;
  isLocked: boolean;
  image: string;
  // Sub modul + quiz yang dipakai di halaman detail (page [id])
  subModules: SubModuleItem[];
  quizzes: SubModuleItem[];
}

/* ---------------------------------------------------------
   DAFTAR COURSE / MODUL (dipakai di dashboard: page.tsx)
--------------------------------------------------------- */

export const courses: Course[] = [
  {
    id: "1",
    title: "Keuangan Syariah",
    diff: "E",
    xp: 100,
    isLocked: false,
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop",
    subModules: [
      {
        id: "sejarah-ekonomi-islam",
        kind: "materi",
        title: "Sejarah Ekonomi Islam",
        status: "completed",
        videoUrl: null,
      },
      {
        id: "prinsip-keuangan-syariah",
        kind: "materi",
        title: "Prinsip Keuangan Syariah",
        status: "active",
        // kosongkan / null kalau dosen belum upload video
        videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
        content: {
          heading: "Pengantar Keuangan Syariah",
          paragraphs: [
            "Dalam keuangan syariah, transparansi dan keadilan adalah kunci utama. Salah satu larangan paling tegas dalam transaksi selain Riba adalah Gharar. Secara bahasa, gharar berarti penipuan, risiko, atau ketidakpastian yang berlebihan.",
            "Dalam konteks bisnis sehari-hari, gharar terjadi ketika salah satu pihak tidak mengetahui dengan pasti rincian objek transaksi, baik itu bentuk barangnya, spesifikasi harganya, maupun waktu penyerahannya. Islam sangat menjunjung tinggi prinsip bahwa bisnis harus saling menguntungkan (win-win solution).",
          ],
          bullets: [
            {
              title: "Barang belum jelas wujudnya",
              description:
                "Membeli anak sapi yang masih berada di dalam kandungan induknya, atau membeli ikan yang masih berada di dalam kolam luas dan belum ditangkap.",
            },
            {
              title: "Sistem Mystery Box berlebihan",
              description:
                "Membeli kotak tertutup dengan harga tinggi tanpa mengetahui sama sekali rentang nilai atau jenis barang yang ada di dalamnya (mendekati unsur perjudian/maysir).",
            },
          ],
        },
      },
      { id: "modul-3", kind: "materi", title: "Modul Tersedia", status: "locked" },
      { id: "modul-4", kind: "materi", title: "Modul Tersedia", status: "locked" },
      { id: "modul-5", kind: "materi", title: "Modul Tersedia", status: "locked" },
      { id: "modul-6", kind: "materi", title: "Modul Tersedia", status: "locked" },
    ],
    quizzes: [
      { id: "quiz-1", kind: "quiz", title: "Quiz 1", status: "active" },
      { id: "quiz-2", kind: "quiz", title: "Quiz 2", status: "locked" },
    ],
  },
  {
    id: "2",
    title: "Keuangan Syariah",
    diff: "E",
    xp: 100,
    isLocked: false,
    image:
      "https://images.unsplash.com/photo-1604594849809-dfedbc827105?q=80&w=600&auto=format&fit=crop",
    subModules: [
      {
        id: "pengenalan-akad",
        kind: "materi",
        title: "Pengenalan Akad",
        status: "active",
        videoUrl: null,
        content: {
          heading: "Pengenalan Akad dalam Muamalah",
          paragraphs: [
            "Akad adalah kesepakatan antara dua pihak atau lebih yang menimbulkan akibat hukum tertentu. Dalam keuangan syariah, jenis akad menentukan bagaimana transaksi boleh dijalankan.",
          ],
        },
      },
      { id: "modul-2", kind: "materi", title: "Modul Tersedia", status: "locked" },
      { id: "modul-3", kind: "materi", title: "Modul Tersedia", status: "locked" },
    ],
    quizzes: [
      { id: "quiz-1", kind: "quiz", title: "Quiz 1", status: "locked" },
    ],
  },
  {
    id: "3",
    title: "Hukum Keuangan",
    diff: "M",
    xp: 100,
    isLocked: false,
    image:
      "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=600&auto=format&fit=crop",
    subModules: [
      {
        id: "dasar-hukum-keuangan",
        kind: "materi",
        title: "Dasar Hukum Keuangan",
        status: "active",
        videoUrl: null,
        content: {
          heading: "Dasar Hukum Keuangan Syariah",
          paragraphs: [
            "Landasan hukum keuangan syariah bersumber dari Al-Qur'an, Hadis, Ijma, dan Qiyas, yang kemudian diterjemahkan menjadi fatwa dan regulasi oleh lembaga terkait.",
          ],
        },
      },
    ],
    quizzes: [{ id: "quiz-1", kind: "quiz", title: "Quiz 1", status: "locked" }],
  },
  {
    id: "4",
    title: "Keuangan Syariah",
    diff: "M",
    xp: 100,
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=600&auto=format&fit=crop",
    subModules: [],
    quizzes: [],
  },
  {
    id: "5",
    title: "Keuangan Syariah",
    diff: "H",
    xp: 100,
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop",
    subModules: [],
    quizzes: [],
  },
  {
    id: "6",
    title: "Riba",
    diff: "H",
    xp: 100,
    isLocked: true,
    image:
      "https://images.unsplash.com/photo-1579621970795-87facc2f976d?q=80&w=600&auto=format&fit=crop",
    subModules: [],
    quizzes: [],
  },
];

/* ---------------------------------------------------------
   HELPER — nanti ganti isinya dengan fetch API/DB asli
--------------------------------------------------------- */

export function getAllCourses(): Course[] {
  return courses;
}

export function getCourseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}
