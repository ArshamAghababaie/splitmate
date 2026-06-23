export type Split = {
  userId: string;
  amountOwed: number;
};

export type ExpenseWithSplits = {
  id: string;
  paidBy: string;
  amountToman: number;
  splits: Split[];
};

export type Settlement = {
  fromUser: string;
  toUser: string;
  amountToman: number;
};

export type Balance = {
  userId: string;
  net: number;
};

export type Debt = {
  fromUser: string;
  toUser: string;
  amountToman: number;
};
