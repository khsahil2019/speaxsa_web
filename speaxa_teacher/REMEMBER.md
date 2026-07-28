# SPEAXA Teacher Mobile App — 1:1 Web Mirror Master Blueprint

This `REMEMBER.md` file serves as the strict, immutable blueprint for developing the **SPEAXA Teacher Mobile Application** in Flutter (`speaxa_teacher`).

---

## 🛑 NON-NEGOTIABLE ARCHITECTURAL CONSTRAINTS

1. **0% Backend Modification**:
   - DO NOT create new backend API endpoints.
   - DO NOT alter existing API schemas, payloads, or field types.
   - DO NOT alter database schemas, tables, columns, or relations.

2. **100% Feature & Logic Parity with Web Panel**:
   - The Flutter mobile application must be a exact 1:1 functional mirror of the Teacher Web Panel (`public/teacher/index.html` & `public/teacher/teacher.js`).
   - Every single feature, permission, workflow, calculation, validation rule, and modal dialog present on the web MUST exist in the Flutter app.

3. **Mobile-First Native UI/UX**:
   - Redesign web table layouts into mobile-optimized cards, expandable list items, bottom sheets, and native Flutter widgets.
   - Use GetX state management (`GetxController`, `GetView`, `GetPage` routes).

---

## 📡 API ENDPOINT MAP (REUSED 1:1 FROM WEB)

### 1. Authentication & Profile (`/api/auth`)
- `POST /api/auth/login` — Teacher login with email/phone & password
- `POST /api/auth/register` — Educator registration
- `POST /api/auth/send-mobile-otp` — Dispatch 6-digit SMS OTP
- `POST /api/auth/verify-mobile-otp` — Verify SMS OTP
- `GET /api/auth/profile` — Fetch fresh ground-truth user profile
- `PUT /api/auth/profile` — Update educator profile
- `POST /api/auth/change-password` — Password reset/change

### 2. Educator Dashboard & Batches (`/api/teacher`)
- `GET /api/teacher/dashboard` — Overview metrics (active batches, students, pending evaluations, earnings)
- `GET /api/teacher/batches` — List assigned batches
- `GET /api/teacher/batches/:batchId` — Detailed batch roster, schedule, & student progress
- `GET /api/teacher/students` — List enrolled students across educator's batches

### 3. Live Classroom & Polls (`/api/live-classes` & `/api/teacher/live-classes`)
- `GET /api/teacher/live-classes` — List scheduled and active live classes
- `POST /api/teacher/live-classes` — Schedule a new live classroom session
- `DELETE /api/teacher/live-classes/:classId` — Cancel live class
- `POST /api/live-classes/:classId/start` — Start live class session
- `POST /api/live-classes/:classId/end` — End class (triggers automated Poll Report PDF email dispatch)
- `POST /api/live-classes/:classId/polls` — Create interactive live poll
- `GET /api/live-classes/:classId/polls` — Get active polls for session
- `GET /api/live-classes/polls/:pollId/results` — Real-time poll response metrics & answer breakdown

### 4. Attendance & Observation Ratings (`/api/attendance` & `/api/teacher`)
- `GET /api/teacher/attendance` — Fetch attendance records by date & batch
- `POST /api/attendance` — Save/update student attendance (Present, Absent, Late, Half-Day)
- `POST /api/teacher/observations` — Submit 7-point student observation ratings (Curiosity, Communication, Concept Clarity, Logical Reasoning, Homework Completion, In-Class Responses, Behavioral Growth)

### 5. Assignments, Homework & Exams (`/api/teacher`)
- `GET /api/teacher/assignments` — List created assignments
- `POST /api/teacher/assignments` — Create assignment with optional file attachments
- `GET /api/teacher/assignments/:id/submissions` — Fetch student submissions
- `POST /api/teacher/assignments/grade` — Grade submission with marks & feedback comments

### 6. Digital Passbook, Wallet & Payouts (`/api/teacher/wallet`)
- `GET /api/teacher/wallet` — Reconciled wallet metrics & chronological passbook ledger entries
- `POST /api/teacher/wallet/payout-request` — Request withdrawal payout
- `POST /api/teacher/email-passbook-statement` — Send certified PDF Passbook statement to educator email

### 7. SOPs & Teaching Resources (`/api/teacher`)
- `GET /api/teacher/sops` — Educator Standard Operating Procedures & guidelines
- `POST /api/teacher/sops/accept` — Accept digital SOP compliance agreement
- `GET /api/teacher/documents` — Educator reference materials & teaching guides

### 8. Direct Messaging & Connect (`/api/teacher/connect`)
- `GET /api/teacher/connect/threads` — Fetch student/parent message threads
- `GET /api/teacher/connect/messages` — Fetch message history
- `POST /api/teacher/connect/messages` — Send text message or document attachment link

---

## 🛠️ FLUTTER APPLICATION MODULE STRUCTURE

```
speaxa_teacher/
└── lib/
    ├── core/
    │   ├── api/             # Dio client with JWT interceptors
    │   ├── theme/           # Speaxa Teal branding design system (#0D7A6D)
    │   └── utils/           # Formatters, validators, toast helper
    ├── data/
    │   ├── models/          # Teacher, Batch, LiveClass, Assignment, Wallet, Poll, Message models
    │   └── repositories/    # TeacherRepository, AuthRepository, LiveClassRepository
    └── presentation/
        ├── auth/            # Login, Register, OTP, ForgotPassword views
        └── teacher/
            ├── controllers/ # TeacherDashboardController, BatchController, WalletController, etc.
            └── views/
                ├── teacher_dashboard_view.dart      # Main overview & quick actions
                ├── teacher_batches_view.dart        # Batches & student rosters
                ├── teacher_live_classes_view.dart   # Class scheduler & room control
                ├── teacher_assignments_view.dart    # Assignment manager & grading UI
                ├── teacher_attendance_view.dart     # Attendance & 7-point ratings
                ├── teacher_wallet_view.dart         # Digital Bank Passbook & payout requests
                ├── teacher_sop_view.dart            # SOP compliance & document vault
                ├── teacher_messaging_view.dart      # Parent & student connect chat
                └── teacher_profile_view.dart        # Educator profile & bank details
```

---

## 📌 VERIFICATION CHECKLIST FOR ALL MODULES

- [ ] Every API call passes the JWT token in `Authorization: Bearer <token>`.
- [ ] No native `confirm()` browser popups — all dialogs use Flutter custom dialogs/bottom sheets.
- [ ] File attachments formatted with full domain URL.
- [ ] Wallet passbook balance calculates exact running balance matched to web.
- [ ] Live class end action triggers automatic PDF poll report email dispatch.
