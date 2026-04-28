export type Currency = 'MXN' | 'USD' | 'EUR';
export type CardType = 'credito' | 'debito';
export type Frequency = 'diario' | 'semanal' | 'quincenal' | 'mensual';

export interface Card {
  id: string;
  apodo: string;
  banco: string;
  tipo: CardType;
  limite: number;
  saldo_inicial: number;
  moneda: Currency;
  fecha_corte: number;
  fecha_pago: number;
  dias_alerta_previa: number;
  cashback_percent: number;
  cashback_pay_day: number;
  created_at: string;
}

export interface MsiPurchase {
  id: string;
  card_id: string;
  descripcion: string;
  monto_total: number;
  meses: number;
  mes_inicio: string; // YYYY-MM
  cargo_mensual: number;
  activa: number;
  created_at: string;
}

export interface Income {
  id: string;
  nombre: string;
  monto: number;
  fecha_pago: string; // YYYY-MM-DD
  frecuencia: Frequency;
  moneda: Currency;
  created_at: string;
}

export interface Category {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  predefinida: number;
}

export interface Expense {
  id: string;
  card_id: string | null;
  categoria_id: string | null;
  monto: number;
  moneda: Currency;
  descripcion: string | null;
  fecha: string;
  created_at: string;
}

export interface PaymentCycle {
  id: string;
  card_id: string;
  ciclo_key: string;
  pago_realizado: number;
  notification_ids: string | null;
}
