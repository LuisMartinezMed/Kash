import type { Card, Currency } from '../db/types';

// ===== Tipos base =====

/** Fecha de calendario pura (sin hora ni zona horaria), formato YYYY-MM-DD validado. */
export type CalendarDate = string;

/** Instante de auditoría, siempre UTC. */
export type ISODateTimeUTC = string;

export type DueDateSource = 'predicted' | 'statement' | 'manual';

/** Estado temporal del ciclo. */
export type BillingCycleStatus = 'open' | 'closed';

/** Estado de pago: siempre derivado, nunca persistido. */
export type BillingCyclePaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overpaid';

/** Política de ajuste de fin de semana. Sólo participa en la predicción de dueDate. */
export type NonBusinessDayPolicy = 'none' | 'next_business_day' | 'previous_business_day';

export type BillingCycleAdjustmentType =
  | 'interest'
  | 'iva_interest'
  | 'commission'
  | 'rounding_debit'
  | 'manual_debit'
  | 'refund'
  | 'manual_credit'
  | 'rounding_credit';

// ===== Entidades =====

export interface BillingCycle {
  id: string;
  cardId: string;

  periodStart: CalendarDate;
  periodEnd: CalendarDate;
  statementCloseDate: CalendarDate;

  predictedDueDate: CalendarDate;
  dueDate: CalendarDate;
  dueDateSource: DueDateSource;
  manualOverrideNote: string | null;

  statementBalanceCents: number | null;
  minimumPaymentCents: number | null;
  currency: Currency;

  status: BillingCycleStatus;

  createdAt: ISODateTimeUTC;
  updatedAt: ISODateTimeUTC;
}

export interface CardPayment {
  id: string;
  cardId: string;
  billingCycleId: string;
  amountCents: number;
  currency: Currency;
  paidAt: CalendarDate;
  createdAt: ISODateTimeUTC;
}

export interface BillingCycleAdjustment {
  id: string;
  billingCycleId: string;
  type: BillingCycleAdjustmentType;
  amountCents: number;
  currency: Currency;
  appliedAt: CalendarDate;
  note: string | null;
  createdAt: ISODateTimeUTC;
}

// ===== Aritmética de calendario (sin Date, sin zona horaria) =====
// Basado en el algoritmo de conversión civil <-> día ordinal de Howard Hinnant
// (http://howardhinnant.github.io/date_algorithms.html), válido para el calendario
// gregoriano proléptico. Es aritmética entera pura: no depende de Date ni de la
// zona horaria del sistema.

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function toCalendarDateString(year: number, month: number, day: number): CalendarDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function isValidCalendarDate(value: string): value is CalendarDate {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

function requireValidCalendarDate(value: string, label: string): { year: number; month: number; day: number } {
  if (!isValidCalendarDate(value)) {
    throw new Error(`${label} is not a valid CalendarDate (expected YYYY-MM-DD): "${value}"`);
  }
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function requireValidDayOfMonth(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    throw new Error(`${label} must be an integer between 1 and 31, received: ${value}`);
  }
  return value;
}

/** Días desde 1970-01-01 (civil -> ordinal), algoritmo de Hinnant. */
function daysFromCivil(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor((y >= 0 ? y : y - 399) / 400);
  const yoe = y - era * 400;
  const mp = month + (month > 2 ? -3 : 9);
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Ordinal -> civil (inverso de daysFromCivil), algoritmo de Hinnant. */
function civilFromDays(daysSinceEpoch: number): { year: number; month: number; day: number } {
  const z = daysSinceEpoch + 719468;
  const era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  const year = month <= 2 ? y + 1 : y;
  return { year, month, day };
}

export function compareCalendarDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  const pa = requireValidCalendarDate(a, 'a');
  const pb = requireValidCalendarDate(b, 'b');
  const da = daysFromCivil(pa.year, pa.month, pa.day);
  const db = daysFromCivil(pb.year, pb.month, pb.day);
  if (da < db) return -1;
  if (da > db) return 1;
  return 0;
}

export function addDaysToCalendarDate(date: CalendarDate, days: number): CalendarDate {
  if (!Number.isInteger(days)) {
    throw new Error(`days must be an integer, received: ${days}`);
  }
  const parts = requireValidCalendarDate(date, 'date');
  const total = daysFromCivil(parts.year, parts.month, parts.day) + days;
  const result = civilFromDays(total);
  return toCalendarDateString(result.year, result.month, result.day);
}

/** 1970-01-01 (día ordinal 0) fue jueves — hecho conocido, ancla del algoritmo de Hinnant. */
function dayOfWeekFromDays(daysSinceEpoch: number): number {
  const raw = daysSinceEpoch % 7;
  return raw < 0 ? raw + 7 : raw; // 0=jueves,1=viernes,2=sábado,3=domingo,4=lunes,5=martes,6=miércoles
}

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  const shiftedYear = Math.floor(index / 12);
  const shiftedMonth = index - shiftedYear * 12 + 1;
  return { year: shiftedYear, month: shiftedMonth };
}

