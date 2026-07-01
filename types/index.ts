export type Split = {
  userId: string | null;
  pendingMemberId: string | null;
  amountOwed: number;
};

export type ExpenseWithSplits = {
  id: string;
  paidBy: string | null;
  pendingPaidBy: string | null;
  amountToman: number;
  splits: Split[];
};

export type PayerInfo = {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarColor: string | null;
  isPending: boolean;
};

export type Settlement = {
  fromUser: string;
  toUser: string;
  amountToman: number;
};

export type Balance = {
  memberId: string;
  isPending: boolean;
  email?: string;
  net: number;
};

export type Debt = {
  fromMemberId: string;
  fromIsPending: boolean;
  fromEmail?: string;
  toMemberId: string;
  toIsPending: boolean;
  toEmail?: string;
  amountToman: number;
};

export type PendingMember = {
  id: string;
  email: string;
  invitedBy: string;
  createdAt: string;
};

export type GroupMemberWithStatus = {
  id: string;
  email: string;
  fullName: string | null;
  avatarColor: string | null;
  isPending: boolean;
};
