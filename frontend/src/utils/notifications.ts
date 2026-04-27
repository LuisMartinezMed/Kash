import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Card } from '../db/types';
import { cycleKeyForCard, nextPayDate } from './finance';
import { upsertCycle, getCycle } from '../db/queries';
import { formatCurrency } from './format';

let configured = false;

export function configureNotifications() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: true,
    } as any),
  });
}

export async function ensurePermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  } catch {
    return false;
  }
}

async function safeCancel(ids: string[] | undefined | null) {
  if (!ids) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}

/**
 * Schedule alerts for a card for the next pay date (and X days before).
 * Cancels previous scheduled IDs for the same cycle if any.
 */
export async function scheduleCardAlerts(card: Card, totalDue: number = 0): Promise<string[]> {
  if (Platform.OS === 'web') return [];
  configureNotifications();
  const ok = await ensurePermissions();
  if (!ok) return [];

  const pay = nextPayDate(card);
  const cycleKey = cycleKeyForCard(card, pay);

  // Skip if cycle already paid
  const existing = await getCycle(card.id, cycleKey);
  if (existing && existing.pago_realizado) return [];

  // Cancel previous scheduled notifications for this cycle
  if (existing?.notification_ids) {
    try {
      await safeCancel(JSON.parse(existing.notification_ids));
    } catch {}
  }

  const ids: string[] = [];
  const now = Date.now();

  // X days before
  const beforeDate = new Date(pay);
  beforeDate.setDate(beforeDate.getDate() - card.dias_alerta_previa);
  if (beforeDate.getTime() > now + 5000) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Pago próximo: ${card.apodo}`,
          body: `Faltan ${card.dias_alerta_previa} días para tu pago${totalDue ? `. Monto estimado: ${formatCurrency(totalDue, card.moneda)}` : ''}`,
          data: { card_id: card.id, cycle_key: cycleKey, type: 'pre' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: beforeDate } as any,
      });
      ids.push(id);
    } catch {}
  }

  // Day of payment
  if (pay.getTime() > now + 5000) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Hoy es tu pago: ${card.apodo}`,
          body: `${card.banco} · ${formatCurrency(totalDue, card.moneda)}`,
          data: { card_id: card.id, cycle_key: cycleKey, type: 'day' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: pay } as any,
      });
      ids.push(id);
    } catch {}
  }

  await upsertCycle(card.id, cycleKey, false, ids);
  return ids;
}

/**
 * Cancel scheduled alerts for a card cycle (when user marks payment as done).
 */
export async function cancelCardAlerts(card: Card): Promise<void> {
  if (Platform.OS === 'web') return;
  const cycleKey = cycleKeyForCard(card, nextPayDate(card));
  const cycle = await getCycle(card.id, cycleKey);
  if (cycle?.notification_ids) {
    try {
      await safeCancel(JSON.parse(cycle.notification_ids));
    } catch {}
  }
  await upsertCycle(card.id, cycleKey, true, []);
}

export async function reschedulePending(card: Card): Promise<void> {
  if (Platform.OS === 'web') return;
  const cycleKey = cycleKeyForCard(card, nextPayDate(card));
  await upsertCycle(card.id, cycleKey, false, []);
  await scheduleCardAlerts(card);
}
