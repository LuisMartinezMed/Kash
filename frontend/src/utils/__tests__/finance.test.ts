import { afterEach, describe, expect, it, jest } from '@jest/globals';

import type { Card, MsiPurchase } from '../../db/types';
import {
  buildPieSegments,
  cashbackForExpense,
  msiCargoForMonth,
  msiCurrentInstallment,
  nextPayDate,
} from '../finance';
import type { DashboardSummary } from '../finance';

function makeMsi(overrides: Partial<MsiPurchase> = {}): MsiPurchase {
  return {
    id: 'msi-1',
    card_id: 'card-1',
    descripcion: 'Compra',
    monto_total: 300,
    meses: 3,
    mes_inicio: '2026-01',
    cargo_mensual: 100,
    activa: 1,
    created_at: '2026-01-01T12:00:00',
    ...overrides,
  };
}

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    apodo: 'Principal',
    banco: 'Banco',
    tipo: 'credito',
    limite: 10000,
    saldo_inicial: 0,
    moneda: 'MXN',
    fecha_corte: 1,
    fecha_pago: 15,
    dias_alerta_previa: 3,
    cashback_percent: 0,
    cashback_pay_day: 1,
    created_at: '2026-01-01T12:00:00',
    ...overrides,
  };
}

afterEach(() => {
  jest.useRealTimers();
});

describe('msiCargoForMonth', () => {
  it('returns the monthly charge throughout the active term', () => {
    const msi = makeMsi();

    expect(msiCargoForMonth(msi, 2026, 1)).toBe(100);
    expect(msiCargoForMonth(msi, 2026, 2)).toBe(100);
    expect(msiCargoForMonth(msi, 2026, 3)).toBe(100);
  });

  it('returns zero outside the active term', () => {
    const msi = makeMsi();

    expect(msiCargoForMonth(msi, 2025, 12)).toBe(0);
    expect(msiCargoForMonth(msi, 2026, 4)).toBe(0);
  });

  it('returns zero for inactive or unparseable purchases', () => {
    expect(msiCargoForMonth(makeMsi({ activa: 0 }), 2026, 1)).toBe(0);
    expect(msiCargoForMonth(makeMsi({ mes_inicio: 'invalid' }), 2026, 1)).toBe(0);
  });
});

describe('msiCurrentInstallment', () => {
  it('returns the first installment during the starting month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));

    expect(msiCurrentInstallment(makeMsi({ mes_inicio: '2026-03', meses: 12 }))).toBe(1);
  });

  it('counts elapsed installments and clamps the result to the term', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));

    expect(msiCurrentInstallment(makeMsi({ mes_inicio: '2026-02', meses: 12 }))).toBe(2);
    expect(msiCurrentInstallment(makeMsi({ mes_inicio: '2025-01', meses: 12 }))).toBe(12);
  });

  it('returns zero before the starting month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));

    expect(msiCurrentInstallment(makeMsi({ mes_inicio: '2026-04', meses: 12 }))).toBe(0);
  });
});

describe('nextPayDate', () => {
  it('returns the upcoming payment day in the current month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));

    expect(nextPayDate(makeCard())).toEqual(new Date(2026, 1, 15, 9, 0, 0));
  });

  it('moves to the following month after the payment day', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 16, 12, 0, 0));

    expect(nextPayDate(makeCard())).toEqual(new Date(2026, 2, 15, 9, 0, 0));
  });

  it('clamps day 31 to the last day of February', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 10, 12, 0, 0));

    expect(nextPayDate(makeCard({ fecha_pago: 31 }))).toEqual(new Date(2026, 1, 28, 9, 0, 0));
  });

  it('uses February 29 in a leap year', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2028, 1, 10, 12, 0, 0));

    expect(nextPayDate(makeCard({ fecha_pago: 31 }))).toEqual(new Date(2028, 1, 29, 9, 0, 0));
  });
});

describe('cashbackForExpense', () => {
  it('calculates and rounds cashback to two decimal places', () => {
    expect(cashbackForExpense(makeCard({ cashback_percent: 2 }), 123.45)).toBe(2.47);
  });

  it('returns zero without an eligible card or amount', () => {
    expect(cashbackForExpense(undefined, 100)).toBe(0);
    expect(cashbackForExpense(makeCard(), 100)).toBe(0);
    expect(cashbackForExpense(makeCard({ cashback_percent: -1 }), 100)).toBe(0);
    expect(cashbackForExpense(makeCard({ cashback_percent: 2 }), 0)).toBe(0);
    expect(cashbackForExpense(makeCard({ cashback_percent: 2 }), Number.NaN)).toBe(0);
  });
});

describe('buildPieSegments', () => {
  function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
    return {
      combinedLimit: 10000,
      availableToday: 1000,
      expensesMonth: 400,
      projectedIncome: 0,
      projectedMsi: 0,
      endOfMonthProjection: 1300,
      msiPendingDebt: 0,
      cashbackMonth: 0,
      ...overrides,
    };
  }

  it('builds a positive projection segment', () => {
    const segments = buildPieSegments(makeSummary());

    expect(segments.map(({ key, value }) => ({ key, value }))).toEqual([
      { key: 'saldo_disponible_hoy', value: 1000 },
      { key: 'proyeccion_positiva', value: 300 },
      { key: 'proyeccion_negativa', value: 0 },
      { key: 'gastos_realizados', value: 400 },
    ]);
  });

  it('builds an absolute negative projection segment', () => {
    const segments = buildPieSegments(makeSummary({ endOfMonthProjection: 700 }));

    expect(segments.find((segment) => segment.key === 'proyeccion_positiva')?.value).toBe(0);
    expect(segments.find((segment) => segment.key === 'proyeccion_negativa')?.value).toBe(300);
  });

  it('never returns negative balance or expense segments', () => {
    const segments = buildPieSegments(
      makeSummary({ availableToday: -100, expensesMonth: -50, endOfMonthProjection: -100 })
    );

    expect(segments.find((segment) => segment.key === 'saldo_disponible_hoy')?.value).toBe(0);
    expect(segments.find((segment) => segment.key === 'gastos_realizados')?.value).toBe(0);
  });
});
