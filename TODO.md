# TODO

## Task: Mengambil nama modul dari tabel modul (nama_modul) dan xp dari foreign key id_level

- [x] Analisis file terkait
- [x] Update `app/Dosen/kuis/pilih(modul)/page.tsx`:
  - Ambil `nama_modul` dari tabel `modul`
  - Ambil `xp` dari foreign key `id_level`
  - Gunakan field `nama_modul` untuk menampilkan nama modul
- [x] Verifikasi tidak ada error lint/type

## Task: Generate kuis otomatis dari modul yang dipilih

- [x] Analisis file terkait
- [x] Tambah state `namaKuis`, `saving`, `successMessage`, `errorMessage`
- [x] Tambah input field untuk nama kuis
- [x] Ubah `handleFinish` menjadi async:
  - Validasi pilihan modul dan nama kuis
  - Ambil soal dari tabel `soal` berdasarkan `id_modul` yang dipilih
  - Ambil `id_jawaban` yang memiliki `id_soal` yang sama dengan soal
  - Acak & batasi maksimal 10 soal per modul
  - Insert satu baris ke tabel `quis` (1 kuis = 1 id_quis)
  - Insert relasi kuis -> soal -> jawaban ke tabel `detail_kuis` (id_quis, id_soal, id_jawaban)
  - Tampilkan pesan sukses/error
- [x] Verifikasi tidak ada error type (tsc)

## Task: Buat kuis manual - simpan soal & jawaban ke tabel quis dan tampilkan

- [x] Analisis file `app/Dosen/kuis/pilih(manual)/page.tsx`
- [x] Tambah state `namaKuis` dan `savedQuiz`
- [x] Tambah input field "Nama Kuis"
- [x] Ubah `handleSubmit`:
  - Insert satu baris ke tabel `quis` (1 nama kuis = 1 id_quis)
  - Simpan soal ke tabel `soal`
  - Simpan jawaban ke tabel `jawaban`
  - Simpan relasi kuis -> soal -> jawaban ke tabel `detail_kuis` (id_quis, id_soal, id_jawaban)
- [x] Tambah tabel tampilan hasil kuis (id_quis, id_soal, soal, id_jawaban, jawaban, jawaban_benar)
- [x] Buat SQL migration `supabase/migrations/001_tabel_detail_kuis.sql` untuk tabel `detail_kuis`
- [x] Verifikasi tidak ada error type (tsc)

## Catatan: Jalankan SQL migration di Supabase SQL Editor

Jalankan isi `supabase/migrations/001_tabel_detail_kuis.sql` untuk membuat tabel `detail_kuis` sebelum fitur ini digunakan.

## Task: Menampilkan daftar kuis dari database di halaman Kuis

- [x] Analisis file `app/Dosen/kuis/page.tsx`
- [x] Tambah state `kuisCards` dan `showModal`
- [x] Ambil data dari tabel `quis` (id_quis, nama_kuis)
- [x] Ambil data dari tabel `detail_kuis` (id_quis, id_soal) untuk menghitung jumlah soal per kuis
- [x] Tampilkan grid dengan tombol "Tambah Kuis Baru" + kartu kuis (sama seperti halaman modul)
- [x] Klik "Tambah Kuis Baru" membuka modal pilihan "Pilih Modul" atau "Buat Kuis Manual"
- [x] Verifikasi tidak ada error type (tsc)
