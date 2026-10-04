/**
 * Database Seed Script for Installment Manager
 * Idempotent: Can be safely executed multiple times without creating duplicate records.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Installment Manager database seed...");

  // -------------------------------------------------------------
  // 1. Seed Users (User A & User B) with Better Auth Credentials
  // -------------------------------------------------------------
  console.log("👤 Seeding Users & Auth Accounts...");
  const hashedPassword = await hashPassword("Password@123");

  const userA = await prisma.user.upsert({
    where: { email: "usera@example.com" },
    update: {
      name: "User A",
      role: "user",
      emailVerified: true,
    },
    create: {
      id: "usr_user_a_default",
      name: "User A",
      email: "usera@example.com",
      emailVerified: true,
      role: "user",
    },
  });

  const userB = await prisma.user.upsert({
    where: { email: "userb@example.com" },
    update: {
      name: "User B",
      role: "user",
      emailVerified: true,
    },
    create: {
      id: "usr_user_b_default",
      name: "User B",
      email: "userb@example.com",
      emailVerified: true,
      role: "user",
    },
  });

  // Create or update Better Auth accounts for email/password sign-in
  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: userA.id,
      },
    },
    update: {
      password: hashedPassword,
    },
    create: {
      id: "acc_user_a_credential",
      userId: userA.id,
      accountId: userA.id,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  await prisma.account.upsert({
    where: {
      providerId_accountId: {
        providerId: "credential",
        accountId: userB.id,
      },
    },
    update: {
      password: hashedPassword,
    },
    create: {
      id: "acc_user_b_credential",
      userId: userB.id,
      accountId: userB.id,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  // -------------------------------------------------------------
  // 2. Seed Default Providers
  // -------------------------------------------------------------
  console.log("🏬 Seeding Providers...");
  const defaultProviders = [
    { id: "prov_shopee", name: "Shopee", slug: "shopee", icon: "shopping-bag", color: "#EE4D2D" },
    { id: "prov_tiktok", name: "TikTok Shop", slug: "tiktok-shop", icon: "smartphone", color: "#000000" },
    { id: "prov_lazada", name: "Lazada", slug: "lazada", icon: "shopping-bag", color: "#0F146D" },
    { id: "prov_credit_card", name: "Credit Card", slug: "credit-card", icon: "credit-card", color: "#2563EB" },
    { id: "prov_truemoney", name: "TrueMoney", slug: "truemoney", icon: "wallet", color: "#F68B1F" },
    { id: "prov_mobile", name: "Mobile", slug: "mobile", icon: "smartphone", color: "#10B981" },
    { id: "prov_other", name: "Other", slug: "other", icon: "layers", color: "#6B7280" },
  ];

  for (const prov of defaultProviders) {
    await prisma.provider.upsert({
      where: { slug: prov.slug },
      update: {
        name: prov.name,
        icon: prov.icon,
        color: prov.color,
        active: true,
      },
      create: {
        id: prov.id,
        name: prov.name,
        slug: prov.slug,
        icon: prov.icon,
        color: prov.color,
        active: true,
        isCustom: false,
      },
    });
  }

  // -------------------------------------------------------------
  // 3. Seed Default Categories
  // -------------------------------------------------------------
  console.log("🏷️ Seeding Categories...");
  const defaultCategories = [
    { id: "cat_shopping", name: "Shopping", slug: "shopping", icon: "shopping-bag", color: "#EC4899" },
    { id: "cat_electronics", name: "Electronics", slug: "electronics", icon: "laptop", color: "#3B82F6" },
    { id: "cat_mobile", name: "Mobile", slug: "mobile", icon: "smartphone", color: "#6366F1" },
    { id: "cat_home", name: "Home", slug: "home", icon: "home", color: "#10B981" },
    { id: "cat_education", name: "Education", slug: "education", icon: "book-open", color: "#F59E0B" },
    { id: "cat_transportation", name: "Transportation", slug: "transportation", icon: "car", color: "#8B5CF6" },
    { id: "cat_subscription", name: "Subscription", slug: "subscription", icon: "repeat", color: "#06B6D4" },
    { id: "cat_other", name: "Other", slug: "other", icon: "circle-dot", color: "#9CA3AF" },
  ];

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        active: true,
      },
      create: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        active: true,
      },
    });
  }

  // -------------------------------------------------------------
  // 4. Seed Comprehensive Installment Test Cases
  // -------------------------------------------------------------
  console.log("📦 Seeding Sample Installments & Payment Schedules...");

  // CASE 1: Personal Installment (Shopee, User A, ฿6,000, 6 installments)
  const inst1Id = "inst_case1_shopee_user_a";
  await prisma.installment.upsert({
    where: { id: inst1Id },
    update: {
      totalAmount: new Prisma.Decimal("6000.00"),
      downPayment: new Prisma.Decimal("0.00"),
      installmentAmount: new Prisma.Decimal("1000.00"),
    },
    create: {
      id: inst1Id,
      ownerId: userA.id,
      providerId: "prov_shopee",
      categoryId: "cat_shopping",
      name: "Shopee 11.11 Order",
      description: "Personal gadgets from Shopee official store",
      totalAmount: new Prisma.Decimal("6000.00"),
      downPayment: new Prisma.Decimal("0.00"),
      installmentAmount: new Prisma.Decimal("1000.00"),
      totalInstallments: 6,
      startDate: new Date("2026-08-05T00:00:00Z"),
      dueDay: 5,
      ownershipType: "PERSONAL",
      splitType: "NONE",
      userSharePercent: new Prisma.Decimal("100.00"),
      partnerSharePercent: new Prisma.Decimal("0.00"),
      status: "ACTIVE",
      note: "SPayLater 0% 6 เดือน",
    },
  });

  // Payments for CASE 1 (Installments 1-6)
  const case1Statuses: Array<{ num: number; status: "PAID" | "DUE" | "UPCOMING"; due: string; paidAt?: string }> = [
    { num: 1, status: "PAID", due: "2026-08-05", paidAt: "2026-08-04T10:00:00Z" },
    { num: 2, status: "PAID", due: "2026-09-05", paidAt: "2026-09-05T14:30:00Z" },
    { num: 3, status: "DUE", due: "2026-10-05" },
    { num: 4, status: "UPCOMING", due: "2026-11-05" },
    { num: 5, status: "UPCOMING", due: "2026-12-05" },
    { num: 6, status: "UPCOMING", due: "2027-01-05" },
  ];

  for (const p of case1Statuses) {
    await prisma.installmentPayment.upsert({
      where: {
        installmentId_installmentNumber: {
          installmentId: inst1Id,
          installmentNumber: p.num,
        },
      },
      update: {
        status: p.status,
        amount: new Prisma.Decimal("1000.00"),
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
      },
      create: {
        id: `pay_${inst1Id}_${p.num}`,
        installmentId: inst1Id,
        installmentNumber: p.num,
        dueDate: new Date(`${p.due}T00:00:00Z`),
        amount: new Prisma.Decimal("1000.00"),
        status: p.status,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        payerId: p.status === "PAID" ? userA.id : null,
      },
    });
  }

  // CASE 2: Personal Installment (TikTok Shop, User B, ฿4,800, 6 installments, with OVERDUE)
  const inst2Id = "inst_case2_tiktok_user_b";
  await prisma.installment.upsert({
    where: { id: inst2Id },
    update: {
      totalAmount: new Prisma.Decimal("4800.00"),
      installmentAmount: new Prisma.Decimal("800.00"),
    },
    create: {
      id: inst2Id,
      ownerId: userB.id,
      providerId: "prov_tiktok",
      categoryId: "cat_electronics",
      name: "หูฟัง Sony WH-1000XM5",
      description: "หูฟังไร้สายส่วนตัวของ User B",
      totalAmount: new Prisma.Decimal("4800.00"),
      downPayment: new Prisma.Decimal("0.00"),
      installmentAmount: new Prisma.Decimal("800.00"),
      totalInstallments: 6,
      startDate: new Date("2026-05-01T00:00:00Z"),
      dueDay: 1,
      ownershipType: "PERSONAL",
      splitType: "NONE",
      userSharePercent: new Prisma.Decimal("100.00"),
      partnerSharePercent: new Prisma.Decimal("0.00"),
      status: "ACTIVE",
      note: "ผ่อนครบงวดสุดท้ายเดือนนี้",
    },
  });

  const case2Statuses: Array<{ num: number; status: "PAID" | "OVERDUE"; due: string; paidAt?: string }> = [
    { num: 1, status: "PAID", due: "2026-05-01", paidAt: "2026-05-01T12:00:00Z" },
    { num: 2, status: "PAID", due: "2026-06-01", paidAt: "2026-06-01T10:00:00Z" },
    { num: 3, status: "PAID", due: "2026-07-01", paidAt: "2026-07-01T09:00:00Z" },
    { num: 4, status: "PAID", due: "2026-08-01", paidAt: "2026-08-01T15:00:00Z" },
    { num: 5, status: "PAID", due: "2026-09-01", paidAt: "2026-09-01T11:00:00Z" },
    { num: 6, status: "OVERDUE", due: "2026-10-01" }, // Overdue since Oct 1
  ];

  for (const p of case2Statuses) {
    await prisma.installmentPayment.upsert({
      where: {
        installmentId_installmentNumber: {
          installmentId: inst2Id,
          installmentNumber: p.num,
        },
      },
      update: {
        status: p.status,
        amount: new Prisma.Decimal("800.00"),
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
      },
      create: {
        id: `pay_${inst2Id}_${p.num}`,
        installmentId: inst2Id,
        installmentNumber: p.num,
        dueDate: new Date(`${p.due}T00:00:00Z`),
        amount: new Prisma.Decimal("800.00"),
        status: p.status,
        paidAt: p.paidAt ? new Date(p.paidAt) : null,
        payerId: p.status === "PAID" ? userB.id : null,
      },
    });
  }

  // CASE 3: Shared 50/50 (iPad, ฿20,000, 10 installments, ฿2,000/mo)
  const inst3Id = "inst_case3_ipad_shared_50_50";
  await prisma.installment.upsert({
    where: { id: inst3Id },
    update: {
      totalAmount: new Prisma.Decimal("20000.00"),
      installmentAmount: new Prisma.Decimal("2000.00"),
      userSharePercent: new Prisma.Decimal("50.00"),
      partnerSharePercent: new Prisma.Decimal("50.00"),
    },
    create: {
      id: inst3Id,
      ownerId: userA.id,
      partnerId: userB.id,
      providerId: "prov_shopee",
      categoryId: "cat_mobile",
      name: "iPad Air M2 + Apple Pencil",
      description: "ไอแพดใช้งานร่วมกันสองคน ทำงานกราฟิกและเรียน",
      totalAmount: new Prisma.Decimal("20000.00"),
      downPayment: new Prisma.Decimal("0.00"),
      installmentAmount: new Prisma.Decimal("2000.00"),
      totalInstallments: 10,
      startDate: new Date("2026-08-05T00:00:00Z"),
      dueDay: 5,
      ownershipType: "SHARED",
      splitType: "EQUAL",
      userSharePercent: new Prisma.Decimal("50.00"),
      partnerSharePercent: new Prisma.Decimal("50.00"),
      status: "ACTIVE",
      note: "แบ่งจ่ายคนละครึ่ง 50/50 คนละ 1,000 บาท/งวด",
    },
  });

  // Schedule for CASE 3 (10 Installments with PaymentSplits)
  for (let num = 1; num <= 10; num++) {
    const month = (num + 7) % 12 + 1;
    const year = num <= 5 ? 2026 : 2027;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dueDate = new Date(`${year}-${monthStr}-05T00:00:00Z`);

    const isPaid = num <= 2;
    const isDue = num === 3;
    const status = isPaid ? "PAID" : isDue ? "DUE" : "UPCOMING";

    const payment = await prisma.installmentPayment.upsert({
      where: {
        installmentId_installmentNumber: {
          installmentId: inst3Id,
          installmentNumber: num,
        },
      },
      update: {
        status,
        amount: new Prisma.Decimal("2000.00"),
        paidAt: isPaid ? dueDate : null,
      },
      create: {
        id: `pay_${inst3Id}_${num}`,
        installmentId: inst3Id,
        installmentNumber: num,
        dueDate,
        amount: new Prisma.Decimal("2000.00"),
        status,
        paidAt: isPaid ? dueDate : null,
        payerId: isPaid ? userA.id : null,
      },
    });

    // Create 50/50 Splits for User A and User B
    await prisma.paymentSplit.upsert({
      where: {
        paymentId_userId: {
          paymentId: payment.id,
          userId: userA.id,
        },
      },
      update: {
        percentage: new Prisma.Decimal("50.00"),
        amount: new Prisma.Decimal("1000.00"),
        status: isPaid || isDue ? "PAID" : "UPCOMING",
        paidAt: isPaid || isDue ? dueDate : null,
      },
      create: {
        id: `split_${payment.id}_user_a`,
        paymentId: payment.id,
        userId: userA.id,
        percentage: new Prisma.Decimal("50.00"),
        amount: new Prisma.Decimal("1000.00"),
        status: isPaid || isDue ? "PAID" : "UPCOMING",
        paidAt: isPaid || isDue ? dueDate : null,
        paidByUserId: userA.id,
      },
    });

    await prisma.paymentSplit.upsert({
      where: {
        paymentId_userId: {
          paymentId: payment.id,
          userId: userB.id,
        },
      },
      update: {
        percentage: new Prisma.Decimal("50.00"),
        amount: new Prisma.Decimal("1000.00"),
        status: isPaid ? "PAID" : "UPCOMING",
        paidAt: isPaid ? dueDate : null,
        paidByUserId: isDue ? userA.id : null, // User A paid for User B on due month 3!
      },
      create: {
        id: `split_${payment.id}_user_b`,
        paymentId: payment.id,
        userId: userB.id,
        percentage: new Prisma.Decimal("50.00"),
        amount: new Prisma.Decimal("1000.00"),
        status: isPaid ? "PAID" : "UPCOMING",
        paidAt: isPaid ? dueDate : null,
        paidByUserId: isDue ? userA.id : null,
      },
    });
  }

  // CASE 4: Shared 70/30 (Washing Machine, ฿15,000, 10 installments, ฿1,500/mo)
  const inst4Id = "inst_case4_washing_machine_70_30";
  await prisma.installment.upsert({
    where: { id: inst4Id },
    update: {
      totalAmount: new Prisma.Decimal("15000.00"),
      installmentAmount: new Prisma.Decimal("1500.00"),
      userSharePercent: new Prisma.Decimal("70.00"),
      partnerSharePercent: new Prisma.Decimal("30.00"),
    },
    create: {
      id: inst4Id,
      ownerId: userA.id,
      partnerId: userB.id,
      providerId: "prov_lazada",
      categoryId: "cat_home",
      name: "เครื่องซักผ้า Electrolux UltimateCare",
      description: "เครื่องซักผ้าคอนโด User A 70%, User B 30%",
      totalAmount: new Prisma.Decimal("15000.00"),
      downPayment: new Prisma.Decimal("0.00"),
      installmentAmount: new Prisma.Decimal("1500.00"),
      totalInstallments: 10,
      startDate: new Date("2026-06-20T00:00:00Z"),
      dueDay: 20,
      ownershipType: "SHARED",
      splitType: "PERCENTAGE",
      userSharePercent: new Prisma.Decimal("70.00"),
      partnerSharePercent: new Prisma.Decimal("30.00"),
      status: "ACTIVE",
      note: "สัดส่วน 70/30: User A = ฿1,050, User B = ฿450",
    },
  });

  // Schedule for CASE 4 (10 Installments with 70/30 Splits)
  for (let num = 1; num <= 10; num++) {
    const month = (num + 5) % 12 + 1;
    const year = num <= 7 ? 2026 : 2027;
    const monthStr = month < 10 ? `0${month}` : `${month}`;
    const dueDate = new Date(`${year}-${monthStr}-20T00:00:00Z`);

    const isPaid = num <= 4;
    const status = isPaid ? "PAID" : "UPCOMING";

    const payment = await prisma.installmentPayment.upsert({
      where: {
        installmentId_installmentNumber: {
          installmentId: inst4Id,
          installmentNumber: num,
        },
      },
      update: {
        status,
        amount: new Prisma.Decimal("1500.00"),
        paidAt: isPaid ? dueDate : null,
      },
      create: {
        id: `pay_${inst4Id}_${num}`,
        installmentId: inst4Id,
        installmentNumber: num,
        dueDate,
        amount: new Prisma.Decimal("1500.00"),
        status,
        paidAt: isPaid ? dueDate : null,
        payerId: isPaid ? userA.id : null,
      },
    });

    // User A 70% = 1,050.00, User B 30% = 450.00
    await prisma.paymentSplit.upsert({
      where: {
        paymentId_userId: {
          paymentId: payment.id,
          userId: userA.id,
        },
      },
      update: {
        percentage: new Prisma.Decimal("70.00"),
        amount: new Prisma.Decimal("1050.00"),
        status: isPaid ? "PAID" : "UPCOMING",
        paidAt: isPaid ? dueDate : null,
      },
      create: {
        id: `split_${payment.id}_user_a`,
        paymentId: payment.id,
        userId: userA.id,
        percentage: new Prisma.Decimal("70.00"),
        amount: new Prisma.Decimal("1050.00"),
        status: isPaid ? "PAID" : "UPCOMING",
        paidAt: isPaid ? dueDate : null,
        paidByUserId: userA.id,
      },
    });

    await prisma.paymentSplit.upsert({
      where: {
        paymentId_userId: {
          paymentId: payment.id,
          userId: userB.id,
        },
      },
      update: {
        percentage: new Prisma.Decimal("30.00"),
        amount: new Prisma.Decimal("450.00"),
        status: isPaid ? "PAID" : "UPCOMING",
        paidAt: isPaid ? dueDate : null,
      },
      create: {
        id: `split_${payment.id}_user_b`,
        paymentId: payment.id,
        userId: userB.id,
        percentage: new Prisma.Decimal("30.00"),
        amount: new Prisma.Decimal("450.00"),
        status: isPaid ? "PAID" : "UPCOMING",
        paidAt: isPaid ? dueDate : null,
        paidByUserId: userB.id,
      },
    });
  }

  // -------------------------------------------------------------
  // 5. Seed Settlements
  // -------------------------------------------------------------
  console.log("🤝 Seeding Settlement Records...");
  await prisma.settlement.upsert({
    where: { id: "stl_sample_pending_1" },
    update: {
      amount: new Prisma.Decimal("300.00"),
      status: "PENDING",
    },
    create: {
      id: "stl_sample_pending_1",
      fromUserId: userB.id,
      toUserId: userA.id,
      amount: new Prisma.Decimal("300.00"),
      status: "PENDING",
      note: "เคลียร์ยอดค้างงวด iPad และ ค่าของใช้เข้าห้องรอบเดือนตุลาคม",
    },
  });

  await prisma.settlement.upsert({
    where: { id: "stl_sample_settled_1" },
    update: {
      amount: new Prisma.Decimal("1200.00"),
      status: "SETTLED",
    },
    create: {
      id: "stl_sample_settled_1",
      fromUserId: userA.id,
      toUserId: userB.id,
      amount: new Prisma.Decimal("1200.00"),
      status: "SETTLED",
      note: "เคลียร์ยอดรอบเดือนกันยายนเรียบร้อยผ่านพร้อมเพย์",
      settledAt: new Date("2026-09-30T18:00:00Z"),
    },
  });

  // -------------------------------------------------------------
  // 6. Seed Sample Notifications
  // -------------------------------------------------------------
  console.log("🔔 Seeding Notifications...");
  await prisma.notification.upsert({
    where: { id: "notif_sample_1" },
    update: {},
    create: {
      id: "notif_sample_1",
      userId: userA.id,
      type: "PAYMENT_DUE",
      title: "ใกล้ถึงกำหนดชำระ iPad Air M2",
      message: "งวดที่ 3 จำนวน ฿1,000.00 ครบกำหนดวันที่ 5 ต.ค. 2026",
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif_sample_2" },
    update: {},
    create: {
      id: "notif_sample_2",
      userId: userB.id,
      type: "PAYMENT_OVERDUE",
      title: "รายการเกินกำหนดชำระ",
      message: "หูฟัง Sony WH-1000XM5 งวดที่ 6 เกินกำหนดชำระแล้ว กรุณาตรวจสอบ",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
