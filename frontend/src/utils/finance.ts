import { Card, MsiPurchase, Income, Expense, Currency } from '../db/types';

/**
 * Calculate the monthly cargo for an MSI in the current month.
 * Returns 0 if MSI is not active in the current month.
 */
export function msiCargoForMonth(msi: MsiPurchase, year: number, month: number): number {
  if (!msi.activa) return 0;
  const [sy, sm] = msi.mes_inicio.split('-').map((n) => parseInt(n, 10));
  if (!sy || !sm) return 0;
  const start = sy * 12 + sm;
  const target = year * 12 + month;
  const diff = target - start;
  if (diff < 0 || diff >= msi.meses) return 0;
  return msi.cargo_mensual;
}

export function msiCurrentInstallment(msi: MsiPurchase): number {
  const [sy, sm] = msi.mes_inicio.split('-').map((n) => parseInt(n, 10));
  if (!sy || !sm) return 0;
  const now = new Date();
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  const diff = ny * 12 + nm - (sy * 12 + sm) + 1;
  if (diff <= 0) return 0;
  if (diff > msi.meses) return msi.meses;
  return diff;
}

export function msiPaidSoFar(msi: MsiPurchase): number {
  const inst = msiCurrentInstallment(msi);
  return Math.max(0, inst - 1) * msi.cargo_mensual;
}

export function msiRemaining(msi: MsiPurchase): number {
  const remaining = msi.monto_total - msiPaidSoFar(msi);
  return Math.max(0, remaining);
}

/**
 * Available balance today for a single card.
 * For credit: limite - saldo_inicial - sum(expenses on this card) - sum(MSI cargos already accrued in current cycle)
 * For debit: saldo_inicial - sum(expenses on this card)
 */
export function cardAvailableBalance(card: Card, expenses: Expense[], msis: MsiPurchase[]): number {
  const cardExpenses = expenses.filter((e) => e.card_id === card.id).reduce((s, e) => s + e.monto, 0);
  const cardMsis = msis.filter((m) => m.card_id === card.id);
  const now = new Date();
  // Sum of MSI charges already accrued (current month installment)
  const msiAccrued = cardMsis.reduce((s, m) => {
    const inst = msiCurrentInstallment(m);
    return s + Math.max(0, inst) * m.cargo_mensual;
  }, 0);

  if (card.tipo === 'credito') {
    return card.limite - card.saldo_inicial - cardExpenses - msiAccrued;
  }
  return card.saldo_inicial - cardExpenses;
}

export function cardCombinedLimit(cards: Card[]): number {
  return cards.reduce((s, c) => s + (c.tipo === 'credito' ? c.limite : c.saldo_inicial), 0);
}

export function totalAvailableToday(cards: Card[], expenses: Expense[], msis: MsiPurchase[]): number {
  return cards.reduce((s, c) => s + cardAvailableBalance(c, expenses, msis), 0);
}

