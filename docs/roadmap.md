# Roadmap

## Alcance

Este roadmap expresa la intención actual del proyecto. Puede cambiar conforme se validen reglas de producto y restricciones técnicas. No representa fechas, releases ni compromisos temporales.

Estados:

- **Completed:** alcance de la fase integrado.
- **In progress:** trabajo activo, todavía no finalizado.
- **Planned:** dirección prevista, su alcance detallado requiere aprobación.

## Fases

### Fase 0.1 — Limpieza e higiene del repositorio

**Estado: Completed**

- Limpieza del `.gitignore` para el stack actual.
- Retiro de artefactos generados de Metro.
- Organización de documentación útil bajo `docs/`.
- Eliminación de scaffolding sin uso.
- Incorporación de un `yarn.lock` reproducible con Yarn 1.22.22.

### Fase 0.2 — Herramientas de calidad y pruebas unitarias

**Estado: Completed**

- Scripts reproducibles para lint, typecheck y pruebas.
- ESLint directo para evitar dependencia del shim global `yarnpkg`.
- Jest configurado con `jest-expo`.
- Primeras 15 pruebas de lógica financiera pura.
- Corrección tipada de identificadores de pestañas.

### Fase 0.3 — Pulido técnico y corrección de assets

**Estado: Completed**

- Eliminación de imports y variables sin uso.
- Lint sin advertencias.
- Normalización de los principales iconos Expo a 512 × 512.
- Validación completa con Expo Doctor.

### Fase 0.4 — Configuración del splash

**Estado: Completed**

- Corrección de la referencia inexistente del splash.
- Reutilización del icono existente sin generar un asset nuevo.
- Validación de configuración Expo y prebuild temporal Android.

La revisión visual de iOS permanece registrada como una brecha de validación, no como parte completada de esta fase.

### Fase 0.5 — Documentación profesional e instrucciones para agentes

**Estado: In progress**

- README profesional para producto y desarrollo.
- Documentación de arquitectura actual y planeada.
- Guía reproducible de desarrollo y validación.
- Registro clasificado de problemas y decisiones pendientes.
- Reglas compartidas para agentes y guía específica para Claude Code.
- Roadmap visible y verificable.

La fase se considerará completada cuando los documentos reflejen el repositorio real, sus enlaces y comandos sean válidos y el conjunto pase revisión.

### Fase 1 — Motor financiero y BillingCycle

**Estado: Planned**

Dirección prevista:

- Definir reglas de fechas de calendario, corte y pago.
- Diseñar y validar el modelo de dominio `BillingCycle`.
- Resolver semántica de saldos, pagos y mensualidades MSI.
- Definir cashback, reembolsos y momento de acreditación.
- Decidir y aplicar una estrategia de monedas.
- Separar cálculos puros de persistencia y plataforma.
- Ampliar pruebas por límites, periodos y decisiones financieras.

No se implementará una fórmula ambigua sin una decisión de producto documentada.

### Fase 2 — Captura rápida

**Estado: Planned**

Dirección prevista:

- Reducir pasos para registrar movimientos frecuentes.
- Definir valores predeterminados seguros y editables.
- Mejorar selección de tarjeta, categoría y fecha.
- Conservar validaciones financieras y datos locales.
- Evaluar accesos rápidos sólo después de estabilizar el modelo.

### Fase 3 — Experiencia móvil

**Estado: Planned**

Dirección prevista:

- Revisar jerarquía visual, estados vacíos, carga y errores.
- Mejorar accesibilidad, teclado, formularios y navegación.
- Validar diseño en diferentes tamaños de pantalla.
- Incorporar retroalimentación visual consistente.
- Realizar pruebas de interacción proporcionales a las capacidades.

### Fase 4 — Integración nativa Android

**Estado: Planned**

Dirección prevista:

- Validar comportamiento en dispositivo y emulador Android.
- Revisar permisos, notificaciones y persistencia durante ciclos de vida nativos.
- Preparar configuración nativa reproducible cuando sea necesaria.
- Verificar splash, iconos y comportamiento de builds.
- Mantener los cambios nativos separados de las reglas financieras.

### Fase 5 — Preparación para publicación

**Estado: Planned**

Dirección prevista:

- Definir requisitos de privacidad y distribución.
- Completar validaciones visuales y funcionales de plataformas objetivo.
- Preparar metadatos y assets sólo con contenido aprobado.
- Revisar builds de producción, versiones y proceso de entrega.
- Confirmar que problemas críticos estén resueltos o explícitamente aceptados.

Esta fase no implica que Kash esté actualmente publicado ni que exista una fecha comprometida para hacerlo.
