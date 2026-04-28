import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY NOT NULL,
    apodo TEXT NOT NULL,
    banco TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'credito',
    limite REAL NOT NULL DEFAULT 0,
    saldo_inicial REAL NOT NULL DEFAULT 0,
    moneda TEXT NOT NULL DEFAULT 'MXN',
    fecha_corte INTEGER NOT NULL DEFAULT 1,
    fecha_pago INTEGER NOT NULL DEFAULT 15,
    dias_alerta_previa INTEGER NOT NULL DEFAULT 3,
    cashback_percent REAL NOT NULL DEFAULT 0,
    cashback_pay_day INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS msi_purchases (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    monto_total REAL NOT NULL,
    meses INTEGER NOT NULL,
    mes_inicio TEXT NOT NULL,
    cargo_mensual REAL NOT NULL,
    activa INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    monto REAL NOT NULL,
    fecha_pago TEXT NOT NULL,
    frecuencia TEXT NOT NULL DEFAULT 'mensual',
    moneda TEXT NOT NULL DEFAULT 'MXN',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL UNIQUE,
    icono TEXT NOT NULL,
    color TEXT NOT NULL,
    predefinida INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT,
    categoria_id TEXT,
    monto REAL NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'MXN',
    descripcion TEXT,
    fecha TEXT NOT NULL DEFAULT (date('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE SET NULL,
    FOREIGN KEY (categoria_id) REFERENCES categories(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payment_cycles (
    id TEXT PRIMARY KEY NOT NULL,
    card_id TEXT NOT NULL,
    ciclo_key TEXT NOT NULL,
    pago_realizado INTEGER NOT NULL DEFAULT 0,
    notification_ids TEXT,
    UNIQUE(card_id, ciclo_key),
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
  )`,
];

const DEFAULT_CATEGORIES = [
  { nombre: 'Comida', icono: 'restaurant-outline', color: '#F59E0B' },
  { nombre: 'Servicios', icono: 'flash-outline', color: '#3B82F6' },
  { nombre: 'Amazon/E-commerce', icono: 'bag-outline', color: '#22C55E' },
  { nombre: 'Transporte', icono: 'car-outline', color: '#A855F7' },
  { nombre: 'Entretenimiento', icono: 'film-outline', color: '#EC4899' },
  { nombre: 'Salud', icono: 'medkit-outline', color: '#EF4444' },
];

async function initSchema(database: SQLite.SQLiteDatabase) {
  if (Platform.OS !== 'web') {
    try { await database.execAsync('PRAGMA journal_mode = WAL'); } catch {}
  }
  try { await database.execAsync('PRAGMA foreign_keys = ON'); } catch {}
  for (const sql of SCHEMA_STATEMENTS) {
    await database.execAsync(sql);
  }
  // Migrations for existing databases (idempotent via try/catch)
  for (const alter of [
    'ALTER TABLE cards ADD COLUMN cashback_percent REAL NOT NULL DEFAULT 0',
    'ALTER TABLE cards ADD COLUMN cashback_pay_day INTEGER NOT NULL DEFAULT 1',
  ]) {
    try { await database.execAsync(alter); } catch {}
  }
}

async function seedDefaultCategories(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories WHERE predefinida = 1'
  );
  if (row && row.count > 0) return;
  for (const c of DEFAULT_CATEGORIES) {
    const id = `cat_${c.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    await database.runAsync(
      'INSERT OR IGNORE INTO categories (id, nombre, icono, color, predefinida) VALUES (?, ?, ?, ?, 1)',
      [id, c.nombre, c.icono, c.color]
    );
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const opened = await SQLite.openDatabaseAsync('finanzas.db');
    await initSchema(opened);
    await seedDefaultCategories(opened);
    db = opened;
    return opened;
  })();
  return initPromise;
}

export async function resetDb() {
  const database = await getDb();
  for (const sql of [
    'DELETE FROM expenses',
    'DELETE FROM incomes',
    'DELETE FROM msi_purchases',
    'DELETE FROM payment_cycles',
    'DELETE FROM cards',
    'DELETE FROM categories WHERE predefinida = 0',
  ]) {
    await database.execAsync(sql);
  }
}
