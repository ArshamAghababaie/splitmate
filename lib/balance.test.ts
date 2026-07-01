import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateBalances,
  simplifyDebts,
  calculateGroupDebts,
  splitEqually,
  splitByPercentage,
} from "./balance";

describe("splitEqually", () => {
  it("splits 300,000 among 3 people equally", () => {
    const splits = splitEqually(300_000, ["a", "b", "c"]);
    assert.equal(splits.length, 3);
    for (const s of splits) assert.equal(s.amountOwed, 100_000);
    assert.equal(splits.reduce((s, x) => s + x.amountOwed, 0), 300_000);
  });

  it("distributes remainder of 100,001 among 3 correctly", () => {
    const splits = splitEqually(100_001, ["a", "b", "c"]);
    assert.equal(splits[0].amountOwed, 33_334);
    assert.equal(splits[1].amountOwed, 33_334);
    assert.equal(splits[2].amountOwed, 33_333);
    assert.equal(splits.reduce((s, x) => s + x.amountOwed, 0), 100_001);
  });
});

describe("splitByPercentage", () => {
  it("splits by percentage with remainder", () => {
    const splits = splitByPercentage(100_001, [
      { userId: "a", percentage: 50 },
      { userId: "b", percentage: 30 },
      { userId: "c", percentage: 20 },
    ]);
    assert.equal(splits.reduce((s, x) => s + x.amountOwed, 0), 100_001);
  });
});

describe("calculateBalances", () => {
  it("calculates simple two-person balance", () => {
    const balances = calculateBalances([
      {
        id: "e1",
        paidBy: "A",
        pendingPaidBy: null,
        amountToman: 100_000,
        splits: [{ userId: "B", pendingMemberId: null, amountOwed: 100_000 }],
      },
    ]);
    const aBalance = balances.find((b) => b.memberId === "A");
    const bBalance = balances.find((b) => b.memberId === "B");
    assert.equal(aBalance?.net, 100_000);
    assert.equal(bBalance?.net, -100_000);
  });
});

describe("simplifyDebts", () => {
  it("simple two-person debt", () => {
    const debts = simplifyDebts([
      { memberId: "A", net: 100_000, isPending: false },
      { memberId: "B", net: -100_000, isPending: false },
    ]);
    assert.equal(debts.length, 1);
    assert.equal(debts[0].fromMemberId, "B");
    assert.equal(debts[0].toMemberId, "A");
    assert.equal(debts[0].amountToman, 100_000);
  });

  it("three-person chain minimizes transactions", () => {
    // A paid 200k for B and C equally (100k each)
    // B paid 100k for C
    const balances = calculateBalances([
      {
        id: "e1",
        paidBy: "A",
        pendingPaidBy: null,
        amountToman: 200_000,
        splits: [
          { userId: "B", pendingMemberId: null, amountOwed: 100_000 },
          { userId: "C", pendingMemberId: null, amountOwed: 100_000 },
        ],
      },
      {
        id: "e2",
        paidBy: "B",
        pendingPaidBy: null,
        amountToman: 100_000,
        splits: [{ userId: "C", pendingMemberId: null, amountOwed: 100_000 }],
      },
    ]);
    const debts = simplifyDebts(balances);
    // A is owed 200k, B net 0 (paid 100k, owes 100k), C owes 200k
    // Should simplify to: C owes A 200k (1 transaction, not 2)
    assert.ok(debts.length <= 2);
    const total = debts.reduce((s, d) => s + d.amountToman, 0);
    assert.equal(total, 200_000);
  });

  it("returns empty when everyone is even", () => {
    const debts = simplifyDebts([
      { memberId: "A", net: 0, isPending: false },
      { memberId: "B", net: 0, isPending: false },
    ]);
    assert.equal(debts.length, 0);
  });
});

describe("calculateGroupDebts", () => {
  it("settlement reduces remaining debt", () => {
    const debts = calculateGroupDebts(
      [
        {
          id: "e1",
          paidBy: "A",
          pendingPaidBy: null,
          amountToman: 100_000,
          splits: [{ userId: "B", pendingMemberId: null, amountOwed: 100_000 }],
        },
      ],
      [{ fromUser: "B", toUser: "A", amountToman: 60_000 }],
    );
    assert.equal(debts.length, 1);
    assert.equal(debts[0].fromMemberId, "B");
    assert.equal(debts[0].toMemberId, "A");
    assert.equal(debts[0].amountToman, 40_000);
  });
});
