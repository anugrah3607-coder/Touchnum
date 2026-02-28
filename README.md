maaf installe gk saya kirim soale gk bisa kirim lebih 25mb

TOUCHNUM adalah aplikasi desktop (Electron/Node.js) untuk mengubah fungsi touchpad menjadi numpad/shortcut

# Fitur
- numpad: area touchpad berfungsi seperti numpad (0–9, +, -, *, /, Enter, dll)
- Mode **Shortcut**: mapping touchpad ke kombinasi tombol (mis. Ctrl+C, Ctrl+V, Alt+Tab, dll) *(tergantung konfigurasi)*
- Profil konfigurasi lewat file JSON: `TOUCHNUM_profiles.json`
- Bisa hidup/mati (toggle) tanpa mengubah setting permanen laptop *(tergantung implementasi)*
- Berjalan di background *(jika kamu aktifkan di code)*

## Cara Kerja Singkat
TOUCHNUM membaca input touchpad (posisi/gesture/klik) lalu menerjemahkannya menjadi:
- input numpad, atau
- shortcut keyboard
sesuai mapping yang ada di `TOUCHNUM_profiles.json`.

## Struktur Project
- `index.html` : tampilan UI
- `renderer.js` : logika UI & pengaturan mapping
- `main.js` : proses utama Electron
- `preload.js` : jembatan Electron
- `engine/` : modul logic/input handler
- `TOUCHNUM_profiles.json` : daftar profil & mapping tombol/shortcut

## Instalasi
**Syarat:**
- Node.js (LTS disarankan)
membutuhkan modul node untuk menjalankan aplikasi
terminal:
```bash
npm install
npm start
