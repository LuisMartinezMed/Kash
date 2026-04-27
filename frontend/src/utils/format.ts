import { Currency } from '../db/types';

const LOCALE_MAP: Record<Currency, string> = {
  MXN: 'es-MX',
  USD: 'en-US',
  EUR: 'es-ES',
};

export function formatCurrency(amount: number, currency: Currency = 'MXN'): string {
  try {
    return new Intl.NumberFormat(LOCALE_MAP[currency] || 'es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function monthLabel(date: Date = new Date()): string {
  return `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
}

export function shortDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function currentMonthYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
