# Arquitectura de Kash

## Propósito

Este documento describe la arquitectura que existe actualmente en el repositorio y, por separado, una dirección futura propuesta. La sección planeada no representa código implementado.

## Arquitectura actual (Current architecture)

### Contexto del sistema

Kash es una aplicación de finanzas personales *mobile-first* basada en Expo. La aplicación funciona sin backend propio: captura información introducida por la persona usuaria, la almacena localmente y calcula resúmenes y proyecciones en el dispositivo.

No existen actualmente autenticación, cuentas remotas, sincronización en la nube, agregación bancaria ni un API de servidor.

### Stack y plataformas

- Expo SDK 54.
- React Native 0.81.5 y React 19.1.0.
- TypeScript en modo estricto.
- Expo Router para navegación por archivos.
- Expo SQLite para persistencia local.
- React Context para estado compartido.
- Expo Notifications para recordatorios locales.
- React Native SVG para gráficas.
- Jest con `jest-expo` para pruebas unitarias.

Android, iOS y web están configurados como destinos Expo. Algunas capacidades tienen comportamiento específico por plataforma: las notificaciones locales no se programan en web y SQLite web depende de la integración WASM configurada en Metro.

### Estructura

```text
frontend/
├── app/                         Rutas y layouts de Expo Router
│   ├── _layout.tsx              Providers globales y Stack raíz
│   └── (tabs)/                  Navegación principal por pestañas
├── assets/                      Imágenes y recursos locales
├── src/
│   ├── components/              Controles, modales y visualizaciones
│   ├── context/                 Estado y coordinación de datos
│   ├── db/                      Tipos, esquema SQLite y consultas
│   ├── theme/                   Colores y tokens visuales
│   └── utils/                   Formato, finanzas y notificaciones
├── app.json                     Configuración de Expo
├── eslint.config.js             Configuración de ESLint
├── metro.config.js              Configuración de Metro y SQLite web
├── package.json                 Scripts y dependencias
└── tsconfig.json                Configuración estricta de TypeScript
```

### Navegación y composición

`frontend/app/_layout.tsx` monta la aplicación con:

1. `GestureHandlerRootView`.
2. `SafeAreaProvider`.
3. `AppDataProvider`.
4. `StatusBar`.
5. El `Stack` de Expo Router.

`frontend/app/(tabs)/_layout.tsx` expone cinco rutas:

| Ruta | Área |
| --- | --- |
| `index` | Inicio y dashboard |
| `tarjetas` | Tarjetas |
| `msi` | Compras a MSI |
| `movimientos` | Ingresos, gastos y categorías |
| `alertas` | Recordatorios de pago |

Las pantallas consumen el contexto compartido y llaman operaciones CRUD expuestas por ese contexto. No existe una capa de estado global adicional.

### Persistencia

`frontend/src/db/database.ts` administra una instancia de `finanzas.db`, inicializa el esquema y crea categorías predeterminadas. El esquema actual contiene:

| Tabla | Responsabilidad |
| --- | --- |
| `cards` | Tarjetas, límites o saldos, días de corte y pago, alertas y configuración de cashback |
| `msi_purchases` | Compras a meses sin intereses asociadas a tarjetas |
| `incomes` | Ingresos y sus frecuencias |
| `categories` | Categorías de movimientos |
| `expenses` | Gastos, categoría y tarjeta opcional |
| `payment_cycles` | Estado local del ciclo de pago por tarjeta y mes |

`frontend/src/db/queries.ts` contiene consultas CRUD directas. No hay repositorios, unidad de trabajo ni capa de servicios. Los cambios de esquema son idempotentes y se ejecutan al inicializar la base.

Los datos son locales. El repositorio no contiene cifrado de una bóveda financiera ni mecanismos de respaldo o sincronización.

### Estado y flujo de datos

`AppDataContext` inicializa SQLite, carga las colecciones y las mantiene en memoria. Después de una mutación, vuelve a consultar los datos para refrescar el estado compartido.

```text
Pantalla o componente
        │
        ▼
AppDataContext
        │
        ├── operaciones CRUD ──► queries.ts ──► SQLite local
        │
        └── datos en memoria ──► finance.ts ──► resumen derivado
                                            │
                                            ▼
                                     interfaz de usuario
```

