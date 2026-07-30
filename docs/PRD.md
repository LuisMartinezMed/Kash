# Kash - Finanzas Personales (PRD)

## Visión
App móvil de control financiero personal con almacenamiento 100% local (expo-sqlite) y tema oscuro moderno. Enfoque en simplicidad, privacidad y proyección de flujo de caja.

## Stack
- React Native + Expo SDK 54
- expo-router (file-based, 5 tabs)
- expo-sqlite (persistencia local) + migraciones con ALTER TABLE
- expo-notifications (alertas locales)
- react-native-svg (gráfica de pastel)
- Español (es-MX), tema oscuro

## Modelo de datos (SQLite)
- `cards` (apodo, banco, tipo, límite, saldo_inicial, moneda, fecha_corte, fecha_pago, dias_alerta_previa, **cashback_percent**, **cashback_pay_day**)
- `msi_purchases` (card_id, descripción, monto_total, meses, mes_inicio, cargo_mensual, activa)
- `incomes` (nombre, monto, fecha_pago, **frecuencia[diario/semanal/quincenal/mensual]**, moneda)
- `categories` (nombre, icono, color, predefinida)
- `expenses` (card_id, categoria_id, monto, moneda, descripción, fecha)
- `payment_cycles` (card_id, ciclo_key, pago_realizado, notification_ids)

## Funcionalidades (MVP + v1.1)

### MVP (v1.0)
1. Dashboard: Límite combinado, Saldo hoy, Proyección fin de mes, Deuda MSI, Gastos del mes, Ingresos por recibir, MSI por aplicar + gráfica de pastel (verde, verde tenue, rojo tenue, gris).
2. Tarjetas: CRUD multi-moneda, crédito/débito.
3. MSI: Cálculo de cargo mensual, progreso "Mensualidad X/Y".
4. Ingresos fijos: Nómina con frecuencia.
5. Gastos rápidos con categorías predefinidas + personalizables.
6. Alertas con expo-notifications + switch "Pago Realizado".

### v1.1 (update actual)
1. **CRUD de Edición**: tap en tarjeta/MSI/ingreso/gasto abre modal en modo edición con campos pre-llenados. Nuevas funciones `updateMsi`, `updateIncome`, `updateExpense` en `queries.ts`.
2. **Sistema de Cashback**:
   - Schema: columnas `cashback_percent` y `cashback_pay_day` en tabla `cards` (migración con ALTER TABLE idempotente).
   - UI de Tarjetas: campos en el formulario de creación/edición.
   - Feedback en Gastos: caja verde "Recibirás $X de Cashback por esta transacción" cuando la tarjeta seleccionada tiene cashback > 0.
   - Automatización: `cashbackAccumulatedMonth` calcula el cashback acumulado del mes y se suma a `projectedIncome` en `buildDashboardSummary`.
3. **Frecuencias de Ingreso**: diario, semanal, quincenal, mensual. Lógica en `projectedIncomeRemaining`:
   - Diario: monto × días restantes del mes.
   - Semanal: monto × número de días que coinciden con el día-de-semana de referencia hasta fin de mes.
   - Quincenal: dos pagos por mes (día + día+15 mod longitud del mes).
   - Mensual: pago único si aún no ha pasado el día de pago.
4. **UI/UX**: KPI pequeño "Cashback acumulado" en Dashboard. Gráfica de pastel respetando los 4 colores tácticos (#22C55E sólido, rgba(34,197,94,0.4), rgba(239,68,68,0.4), #4B5563).

## Próximos pasos sugeridos
- Exportar/respaldar la base SQLite (backup) y restauración desde archivo.
- Filtros de movimientos por mes/categoría/tarjeta.
- Gráficos históricos (últimos 6 meses).
- Notificación local separada el día del pago de cashback.
