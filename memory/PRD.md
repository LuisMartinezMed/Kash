# Finanzas Personales - PRD

## Visión
App móvil de control financiero personal con almacenamiento 100% local, enfocada en simplicidad, privacidad y proyección de flujo de caja.

## Stack
- **Framework:** React Native + Expo SDK 54
- **Routing:** expo-router (file-based, tabs)
- **Storage:** expo-sqlite (local, persistente, sin backend)
- **Notificaciones:** expo-notifications (alertas locales con permisos del sistema)
- **Gráficas:** react-native-svg
- **Idioma:** Español (es-MX)
- **Tema:** Oscuro moderno (Archetype "Jewel & Luxury" + Swiss Precision)

## Arquitectura
- 5 tabs principales: Inicio (Dashboard), Tarjetas, MSI, Movimientos, Alertas
- Sin backend (toda la persistencia es SQLite local)
- Provider único `AppDataContext` que expone listados, summary y refresh

## Modelo de datos (SQLite)
- `cards` (apodo, banco, tipo[crédito/débito], límite, saldo_inicial, moneda, fecha_corte, fecha_pago, dias_alerta_previa)
- `msi_purchases` (card_id, descripción, monto_total, meses, mes_inicio, cargo_mensual, activa)
- `incomes` (nombre, monto, fecha_pago, frecuencia[quincenal/mensual], moneda)
- `categories` (nombre, icono, color, predefinida)
- `expenses` (card_id, categoria_id, monto, moneda, descripción, fecha)
- `payment_cycles` (card_id, ciclo_key, pago_realizado, notification_ids)

## Funcionalidades implementadas
1. **Dashboard:** Límite total combinado, Saldo disponible hoy, Proyección fin de mes, Deuda MSI pendiente, Gastos del mes, Ingresos por recibir, MSI por aplicar. Gráfica de pastel con 4 colores (verde, verde tenue, rojo tenue, gris).
2. **Tarjetas:** CRUD multi-moneda (MXN/USD/EUR), bancos predefinidos.
3. **MSI:** Cálculo automático del cargo mensual, barra de progreso "Mensualidad X/Y", saldo restante, total y mensualidad visibles.
4. **Ingresos:** Nómina con frecuencia mensual/quincenal.
5. **Gastos rápidos:** Categorías predefinidas (Comida, Servicios, Amazon/E-commerce, Transporte, Entretenimiento, Salud) + categorías personalizables (icono + color).
6. **Alertas:** Programadas X días antes y el día del pago. Switch "Pago Realizado" cancela las notificaciones del ciclo y las reactiva si se desmarca.

## Próximos pasos sugeridos
- Modo edición para tarjetas y MSI
- Exportar/respaldar la base SQLite (backup)
- Filtros de movimientos por mes/categoría
- Modo "compartir" con familiares (sin sincronización por ahora, exportable)