Este flujo es sencillo para el tamaño actual, pero implica cargar colecciones completas y recalcular agregados en memoria.

### Cálculos financieros

`frontend/src/utils/finance.ts` concentra funciones para:

- cargos y mensualidad actual de MSI;
- deuda y avance de compras;
- disponibilidad estimada de tarjetas;
- gastos e ingresos del mes;
- proyecciones de ingresos y cargos MSI;
- cashback;
- distribución de gastos por categoría;
- resumen del dashboard;
- próxima fecha de pago.

Estas funciones operan sobre los registros locales. Algunas reglas aún son ambiguas o incompletas, en especial ciclos de corte, saldos MSI, fechas sin zona horaria y cashback. Se documentan en [known-issues.md](known-issues.md).

### Monedas

Los tipos actuales permiten `MXN`, `USD` y `EUR`, pero este soporte es únicamente de etiquetado. No existe tipo de cambio, conversión, moneda base ni fecha de valuación. Los agregados pueden sumar importes nominales de monedas diferentes y mostrarlos usando una sola etiqueta.

### Alertas y notificaciones

`frontend/src/utils/notifications.ts` solicita permisos en plataformas nativas y programa notificaciones locales alrededor de la fecha de pago. La pantalla de Alertas permite activar o desactivar recordatorios por ciclo.

Las alertas son locales y estimadas:

- no consultan un banco;
- no conocen el estado de cuenta real;
- no confirman pagos;
- el total mostrado usa cargos MSI estimados, no el saldo exigible de una institución.

En web no se programan notificaciones nativas.

### Pruebas actuales

Existe una suite unitaria para cinco funciones puras de `finance.ts`, con 15 casos. No existen todavía pruebas de integración SQLite, componentes, navegación ni E2E. Tampoco existe una métrica de cobertura configurada.

### Limitaciones estructurales

- Reglas financieras y agregación conviven en un único módulo de utilidades.
- Las pantallas conocen las formas de datos de persistencia.
- El contexto coordina carga, mutación, estado y cálculos derivados.
- No existe un modelo formal de ciclo de facturación.
- Corte, pago, cashback y disponibilidad no comparten una política financiera explícita.
- Las fechas de calendario se representan como texto y en algunos puntos se convierten mediante `Date`.
- No existe conversión de monedas.
- Los reportes bajo `test_reports/` son históricos y no forman parte de una suite automatizada actual.

## Arquitectura planeada (Planned architecture)

Esta sección expresa una dirección de diseño. Los directorios y conceptos siguientes **no están implementados**.

### Objetivos

- Separar reglas de negocio, persistencia y presentación.
- Hacer explícitos los supuestos de fechas, redondeo, moneda y ciclos.
- Probar el motor financiero sin Expo, SQLite ni mocks complejos.
- Permitir evolución incremental sin reescribir toda la aplicación.

### Organización propuesta

```text
frontend/src/
├── domain/       Entidades, valores y reglas financieras puras
├── features/     Casos de uso y UI agrupados por capacidad
├── database/     Adaptadores SQLite, esquema, migraciones y repositorios
└── services/     Integraciones de plataforma, como notificaciones
```

La migración se realizaría por capacidades, manteniendo operativas las rutas actuales. Crear estos directorios por sí solo no aporta separación; cada movimiento debe acompañarse de límites claros y pruebas.

### BillingCycle planeado

`BillingCycle` se plantea como modelo de dominio para representar, como mínimo:

- periodo de compras incluido;
- fecha de corte;
- fecha límite de pago;
- cargos MSI aplicables;
- pagos y saldo pendiente;
- estado del ciclo;
- reglas de zona horaria y fecha de calendario.

Su semántica debe aprobarse antes de implementarse. El nombre de una tabla actual no equivale todavía a este modelo de dominio.

### Principios de evolución

1. Caracterizar primero el comportamiento actual con pruebas.
2. Resolver decisiones de producto antes de codificar fórmulas ambiguas.
3. Mantener funciones financieras puras e independientes de SQLite y Expo.
4. Encapsular persistencia detrás de interfaces sólo cuando exista un caso de uso concreto.
5. Migrar una capacidad a la vez.
6. Evitar cambios simultáneos de arquitectura, comportamiento y diseño.
