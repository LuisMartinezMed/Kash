# Problemas conocidos y decisiones pendientes

## Alcance

Este registro distingue bugs confirmados, riesgos, comportamientos ambiguos, limitaciones y brechas de validación. Una entrada no implica automáticamente que el comportamiento sea incorrecto: varias requieren una decisión de producto antes de modificar código.

Los niveles de severidad expresan impacto potencial:

- **Alta:** puede producir una interpretación financiera materialmente incorrecta.
- **Media:** afecta casos relevantes, validación o confianza, pero tiene alcance acotado.
- **Baja:** impacto menor o principalmente técnico.
- **Informativa:** no es un fallo del producto, pero evita interpretar evidencia histórica como actual.

## Registro

| ID | Tema | Tipo | Severidad | Estado | Evidencia actual | Decisión de producto requerida | Fase prevista |
| --- | --- | --- | --- | --- | --- | --- | --- |
| KI-01 | Fechas `YYYY-MM-DD` interpretadas como UTC | Riesgo | Alta | Abierto | Varias utilidades construyen `Date` directamente desde texto `YYYY-MM-DD`. En zonas horarias al oeste de UTC puede representar el día calendario anterior. | Sí: definir si las fechas financieras son fechas locales puras y establecer una estrategia de parseo. | Fase 1 |
| KI-02 | `msiPaidSoFar` y saldo restante | Comportamiento ambiguo | Alta | Pendiente de definición | El cálculo considera pagadas las mensualidades anteriores a la actual. Al llegar al último mes puede conservar una mensualidad como saldo restante. | Sí: definir cuándo se considera pagada la mensualidad actual y cuándo termina la deuda. | Fase 1 |
| KI-03 | `cardAvailableBalance` | Limitación del modelo | Alta | Abierto | La disponibilidad resta gastos históricos y MSI acumulados sin construir estados de cuenta por corte, pagos aplicados o ciclos completos. | Sí: definir saldo inicial, cargos, pagos, corte y disponibilidad por tipo de tarjeta. | Fase 1 |
| KI-04 | `nextPayDate` después de las 09:00 | Comportamiento ambiguo | Media | Pendiente de definición | En el día de pago la función fija las 09:00 y compara principalmente el día calendario; después de esa hora puede devolver una hora ya transcurrida del mismo día. | Sí: decidir si debe conservar el día actual o avanzar al siguiente ciclo. | Fase 1 |
| KI-05 | Cashback negativo | Riesgo | Media | Abierto | La interfaz rechaza importes no positivos, pero la función pura puede calcular cashback negativo si recibe una cantidad negativa. | Sí: definir tratamiento de reembolsos, contracargos y ajustes negativos. | Fase 1 |
| KI-06 | `mes_inicio` fuera de `01..12` | Brecha de validación | Media | Abierto | La validación de formato acepta valores como `YYYY-00` y `YYYY-13`; las funciones posteriores no rechazan explícitamente esos meses. | Sí: decidir entre rechazo estricto o una normalización explícita. | Fase 1 |
| KI-07 | Reportes `test_reports/iteration_*.json` | Artefacto histórico | Informativa | Documentado | Los archivos describen ejecuciones, rutas, URLs y comportamientos de iteraciones anteriores. No están conectados a la suite Jest actual. | No. Deben conservarse e interpretarse como historial, no como estado vigente. | Fase 0.5 |
| KI-08 | Splash sin validación visual iOS | Brecha de validación | Media | Pendiente de validación | La configuración y el prebuild se validaron localmente para Android en Windows; no existe comprobación visual equivalente de iOS. | No para la regla funcional; sí se necesita una decisión operativa sobre el entorno de validación. | Fase 4 o 5 |
| KI-09 | Agregación nominal de monedas | Limitación del modelo | Alta | Abierto | Los registros pueden usar MXN, USD o EUR, pero los totales suman importes sin tipo de cambio y suelen mostrarse con una sola etiqueta de moneda. | Sí: definir moneda base, fuente y fecha del tipo de cambio, redondeo y presentación. | Fase 1 |
| KI-10 | `fecha_corte` no aplicada | Limitación del modelo | Alta | Abierto | El día de corte se almacena y se muestra, pero no delimita gastos, disponibilidad, proyecciones o estados de cuenta. | Sí: definir el ciclo de facturación y su relación con compras, pagos y fecha límite. | Fase 1 |
| KI-11 | `cashback_pay_day` no aplicado | Limitación del modelo | Media | Abierto | El día de pago de cashback se almacena y edita, pero no participa en cálculos ni programación de notificaciones; el cashback se incorpora a proyecciones de otra forma. | Sí: definir cuándo se devenga, confirma y acredita el cashback. | Fase 1 |
| KI-12 | Total de Alertas como estimación | Limitación funcional | Alta | Documentado | El importe de la pantalla de Alertas se deriva de cargos MSI estimados. No incluye un estado de cuenta bancario ni confirma otros cargos, pagos o intereses. | Sí: definir el significado y nombre del total, y si se conservará como estimación o evolucionará a saldo de ciclo. | Fase 1 |

## Criterios para actualizar el registro

- Cambia el estado sólo cuando exista evidencia reproducible o una decisión aprobada.
- No reclasifiques un riesgo como bug confirmado sin un caso que demuestre incumplimiento de una regla definida.
- Vincula cualquier corrección futura con pruebas que caractericen el caso.
- Conserva los reportes históricos sin usarlos como sustituto de las validaciones actuales.
- Si una decisión modifica el significado financiero del producto, actualiza también el PRD y la arquitectura.
