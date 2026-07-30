import { describe, expect, it } from '@jest/globals';

import type { BillingCycle, BillingCycleAdjustment, BillingCycleAdjustmentType, CardPayment } from '../billingCycle';
import {
  addDaysToCalendarDate,
  applyNonBusinessDayPolicy,
  compareCalendarDates,
  computeAdjustmentsNetCents,
  computePaymentStatus,
  computePendingBalanceCents,
  computeTotalPaidCents,
  deriveBillingPeriod,
  isOverdue,
  isValidCalendarDate,
  predictDueDate,
  resolveDueDate,
} from '../billingCycle';

function makeCycle(overrides: Partial<BillingCycle> = {}): Pick<BillingCycle, 'id' | 'currency' | 'statementBalanceCents'> {
  return {
    id: 'cycle-1',
    currency: 'MXN',
    statementBalanceCents: 100000,
    ...overrides,
  };
}

function makePayment(overrides: Partial<CardPayment> = {}): CardPayment {
  return {
    id: 'payment-1',
    cardId: 'card-1',
    billingCycleId: 'cycle-1',
    amountCents: 1000,
    currency: 'MXN',
    paidAt: '2026-02-01',
    createdAt: '2026-02-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeAdjustment(overrides: Partial<BillingCycleAdjustment> = {}): BillingCycleAdjustment {
  return {
    id: 'adjustment-1',
    billingCycleId: 'cycle-1',
    type: 'interest',
    amountCents: 100,
    currency: 'MXN',
    appliedAt: '2026-02-01',
    note: null,
    createdAt: '2026-02-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('isValidCalendarDate', () => {
  it('accepts valid calendar dates', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true);
    expect(isValidCalendarDate('2026-01-01')).toBe(true);
    expect(isValidCalendarDate('2026-12-31')).toBe(true);
  });

  it('accepts February 29 only in leap years', () => {
    expect(isValidCalendarDate('2024-02-29')).toBe(true); // 2024 is a leap year
    expect(isValidCalendarDate('2023-02-29')).toBe(false); // 2023 is not
    expect(isValidCalendarDate('2000-02-29')).toBe(true); // divisible by 400
    expect(isValidCalendarDate('1900-02-29')).toBe(false); // divisible by 100, not 400
  });

  it('rejects malformed strings', () => {
    expect(isValidCalendarDate('2026-2-5')).toBe(false);
    expect(isValidCalendarDate('2026/02/05')).toBe(false);
    expect(isValidCalendarDate('not-a-date')).toBe(false);
    expect(isValidCalendarDate('')).toBe(false);
  });

  it('rejects out-of-range months and days', () => {
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('2026-00-01')).toBe(false);
    expect(isValidCalendarDate('2026-04-31')).toBe(false); // April has 30 days
    expect(isValidCalendarDate('2026-01-32')).toBe(false);
  });

  describe('regression: additional CalendarDate edge cases', () => {
    it('rejects day 00', () => {
      expect(isValidCalendarDate('2026-01-00')).toBe(false);
    });

    it('rejects February 30 in any year', () => {
      expect(isValidCalendarDate('2026-02-30')).toBe(false);
      expect(isValidCalendarDate('2024-02-30')).toBe(false); // leap year, still invalid
    });

    it('rejects a partial date', () => {
      expect(isValidCalendarDate('2026-02')).toBe(false);
      expect(isValidCalendarDate('2026-02-1')).toBe(false); // day not zero-padded
      expect(isValidCalendarDate('2026-2-01')).toBe(false); // month not zero-padded
    });

    it('distinguishes leap years from non-leap years for February 29', () => {
      expect(isValidCalendarDate('2028-02-29')).toBe(true); // leap
      expect(isValidCalendarDate('2027-02-29')).toBe(false); // not a leap year
      expect(isValidCalendarDate('2027-02-28')).toBe(true); // last valid day in a non-leap February
    });
  });
});

describe('compareCalendarDates', () => {
  it('compares dates correctly', () => {
    expect(compareCalendarDates('2026-01-01', '2026-01-02')).toBe(-1);
    expect(compareCalendarDates('2026-01-02', '2026-01-01')).toBe(1);
    expect(compareCalendarDates('2026-01-01', '2026-01-01')).toBe(0);
  });

  it('compares across month and year boundaries', () => {
    expect(compareCalendarDates('2026-01-31', '2026-02-01')).toBe(-1);
    expect(compareCalendarDates('2026-12-31', '2027-01-01')).toBe(-1);
  });

  it('throws for invalid input', () => {
    expect(() => compareCalendarDates('invalid', '2026-01-01')).toThrow();
  });
});