function calendarDateForDayOfMonth(day: number, year: number, month: number): CalendarDate {
  const clampedDay = Math.min(day, daysInMonth(year, month));
  return toCalendarDateString(year, month, clampedDay);
}

// ===== Política de fin de semana =====

export function applyNonBusinessDayPolicy(date: CalendarDate, policy: NonBusinessDayPolicy): CalendarDate {
  const parts = requireValidCalendarDate(date, 'date');
  if (policy === 'none') return date;

  const days = daysFromCivil(parts.year, parts.month, parts.day);
  const dow = dayOfWeekFromDays(days);
  const isSaturday = dow === 2;
  const isSunday = dow === 3;
  if (!isSaturday && !isSunday) return date;

  if (policy === 'next_business_day') {
    return addDaysToCalendarDate(date, isSaturday ? 2 : 1);
  }
  return addDaysToCalendarDate(date, isSaturday ? -1 : -2);
}

// ===== Derivación de periodo y predicción de dueDate =====

export function deriveBillingPeriod(
  card: Pick<Card, 'fecha_corte'>,
  referenceDate: CalendarDate
): { periodStart: CalendarDate; periodEnd: CalendarDate; statementCloseDate: CalendarDate } {
  const closeDay = requireValidDayOfMonth(card.fecha_corte, 'card.fecha_corte');
  const ref = requireValidCalendarDate(referenceDate, 'referenceDate');

  const thisMonthClose = calendarDateForDayOfMonth(closeDay, ref.year, ref.month);
  let closeYear = ref.year;
  let closeMonth = ref.month;
  if (compareCalendarDates(referenceDate, thisMonthClose) > 0) {
    const next = shiftMonth(ref.year, ref.month, 1);
    closeYear = next.year;
    closeMonth = next.month;
  }

  const periodEnd = calendarDateForDayOfMonth(closeDay, closeYear, closeMonth);
  const previous = shiftMonth(closeYear, closeMonth, -1);
  const previousClose = calendarDateForDayOfMonth(closeDay, previous.year, previous.month);
  const periodStart = addDaysToCalendarDate(previousClose, 1);

  return { periodStart, periodEnd, statementCloseDate: periodEnd };
}

export function predictDueDate(
  card: Pick<Card, 'fecha_pago'>,
  periodEnd: CalendarDate,
  policy: NonBusinessDayPolicy
): CalendarDate {
  const payDay = requireValidDayOfMonth(card.fecha_pago, 'card.fecha_pago');
  const end = requireValidCalendarDate(periodEnd, 'periodEnd');

  const payDateThisMonth = calendarDateForDayOfMonth(payDay, end.year, end.month);
  let year = end.year;
  let month = end.month;
  if (compareCalendarDates(payDateThisMonth, periodEnd) <= 0) {
    const next = shiftMonth(end.year, end.month, 1);
    year = next.year;
    month = next.month;
  }

  // previous_business_day can push a candidate backward far enough to land on or
  // before periodEnd. When that happens the candidate is invalid and the next
  // month must be tried (re-clamped, re-adjusted) until the result clears periodEnd.
  const MAX_MONTH_SHIFTS = 24;
  for (let attempts = 0; attempts < MAX_MONTH_SHIFTS; attempts++) {
    const nominal = calendarDateForDayOfMonth(payDay, year, month);
    const adjusted = applyNonBusinessDayPolicy(nominal, policy);
    if (compareCalendarDates(adjusted, periodEnd) > 0) {
      return adjusted;
    }
    const next = shiftMonth(year, month, 1);
    year = next.year;
    month = next.month;
  }

  throw new Error(
    `predictDueDate could not find a date strictly after periodEnd "${periodEnd}" within ${MAX_MONTH_SHIFTS} month shifts`
  );
}

export function resolveDueDate(input: {
  predicted: CalendarDate;
  statement?: CalendarDate;
  manual?: { date: CalendarDate; note: string };
}): { dueDate: CalendarDate; dueDateSource: DueDateSource } {
  // All provided dates are validated up front, regardless of precedence: an invalid
  // lower-precedence field must not be silently ignored just because a higher-precedence
  // field happens to be valid.
  requireValidCalendarDate(input.predicted, 'predicted');
  if (input.statement !== undefined) {
    requireValidCalendarDate(input.statement, 'statement');
  }
  if (input.manual !== undefined) {
    requireValidCalendarDate(input.manual.date, 'manual.date');
    if (input.manual.note.trim().length === 0) {
      throw new Error('manualOverrideNote must be a non-empty string when dueDateSource is manual');
    }
  }

  if (input.manual) {
    return { dueDate: input.manual.date, dueDateSource: 'manual' };
  }
  if (input.statement) {
    return { dueDate: input.statement, dueDateSource: 'statement' };
  }
  return { dueDate: input.predicted, dueDateSource: 'predicted' };
}

