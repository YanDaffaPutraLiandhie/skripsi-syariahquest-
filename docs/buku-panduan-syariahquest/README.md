# Buku Panduan Sistem SyariahQuest

Dokumentasi ini disusun dari alur kode sumber SyariahQuest saat ini. Fokusnya adalah cara sistem bekerja, route yang tersedia, data yang dipakai, dan langkah operasional untuk setiap role.

## Isi dokumentasi

1. [`01-arsitektur-dan-alur-sistem.md`](./01-arsitektur-dan-alur-sistem.md) — arsitektur, autentikasi, role, data, dan alur lintas sistem.
2. [`02-panduan-admin.md`](./02-panduan-admin.md) — panduan lengkap role Admin.
3. [`03-panduan-dosen.md`](./03-panduan-dosen.md) — panduan lengkap role Dosen.
4. [`04-panduan-mahasiswa.md`](./04-panduan-mahasiswa.md) — panduan lengkap role Mahasiswa, termasuk Arena.
5. [`05-referensi-file.md`](./05-referensi-file.md) — inventaris file sumber berdasarkan fungsi dan role.

## Entry point berdasarkan role

| Role | Route setelah login | File utama |
| --- | --- | --- |
| Admin | `/admin` | `src/app/admin/page.tsx` |
| Dosen | `/Dosen/Dashboard` | `src/app/Dosen/Dashboard/page.tsx` |
| Mahasiswa | `/dashboard` | `src/app/(mahasiswa)/dashboard/page.tsx` |

## Cara membaca dokumentasi

- Referensi berbentuk `path:line` menunjuk ke file sumber yang menjadi dasar penjelasan.
- Alur ditulis berdasarkan perilaku kode saat ini, bukan berdasarkan rencana fitur yang belum diimplementasikan.
- Nama tabel dan kolom mengikuti query Supabase yang ditemukan di repositori.
- Catatan keamanan dan inkonsistensi dituliskan secara eksplisit agar dokumentasi tidak menyembunyikan batasan implementasi.

## Catatan penting

- Registrasi publik hanya membuat role Mahasiswa. Role Dosen dan Admin dibuat melalui fungsi Admin (`src/app/register/page.tsx:47-55`, `src/app/api/register/route.ts:27-73`).
- Pemetaan role disimpan di tabel `user` melalui kolom `id_mahasiswa`, `id_dosen`, dan `id_admin` (`src/app/login/page.tsx:174-192`).
- Sebagian besar halaman mengambil data langsung dari Supabase menggunakan client browser. Mutasi administratif dilakukan melalui API route dengan service role.
- Repositori hanya menyimpan migration `001_tabel_detail_kuis.sql` dan `002_riwayat_jawaban_kuis.sql`. Sejumlah tabel lain digunakan oleh kode, tetapi migration-nya tidak tersedia di folder lokal.
- Endpoint impersonate saat ini secara eksplisit belum memiliki admin auth guard. Jangan digunakan di production sebelum ditambahkan verifikasi role (`src/app/api/admin/impersonate/route.ts:34-41`).
