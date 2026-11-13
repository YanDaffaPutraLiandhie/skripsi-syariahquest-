# Art Direction — Syariah-Quest Visual Novel

## Prinsip desain
Produk ini adalah game edukasi bergaya visual novel. UI harus mendukung adegan, karakter, dialog, pilihan, dan navigasi dunia; dashboard statistik hanya digunakan sebagai informasi sekunder. Gunakan ilustrasi dan komponen dari asset pack yang disediakan sebagai sumber utama.

## Identitas visual
- Nuansa ilustrasi: anime 2D ringan / visual novel edukatif.
- Palet: ungu dan lavender dari branding; aksen emas untuk reward; putih hangat untuk kotak dialog; hijau untuk sukses.
- Font UI: Nunito atau sans-serif bundel; dialog mudah dibaca dengan ukuran nyaman.
- Panel: sudut membulat, garis lavender tipis, bayangan halus.
- Scene: gambar lokasi memenuhi layar, karakter berada di tengah/bawah, label adegan di atas, kotak dialog menempel di bagian bawah.
- Pilihan: dua sampai empat tombol jawaban yang jelas; jangan tampilkan semua statistik saat pemain sedang membaca cerita.

## Asset sumber yang digunakan
- `05_Branding/logo_syariah_quest.png`: identitas game.
- `03_Background/lembar_referensi_background.png`: latar lokasi; dipotong menjadi tile scene untuk prototipe.
- `02_Karakter/NPC/lembar_referensi_enam_NPC.png`: karakter pendukung; dipotong per kolom sebagai placeholder.
- `02_Karakter/Mahasiswa/lembar_referensi_mahasiswa.png`: karakter mahasiswa; dipotong untuk placeholder pemain.
- `01_Peta_Kota/Full_Map/peta_kota_full.png`: peta world map.
- `04_UI/Panel_Misi/lembar_referensi_panel_misi.png`: referensi visual panel misi.
- `04_UI/Dialog/lembar_referensi_dialog.png`: referensi visual dialog/pilihan.
- `04_UI/Status_Koin_XP_Badge/lembar_referensi_koin_xp_badge.png`: referensi resource dan level.
- `04_UI/Hasil_Remedial/lembar_referensi_hasil.png`: referensi panel hasil.

## Struktur layar
1. **Cerita** — scene, lokasi, nama karakter, dialog, nomor adegan, pilihan respons, tombol lanjut.
2. **Peta Kota** — peta ilustratif dengan lokasi aktif/terkunci.
3. **Misi & Modul** — bab naratif yang terbuka sesuai progres.
4. **Profil** — avatar, level, XP, ringkasan bab.
5. **Koleksi** — badge dan pencapaian.

## Komponen inti
- `VisualNovelScene`: background, overlay, label adegan.
- `CharacterSprite`: karakter aktif di scene.
- `DialogueBox`: nama pembicara dan dialog.
- `ChoiceButton`: pilihan A/B, state hover/selected/disabled.
- `SceneCounter`: nomor adegan.
- `ChapterProgress`: bab dan progres.
- `WorldMapPin`: lokasi tersedia/terkunci.
- `MissionCard`: cerita, durasi, reward, status.
- `ResourceHUD`: koin, XP, badge.
- `ResultPanel`: ringkasan reward setelah misi.
- `Toast`: umpan balik singkat.

## Rekomendasi produksi
Untuk engine Godot/Unity, ekspor sprite tiap karakter dan ekspresi sebagai PNG transparan terpisah. Gunakan state machine untuk dialog dan branching, data-driven dialogue JSON, save/load untuk pilihan, dan sistem quest untuk membuka lokasi. Tambahkan audio, efek transisi, autosave, aksesibilitas, dan dukungan resolusi 16:9. Jangan menganggap hasil crop otomatis sebagai sprite final tanpa pemeriksaan manual.
