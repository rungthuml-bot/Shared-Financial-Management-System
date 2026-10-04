# Installment Manager 💳

เว็บแอปพลิเคชันสำหรับจัดการรายการผ่อนชำระสำหรับ 2 คน (เช่น Shopee, TikTok Shop, Lazada, บัตรเครดิต, TrueMoney) ออกแบบเพื่อลดความยุ่งยากในการคำนวณเงิน คำนวณส่วนแบ่งอัตโนมัติ (50/50 หรือกำหนด % เอง) พร้อมระบบติดตามสถานะงวดชำระ และสรุปยอดที่ต้องเคลียร์ระหว่างกัน (Net Settlement)

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4, shadcn/ui components (Radix UI primitives), Lucide React
- **Theming**: Dark Mode & Light Mode (next-themes)
- **Database**: PostgreSQL
- **ORM**: Prisma ORM (v6.19 LTS) with `Decimal(12, 2)` precision
- **Authentication**: Better Auth (Email + Password with Prisma PostgreSQL adapter)
- **Validation**: Zod (v4), React Hook Form
- **Data Visualization**: Recharts
- **Notifications**: Sonner (Toast notifications)
- **Package Manager**: pnpm

---

## 🚀 Quick Start & Installation

### 1. ติดตั้ง Dependencies
```bash
pnpm install
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` เป็น `.env` และกำหนดค่าการเชื่อมต่อฐานข้อมูล PostgreSQL:
```bash
cp .env.example .env
```

ตัวอย่าง `.env`:
```env
# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/installment_manager?schema=public"

# Better Auth Secret (ความยาวอย่างน้อย 32 ตัวอักษร)
BETTER_AUTH_SECRET="installment-manager-dev-secret-key-change-for-production"
BETTER_AUTH_URL="http://localhost:3000"

# Environment
NODE_ENV="development"
```

### 3. รัน Database Migration
สร้างและซิงค์ตารางลง PostgreSQL:
```bash
# กรณีรัน Migration ปกติ
pnpm exec prisma migrate dev --name init_installment_core_data

# หรือกรณี Production Deployment
pnpm exec prisma migrate deploy
```

> **หมายเหตุกรณี Local PostgreSQL**: หากยังไม่ได้ติดตั้งหรือเปิดใช้งาน PostgreSQL Server ในเครื่อง สามารถใช้ Docker เปิด PostgreSQL ได้ทันที:
> ```bash
> docker run --name installment-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=installment_manager -p 5432:5432 -d postgres:16-alpine
> ```
> หรือใช้ Cloud PostgreSQL Provider เช่น Supabase, Neon, Railway ได้เช่นกัน

### 4. รัน Database Seed
เติมข้อมูลเริ่มต้น (Master Data, User A & User B, Providers, Categories และรายการผ่อนตัวอย่าง):
```bash
pnpm seed
# หรือ
pnpm exec prisma db seed
```

### 5. รัน Development Server
```bash
pnpm dev
```
เปิดบราวเซอร์ที่ [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Database Architecture & Core Models

| Model | คำอธิบาย |
| :--- | :--- |
| **`User`** | ผู้ใช้ในระบบ รองรับทั้ง User A, User B และขยายต่อได้ในอนาคต |
| **`Session` / `Account` / `Verification`** | โมเดลการยืนยันตัวตนของ Better Auth (Email + Password) |
| **`Provider`** | ผู้ให้บริการผ่อนชำระ (Shopee, TikTok Shop, Lazada, Credit Card ฯลฯ) |
| **`Category`** | หมวดหมู่สินค้า/บริการ (Shopping, Electronics, Mobile, Home ฯลฯ) |
| **`Installment`** | สัญญาผ่อนชำระ (Personal หรือ Shared 50/50 / Custom %) ใช้ `Decimal(12, 2)` |
| **`InstallmentPayment`** | ตารางงวดแต่ละงวด (UPCOMING, DUE, PAID, OVERDUE) |
| **`PaymentSplit`** | ส่วนแบ่งของแต่ละคนในงวดของรายการผ่อนร่วม (Shared) |
| **`Settlement`** | บันทึกยอดค้างและยอดที่ต้องโอนเคลียร์กันระหว่าง 2 ผู้ใช้ |
| **`Notification`** | ระบบแจ้งเตือนกำหนดชำระและยอดเคลียร์ |

---

## 🧪 Development & Quality Checks

```bash
# ตรวจสอบความถูกต้องของ Prisma Schema
pnpm exec prisma validate

# สร้าง Prisma Client Types
pnpm exec prisma generate

# ตรวจสอบ TypeScript Strict Mode (0 Errors)
pnpm exec tsc --noEmit

# ตรวจสอบ ESLint (0 Warnings, 0 Errors)
pnpm lint

# ทดสอบ Production Build
pnpm build
```

---

## 📁 โครงสร้างโปรเจกต์ (Clean Architecture)

```
src/
├── app/                  # Next.js App Router (Dashboard, Installments, Calendar, Shared, Reports, Settings)
├── components/
│   ├── layout/           # AppShell, Sidebar, Header, MobileNav
│   └── ui/               # Reusable UI Primitives (Button, Card, Badge, Avatar ฯลฯ)
├── hooks/                # Custom React Hooks (useMounted ฯลฯ)
├── lib/                  # Utilities, Prisma Client Singleton, Better Auth Config
├── services/             # Service Layer สำหรับจัดการ Query และ Business Calculations
├── types/                # Strict TypeScript Types & Prisma Payload Types
└── validators/           # Zod Schemas สำหรับ Form Validation ทั้ง Client & Server
prisma/
├── migrations/           # PostgreSQL Migration Files
├── schema.prisma         # Production Prisma Schema
└── seed.ts               # Idempotent Database Seed Script
```