// ===== Cálculos puros de saldo y estado de pago =====

const ADJUSTMENT_SIGN: Record<BillingCycleAdjustmentType, 1 | -1> = {
  interest: 1,
  iva_interest: 1,
  commission: 1,
  rounding_debit: 1,
  manual_debit: 1,
  refund: -1,
  manual_credit: -1,
  rounding_credit: -1,
};

function requirePositiveIntegerAmount(amountCents: number, label: string): void {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(`${label}.amountCents must be a positive integer, received: ${amountCents}`);
  }
}

function requireMatchingCycle(
  cycle: Pick<BillingCycle, 'id' | 'currency'>,
  item: { billingCycleId: string; currency: Currency },
  label: string
): void {
  if (item.currency !== cycle.currency) {
    throw new Error(`${label}.currency ("${item.currency}") does not match cycle currency ("${cycle.currency}")`);
  }
  if (item.billingCycleId !== cycle.id) {
    throw new Error(`${label}.billingCycleId ("${item.billingCycleId}") does not match cycle id ("${cycle.id}")`);
  }
}

export function computeTotalPaidCents(
  cycle: Pick<BillingCycle, 'id' | 'currency'>,
  payments: CardPayment[]
): number {
  let total = 0;
  for (const payment of payments) {
    requirePositiveIntegerAmount(payment.amountCents, 'payment');
    requireMatchingCycle(cycle, payment, 'payment');
    total += payment.amountCents;
  }
  return total;
}

export function computeAdjustmentsNetCents(
  cycle: Pick<BillingCycle, 'id' | 'currency'>,
  adjustments: BillingCycleAdjustment[]
): number {
  let total = 0;
  for (const adjustment of adjustments) {
    requirePositiveIntegerAmount(adjustment.amountCents, 'adjustment');
    requireMatchingCycle(cycle, adjustment, 'adjustment');
    total += ADJUSTMENT_SIGN[adjustment.type] * adjustment.amountCents;
  }
  return total;
}

/**
 * Pure arithmetic only — payments/adjustments must already be validated and summed
 * (via computeTotalPaidCents / computeAdjustmentsNetCents) before calling this.
 */
function derivePendingBalanceCents(
  statementBalanceCents: number | null,
  totalPaidCents: number,
  adjustmentsNetCents: number
): number | null {
  if (statementBalanceCents === null) return null;
  return statementBalanceCents + adjustmentsNetCents - totalPaidCents;
}

export function computePendingBalanceCents(
  cycle: Pick<BillingCycle, 'id' | 'currency' | 'statementBalanceCents'>,
  payments: CardPayment[],
  adjustments: BillingCycleAdjustment[]
): number | null {
  // Payments and adjustments are validated and summed unconditionally, even when
  // statementBalanceCents is null: an unknown statement balance must not let an
  // invalid currency, billingCycleId or amountCents pass silently.
  const totalPaid = computeTotalPaidCents(cycle, payments);
  const adjustmentsNet = computeAdjustmentsNetCents(cycle, adjustments);
  return derivePendingBalanceCents(cycle.statementBalanceCents, totalPaid, adjustmentsNet);
}

export function computePaymentStatus(
  cycle: Pick<BillingCycle, 'id' | 'currency' | 'statementBalanceCents'>,
  payments: CardPayment[],
  adjustments: BillingCycleAdjustment[]
): BillingCyclePaymentStatus | null {
  // totalPaid/adjustmentsNet are computed once here (each validates its own array
  // exactly once) instead of delegating to computePendingBalanceCents, to avoid
  // revalidating the same payments/adjustments a second time.
  const totalPaid = computeTotalPaidCents(cycle, payments);
  const adjustmentsNet = computeAdjustmentsNetCents(cycle, adjustments);
  const pending = derivePendingBalanceCents(cycle.statementBalanceCents, totalPaid, adjustmentsNet);

  if (pending === null) return null;
  if (pending > 0 && totalPaid === 0) return 'unpaid';
  if (pending > 0 && totalPaid > 0) return 'partially_paid';
  if (pending === 0) return 'paid';
  if (pending < 0) return 'overpaid';
  throw new Error('Unreachable payment status branch');
}

export function isOverdue(dueDate: CalendarDate, referenceDate: CalendarDate, pendingBalanceCents: number | null): boolean {
  if (pendingBalanceCents === null || pendingBalanceCents <= 0) return false;
  return compareCalendarDates(referenceDate, dueDate) > 0;
}
