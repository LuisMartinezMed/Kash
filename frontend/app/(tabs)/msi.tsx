import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../../src/context/AppDataContext';
import { colors, radii, spacing } from '../../src/theme';
import { formatCurrency, currentMonthYM } from '../../src/utils/format';
import { msiCurrentInstallment, msiPaidSoFar, msiRemaining } from '../../src/utils/finance';
import { MsiPurchase } from '../../src/db/types';
import * as Q from '../../src/db/queries';
import ModalSheet from '../../src/components/ModalSheet';
import { Field, ChipsSelect, PrimaryButton } from '../../src/components/FormControls';

export default function MsiScreen() {
  const { msis, cards, refresh } = useAppData();
  const [showForm, setShowForm] = useState(false);

  const handleDelete = (msi: MsiPurchase) => {
    Alert.alert('Eliminar MSI', `¿Eliminar "${msi.descripcion}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await Q.deleteMsi(msi.id);
          await refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>MESES SIN INTERESES</Text>
          <Text style={styles.headerTitle}>MSI</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, cards.length === 0 && { opacity: 0.4 }]}
          onPress={() => {
            if (cards.length === 0) {
              Alert.alert('Sin tarjetas', 'Primero agrega una tarjeta para registrar MSI.');
              return;
            }
            setShowForm(true);
          }}
          testID="add-msi-button"
          disabled={cards.length === 0}
        >
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} testID="msi-list">
        {msis.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="layers-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin compras MSI</Text>
            <Text style={styles.emptyDesc}>Agrega una compra a meses sin intereses.</Text>
          </View>
        )}
        {msis.map((msi) => {
          const card = cards.find((c) => c.id === msi.card_id);
          const inst = Math.min(msi.meses, Math.max(0, msiCurrentInstallment(msi)));
          const progress = Math.min(1, msiPaidSoFar(msi) / msi.monto_total);
          return (
            <View key={msi.id} style={styles.card} testID={`msi-item-${msi.id}`}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{msi.descripcion}</Text>
                <TouchableOpacity onPress={() => handleDelete(msi)} testID={`delete-msi-${msi.id}`} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
              <Text style={styles.subtitle}>{card?.apodo || 'Tarjeta eliminada'} · {card?.banco || ''}</Text>

              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Total</Text>
                  <Text style={styles.statValue}>{formatCurrency(msi.monto_total, card?.moneda || 'MXN')}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Mensualidad</Text>
                  <Text style={styles.statValue}>{formatCurrency(msi.cargo_mensual, card?.moneda || 'MXN')}</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statLabel}>Restante</Text>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{formatCurrency(msiRemaining(msi), card?.moneda || 'MXN')}</Text>
                </View>
              </View>

              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Mensualidad</Text>
                <Text style={styles.progressValue} testID={`msi-progress-${msi.id}`}>
                  {inst}/{msi.meses}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>

              {msi.activa === 0 && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>INACTIVA</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <MsiForm
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await refresh();
        }}
      />
    </SafeAreaView>
  );
}

function MsiForm({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { cards } = useAppData();
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [meses, setMeses] = useState('12');
  const [mesInicio, setMesInicio] = useState(currentMonthYM());

  React.useEffect(() => {
    if (!cardId && cards[0]) setCardId(cards[0].id);
  }, [cards, cardId]);

  const onSubmit = async () => {
    if (!cardId) return Alert.alert('Sin tarjeta', 'Selecciona una tarjeta.');
    if (!descripcion.trim()) return Alert.alert('Falta descripción', 'Describe la compra.');
    const m = parseFloat(monto);
    const mm = parseInt(meses, 10);
    if (isNaN(m) || m <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto válido.');
    if (isNaN(mm) || mm <= 0) return Alert.alert('Meses inválidos', 'Ingresa los meses.');
    if (!/^\d{4}-\d{2}$/.test(mesInicio)) return Alert.alert('Mes inválido', 'Formato YYYY-MM.');
    await Q.createMsi({ card_id: cardId, descripcion: descripcion.trim(), monto_total: m, meses: mm, mes_inicio: mesInicio });
    setDescripcion(''); setMonto(''); setMeses('12'); setMesInicio(currentMonthYM());
    onSaved();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Nueva compra MSI" testID="msi-form-modal">
      <ChipsSelect
        label="Tarjeta"
        value={cardId}
        options={cards.map((c) => c.id) as any}
        onChange={(v) => setCardId(v)}
        renderLabel={(id) => cards.find((c) => c.id === id)?.apodo || id}
        testID="chip-card"
      />
      <Field label="Descripción" value={descripcion} onChangeText={setDescripcion} placeholder="Ej. iPhone 15" testID="input-descripcion" />
      <Field label="Monto total" value={monto} onChangeText={setMonto} placeholder="0.00" keyboardType="decimal-pad" testID="input-monto" />
      <ChipsSelect
        label="Meses"
        value={meses}
        options={['3', '6', '9', '12', '18', '24'] as any}
        onChange={(v) => setMeses(v)}
        testID="chip-meses"
      />
      <Field label="Mes de inicio (YYYY-MM)" value={mesInicio} onChangeText={setMesInicio} placeholder="2026-02" testID="input-mes-inicio" />
      {monto && meses && parseFloat(monto) > 0 && parseInt(meses, 10) > 0 && (
        <View style={styles.computed} testID="msi-computed-payment">
          <Text style={styles.computedLabel}>Cargo mensual estimado</Text>
          <Text style={styles.computedValue}>
            {formatCurrency(parseFloat(monto) / parseInt(meses, 10), 'MXN')}
          </Text>
        </View>
      )}
      <PrimaryButton label="Guardar MSI" onPress={onSubmit} testID="submit-msi" />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  eyebrow: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.sm,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.textTertiary, fontSize: 12, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  stat: { flex: 1 },
  statLabel: { color: colors.textTertiary, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', marginTop: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  progressLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressValue: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.success, borderRadius: 9999 },
  inactiveBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6,
  },
  inactiveBadgeText: { color: colors.textTertiary, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: colors.textTertiary, fontSize: 13, textAlign: 'center' },
  computed: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: radii.md, padding: spacing.md,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: spacing.md,
  },
  computedLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  computedValue: { color: colors.success, fontSize: 22, fontWeight: '800', marginTop: 4 },
});
