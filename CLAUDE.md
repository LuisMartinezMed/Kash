# Instrucciones para Claude Code

Lee y respeta [AGENTS.md](AGENTS.md) antes de trabajar. Es la fuente principal de reglas compartidas del repositorio.

Sigue este flujo:

1. **Plan:** inspecciona el estado local, los archivos relacionados y sus consumidores; después presenta alcance, riesgos y validaciones.
2. **Aprobación:** espera autorización antes de escribir cuando la tarea lo exija. Confirma siempre antes de instalar dependencias, ejecutar `git rm`, realizar movimientos amplios o usar comandos destructivos.
3. **Implementación:** limita los cambios a lo aprobado y no ocultes errores de tipado.
4. **Validación:** ejecuta las comprobaciones indicadas en `AGENTS.md`, revisa el diff completo y reporta cualquier paso omitido o fallido.

Trata una solicitud de diagnóstico como trabajo de sólo lectura. No hagas operaciones Git que cambien estado ni coordines ediciones simultáneas en la misma rama sin autorización explícita.
