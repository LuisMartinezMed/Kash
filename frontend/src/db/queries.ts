import { getDb } from './database';
import { Card, MsiPurchase, Income, Category, Expense, PaymentCycle, Currency, CardType, Frequency } from './types';

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

// ===== CARDS =====
export async function listCards(): Promise<Card[]> {
  const db = await getDb();
  return await db.getAllAsync<Card>('SELECT * FROM cards ORDER BY created_at DESC');
}

export async function getCard(id: string): Promise<Card | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<Card>('SELECT * FROM cards WHERE id = ?', [id]);
  return r || null;
}

export async function createCard(input: Omit<Card, 'id' | 'created_at'>): Promise<Card> {
  const db = await getDb();
  const id = uid();
  await db.runAsync(
    `INSERT INTO cards (id, apodo, banco, tipo, limite, saldo_inicial, moneda, fecha_corte, fecha_pago, dias_alerta_previa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.apodo, input.banco, input.tipo, input.limite, input.saldo_inicial, input.moneda, input.fecha_corte, input.fecha_pago, input.dias_alerta_previa]
  );
  return (await getCard(id))!;
}

export async function updateCard(id: string, input: Partial<Omit<Card, 'id' | 'created_at'>>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(input)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (!fields.length) return;
  values.push(id);
  await db.runAsync(`UPDATE cards SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
}

// ===== MSI =====
export async function listMsi(): Promise<MsiPurchase[]> {
  const db = await getDb();
  return await db.getAllAsync<MsiPurchase>('SELECT * FROM msi_purchases ORDER BY created_at DESC');
}

export async function listMsiByCard(card_id: string): Promise<MsiPurchase[]> {
  const db = await getDb();
  return await db.getAllAsync<MsiPurchase>('SELECT * FROM msi_purchases WHERE card_id = ? ORDER BY created_at DESC', [card_id]);
}

export async function createMsi(input: { card_id: string; descripcion: string; monto_total: number; meses: number; mes_inicio: string }): Promise<MsiPurchase> {
  const db = await getDb();
  const id = uid();
  const cargo_mensual = +(input.monto_total / input.meses).toFixed(2);
  await db.runAsync(
    `INSERT INTO msi_purchases (id, card_id, descripcion, monto_total, meses, mes_inicio, cargo_mensual, activa)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, input.card_id, input.descripcion, input.monto_total, input.meses, input.mes_inicio, cargo_mensual]
  );
  const r = await db.getFirstAsync<MsiPurchase>('SELECT * FROM msi_purchases WHERE id = ?', [id]);
  return r!;
}

export async function deleteMsi(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM msi_purchases WHERE id = ?', [id]);
}

export async function setMsiActive(id: string, activa: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE msi_purchases SET activa = ? WHERE id = ?', [activa ? 1 : 0, id]);
}

// ===== INCOMES =====
export async function listIncomes(): Promise<Income[]> {
  const db = await getDb();
  return await db.getAllAsync<Income>('SELECT * FROM incomes ORDER BY created_at DESC');
}

export async function createIncome(input: Omit<Income, 'id' | 'created_at'>): Promise<Income> {
  const db = await getDb();
  const id = uid();
  await db.runAsync(
    `INSERT INTO incomes (id, nombre, monto, fecha_pago, frecuencia, moneda) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.nombre, input.monto, input.fecha_pago, input.frecuencia, input.moneda]
  );
  const r = await db.getFirstAsync<Income>('SELECT * FROM incomes WHERE id = ?', [id]);
  return r!;
}

export async function deleteIncome(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM incomes WHERE id = ?', [id]);
}

// ===== CATEGORIES =====
export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  return await db.getAllAsync<Category>('SELECT * FROM categories ORDER BY predefinida DESC, nombre ASC');
}

export async function createCategory(input: { nombre: string; icono: string; color: string }): Promise<Category> {
  const db = await getDb();
  const id = uid();
  await db.runAsync(
    `INSERT INTO categories (id, nombre, icono, color, predefinida) VALUES (?, ?, ?, ?, 0)`,
    [id, input.nombre, input.icono, input.color]
  );
  const r = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', [id]);
  return r!;
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ? AND predefinida = 0', [id]);
}

// ===== EXPENSES =====
export async function listExpenses(limit?: number): Promise<Expense[]> {
  const db = await getDb();
  const sql = `SELECT * FROM expenses ORDER BY fecha DESC, created_at DESC ${limit ? `LIMIT ${limit}` : ''}`;
  return await db.getAllAsync<Expense>(sql);
}

export async function listExpensesInMonth(year: number, month: number): Promise<Expense[]> {
  const db = await getDb();
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const end = `${year}-${m}-31`;
  return await db.getAllAsync<Expense>(
    'SELECT * FROM expenses WHERE fecha >= ? AND fecha <= ? ORDER BY fecha DESC',
    [start, end]
  );
}

export async function createExpense(input: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
  const db = await getDb();
  const id = uid();
  await db.runAsync(
    `INSERT INTO expenses (id, card_id, categoria_id, monto, moneda, descripcion, fecha)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.card_id, input.categoria_id, input.monto, input.moneda, input.descripcion ?? null, input.fecha]
  );
  const r = await db.getFirstAsync<Expense>('SELECT * FROM expenses WHERE id = ?', [id]);
  return r!;
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ===== PAYMENT CYCLES =====
export async function getCycle(card_id: string, ciclo_key: string): Promise<PaymentCycle | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<PaymentCycle>(
    'SELECT * FROM payment_cycles WHERE card_id = ? AND ciclo_key = ?',
    [card_id, ciclo_key]
  );
  return r || null;
}

export async function upsertCycle(card_id: string, ciclo_key: string, pago_realizado: boolean, notification_ids?: string[]): Promise<void> {
  const db = await getDb();
  const existing = await getCycle(card_id, ciclo_key);
  const ids = notification_ids ? JSON.stringify(notification_ids) : existing?.notification_ids ?? null;
  if (existing) {
    await db.runAsync(
      'UPDATE payment_cycles SET pago_realizado = ?, notification_ids = ? WHERE id = ?',
      [pago_realizado ? 1 : 0, ids, existing.id]
    );
  } else {
    await db.runAsync(
      'INSERT INTO payment_cycles (id, card_id, ciclo_key, pago_realizado, notification_ids) VALUES (?, ?, ?, ?, ?)',
      [uid(), card_id, ciclo_key, pago_realizado ? 1 : 0, ids]
    );
  }
}

export async function listCycles(): Promise<PaymentCycle[]> {
  const db = await getDb();
  return await db.getAllAsync<PaymentCycle>('SELECT * FROM payment_cycles');
}

export type { Card, MsiPurchase, Income, Category, Expense, PaymentCycle, Currency, CardType, Frequency };