describe('addDaysToCalendarDate', () => {
  it('adds days within a month', () => {
    expect(addDaysToCalendarDate('2026-01-01', 1)).toBe('2026-01-02');
    expect(addDaysToCalendarDate('2026-01-10', 5)).toBe('2026-01-15');
  });

  it('crosses a non-leap month boundary correctly', () => {
    expect(addDaysToCalendarDate('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('crosses a leap-year February boundary correctly', () => {
    expect(addDaysToCalendarDate('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDaysToCalendarDate('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('crosses a year boundary with negative days', () => {
    expect(addDaysToCalendarDate('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('throws for non-integer day counts', () => {
    expect(() => addDaysToCalendarDate('2026-01-01', 1.5)).toThrow();
  });
});

describe('deriveBillingPeriod', () => {
  it('derives the cycle containing a reference date before the close day', () => {
    const result = deriveBillingPeriod({ fecha_corte: 15 }, '2026-02-10');
    expect(result).toEqual({
      periodStart: '2026-01-16',
      periodEnd: '2026-02-15',
      statementCloseDate: '2026-02-15',
    });
  });

  it('treats the close day itself as part of the ending cycle (inclusive)', () => {
    const result = deriveBillingPeriod({ fecha_corte: 15 }, '2026-02-15');
    expect(result.periodEnd).toBe('2026-02-15');
    expect(result.periodStart).toBe('2026-01-16');
  });

  it('derives the next cycle when the reference date is after the close day', () => {
    const result = deriveBillingPeriod({ fecha_corte: 15 }, '2026-02-20');
    expect(result).toEqual({
      periodStart: '2026-02-16',
      periodEnd: '2026-03-15',
      statementCloseDate: '2026-03-15',
    });
  });

  it('clamps a close day of 31 to the last day of a short month', () => {
    const result = deriveBillingPeriod({ fecha_corte: 31 }, '2026-02-10');
    expect(result).toEqual({
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      statementCloseDate: '2026-02-28',
    });
  });

  it('clamps a close day of 31 to February 29 in a leap year', () => {
    const result = deriveBillingPeriod({ fecha_corte: 31 }, '2028-02-10');
    expect(result).toEqual({
      periodStart: '2028-02-01',
      periodEnd: '2028-02-29',
      statementCloseDate: '2028-02-29',
    });
  });

  describe('regression: consecutive cycles with fecha_corte=31 have no gaps or overlaps', () => {
    it('chains February (clamped to 28) into March (unclamped, 31 days) without a gap', () => {
      const card = { fecha_corte: 31 };
      const cycle1 = deriveBillingPeriod(card, '2026-02-10');
      const cycle2 = deriveBillingPeriod(card, addDaysToCalendarDate(cycle1.periodEnd, 1));

      expect(cycle1).toEqual({
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        statementCloseDate: '2026-02-28',
      });
      expect(cycle2).toEqual({
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        statementCloseDate: '2026-03-31',
      });
      // No gap: the next cycle starts exactly one day after the previous one ends.
      expect(cycle2.periodStart).toBe(addDaysToCalendarDate(cycle1.periodEnd, 1));
      // No overlap: the previous cycle's end is strictly before the next cycle's start.
      expect(compareCalendarDates(cycle1.periodEnd, cycle2.periodStart)).toBe(-1);
    });

    it('chains March (31 days) into a leap February (clamped to 29) without a gap', () => {
      const card = { fecha_corte: 31 };
      const cycle1 = deriveBillingPeriod(card, '2028-02-10');
      const cycle2 = deriveBillingPeriod(card, addDaysToCalendarDate(cycle1.periodEnd, 1));

      expect(cycle1.periodEnd).toBe('2028-02-29');
      expect(cycle2.periodStart).toBe('2028-03-01');
      expect(cycle2.periodStart).toBe(addDaysToCalendarDate(cycle1.periodEnd, 1));
      expect(compareCalendarDates(cycle1.periodEnd, cycle2.periodStart)).toBe(-1);
    });
  });

  it('rejects an out-of-range fecha_corte', () => {
    expect(() => deriveBillingPeriod({ fecha_corte: 0 }, '2026-02-10')).toThrow();
    expect(() => deriveBillingPeriod({ fecha_corte: 32 }, '2026-02-10')).toThrow();
  });

  it('rejects an invalid referenceDate', () => {
    expect(() => deriveBillingPeriod({ fecha_corte: 15 }, '2026-13-01')).toThrow();
  });
});

describe('predictDueDate', () => {
  it('selects the pay day strictly after periodEnd within the same month', () => {
    // 2026-01-15 (payDateThisMonth) is after periodEnd 2026-01-10
    const result = predictDueDate({ fecha_pago: 15 }, '2026-01-10', 'none');
    expect(result).toBe('2026-01-15');
  });

  it('moves to the next month when the pay day is not strictly after periodEnd', () => {
    // payDateThisMonth (2026-01-15) equals periodEnd (2026-01-15) -> not strictly after -> next month
    const result = predictDueDate({ fecha_pago: 15 }, '2026-01-15', 'none');
    expect(result).toBe('2026-02-15');
  });

  it('moves to the next month when the pay day falls before periodEnd', () => {
    const result = predictDueDate({ fecha_pago: 15 }, '2026-01-20', 'none');
    expect(result).toBe('2026-02-15');
  });

  it('clamps the pay day to the end of a short month', () => {
    // fecha_pago=31 clamped to Feb 28 (2026 is not a leap year); Feb 28 > periodEnd (Feb 10), so no month shift.
    const result = predictDueDate({ fecha_pago: 31 }, '2026-02-10', 'none');
    expect(result).toBe('2026-02-28');
  });

  it('applies the weekend policy only to the predicted date', () => {
    // 2026-02-15 is a Sunday; predicted lands there, then gets pushed to Monday
    const result = predictDueDate({ fecha_pago: 15 }, '2026-01-20', 'next_business_day');
    expect(result).toBe('2026-02-16');
  });

  describe('regression: the adjusted date must always clear periodEnd', () => {
    // 2026-02-14 is a Saturday and 2026-02-15 is a Sunday (verified independently
    // via Zeller's congruence). Feb 2026 has exactly 28 days (4 weeks), so the same
    // weekday pattern repeats in March on the same day-of-month.

    it('rejects an adjusted candidate that lands exactly on periodEnd (reported bug)', () => {
      // Nominal 2026-02-14 (Sat) adjusts back to 2026-02-13, which equals periodEnd —
      // must be rejected and the next month's candidate (also Sat) must be used instead.
      const result = predictDueDate({ fecha_pago: 14 }, '2026-02-13', 'previous_business_day');
      expect(result).toBe('2026-03-13');
      expect(compareCalendarDates(result, '2026-02-13')).toBe(1);
    });

    it('rejects an adjusted candidate that lands strictly before periodEnd', () => {
      // Nominal 2026-02-15 (Sun) adjusts back 2 days to 2026-02-13, which is BEFORE
      // periodEnd (2026-02-14) — must be rejected, not just the equality case.
      const result = predictDueDate({ fecha_pago: 15 }, '2026-02-14', 'previous_business_day');
      expect(result).toBe('2026-03-13');
      expect(compareCalendarDates(result, '2026-02-14')).toBe(1);
    });

    it('handles previous_business_day near the cutoff for a Saturday nominal', () => {
      const result = predictDueDate({ fecha_pago: 14 }, '2026-02-13', 'previous_business_day');
      expect(result).toBe('2026-03-13');
    });

    it('handles previous_business_day near the cutoff for a Sunday nominal', () => {
      const result = predictDueDate({ fecha_pago: 15 }, '2026-02-14', 'previous_business_day');
      expect(result).toBe('2026-03-13');
    });

    it('combines end-of-month clamping with a policy that forces a month shift', () => {
      // fecha_pago=31 clamps to 2026-02-28 (a Saturday). previous_business_day sends it
      // back to 2026-02-27, which equals periodEnd — must roll to March, where day 31
      // exists unclamped (2026-03-31, a Tuesday, needs no further adjustment).
      const result = predictDueDate({ fecha_pago: 31 }, '2026-02-27', 'previous_business_day');
      expect(result).toBe('2026-03-31');
      expect(compareCalendarDates(result, '2026-02-27')).toBe(1);
    });
  });
});

describe('applyNonBusinessDayPolicy', () => {
  // Verified independently via Zeller's congruence: 2026-02-14 is a Saturday, 2026-02-15 is a Sunday.
  it('does not adjust weekdays', () => {
    expect(applyNonBusinessDayPolicy('2026-02-16', 'next_business_day')).toBe('2026-02-16');
    expect(applyNonBusinessDayPolicy('2026-02-16', 'previous_business_day')).toBe('2026-02-16');
  });

  it('never adjusts under policy none', () => {
    expect(applyNonBusinessDayPolicy('2026-02-14', 'none')).toBe('2026-02-14');
    expect(applyNonBusinessDayPolicy('2026-02-15', 'none')).toBe('2026-02-15');
  });

  it('moves a Saturday under next_business_day to Monday', () => {
    expect(applyNonBusinessDayPolicy('2026-02-14', 'next_business_day')).toBe('2026-02-16');
  });

  it('moves a Saturday under previous_business_day to Friday', () => {
    expect(applyNonBusinessDayPolicy('2026-02-14', 'previous_business_day')).toBe('2026-02-13');
  });

  it('moves a Sunday under next_business_day to Monday', () => {
    expect(applyNonBusinessDayPolicy('2026-02-15', 'next_business_day')).toBe('2026-02-16');
  });

  it('moves a Sunday under previous_business_day to Friday', () => {
    expect(applyNonBusinessDayPolicy('2026-02-15', 'previous_business_day')).toBe('2026-02-13');
  });
});

describe('resolveDueDate', () => {
  it('falls back to predicted when nothing else is provided', () => {
    expect(resolveDueDate({ predicted: '2026-02-15' })).toEqual({
      dueDate: '2026-02-15',
      dueDateSource: 'predicted',
    });
  });

  it('prefers statement over predicted', () => {
    expect(resolveDueDate({ predicted: '2026-02-15', statement: '2026-02-16' })).toEqual({
      dueDate: '2026-02-16',
      dueDateSource: 'statement',
    });
  });

  it('prefers manual over statement and predicted', () => {
    expect(
      resolveDueDate({
        predicted: '2026-02-15',
        statement: '2026-02-16',
        manual: { date: '2026-02-20', note: 'Confirmado por el usuario' },
      })
    ).toEqual({ dueDate: '2026-02-20', dueDateSource: 'manual' });
  });

  it('throws when manual is provided with an empty note', () => {
    expect(() => resolveDueDate({ predicted: '2026-02-15', manual: { date: '2026-02-20', note: '' } })).toThrow();
    expect(() => resolveDueDate({ predicted: '2026-02-15', manual: { date: '2026-02-20', note: '   ' } })).toThrow();
  });

  describe('regression: every provided date is validated before precedence is applied', () => {
    it('throws when predicted is invalid even though manual is valid', () => {
      expect(() =>
        resolveDueDate({ predicted: 'not-a-date', manual: { date: '2026-02-20', note: 'ok' } })
      ).toThrow();
    });

    it('throws when predicted is invalid even though statement is valid', () => {
      expect(() => resolveDueDate({ predicted: 'not-a-date', statement: '2026-02-16' })).toThrow();
    });

    it('throws when statement is invalid even though manual is valid', () => {
      expect(() =>
        resolveDueDate({
          predicted: '2026-02-15',
          statement: 'not-a-date',
          manual: { date: '2026-02-20', note: 'ok' },
        })
      ).toThrow();
    });

    it('throws when manual.date is invalid', () => {
      expect(() =>
        resolveDueDate({ predicted: '2026-02-15', manual: { date: 'not-a-date', note: 'ok' } })
      ).toThrow();
    });

    it('still resolves with correct precedence once all provided dates are valid', () => {
      expect(
        resolveDueDate({ predicted: '2026-02-15', statement: '2026-02-16', manual: { date: '2026-02-20', note: 'ok' } })
      ).toEqual({ dueDate: '2026-02-20', dueDateSource: 'manual' });
      expect(resolveDueDate({ predicted: '2026-02-15', statement: '2026-02-16' })).toEqual({
        dueDate: '2026-02-16',
        dueDateSource: 'statement',
      });
      expect(resolveDueDate({ predicted: '2026-02-15' })).toEqual({
        dueDate: '2026-02-15',
        dueDateSource: 'predicted',
      });
    });
  });
});

describe('computeAdjustmentsNetCents', () => {
  const cycle = makeCycle();

  const cases: [BillingCycleAdjustmentType, 1 | -1][] = [
    ['interest', 1],
    ['iva_interest', 1],
    ['commission', 1],
    ['rounding_debit', 1],
    ['manual_debit', 1],
    ['refund', -1],
    ['manual_credit', -1],
    ['rounding_credit', -1],
  ];

  it.each(cases)('applies the correct sign for adjustment type %s', (type, sign) => {
    const net = computeAdjustmentsNetCents(cycle, [makeAdjustment({ type, amountCents: 250 })]);
    expect(net).toBe(sign * 250);
  });

  it('sums multiple adjustments with mixed signs', () => {
    const net = computeAdjustmentsNetCents(cycle, [
      makeAdjustment({ type: 'interest', amountCents: 100 }),
      makeAdjustment({ type: 'refund', amountCents: 30 }),
    ]);
    expect(net).toBe(70);
  });
});

describe('computeTotalPaidCents / computeAdjustmentsNetCents validation', () => {
  const cycle = makeCycle();

  it('rejects a non-positive-integer amountCents (zero, negative, decimal, NaN, Infinity)', () => {
    for (const amountCents of [0, -50, 10.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => computeTotalPaidCents(cycle, [makePayment({ amountCents })])).toThrow();
      expect(() => computeAdjustmentsNetCents(cycle, [makeAdjustment({ amountCents })])).toThrow();
    }
  });

  it('rejects a currency mismatch', () => {
    expect(() => computeTotalPaidCents(cycle, [makePayment({ currency: 'USD' })])).toThrow();
    expect(() => computeAdjustmentsNetCents(cycle, [makeAdjustment({ currency: 'USD' })])).toThrow();
  });

  it('rejects a billingCycleId mismatch', () => {
    expect(() => computeTotalPaidCents(cycle, [makePayment({ billingCycleId: 'other-cycle' })])).toThrow();
    expect(() => computeAdjustmentsNetCents(cycle, [makeAdjustment({ billingCycleId: 'other-cycle' })])).toThrow();
  });
});

describe('computePendingBalanceCents', () => {
  it('returns null when statementBalanceCents is null', () => {
    const cycle = makeCycle({ statementBalanceCents: null });
    expect(computePendingBalanceCents(cycle, [], [])).toBeNull();
  });

  it('returns the statement balance untouched with no payments or adjustments', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    expect(computePendingBalanceCents(cycle, [], [])).toBe(1000);
  });

  it('subtracts partial payments', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const payments = [makePayment({ amountCents: 400 })];
    expect(computePendingBalanceCents(cycle, payments, [])).toBe(600);
  });

  it('reaches exactly zero for an exact payment', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const payments = [makePayment({ amountCents: 1000 })];
    expect(computePendingBalanceCents(cycle, payments, [])).toBe(0);
  });

  it('goes negative for an overpayment, without clamping to zero', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const payments = [makePayment({ amountCents: 1500 })];
    expect(computePendingBalanceCents(cycle, payments, [])).toBe(-500);
  });

  it('applies adjustments net of sign', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const adjustments = [makeAdjustment({ type: 'interest', amountCents: 100 }), makeAdjustment({ type: 'refund', amountCents: 200 })];
    expect(computePendingBalanceCents(cycle, [], adjustments)).toBe(900);
  });

  describe('regression: unknown statement balance must not bypass validation', () => {
    const nullCycle = makeCycle({ statementBalanceCents: null });

    it('still throws on a payment with the wrong currency', () => {
      expect(() => computePendingBalanceCents(nullCycle, [makePayment({ currency: 'USD' })], [])).toThrow();
    });

    it('still throws on a payment with the wrong billingCycleId', () => {
      expect(() => computePendingBalanceCents(nullCycle, [makePayment({ billingCycleId: 'other-cycle' })], [])).toThrow();
    });

    it('still throws on an adjustment with the wrong currency', () => {
      expect(() => computePendingBalanceCents(nullCycle, [], [makeAdjustment({ currency: 'USD' })])).toThrow();
    });

    it('still throws on an adjustment with the wrong billingCycleId', () => {
      expect(() =>
        computePendingBalanceCents(nullCycle, [], [makeAdjustment({ billingCycleId: 'other-cycle' })])
      ).toThrow();
    });

    it('still throws on an invalid amountCents in either payments or adjustments', () => {
      expect(() => computePendingBalanceCents(nullCycle, [makePayment({ amountCents: -1 })], [])).toThrow();
      expect(() => computePendingBalanceCents(nullCycle, [], [makeAdjustment({ amountCents: Number.NaN })])).toThrow();
    });

    it('returns null only once valid payments and adjustments have been accounted for', () => {
      const payments = [makePayment({ amountCents: 500 })];
      const adjustments = [makeAdjustment({ type: 'interest', amountCents: 100 })];
      expect(computePendingBalanceCents(nullCycle, payments, adjustments)).toBeNull();
    });
  });
});

describe('computePaymentStatus', () => {
  it('returns null when the statement balance is unknown', () => {
    const cycle = makeCycle({ statementBalanceCents: null });
    expect(computePaymentStatus(cycle, [], [])).toBeNull();
  });

  it('returns unpaid when there is a positive balance and no payments', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    expect(computePaymentStatus(cycle, [], [])).toBe('unpaid');
  });

  it('returns partially_paid when a partial payment leaves a positive balance', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const payments = [makePayment({ amountCents: 400 })];
    expect(computePaymentStatus(cycle, payments, [])).toBe('partially_paid');
  });

  it('returns paid when the balance reaches exactly zero', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const payments = [makePayment({ amountCents: 1000 })];
    expect(computePaymentStatus(cycle, payments, [])).toBe('paid');
  });

  it('returns overpaid when payments exceed the balance', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    const payments = [makePayment({ amountCents: 1500 })];
    expect(computePaymentStatus(cycle, payments, [])).toBe('overpaid');
  });

  it('reuses payment/adjustment validation (currency mismatch)', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    expect(() => computePaymentStatus(cycle, [makePayment({ currency: 'USD' })], [])).toThrow();
  });

  it('reuses payment/adjustment validation (billingCycleId mismatch)', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    expect(() => computePaymentStatus(cycle, [], [makeAdjustment({ billingCycleId: 'other-cycle' })])).toThrow();
  });

  it('reuses payment/adjustment validation (non-positive-integer amountCents)', () => {
    const cycle = makeCycle({ statementBalanceCents: 1000 });
    expect(() => computePaymentStatus(cycle, [makePayment({ amountCents: -1 })], [])).toThrow();
  });

  describe('regression: unknown statement balance must not bypass validation', () => {
    const nullCycle = makeCycle({ statementBalanceCents: null });

    it('still throws on a payment with the wrong currency', () => {
      expect(() => computePaymentStatus(nullCycle, [makePayment({ currency: 'USD' })], [])).toThrow();
    });

    it('still throws on a payment with the wrong billingCycleId', () => {
      expect(() => computePaymentStatus(nullCycle, [makePayment({ billingCycleId: 'other-cycle' })], [])).toThrow();
    });

    it('still throws on an adjustment with the wrong currency', () => {
      expect(() => computePaymentStatus(nullCycle, [], [makeAdjustment({ currency: 'USD' })])).toThrow();
    });

    it('still throws on an adjustment with the wrong billingCycleId', () => {
      expect(() => computePaymentStatus(nullCycle, [], [makeAdjustment({ billingCycleId: 'other-cycle' })])).toThrow();
    });

    it('still throws on an invalid amountCents in either payments or adjustments', () => {
      expect(() => computePaymentStatus(nullCycle, [makePayment({ amountCents: 0 })], [])).toThrow();
      expect(() =>
        computePaymentStatus(nullCycle, [], [makeAdjustment({ amountCents: Number.POSITIVE_INFINITY })])
      ).toThrow();
    });

    it('returns null only once valid payments and adjustments have been accounted for', () => {
      const payments = [makePayment({ amountCents: 500 })];
      const adjustments = [makeAdjustment({ type: 'refund', amountCents: 100 })];
      expect(computePaymentStatus(nullCycle, payments, adjustments)).toBeNull();
    });
  });
});

describe('isOverdue', () => {
  it('is false when the pending balance is null', () => {
    expect(isOverdue('2026-02-15', '2026-03-01', null)).toBe(false);
  });

  it('is false when the pending balance is zero or negative', () => {
    expect(isOverdue('2026-02-15', '2026-03-01', 0)).toBe(false);
    expect(isOverdue('2026-02-15', '2026-03-01', -100)).toBe(false);
  });

  it('is false before the due date', () => {
    expect(isOverdue('2026-02-15', '2026-02-10', 500)).toBe(false);
  });

  it('is false on the due date itself', () => {
    expect(isOverdue('2026-02-15', '2026-02-15', 500)).toBe(false);
  });

  it('is true strictly after the due date with a positive pending balance', () => {
    expect(isOverdue('2026-02-15', '2026-02-16', 500)).toBe(true);
  });
});
