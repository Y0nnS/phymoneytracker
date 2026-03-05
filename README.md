# MoneyTracker (Next.js + Firebase)

Website sederhana untuk mengatur pemasukan, pengeluaran, dan uang bulanan (budget) dengan UI dark yang clean.

## 1) Setup Project

Prerequisites: Node.js 18+.

```bash
npm install
```

Jalankan:

```bash
npm run dev
```

## 2) Setup Firebase dari awal

1. Buka Firebase Console → buat Project baru.
2. **Build → Authentication** → *Get started* → aktifkan **Email/Password**.
3. **Build → Firestore Database** → *Create database* (pilih region terdekat).
4. **Project settings → General → Your apps** → tambahkan **Web app** → salin konfigurasi.
5. Buat file `.env.local` (contoh variabel ada di `.env.example`) lalu isi:
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - (Kalau pakai Analytics) `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

## 3) Firestore Rules (wajib biar aman)

Struktur data yang dipakai:

`users/{uid}/transactions/{txId}` dan `users/{uid}/budgets/{monthId}`

Di Firebase Console → Firestore Database → **Rules**, ganti dengan:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read, write: if isOwner(uid);

      match /transactions/{txId} {
        allow read, write: if isOwner(uid);
      }

      match /budgets/{monthId} {
        allow read, write: if isOwner(uid);
      }
    }
  }
}
```

File yang sama juga ada di `firestore.rules` (kalau kamu nanti pakai Firebase CLI).

## 4) Catatan

- Aplikasi ini pakai Email/Password (Firebase Auth).
- Registrasi via UI dimatikan (website personal). Tambah user lewat Firebase Console → Authentication → Users → **Add user**.
- Semua data tersimpan per-user (berdasarkan UID) di Firestore.
- Firebase Analytics aktif otomatis kalau kamu mengisi `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`.
- Kategori custom bisa diatur di halaman Settings (tersimpan di browser via localStorage).
