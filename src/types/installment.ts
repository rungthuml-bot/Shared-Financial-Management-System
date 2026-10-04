import type {
  OwnershipType,
  SplitType,
  InstallmentStatus,
  PaymentStatus,
  SettlementStatus,
  NotificationType,
  Installment as PrismaInstallment,
  InstallmentPayment as PrismaInstallmentPayment,
  PaymentSplit as PrismaPaymentSplit,
  Provider as PrismaProvider,
  Category as PrismaCategory,
  Settlement as PrismaSettlement,
  Notification as PrismaNotification,
  User as PrismaUser,
  Prisma,
} from "@prisma/client";

// Re-export enums directly from Prisma for single source of truth
export type {
  OwnershipType,
  SplitType,
  InstallmentStatus,
  PaymentStatus,
  SettlementStatus,
  NotificationType,
  PrismaInstallment,
  PrismaInstallmentPayment,
  PrismaPaymentSplit,
  PrismaProvider,
  PrismaCategory,
  PrismaSettlement,
  PrismaNotification,
  PrismaUser,
};

// -------------------------------------------------------------
// Detailed Query Payload Types (With Relations)
// -------------------------------------------------------------

export type InstallmentWithDetails = Prisma.InstallmentGetPayload<{
  include: {
    provider: true;
    category: true;
    owner: { select: { id: true; name: true; email: true; image: true } };
    partner: { select: { id: true; name: true; email: true; image: true } };
    payments: {
      include: {
        splits: {
          include: {
            user: { select: { id: true; name: true; email: true } };
          };
        };
      };
    };
  };
}>;

export type PaymentWithSplits = Prisma.InstallmentPaymentGetPayload<{
  include: {
    splits: {
      include: {
        user: { select: { id: true; name: true; email: true } };
      };
    };
  };
}>;

export type SettlementWithUsers = Prisma.SettlementGetPayload<{
  include: {
    fromUser: { select: { id: true; name: true; email: true } };
    toUser: { select: { id: true; name: true; email: true } };
  };
}>;

// -------------------------------------------------------------
// Client View Types (for Dashboard and UI presentation)
// -------------------------------------------------------------

export interface InstallmentViewItem {
  id: string;
  name: string;
  provider: string;
  providerSlug: string;
  category?: string;
  totalAmount: number;
  downPayment: number;
  installmentAmount: number;
  totalInstallments: number;
  currentInstallment?: number;
  dueDay: number;
  startDate: string;
  ownershipType: OwnershipType;
  splitType: SplitType;
  userSharePercent: number;
  partnerSharePercent: number;
  status: InstallmentStatus;
  note?: string;
}

export interface PaymentScheduleViewItem {
  id: string;
  installmentId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: string;
  payerId?: string;
  note?: string;
  splits: Array<{
    userId: string;
    userName: string;
    percentage: number;
    amount: number;
    status: PaymentStatus;
    paidAt?: string;
  }>;
}

export interface NetSettlementSummary {
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  userAPaidForB: number;
  userBPaidForA: number;
  status: SettlementStatus;
}
