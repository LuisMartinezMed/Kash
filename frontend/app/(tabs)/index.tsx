import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../../src/context/AppDataContext';
import { colors, radii, spacing } from '../../src/theme';
import { formatCurrency, monthLabel } from '../../src/utils/format';
import { buildPieSegments } from '../../src/utils/finance';
import PieChart from '../../src/components/PieChart';

export default function Dashboard() {
  const { summary, refresh, cards, loading } = useAppData();
  const segments = useMemo(() => buildPieSegments(summary), [summary]);
  const primaryCurrency = cards[0]?.moneda || 'MXN';

  const projectionPositive = summary.endOfMonthProjection >= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.textSecondary} />}
        testID="dashboard-screen"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>{monthLabel().toUpperCase()}</Text>
            <Text style={styles.headerTitle}>Resumen</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="wallet-outline" size={22} color={colors.textPrimary} />
          </View>
        </View>

        <View style={styles.heroCard} testID="dashboard-hero">
          <Text style={styles.heroLabel}>Límite total combinado</Text>
          <Text style={styles.heroValue} testID="dashboard-combined-limit">
            {formatCurrency(summary.combinedLimit, primaryCurrency)}
          </Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSmallLabel}>Saldo disponible hoy</Text>
              <Text style={[styles.heroSmallValue, { color: colors.success }]} testID="dashboard-available-today">
                {formatCurrency(summary.availableToday, primaryCurrency)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={styles.heroSmallLabel}>Proyección fin de mes</Text>
              <Text
                style={[styles.heroSmallValue, { color: projectionPositive ? colors.success : colors.danger }]}
                testID="dashboard-end-month-projection"
              >
                {formatCurrency(summary.endOfMonthProjection, primaryCurrency)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartCard} testID="dashboard-pie-card">
          <Text style={styles.sectionTitle}>Flujo del mes</Text>
          <View style={styles.chartRow}>
            <PieChart segments={segments} size={180} strokeWidth={32} />
            <View style={styles.legend}>
              {segments.map((s) => (
                <View key={s.key} style={styles.legendRow} testID={`legend-${s.key}`}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.legendLabel}>{s.label}</Text>
                    <Text style={styles.legendValue}>{formatCurrency(s.value, primaryCurrency)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.kpiRow}>
          <KpiTile
            label="Deuda MSI pendiente"
            value={formatCurrency(summary.msiPendingDebt, primaryCurrency)}
            icon="layers-outline"
            color={colors.warning}
            testID="dashboard-msi-debt"
          />
          <KpiTile
            label="Gastos del mes"
            value={formatCurrency(summary.expensesMonth, primaryCurrency)}
            icon="trending-down-outline"
            color={colors.gray}
            testID="dashboard-expenses-month"
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiTile
            label="Ingresos por recibir"
            value={formatCurrency(summary.projectedIncome, primaryCurrency)}
            icon="trending-up-outline"
            color={colors.success}
            testID="dashboard-projected-income"
          />
          <KpiTile
            label="MSI por aplicar"
            value={formatCurrency(summary.projectedMsi, primaryCurrency)}
            icon="time-outline"
            color={colors.info}
            testID="dashboard-projected-msi"
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiTile
            label="Cashback acumulado"
            value={formatCurrency(summary.cashbackMonth, primaryCurrency)}
            icon="gift-outline"
            color={colors.success}
            testID="dashboard-cashback"
          />
          <View style={{ flex: 1 }} />
        </View>

        {cards.length === 0 && (
          <View style={styles.emptyCard} testID="dashboard-empty-state">
            <Ionicons name="card-outline" size={28} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin tarjetas registradas</Text>
            <Text style={styles.emptyDesc}>Agrega tu primera tarjeta para empezar a ver el flujo de caja.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiTile({ label, value, icon, color, testID }: { label: string; value: string; icon: any; color: string; testID?: string }) {
  return (
    <View style={styles.kpiTile} testID={testID}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  eyebrow: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  headerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  heroLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  heroValue: { color: colors.textPrimary, fontSize: 36, fontWeight: '800', letterSpacing: -1.5, marginTop: spacing.xs },
  heroDivider: { height: 1, backgroundColor: colors.borderSubtle, marginVertical: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: '100%', backgroundColor: colors.borderSubtle, marginHorizontal: spacing.md },
  heroSmallLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  heroSmallValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  legend: { flex: 1, gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
  legendValue: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: spacing.md },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: 6,
  },
  kpiIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  kpiLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: colors.textTertiary, fontSize: 13, textAlign: 'center' },
});
