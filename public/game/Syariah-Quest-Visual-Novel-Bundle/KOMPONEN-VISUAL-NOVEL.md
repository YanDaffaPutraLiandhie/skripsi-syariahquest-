# Komponen Visual Novel

## Komponen cerita
- **VisualNovelScene**: background lokasi, gradasi bawah, label lokasi dan adegan.
- **CharacterSprite**: karakter aktif; mendukung ganti karakter dan ekspresi.
- **DialogueBox**: nama karakter, teks dialog, indikator lanjut.
- **ChoiceButton**: opsi dialog A/B; setiap pilihan mengubah respons lanjutan.
- **SceneCounter**: urutan adegan.
- **ChapterCompletePanel**: hasil bab dan reward XP.

## Komponen eksplorasi
- **WorldMap**: peta kota ilustratif.
- **WorldMapPin**: lokasi aktif, selesai, atau terkunci.
- **MissionCard**: ringkasan bab, durasi, reward, syarat buka.
- **QuestPanel**: daftar objektif dan status penyelesaian.

## Komponen meta game
- **ResourceHUD**: koin, XP, level, badge.
- **StudentProfile**: avatar, nama, institusi, progress XP.
- **BadgeCollection**: badge yang dimiliki dan badge terkunci.
- **ResultPanel**: reward dan tombol lanjut.
- **Toast**: konfirmasi tindakan.

## Status penting
- Cerita: `idle`, `dialogue`, `choice`, `transition`, `completed`.
- Lokasi: `locked`, `available`, `completed`.
- Misi: `locked`, `available`, `in-progress`, `completed`.
- Pilihan: `default`, `hover`, `selected`, `disabled`.

## Alur demo
Cerita → dialog → pilihan respons → adegan berikutnya → penyelesaian bab → XP simulasi → daftar misi. Menu peta, profil, dan koleksi tetap dapat dibuka dari sidebar.

Data masih dummy. Untuk versi produksi, simpan node dialog, pilihan, kondisi, efek pilihan, reward, dan unlock rules di data terpisah agar naskah dapat dikembangkan tanpa mengubah UI.


## Pembaruan sumber aset
Sumber asset resmi dalam paket ini adalah `Syariah-Quest-Assets-Individual.zip`. Peta, background, lembar mahasiswa, lembar enam NPC, dialog, panel misi, ikon, dan referensi resource diambil dari struktur folder ZIP pengganti tersebut.
