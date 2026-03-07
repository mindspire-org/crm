export type RecoveryStatus =
  | "Pending"
  | "PartiallyPaid"
  | "Overdue"
  | "InFollowUp"
  | "PaymentPromised"
  | "Dispute"
  | "Completed"
  | "WrittenOff";

export type RecoveryCaseRow = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  issueDate: string | null;
  dueDate: string | null;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  amount: number;
  received: number;
  outstanding: number;
  overdue: boolean;
  lastPaymentAt: string | null;
  recovery: null | {
    id: string;
    status: RecoveryStatus;
    ownerUserId: string;
    priority: "low" | "normal" | "high" | "critical";
    riskFlags: string[];
    nextFollowUpAt: string | null;
    lastFollowUpAt: string | null;
    nextExpectedPaymentAt: string | null;
    notes: string;
  };
  effectiveStatus: RecoveryStatus;
};

export type RecoveryCaseDetail = {
  invoice: any;
  project: any;
  client: any;
  case: any;
  schedules: Array<{
    _id: string;
    title?: string;
    dueDate?: string;
    amountDue?: number;
    expectedPaymentAt?: string;
    status?: "Pending" | "PartiallyPaid" | "Overdue" | "Completed";
    milestoneId?: string;
  }>;
  events: Array<{
    _id: string;
    type: string;
    title?: string;
    body?: string;
    meta?: any;
    createdAt?: string;
    createdByUserId?: string;
  }>;
  computed: {
    amount: number;
    received: number;
    outstanding: number;
    overdue: boolean;
    lastPaymentAt: string | null;
  };
};

export type UserPick = {
  _id: string;
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
};
