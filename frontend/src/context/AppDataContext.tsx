import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Q from '../db/queries';
import { Card, MsiPurchase, Income, Expense, Category, PaymentCycle } from '../db/types';
import { configureNotifications, ensurePermissions, scheduleCardAlerts } from '../utils/notifications';
import { buildDashboardSummary, DashboardSummary } from '../utils/finance';

interface AppData {
  loading: boolean;
  cards: Card[];
  msis: MsiPurchase[];
  incomes: Income[];
  expenses: Expense[];
  categories: Category[];
  cycles: PaymentCycle[];
  summary: DashboardSummary;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [msis, setMsis] = useState<MsiPurchase[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cycles, setCycles] = useState<PaymentCycle[]>([]);

  const refresh = useCallback(async () => {
    const [c, m, i, e, ca, cy] = await Promise.all([
      Q.listCards(),
      Q.listMsi(),
      Q.listIncomes(),
      Q.listExpenses(),
      Q.listCategories(),
      Q.listCycles(),
    ]);
    setCards(c);
    setMsis(m);
    setIncomes(i);
    setExpenses(e);
    setCategories(ca);
    setCycles(cy);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        configureNotifications();
        if (Platform.OS !== 'web') {
          ensurePermissions().catch(() => {});
        }
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // Auto schedule card alerts when cards change
  useEffect(() => {
    if (loading || Platform.OS === 'web') return;
    cards.forEach((c) => {
      scheduleCardAlerts(c).catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  const summary = buildDashboardSummary(cards, expenses, msis, incomes);

  return (
    <Ctx.Provider value={{ loading, cards, msis, incomes, expenses, categories, cycles, summary, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAppData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppData must be used within AppDataProvider');
  return v;
}
