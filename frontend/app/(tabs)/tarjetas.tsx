import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../../src/context/AppDataContext';
import { colors, radii, spacing, CURRENCIES, BANK_OPTIONS } from '../../src/theme';
import { formatCurrency } from '../../src/utils/format';
import { cardAvailableBalance } from '../../src/utils/finance';
import { Card, Currency, CardType } from '../../src/db/types';
import * as Q from '../../src/db/queries';
import ModalSheet from '../../src/components/ModalSheet';
import { Field, ChipsSelect, PrimaryButton } from '../../src/components/FormControls';

export default function TarjetasScreen() {
  const { cards, expenses, msis, refresh } = useAppData();
  const [editing, setEditing] = useState<Card | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleDelete = (card: Card) => {
    Alert.alert('Eliminar tarjeta', `¿Eliminar "${card.apodo}"? También se borrarán sus MSI y gastos.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await Q.deleteCard(card.id);
          await refresh();
        },
      },
    ]);
  };

  const openCreate = () => { setEditing(null); setShowForm(true); };
  const openEdit = (card: Card) => { setEditing(card); setShowForm(true); };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>MIS CUENTAS</Text>
          <Text style={styles.headerTitle}>Tarjetas</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate} testID="add-card-button">
          <Ionicons name="add" size={22} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list} testID="cards-list">
        {cards.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Sin tarjetas aún</Text>
            <Text style={styles.emptyDesc}>Toca el botón + para agregar tu primera tarjeta.</Text>
          </View>
        )}
        {cards.map((card) => {
          const available = cardAvailableBalance(card, expenses, msis);
          return (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => openEdit(card)}
              activeOpacity={0.85}
              testID={`card-item-${card.id}`}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardBank}>{card.banco}</Text>
                  <Text style={styles.cardAlias}>{card.apodo}</Text>
                </View>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyBadgeText}>{card.moneda}</Text>
                </View>
              </View>

              <Text style={styles.cardLabel}>
                {card.tipo === 'credito' ? 'Disponible' : 'Saldo'}
              </Text>
              <Text style={styles.cardAmount} testID={`card-available-${card.id}`}>
                {formatCurrency(available, card.moneda)}
              </Text>

              <View style={styles.cardFooter}>
                {card.tipo === 'credito' ? (
                  <>
                    <FooterChip icon="trending-up-outline" label={`Límite ${formatCurrency(card.limite, card.moneda)}`} />
                    <FooterChip icon="calendar-outline" label={`Corte día ${card.fecha_corte}`} />
                    <FooterChip icon="alarm-outline" label={`Pago día ${card.fecha_pago}`} />
                  </>
                ) : (
                  <FooterChip icon="cash-outline" label="Cuenta de débito" />
                )}
                {card.cashback_percent > 0 && (
                  <FooterChip icon="gift-outline" label={`${card.cashback_percent}% cashback`} />
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(card)}
                testID={`delete-card-${card.id}`}
                hitSlop={10}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <CardForm
        visible={showForm}
        editing={editing}
        onClose={() => setShowForm(false)}
        onSaved={async () => {
          setShowForm(false);
          await refresh();
        }}
      />
    </SafeAreaView>
  );
}

function FooterChip({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.footerChip}>
      <Ionicons name={icon} size={12} color={colors.textSecondary} />
      <Text style={styles.footerChipText}>{label}</Text>
    </View>
  );
}

function CardForm({ visible, editing, onClose, onSaved }: { visible: boolean; editing: Card | null; onClose: () => void; onSaved: () => void }) {
  const [apodo, setApodo] = useState('');
  const [banco, setBanco] = useState(BANK_OPTIONS[0]);
  const [tipo, setTipo] = useState<CardType>('credito');
  const [limite, setLimite] = useState('');
  const [moneda, setMoneda] = useState<Currency>('MXN');
  const [fechaCorte, setFechaCorte] = useState('1');
  const [fechaPago, setFechaPago] = useState('15');
  const [diasAlerta, setDiasAlerta] = useState('3');
  const [cashbackPercent, setCashbackPercent] = useState('0');
  const [cashbackPayDay, setCashbackPayDay] = useState('1');

  React.useEffect(() => {
    if (!visible) return;
    if (editing) {
      setApodo(editing.apodo);
      setBanco(editing.banco);
      setTipo(editing.tipo);
      setLimite(String(editing.tipo === 'credito' ? editing.limite : editing.saldo_inicial));
      setMoneda(editing.moneda);
      setFechaCorte(String(editing.fecha_corte));
      setFechaPago(String(editing.fecha_pago));
      setDiasAlerta(String(editing.dias_alerta_previa));
      setCashbackPercent(String(editing.cashback_percent ?? 0));
      setCashbackPayDay(String(editing.cashback_pay_day ?? 1));
    } else {
      setApodo(''); setBanco(BANK_OPTIONS[0]); setTipo('credito');
      setLimite(''); setMoneda('MXN'); setFechaCorte('1');
      setFechaPago('15'); setDiasAlerta('3');
      setCashbackPercent('0'); setCashbackPayDay('1');
    }
  }, [visible, editing]);

  const onSubmit = async () => {
    if (!apodo.trim()) return Alert.alert('Falta apodo', 'Ingresa un apodo para la tarjeta.');
    const lim = parseFloat(limite);
    if (isNaN(lim) || lim <= 0) return Alert.alert('Monto inválido', tipo === 'credito' ? 'Ingresa el límite de crédito.' : 'Ingresa el saldo inicial.');
    const fc = Math.min(31, Math.max(1, parseInt(fechaCorte, 10) || 1));
    const fp = Math.min(31, Math.max(1, parseInt(fechaPago, 10) || 1));
    const da = Math.max(0, parseInt(diasAlerta, 10) || 0);
    const cbp = Math.max(0, Math.min(100, parseFloat(cashbackPercent) || 0));
    const cbd = Math.min(31, Math.max(1, parseInt(cashbackPayDay, 10) || 1));
    const payload = {
      apodo: apodo.trim(),
      banco,
      tipo,
      limite: tipo === 'credito' ? lim : 0,
      saldo_inicial: tipo === 'debito' ? lim : 0,
      moneda,
      fecha_corte: fc,
      fecha_pago: fp,
      dias_alerta_previa: da,
      cashback_percent: cbp,
      cashback_pay_day: cbd,
    };
    if (editing) {
      await Q.updateCard(editing.id, payload);
    } else {
      await Q.createCard(payload);
    }
    onSaved();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={editing ? 'Editar tarjeta' : 'Nueva tarjeta'} testID="card-form-modal">
      <Field label="Apodo" value={apodo} onChangeText={setApodo} placeholder="Ej. BBVA Oro" testID="input-apodo" />
      <ChipsSelect label="Banco" value={banco} options={BANK_OPTIONS as any} onChange={(v) => setBanco(v)} testID="chip-banco" />
      <ChipsSelect<CardType>
        label="Tipo"
        value={tipo}
        options={['credito', 'debito']}
        onChange={setTipo}
        testID="chip-tipo"
        renderLabel={(v) => (v === 'credito' ? 'Crédito' : 'Débito')}
      />
      <Field
        label={tipo === 'credito' ? 'Límite de crédito' : 'Saldo inicial'}
        value={limite}
        onChangeText={setLimite}
        placeholder="0.00"
        keyboardType="decimal-pad"
        testID="input-limite"
      />
      <ChipsSelect<Currency> label="Moneda" value={moneda} options={CURRENCIES} onChange={setMoneda} testID="chip-moneda" />
      {tipo === 'credito' && (
        <>
          <Field label="Fecha de corte (día)" value={fechaCorte} onChangeText={setFechaCorte} keyboardType="numeric" testID="input-corte" />
          <Field label="Fecha límite de pago (día)" value={fechaPago} onChangeText={setFechaPago} keyboardType="numeric" testID="input-pago" />
          <Field label="Días de alerta previa" value={diasAlerta} onChangeText={setDiasAlerta} keyboardType="numeric" testID="input-dias-alerta" />
        </>
      )}
      <Field label="Cashback (%)" value={cashbackPercent} onChangeText={setCashbackPercent} placeholder="0" keyboardType="decimal-pad" testID="input-cashback-percent" />
      <Field label="Día de pago del cashback" value={cashbackPayDay} onChangeText={setCashbackPayDay} placeholder="1" keyboardType="numeric" testID="input-cashback-day" />
      <PrimaryButton label={editing ? 'Guardar cambios' : 'Guardar tarjeta'} onPress={onSubmit} testID="submit-card" />
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
  addBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBank: { color: colors.textTertiary, fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  cardAlias: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },
  currencyBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.borderSubtle,
  },
  currencyBadgeText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
  cardLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.sm },
  cardAmount: { color: colors.success, fontSize: 26, fontWeight: '800', letterSpacing: -1 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  footerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footerChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: '500' },
  deleteBtn: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    padding: 6, borderRadius: 8,
  },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: colors.textTertiary, fontSize: 13, textAlign: 'center' },
});
