# Instrucciones para agentes

Este archivo contiene las reglas compartidas para Codex, Claude Code y cualquier otro agente que trabaje en Kash. Las instrucciones específicas de una tarea prevalecen cuando son más restrictivas; ninguna instrucción implícita amplía el alcance autorizado.

## Antes de editar

1. Lee la solicitud completa y define el alcance exacto.
2. Inspecciona los archivos relacionados y sus consumidores antes de proponer cambios.
3. Ejecuta `git status --short` y revisa todos los cambios locales, incluidos staged, unstaged y untracked.
4. Distingue los cambios existentes de los que requiere la tarea. No sobrescribas trabajo ajeno.
5. Comprueba la rama actual y confirma que ningún otro agente la esté modificando.
6. Expón el plan y solicita aprobación cuando la tarea lo requiera.

Un solo agente puede modificar una rama a la vez. Otros agentes pueden realizar análisis de sólo lectura, pero no deben escribir simultáneamente en la misma rama.

## Alcance y Git

- Mantén cada cambio pequeño, focalizado y fácil de revisar.
- No realices trabajo adyacente sólo porque parezca conveniente.
- No hagas `commit`, `push`, `merge`, `rebase`, `reset`, `restore`, `clean` ni cambies de rama sin autorización explícita.
- Confirma antes de eliminar archivos, ejecutar `git rm`, mover grupos amplios de archivos o regenerar artefactos.
- No descartes ni reformatees cambios locales que no pertenezcan a la tarea.
- Antes de terminar, informa todos los archivos modificados y cualquier validación que no haya podido ejecutarse.

## Dependencias y herramientas

- Usa Yarn 1.22.22 mediante Corepack y respeta `frontend/yarn.lock`.
- Ejecuta comandos desde la raíz con `corepack yarn --cwd frontend ...`.
- No instales Yarn globalmente.
- No actualices, sustituyas ni agregues dependencias sin aprobación.
- No ejecutes `yarn upgrade`, `npm update` ni instalaciones globales.
- No modifiques Expo, React Native, Babel, Metro, TypeScript o configuración nativa fuera del alcance autorizado.

## Código y tipado

- Comprende el comportamiento actual antes de modificarlo.
- Preserva la configuración estricta de TypeScript.
- No introduzcas nuevos `as any`, `@ts-ignore`, `@ts-expect-error` ni `@ts-nocheck` para ocultar errores.
- Esta regla no afirma que el repositorio actual esté completamente libre de esos patrones; las apariciones existentes son deuda técnica, no precedentes para código nuevo.
- Corrige la causa de un error de tipo o documenta el bloqueo. No lo suprimas.
- Evita refactors amplios junto con correcciones funcionales.
- Añade o actualiza pruebas cuando cambie un comportamiento observable.

## Lógica financiera

- No modifiques lógica financiera sin autorización explícita y pruebas proporcionales al riesgo.
- Antes de cambiar una fórmula, documenta:
  - significado de cada entrada;
  - unidades y moneda;
  - reglas de redondeo;
  - interpretación de fechas y zona horaria;
  - límites del mes y ciclo de facturación;
  - comportamiento antes, durante y después del periodo aplicable.
- No supongas reglas bancarias, fiscales, de cashback o MSI que no estén definidas.
- Señala cuándo una decisión depende del producto y no sólo de la implementación.
- Mantén separadas las etiquetas de moneda y la conversión real de divisas.

## Persistencia y privacidad

- Trata SQLite y sus migraciones como datos sensibles al cambio: inspecciona esquema, consultas y consumidores antes de editar.
- No almacenes ni documentes credenciales bancarias, contraseñas, secretos, tokens, llaves o datos financieros reales.
- Usa exclusivamente datos sintéticos en pruebas, fixtures, documentación, ejemplos, logs y capturas.
- Sanitiza cualquier salida que pueda contener rutas privadas, identificadores personales o información financiera.
- No agregues servicios de telemetría, sincronización o red sin aprobación explícita.

## Validación

Como mínimo, antes de entregar una implementación:

```powershell
corepack yarn --cwd frontend lint
corepack yarn --cwd frontend typecheck
corepack yarn --cwd frontend test
git diff --check
git status --short
```

Además:

- Revisa `git diff` y confirma que sólo cambió el alcance aprobado.
- Verifica archivos staged y unstaged por separado cuando se vaya a crear un commit.
- Añade comprobaciones específicas para SQLite, Expo, assets o configuración cuando corresponda.
- No declares una validación como aprobada si no se ejecutó.
- Distingue fallos preexistentes de regresiones introducidas por la tarea.

## Documentación y entrega

- Describe el estado real; separa claramente lo implementado de lo planeado.
- No inventes métricas, compatibilidad, cobertura, CI, publicaciones o enlaces.
- Registra supuestos financieros y decisiones de producto pendientes.
- Finaliza con un resumen de cambios, resultados de validación, riesgos y trabajo fuera de alcance.
