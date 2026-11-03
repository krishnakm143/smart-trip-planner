/**
 * Pure helper for calculating group balances, category totals, and minimal settlements.
 * Has no database or ORM dependencies so it can safely run in both node and browser environments.
 */
export function calculateSettlements(members = ['Me'], expenses = []) {
  const memberList = members.length > 0 ? members : ['Me'];
  const balances = {};
  memberList.forEach((m) => {
    balances[m] = 0;
  });

  const byCategory = {};
  const byPaymentMethod = {};
  let totalSpent = 0;

  for (const exp of expenses) {
    const amt = Number(exp.amount) || 0;
    totalSpent += amt;

    const cat = exp.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + amt;

    const pm = exp.paymentMethod || 'cash';
    byPaymentMethod[pm] = (byPaymentMethod[pm] || 0) + amt;

    const payer = exp.paidBy || memberList[0] || 'Me';
    if (balances[payer] === undefined) balances[payer] = 0;
    balances[payer] += amt;

    if (Array.isArray(exp.splits) && exp.splits.length > 0) {
      for (const split of exp.splits) {
        const m = split.member;
        const splitAmt = Number(split.amount) || 0;
        if (balances[m] === undefined) balances[m] = 0;
        balances[m] -= splitAmt;
      }
    } else {
      const share = amt / memberList.length;
      for (const m of memberList) {
        balances[m] -= share;
      }
    }
  }

  const creditors = [];
  const debtors = [];

  for (const [member, balance] of Object.entries(balances)) {
    const rounded = Math.round(balance * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ member, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ member, amount: -rounded });
    }
  }

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];
    const settleAmt = Math.min(creditor.amount, debtor.amount);
    const roundedSettle = Math.round(settleAmt);

    if (roundedSettle > 0) {
      settlements.push({
        from: debtor.member,
        to: creditor.member,
        amount: roundedSettle,
      });
    }

    creditor.amount -= settleAmt;
    debtor.amount -= settleAmt;

    if (creditor.amount < 0.01) cIdx++;
    if (debtor.amount < 0.01) dIdx++;
  }

  return {
    totalSpent,
    byCategory,
    byPaymentMethod,
    balances,
    settlements,
  };
}
