# Productivity Space Firebase Structure

Project ini sekarang tetap **Firebase-only**. Jadi tidak ada SQL atau Supabase yang perlu dipakai.

## Collections yang dipakai

Semua data utama tetap disimpan di bawah:

```text
users/{uid}
```

Subcollection yang dipakai:

```text
users/{uid}/transactions/{transactionId}
users/{uid}/budgets/{monthId}
users/{uid}/tasks/{taskId}
users/{uid}/notes/{noteId}
users/{uid}/goals/{goalId}
users/{uid}/plannerBlocks/{blockId}
users/{uid}/focusSessions/{sessionId}
```

## Struktur dokumen

### 1. Transactions

```json
{
  "type": "expense",
  "amount": 50000,
  "category": "Food",
  "note": "Makan siang",
  "date": "Firestore Timestamp",
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

### 2. Budgets

Document id pakai format `YYYY-MM`, contoh: `2026-03`

```json
{
  "month": "2026-03",
  "amount": 3000000,
  "updatedAt": "Firestore Timestamp"
}
```

### 3. Tasks

```json
{
  "title": "Finalisasi landing page",
  "description": "Rapikan hero dan CTA",
  "status": "today",
  "priority": "high",
  "category": "Work",
  "dueDate": "Firestore Timestamp atau null",
  "estimateMinutes": 90,
  "tags": ["frontend", "urgent"],
  "completedAt": null,
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

Nilai `status`:

```text
inbox
today
in_progress
done
```

Nilai `priority`:

```text
low
medium
high
```

### 4. Notes

```json
{
  "title": "Meeting recap",
  "content": "Bahas target minggu ini...",
  "category": "Meeting",
  "pinned": true,
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

### 5. Goals

```json
{
  "title": "Publish 8 artikel bulan ini",
  "description": "Target content untuk Maret",
  "currentValue": 3,
  "targetValue": 8,
  "unit": "artikel",
  "deadline": "Firestore Timestamp atau null",
  "status": "active",
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

Nilai `status`:

```text
active
paused
completed
```

### 6. Planner Blocks

```json
{
  "title": "Deep work - redesign dashboard",
  "notes": "Fokus ke task board dan planner",
  "type": "deep_work",
  "date": "2026-03-09",
  "startTime": "09:00",
  "endTime": "11:00",
  "sortKey": "2026-03-09T09:00",
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

Nilai `type`:

```text
deep_work
admin
meeting
personal
```

### 7. Focus Sessions

```json
{
  "label": "Deep work - landing page",
  "mode": "deep_work",
  "sessionDate": "2026-03-09",
  "plannedMinutes": 25,
  "actualMinutes": 25,
  "startedAt": "Firestore Timestamp",
  "completedAt": "Firestore Timestamp atau null",
  "createdAt": "Firestore Timestamp"
}
```

Nilai `mode`:

```text
deep_work
admin
learning
```

## Firestore Rules

Rules project sudah saya update di file:

[`firestore.rules`](d:/Programming/React/Next/project-moneytracker/firestore.rules)

Collection baru yang sudah diizinkan:

- `tasks`
- `notes`
- `goals`
- `plannerBlocks`
- `focusSessions`

Semua hanya bisa dibaca dan ditulis oleh owner (`request.auth.uid == uid`).

## Firebase setup yang perlu kamu lakukan

1. Pastikan Authentication email/password aktif.
2. Deploy rules terbaru:

```bash
firebase deploy --only firestore:rules
```

3. Kalau perlu seed manual, cukup buat dokumen lewat aplikasi ini; semua collection baru akan otomatis dibuat saat data pertama disimpan.

## Catatan

- Firebase/Firestore tidak butuh SQL schema seperti Supabase.
- Jadi source of truth backend untuk project ini sekarang tetap:
  - Auth: Firebase Authentication
  - Database: Cloud Firestore
  - Rules: `firestore.rules`
