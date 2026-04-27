import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppData } from '../../src/context/AppDataContext';
import { colors, radii, spacing, CURRENCIES } from '../../src/theme';
import { formatCurrency, shortDate, todayISO } from '../../src/utils/format';
import { Currency, Frequency } from '../../src/db/types';
import * as Q from '../../src/db/queries';
import ModalSheet from '../../src/components/ModalSheet';
import { Field, ChipsSelect, PrimaryButton } from '../../src/components/FormControls';

type Tab = 'gastos' | 'ingresos';

const ICON_OPTIONS = [
  'pricetag-outline', 'cart-outline', 'home-outline', 'school-outline',
  'paw-outline', 'gift-outline', 'fitness-outline', 'cafe-outline',
  'airplane-outline', 'cellular-outline',
];
const COLOR_OPTIONS = ['#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#F59E0B', '#EF4444', '#14B8A6', '#FACC15'];

export default function MovimientosScreen() {
  const { expenses, incomes, categories, cards, refresh } = useAppData();
  const [tab, setTab] = useState<Tab>('gastos');
  const [showExpense, setShowExpense] = useState(false);
  const [showIncome, setShowIncome] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [presetCategoryId, setPresetCategoryId] = useState<string | null>(null);

  const onQuickExpense = (categoryId: string) => {
    if (cards.length === 0) {
      Alert.alert('Sin tarjetas', 'Agrega una tarjeta primero.');
      return;
    }
    setPresetCategoryId(categoryId);
    setShowExpense(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>FLUJO</Text>
          <Text style={styles.headerTitle}>Movimientos</Text>
        </View>
      </View>

      <View style={styles.segmented}>
        <SegBtn label="Gastos" active={tab === 'gastos'} onPress={() => setTab('gastos')} testID="seg-gastos" />
        <SegBtn label="Ingresos" active={tab === 'ingresos'} onPress={() => setTab('ingresos')} testID="seg-ingresos" />
      </View>

      {tab === 'gastos' ? (
        <ScrollView contentContainerStyle={styles.list} testID="expenses-screen">
          <Text style={styles.quickLabel}>Categorías rápidas</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.quickChip}
                onPress={() => onQuickExpense(cat.id)}
                testID={`expense-chip-${cat.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${cat.color}22` }]}>
                  <Ionicons name={cat.icono as any} size={18} color={cat.color} />
                </View>
                <Text style={styles.quickText}>{cat.nombre}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.quickChip} onPress={() => setShowCategory(true)} testID="add-category-button">
              <View style={[styles.quickIcon, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                <Ionicons name="add" size={18} color={colors.textPrimary} />
              </View>
              <Text style={styles.quickText}>Nueva</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Gastos recientes</Text>
            <TouchableOpacity
              onPress={() => {
                if (cards.length === 0) return Alert.alert('Sin tarjetas', 'Agrega una tarjeta primero.');
                setPresetCategoryId(null);
                setShowExpense(true);
              }}
              testID="add-expense-button"
              style={styles.smallAdd}
            >
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.smallAddText}>Nuevo gasto</Text>
            </TouchableOpacity>
          </View>

          {expenses.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="trending-down-outline" size={36} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin gastos registrados</Text>
            </View>
          )}
          {expenses.map((exp) => {
            const cat = categories.find((c) => c.id === exp.categoria_id);
            const card = cards.find((c) => c.id === exp.card_id);
            return (
              <View key={exp.id} style={styles.row} testID={`expense-item-${exp.id}`}>
                <View style={[styles.rowIcon, { backgroundColor: `${cat?.color || '#4B5563'}22` }]}>
                  <Ionicons name={(cat?.icono as any) || 'pricetag-outline'} size={18} color={cat?.color || colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{cat?.nombre || 'Sin categoría'}</Text>
                  <Text style={styles.rowSubtitle}>
                    {card?.apodo || 'Sin tarjeta'} · {shortDate(exp.fecha)}
                  </Text>
                  {exp.descripcion ? <Text style={styles.rowDesc}>{exp.descripcion}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.rowAmount, { color: colors.danger }]}>
                    -{formatCurrency(exp.monto, exp.moneda)}
                  </Text>
                  <TouchableOpacity
                    onPress={async () => {
                      await Q.deleteExpense(exp.id);
                      await refresh();
                    }}
                    testID={`delete-expense-${exp.id}`}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.list} testID="incomes-screen">
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Ingresos fijos</Text>
            <TouchableOpacity onPress={() => setShowIncome(true)} testID="add-income-button" style={styles.smallAdd}>
              <Ionicons name="add" size={16} color="#000" />
              <Text style={styles.smallAddText}>Nuevo ingreso</Text>
            </TouchableOpacity>
          </View>

          {incomes.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="trending-up-outline" size={36} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>Sin ingresos registrados</Text>
              <Text style={styles.emptyDesc}>Agrega tu nómina o ingresos recurrentes.</Text>
            </View>
          )}
          {incomes.map((inc) => (
            <View key={inc.id} style={styles.row} testID={`income-item-${inc.id}`}>
              <View style={[styles.rowIcon, { backgroundColor: `${colors.success}22` }]}>
                <Ionicons name="wallet-outline" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{inc.nombre}</Text>
                <Text style={styles.rowSubtitle}>
                  {inc.frecuencia === 'mensual' ? 'Mensual' : 'Quincenal'} · {shortDate(inc.fecha_pago)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.rowAmount, { color: colors.success }]}>
                  +{formatCurrency(inc.monto, inc.moneda)}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    await Q.deleteIncome(inc.id);
                    await refresh();
                  }}
                  testID={`delete-income-${inc.id}`}
                >
                  <Ionicons name="trash-outline" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <ExpenseForm
        visible={showExpense}
        presetCategoryId={presetCategoryId}
        onClose={() => setShowExpense(false)}
        onSaved={async () => {
          setShowExpense(false);
          await refresh();
        }}
      />
      <IncomeForm
        visible={showIncome}
        onClose={() => setShowIncome(false)}
        onSaved={async () => {
          setShowIncome(false);
          await refresh();
        }}
      />
      <CategoryForm
        visible={showCategory}
        onClose={() => setShowCategory(false)}
        onSaved={async () => {
          setShowCategory(false);
          await refresh();
        }}
      />
    </SafeAreaView>
  );
}

function SegBtn({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.segBtn, active && styles.segBtnActive]} testID={testID}>
      <Text style={[styles.segBtnText, active && styles.segBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ExpenseForm({ visible, onClose, onSaved, presetCategoryId }: { visible: boolean; onClose: () => void; onSaved: () => void; presetCategoryId: string | null }) {
  const { cards, categories } = useAppData();
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [categoriaId, setCategoriaId] = useState(presetCategoryId || categories[0]?.id || '');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<Currency>(cards[0]?.moneda || 'MXN');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(todayISO());

  React.useEffect(() => {
    if (visible) {
      setCardId(cards[0]?.id || '');
      setCategoriaId(presetCategoryId || categories[0]?.id || '');
      setMoneda(cards[0]?.moneda || 'MXN');
      setMonto('');
      setDescripcion('');
      setFecha(todayISO());
    }
  }, [visible, presetCategoryId, cards, categories]);

  const onSubmit = async () => {
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto válido.');
    if (!cardId) return Alert.alert('Sin tarjeta', 'Selecciona una tarjeta.');
    if (!categoriaId) return Alert.alert('Sin categoría', 'Selecciona una categoría.');
    await Q.createExpense({
      card_id: cardId,
      categoria_id: categoriaId,
      monto: m,
      moneda,
      descripcion: descripcion.trim() || null,
      fecha,
    });
    onSaved();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Nuevo gasto" testID="expense-form-modal">
      <Field label="Monto" value={monto} onChangeText={setMonto} placeholder="0.00" keyboardType="decimal-pad" testID="input-expense-monto" />
      <ChipsSelect<Currency> label="Moneda" value={moneda} options={CURRENCIES} onChange={setMoneda} testID="chip-expense-moneda" />
      <ChipsSelect
        label="Tarjeta"
        value={cardId}
        options={cards.map((c) => c.id) as any}
        onChange={setCardId}
        renderLabel={(id) => cards.find((c) => c.id === id)?.apodo || id}
        testID="chip-expense-card"
      />
      <ChipsSelect
        label="Categoría"
        value={categoriaId}
        options={categories.map((c) => c.id) as any}
        onChange={setCategoriaId}
        renderLabel={(id) => categories.find((c) => c.id === id)?.nombre || id}
        testID="chip-expense-cat"
      />
      <Field label="Descripción (opcional)" value={descripcion} onChangeText={setDescripcion} testID="input-expense-desc" />
      <Field label="Fecha (YYYY-MM-DD)" value={fecha} onChangeText={setFecha} testID="input-expense-fecha" />
      <PrimaryButton label="Guardar gasto" onPress={onSubmit} testID="submit-expense" />
    </ModalSheet>
  );
}

function IncomeForm({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState<Currency>('MXN');
  const [fecha, setFecha] = useState(todayISO());
  const [frecuencia, setFrecuencia] = useState<Frequency>('mensual');

  React.useEffect(() => {
    if (visible) {
      setNombre(''); setMonto(''); setMoneda('MXN'); setFecha(todayISO()); setFrecuencia('mensual');
    }
  }, [visible]);

  const onSubmit = async () => {
    if (!nombre.trim()) return Alert.alert('Falta nombre', 'Ingresa el nombre del ingreso.');
    const m = parseFloat(monto);
    if (isNaN(m) || m <= 0) return Alert.alert('Monto inválido', 'Ingresa un monto válido.');
    await Q.createIncome({ nombre: nombre.trim(), monto: m, moneda, fecha_pago: fecha, frecuencia });
    onSaved();
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Nuevo ingreso fijo" testID="income-form-modal">
      <Field label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej. Nómina" testID="input-income-nombre" />
      <Field label="Monto" value={monto} onChangeText={setMonto} placeholder="0.00" keyboardType="decimal-pad" testID="input-income-monto" />
      <ChipsSelect<Currency> label="Moneda" value={moneda} options={CURRENCIES} onChange={setMoneda} testID="chip-income-moneda" />
      <Field label="Fecha de pago (YYYY-MM-DD)" value={fecha} onChangeText={setFecha} testID="input-income-fecha" />
      <ChipsSelect<Frequency>
        label="Frecuencia"
        value={frecuencia}
        options={['quincenal', 'mensual']}
        onChange={setFrecuencia}
        renderLabel={(v) => (v === 'mensual' ? 'Mensual' : 'Quincenal')}
        testID="chip-income-frecuencia"
      />
      <PrimaryButton label="Guardar ingreso" onPress={onSubmit} testID="submit-income" />
    </ModalSheet>
  );
}

function CategoryForm({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState(ICON_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  React.useEffect(() => {
    if (visible) { setNombre(''); setIcono(ICON_OPTIONS[0]); setColor(COLOR_OPTIONS[0]); }
  }, [visible]);

  const onSubmit = async () => {
    if (!nombre.trim()) return Alert.alert('Falta nombre', 'Ingresa el nombre de la categoría.');
    try {
      await Q.createCategory({ nombre: nombre.trim(), icono, color });
      onSaved();
    } catch {
      Alert.alert('Error', 'Esa categoría ya existe.');
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Nueva categoría" testID="category-form-modal">
      <Field label="Nombre" value={nombre} onChangeText={setNombre} placeholder="Ej. Mascotas" testID="input-cat-nombre" />
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>Icono</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
        {ICON_OPTIONS.map((ic) => (
          <TouchableOpacity
            key={ic}
            onPress={() => setIcono(ic)}
            style={[styles.iconPick, icono === ic && styles.iconPickActive]}
            testID={`icon-${ic}`}
          >
            <Ionicons name={ic as any} size={20} color={icono === ic ? '#000' : colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' }}>Color</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {COLOR_OPTIONS.map((cc) => (
          <TouchableOpacity
            key={cc}
            onPress={() => setColor(cc)}
            style={[styles.colorPick, { backgroundColor: cc }, color === cc && styles.colorPickActive]}
            testID={`color-${cc}`}
          />
        ))}
      </View>
      <PrimaryButton label="Crear categoría" onPress={onSubmit} testID="submit-category" />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerRow: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md },
  eyebrow: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  headerTitle: { color: colors.textPrimary, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  segmented: {
    marginHorizontal: spacing.md, marginBottom: spacing.md,
    flexDirection: 'row', backgroundColor: colors.surface,
    borderRadius: radii.pill, padding: 4,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.pill },
  segBtnActive: { backgroundColor: colors.textPrimary },
  segBtnText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  segBtnTextActive: { color: '#000', fontWeight: '700' },
  list: { padding: spacing.md, gap: spacing.md, paddingBottom: 100 },
  quickLabel: { color: colors.textTertiary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  quickRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  quickChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: radii.lg, flexDirection: 'row',
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.borderSubtle, height: 48,
  },
  quickIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  smallAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.success,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill,
  },
  smallAddText: { color: '#000', fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, padding: spacing.md,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderSubtle,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  rowSubtitle: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  rowDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyDesc: { color: colors.textTertiary, fontSize: 13, textAlign: 'center' },
  iconPick: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  iconPickActive: { backgroundColor: colors.textPrimary },
  colorPick: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: 'transparent',
  },
  colorPickActive: { borderColor: colors.textPrimary },
});