export function totalExpensesMonth(expenses: Expense[], year: number, month: number): number {
  return expenses
    .filter((e) => {
      const d = new Date(e.fecha);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .reduce((s, e) => s + e.monto, 0);
}

/**
 * Project income for remaining of current month.
 * - mensual: pay once if pay day >= today
 * - quincenal: two pay days (pay day and pay day+15 mod last day)
 * - semanal: pay every 7 days starting from fecha_pago day-of-week; count remaining pay dates in month
 * - diario: amount * remaining days of the month (including today)
 */
export function projectedIncomeRemaining(incomes: Income[]): number {
  const now = new Date();
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  const today = now.getDate();
  const lastDay = new Date(ny, nm, 0).getDate();
  const remainingDays = lastDay - today + 1; // including today
  let total = 0;
  for (const inc of incomes) {
    const payDate = new Date(inc.fecha_pago);
    if (isNaN(payDate.getTime())) continue;
    const payDay = payDate.getDate();
    if (inc.frecuencia === 'diario') {
      total += inc.monto * Math.max(0, remainingDays);
    } else if (inc.frecuencia === 'semanal') {
      const targetDow = payDate.getDay();
      let count = 0;
      for (let d = today; d <= lastDay; d++) {
        const dow = new Date(ny, nm - 1, d).getDay();
        if (dow === targetDow) count++;
      }
      total += inc.monto * count;
    } else if (inc.frecuencia === 'quincenal') {
      const second = ((payDay + 15 - 1) % lastDay) + 1;
      if (payDay >= today) total += inc.monto;
      if (second >= today && second !== payDay) total += inc.monto;
    } else {
      // mensual
      if (payDay >= today) total += inc.monto;
    }
  }
  return total;
}

/**
 * Projected MSI cargos remaining in current month (only those not yet "paid", but for simplicity we add the current month cargo).
 * Used only for end-of-month projection.
 */
export function projectedMsiCargosRemaining(msis: MsiPurchase[]): number {
  const now = new Date();
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  return msis.reduce((s, m) => s + msiCargoForMonth(m, ny, nm), 0);
}

export function totalMsiPendingDebt(msis: MsiPurchase[]): number {
  return msis.filter((m) => m.activa).reduce((s, m) => s + msiRemaining(m), 0);
}

/**
 * Cashback earned from expenses in a given month, aggregated across all cards
 * that have cashback_percent > 0.
 */
export function cashbackAccumulatedMonth(cards: Card[], expenses: Expense[], year: number, month: number): number {
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  let total = 0;
  for (const exp of expenses) {
    const d = new Date(exp.fecha);
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
    if (!exp.card_id) continue;
    const card = cardMap.get(exp.card_id);
    if (!card || !card.cashback_percent || card.cashback_percent <= 0) continue;
    total += exp.monto * (card.cashback_percent / 100);
  }
  return +total.toFixed(2);
}

/**
 * Compute cashback for a single prospective expense given a card.
 */
export function cashbackForExpense(card: Card | undefined | null, amount: number): number {
  if (!card || !card.cashback_percent || card.cashback_percent <= 0) return 0;
  if (!amount || isNaN(amount)) return 0;
  return +(amount * (card.cashback_percent / 100)).toFixed(2);
}

export interface DashboardSummary {
  combinedLimit: number;
  availableToday: number;
  expensesMonth: number;
  projectedIncome: number;
  projectedMsi: number;
  endOfMonthProjection: number;
  msiPendingDebt: number;
  cashbackMonth: number;
}

export function buildDashboardSummary(
  cards: Card[],
  expenses: Expense[],
  msis: MsiPurchase[],
  incomes: Income[]
): DashboardSummary {
  const now = new Date();
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  const combinedLimit = cardCombinedLimit(cards);
  const availableToday = totalAvailableToday(cards, expenses, msis);
  const expensesMonth = totalExpensesMonth(expenses, ny, nm);
  const cashbackMonth = cashbackAccumulatedMonth(cards, expenses, ny, nm);
  const projectedIncome = projectedIncomeRemaining(incomes) + cashbackMonth;
  const projectedMsi = projectedMsiCargosRemaining(msis);
  const endOfMonthProjection = availableToday + projectedIncome - projectedMsi;
  const msiPendingDebt = totalMsiPendingDebt(msis);

  return {
    combinedLimit,
    availableToday,
    expensesMonth,
    projectedIncome,
    projectedMsi,
    endOfMonthProjection,
    msiPendingDebt,
    cashbackMonth,
  };
}

/**
 * Build pie chart segments. Always returns non-negative segments.
 * Buckets:
 *  - saldo_disponible_hoy (green solid)
 *  - proyeccion_positiva (green tenue) -> end-of-month projection delta if positive
 *  - proyeccion_negativa (red tenue) -> end-of-month projection delta if negative
 *  - gastos_realizados (gray)
 */
export interface PieSegment {
  key: 'saldo_disponible_hoy' | 'proyeccion_positiva' | 'proyeccion_negativa' | 'gastos_realizados';
  label: string;
  value: number;
  color: string;
}

export function buildPieSegments(summary: DashboardSummary): PieSegment[] {
  const projectionDelta = summary.endOfMonthProjection - summary.availableToday;
  const proyeccionPositiva = projectionDelta > 0 ? projectionDelta : 0;
  const proyeccionNegativa = projectionDelta < 0 ? Math.abs(projectionDelta) : 0;
  const segments: PieSegment[] = [
    {
      key: 'saldo_disponible_hoy',
      label: 'Saldo disponible hoy',
      value: Math.max(0, summary.availableToday),
      color: '#22C55E',
    },
    {
      key: 'proyeccion_positiva',
      label: 'Proyección positiva',
      value: proyeccionPositiva,
      color: 'rgba(34, 197, 94, 0.4)',
    },
    {
      key: 'proyeccion_negativa',
      label: 'Alerta: saldo negativo',
      value: proyeccionNegativa,
      color: 'rgba(239, 68, 68, 0.4)',
    },
    {
      key: 'gastos_realizados',
      label: 'Gastos realizados',
      value: Math.max(0, summary.expensesMonth),
      color: '#4B5563',
    },
  ];
  return segments;
}

export function cycleKeyForCard(card: Card, date: Date = new Date()): string {
  // Cycle key based on year-month and pay day to identify a particular billing cycle
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(card.fecha_pago).padStart(2, '0')}`;
}

export function nextPayDate(card: Card, from: Date = new Date()): Date {
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();
  const lastDayThis = new Date(y, m + 1, 0).getDate();
  const payDayThis = Math.min(card.fecha_pago, lastDayThis);
  if (d <= payDayThis) {
    return new Date(y, m, payDayThis, 9, 0, 0);
  }
  const lastDayNext = new Date(y, m + 2, 0).getDate();
  const payDayNext = Math.min(card.fecha_pago, lastDayNext);
  return new Date(y, m + 1, payDayNext, 9, 0, 0);
}
