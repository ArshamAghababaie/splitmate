import type {
  Balance,
  Debt,
  ExpenseWithSplits,
  Settlement,
  Split,
} from "../types";

export function calculateBalances(expenses: ExpenseWithSplits[]): Balance[] {
  const nets = new Map<string, number>();

  for (const expense of expenses) {
    nets.set(expense.paidBy, (nets.get(expense.paidBy) ?? 0) + expense.amountToman);
    for (const split of expense.splits) {
      nets.set(split.userId, (nets.get(split.userId) ?? 0) - split.amountOwed);
    }
  }

  return Array.from(nets.entries()).map(([userId, net]) => ({ userId, net }));
}

export function simplifyDebts(balances: Balance[]): Debt[] {
  const creditors: Balance[] = [];
  const debtors: Balance[] = [];

  for (const b of balances) {
    if (b.net > 0) creditors.push({ ...b });
    else if (b.net < 0) debtors.push({ ...b });
  }

  creditors.sort((a, b) => b.net - a.net);
  debtors.sort((a, b) => a.net - b.net);

  const debts: Debt[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const payment = Math.min(creditor.net, Math.abs(debtor.net));

    debts.push({
      fromUser: debtor.userId,
      toUser: creditor.userId,
      amountToman: payment,
    });

    creditor.net -= payment;
    debtor.net += payment;

    if (creditor.net === 0) ci++;
    if (debtor.net === 0) di++;
  }

  return debts;
}

export function calculateGroupDebts(
  expenses: ExpenseWithSplits[],
  settlements: Settlement[],
): Debt[] {
  const settlementExpenses: ExpenseWithSplits[] = settlements.map((s, i) => ({
    id: `settlement-${i}`,
    paidBy: s.fromUser,
    amountToman: s.amountToman,
    splits: [{ userId: s.toUser, amountOwed: s.amountToman }],
  }));

  const allExpenses = [...expenses, ...settlementExpenses];
  const balances = calculateBalances(allExpenses);
  return simplifyDebts(balances);
}

export function splitEqually(totalAmount: number, userIds: string[]): Split[] {
  const count = userIds.length;
  const base = Math.floor(totalAmount / count);
  const remainder = totalAmount % count;

  return userIds.map((userId, i) => ({
    userId,
    amountOwed: base + (i < remainder ? 1 : 0),
  }));
}

export function splitByPercentage(
  totalAmount: number,
  percentages: { userId: string; percentage: number }[],
): Split[] {
  const splits: Split[] = percentages.map(({ userId, percentage }) => ({
    userId,
    amountOwed: Math.floor((totalAmount * percentage) / 100),
  }));

  let assigned = splits.reduce((sum, s) => sum + s.amountOwed, 0);
  let remainder = totalAmount - assigned;

  for (let i = 0; i < splits.length && remainder > 0; i++) {
    splits[i].amountOwed += 1;
    remainder--;
  }

  return splits;
}
