import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../../src/context/AppDataContext';
import { colors, radii, spacing } from '../../src/theme';
import { formatCurrency, shortDate } from '../../src/utils/format';
import { cycleKeyForCard, nextPayDate, msiCargoForMonth } from '../../src/utils/finance';
import { cancelCardAlerts, reschedulePending, ensurePermissions } from '../../src/utils/notifications';

export default function AlertasScreen() {
  const { cards, msis, cycles, refresh } = useAppData();

  const items = useMemo(() => {
    const now = new Date();
    return cards
      .filter((c) => c.tipo === 'credito')
      .map((card) => {
        const pay = nextPayDate(card, now);
        const ck = cycleKeyForCard(card, pay);
        const cycle = cycles.find((cy) => cy.card_id === card.id && cy.ciclo_key === ck);
        const paid = !!cycle?.pago_realizado;
        const daysLeft = Math.ceil((pay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Estimate due: sum of MSI charges for current month + 0 (we don't track exact statement, so MSI cargo as proxy)
        const ny = pay.getFullYear();
        const nm = pay.getMonth() + 1;
        const msiCharges = msis
          .filter((m) => m.card_id === card.id)
          .reduce((s, m) => s + msiCargoForMonth(m, ny, nm), 0);
        return { card, pay, daysLeft, paid, ck, totalDue: msiCharges };
      })
      .sort((a, b) => a.pay.getTime() - b.pay.getTime());
  }, [cards, cycles, msis]);

  const togglePaid = async (card: any, ck: string, currentPaid: boolean) => {
    if (!currentPaid) {
      await cancelCardAlerts(card);
      Alert.alert('Pago marcado', `Las alertas de "${card.apodo}" se desactivaron para este ciclo.`);
    } else {
      await reschedulePending(card);
    }
    await refresh();
  };

  const requestPerm = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('No disponible', 'Las notificaciones locales solo funcionan en el dispositivo móvil.');
      return;
    }
    const ok = await ensurePermissions();
    Alert.alert(ok ? 'Permisos otorgados' : 'Permisos denegados', ok
      ? 'Las alertas se enviarán según configuraste.'
      : 'Activa las notificaciones desde los ajustes del sistema.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>RECORDATORIOS</Text>
          <Text style={styles.headerTitle}>Alertas</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} testID="alertas-screen">
        <View style={styles.permCard}>
          <View style={[styles.permIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
            <Ionicons name="notifications-outline" size={20} color={colors.info} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>Notificaciones del sistema</Text>
            <Text style={styles.permDesc}>Recibirás alertas X días antes de tu pago y el día del corte.</Text>
          </View>
          <TouchableOpacity onPress={requestPerm} style={styles.permBtnBox} testID="request-permissions">
            <Text style={styles.permBtnText}>Activar</Text>
          </TouchableOpacity>
        </View>

        {items.length === 0 && (
          <View style={styles.empty} testID="alertas-empty">
            <Ionicons name="alarm-outline" size={36} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin alertas</Text>
            <Text style={styles.emptyDesc}>Agrega una tarjeta de crédito para programar alertas.</Text>
          </View>
        )}

        {items.map(({ card, pay, daysLeft, paid, ck, totalDue }) => (
          <View key={card.id + ck} style={styles.alertCard} testID={`alert-card-${card.id}`}>
            <View style={styles.alertHeader}>
              <View style={[styles.alertIcon, { backgroundColor: paid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons
                  name={paid ? 'checkmark-circle-outline' : 'alarm-outline'}
                  size={20}
                  color={paid ? colors.success : colors.danger}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{card.apodo}</Text>
                <Text style={styles.alertSubtitle}>{card.banco}</Text>
              </View>
              <Switch
                value={paid}
                onValueChange={() => togglePaid(card, ck, paid)}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: colors.success }}
                thumbColor="#fff"
                testID={`alert-switch-paid-${card.id}`}
              />
            </View>
            <View style={styles.alertBody}>
              <View style={styles.alertChip}>
                <Text style={styles.alertChipLabel}>FECHA DE PAGO</Text>
                <Text style={styles.alertChipValue}>{shortDate(pay.toISOString())}</Text>
              </View>
              <View style={styles.alertChip}>
                <Text style={styles.alertChipLabel}>EN</Text>
                <Text style={[styles.alertChipValue, { color: paid ? colors.textSecondary : daysLeft <= card.dias_alerta_previa ? colors.danger : colors.textPrimary }]}>
                  {paid ? 'Pagado' : daysLeft >= 0 ? `${daysLeft} días` : `Vencido`}
                </Text>
              </View>
              {totalDue > 0 && (
                <View style={styles.alertChip}>
                  <Text style={styles.alertChipLabel}>MSI ESTE MES</Text>
                  <Text style={styles.alertChipValue}>{formatCurrency(totalDue, card.moneda)}</Text>
                </View>
              )}
              <View style={styles.alertChip}>
                <Text style={styles.alertChipLabel}>AVISO PREVIO</Text>
                <Text style={styles.alertChipValue}>{card.dias_alerta_previa} días</Text>
              </View>
            </View>
            <Text style={styles.alertHint}>
              {paid
                ? '✓ Las alertas de este ciclo están desactivadas.'
                : `Te avisaremos ${card.dias_alerta_previa} día(s) antes y el día del pago.`}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  eyebrow: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  permCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  permIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  permTitle: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  permDesc: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  permBtnBox: {
    backgroundColor: colors.success, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radii.pill, minHeight: 36, minWidth: 64, alignItems: 'center', justifyContent: 'center',
  },
  permBtnText: { color: '#000', fontWeight: '700', fontSize: 12 },
  alertCard: {
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.sm,
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  alertSubtitle: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  alertBody: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  alertChip: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.surfaceElevated, padding: spacing.sm,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  alertChipLabel: { color: colors.textTertiary, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  alertChipValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  alertHint: { color: colors.textTertiary, fontSize: 11, marginTop: 4 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: colors.textTertiary, fontSize: 13, textAlign: 'center' },
});
