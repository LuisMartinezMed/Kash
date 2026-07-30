# Kash

Kash es una aplicación de finanzas personales *mobile-first* para registrar tarjetas, ingresos, gastos y compras a meses sin intereses (MSI) en un solo lugar. Su objetivo es ayudar a entender la disponibilidad cotidiana y anticipar compromisos del mes sin depender de una cuenta bancaria conectada ni de un servicio remoto.

## Estado del proyecto

Kash se encuentra en desarrollo activo. La base técnica, las validaciones automatizadas iniciales y la persistencia local están implementadas; el motor financiero todavía tiene reglas pendientes de definición antes de considerarse apto para decisiones financieras críticas.

Todos los datos de la aplicación se almacenan localmente mediante SQLite. Actualmente no existen cuentas de usuario, sincronización en la nube ni integración con instituciones bancarias.

## Funcionalidades actuales

- Dashboard con límites, disponibilidad, gastos, proyección mensual, MSI, cashback y distribución por categorías.
- Alta, edición y eliminación de tarjetas de crédito y débito.
- Registro y seguimiento de compras a meses sin intereses.
- Alta, edición y eliminación de ingresos y gastos.
- Categorías predeterminadas y personalizadas.
- Frecuencias de ingreso diarias, semanales, quincenales y mensuales.
- Configuración de porcentajes de cashback por tarjeta.
- Recordatorios locales asociados a fechas de pago.
- Navegación por cinco áreas: Inicio, Tarjetas, MSI, Movimientos y Alertas.
- Persistencia local con Expo SQLite.

El modelo permite etiquetar importes como MXN, USD o EUR, pero todavía no realiza conversión de monedas. Las alertas y proyecciones son estimaciones locales, no estados de cuenta bancarios.

## Stack

| Área | Tecnología |
| --- | --- |
| Aplicación | Expo SDK 54 |
| Interfaz | React Native 0.81.5 y React 19.1.0 |
| Lenguaje | TypeScript 5.9 en modo estricto |
| Navegación | Expo Router 6 |
| Persistencia | Expo SQLite 16 |
| Notificaciones | Expo Notifications |
| Gráficas | React Native SVG |
| Calidad | ESLint 9 y TypeScript |
| Pruebas | Jest 29.7.0 y jest-expo 54.0.17 |
| Dependencias | Yarn 1.22.22 mediante Corepack |

## Arquitectura resumida

La aplicación vive en `frontend/`. Expo Router define las pantallas en `frontend/app/`; los contextos coordinan el estado en memoria; las consultas de `frontend/src/db/` leen y escriben en SQLite; y `frontend/src/utils/finance.ts` calcula los valores derivados que consume la interfaz.

La descripción completa, incluyendo las limitaciones actuales y la arquitectura futura propuesta, está en [docs/architecture.md](docs/architecture.md).

## Capturas

Capturas de pantalla pendientes.

## Requisitos

- Node.js LTS compatible con Expo SDK 54 (Node 20.19 o posterior).
- Corepack disponible.
- Android Studio para trabajar con un emulador o una compilación local de Android.
- macOS y Xcode para una compilación local de iOS.

No es necesario instalar Yarn globalmente. El repositorio fija Yarn 1.22.22 mediante el campo `packageManager`.

## Instalación

Desde la raíz del repositorio:

```powershell
corepack yarn install --cwd frontend --frozen-lockfile
```

Inicia el servidor de desarrollo:

```powershell
corepack yarn --cwd frontend start
```

Expo mostrará las opciones disponibles para abrir Android, iOS o web. Consulta [docs/development.md](docs/development.md) para la configuración completa del entorno y el flujo de trabajo.

## Scripts

Todos estos comandos se ejecutan desde la raíz:

| Comando | Propósito |
| --- | --- |
| `corepack yarn --cwd frontend start` | Inicia Expo. |
| `corepack yarn --cwd frontend android` | Inicia Expo y solicita abrir Android. |
| `corepack yarn --cwd frontend ios` | Inicia Expo y solicita abrir iOS; la compilación local requiere macOS. |
| `corepack yarn --cwd frontend web` | Inicia la versión web. |
| `corepack yarn --cwd frontend lint` | Ejecuta ESLint directamente. |
| `corepack yarn --cwd frontend typecheck` | Comprueba TypeScript sin emitir archivos. |
| `corepack yarn --cwd frontend test` | Ejecuta las pruebas unitarias en serie. |
| `corepack yarn --cwd frontend test:watch` | Ejecuta Jest en modo interactivo. |

## Documentación

- [Arquitectura](docs/architecture.md)
- [Desarrollo y validación](docs/development.md)
- [Problemas conocidos](docs/known-issues.md)
- [Roadmap](docs/roadmap.md)
- [PRD](docs/PRD.md)
- [Guías de diseño](docs/design-guidelines.json)
- [Instrucciones para agentes](AGENTS.md)

## Roadmap resumido

Las fases 0.1 a 0.4 establecieron la limpieza del repositorio, herramientas de calidad, pruebas iniciales, correcciones de assets y una configuración válida del splash. La fase 0.5 documenta el proyecto. Las fases planeadas abarcan el motor financiero y `BillingCycle`, captura rápida, experiencia móvil, integración nativa Android y preparación para publicación.

El detalle y el estado de cada fase están en [docs/roadmap.md](docs/roadmap.md).

## Privacidad y contribuciones

Kash maneja información financiera personal. Las pruebas, documentos, logs y capturas deben utilizar exclusivamente datos sintéticos y no deben incluir credenciales bancarias, tokens, secretos ni información financiera real.

Antes de contribuir, revisa [AGENTS.md](AGENTS.md), mantén los cambios pequeños y valida `lint`, `typecheck` y `test`. Los cambios se integran mediante una rama dedicada y un Pull Request revisable.
