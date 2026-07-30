# Desarrollo

## Requisitos

- Node.js LTS compatible con Expo SDK 54. El mínimo de la línea SDK 54 es Node 20.19.
- Corepack.
- Git.
- Android Studio y un Android SDK cuando se utilice un emulador o una compilación local de Android.
- macOS y Xcode para compilar iOS localmente.

El repositorio fija Yarn 1.22.22 mediante `frontend/package.json`. No instales Yarn globalmente ni cambies de gestor de paquetes.

## Instalación desde cero

Clona el repositorio y entra en su raíz:

```powershell
git clone https://github.com/LuisMartinezMed/Kash.git
Set-Location Kash
```

Instala exactamente lo descrito por `yarn.lock`:

```powershell
corepack yarn install --cwd frontend --frozen-lockfile
```

`--frozen-lockfile` impide que una instalación de desarrollo reescriba silenciosamente el lockfile.

## Ejecución

Todos los comandos de esta guía parten de la raíz del repositorio.

```powershell
corepack yarn --cwd frontend start
```

También se puede solicitar una plataforma:

```powershell
corepack yarn --cwd frontend android
corepack yarn --cwd frontend ios
corepack yarn --cwd frontend web
```

El comando `ios` puede iniciar el flujo de Expo, pero una compilación local nativa de iOS requiere macOS.

## Scripts

Los scripts definidos actualmente en `frontend/package.json` son:

| Script | Comando desde la raíz | Resultado |
| --- | --- | --- |
| `start` | `corepack yarn --cwd frontend start` | Inicia el servidor de Expo. |
| `android` | `corepack yarn --cwd frontend android` | Inicia Expo y solicita abrir Android. |
| `ios` | `corepack yarn --cwd frontend ios` | Inicia Expo y solicita abrir iOS. |
| `web` | `corepack yarn --cwd frontend web` | Inicia Expo para web. |
| `lint` | `corepack yarn --cwd frontend lint` | Ejecuta ESLint directamente. |
| `typecheck` | `corepack yarn --cwd frontend typecheck` | Ejecuta TypeScript sin emitir archivos. |
| `test` | `corepack yarn --cwd frontend test` | Ejecuta Jest en serie. |
| `test:watch` | `corepack yarn --cwd frontend test:watch` | Ejecuta Jest en modo interactivo. |

### Script destructivo de scaffolding

`frontend/scripts/reset-project.js`, expuesto como `reset-project`, pertenece al scaffolding original de Create Expo App. Puede mover o eliminar directorios de la aplicación y generar una estructura vacía.

No forma parte del flujo normal de Kash y no debe ejecutarse sin una tarea explícita, una revisión de su contenido y autorización previa.

## Validación

Antes de entregar cambios de código o configuración:

```powershell
corepack yarn --cwd frontend lint
corepack yarn --cwd frontend typecheck
corepack yarn --cwd frontend test
git diff --check
git status --short
```

Revisa además:

```powershell
git diff --stat
git diff
```

No declares como correcta una comprobación que no se ejecutó. Si falla, conserva la salida relevante y determina si es una regresión o un problema preexistente.

### Expo Doctor

Para una revisión de compatibilidad del proyecto:

```powershell
npx --yes expo-doctor frontend
```

Expo Doctor puede consultar información de paquetes. Revisa cualquier cambio sugerido antes de instalar o actualizar dependencias.

### Configuración Expo

Para comprobar la configuración resuelta sin hacer prebuild:

```powershell
corepack yarn --cwd frontend expo config --type public
corepack yarn --cwd frontend expo config --type introspect
```

Un prebuild de diagnóstico puede generar directorios nativos y modificar archivos. Si se necesita, ejecútalo en una copia temporal del repositorio, no en el árbol de trabajo activo.

## Matriz de validación

| Tipo de cambio | Comprobaciones adicionales |
| --- | --- |
| Lógica financiera | Casos unitarios de límites, fechas y redondeo; supuestos documentados |
| SQLite o queries | Inicialización desde una base vacía, migración y CRUD afectado |
| Navegación o UI | Rutas relacionadas, TypeScript y revisión visual en plataformas aplicables |
| Assets o splash | Dimensiones, formato, transparencia, Expo Doctor y revisión visual |
| Dependencias | Diff de `package.json` y `yarn.lock`, instalación congelada y compatibilidad Expo |
| Documentación | Enlaces relativos, comandos reales, alcance y `git diff --check` |

## Flujo de ramas y Pull Requests

1. Parte de una rama principal actualizada y limpia.
2. Crea una rama dedicada a una sola tarea.
3. Inspecciona el estado local antes de editar.
4. Mantén cambios pequeños y revisables.
5. Ejecuta la validación proporcional al riesgo.
6. Revisa los diffs staged y unstaged.
7. Crea commit, push y Pull Request sólo con autorización.
8. Describe cambios, validación, limitaciones y pendientes en el Pull Request.
9. Fusiona y elimina ramas únicamente después de aprobación.

No permitas que dos agentes escriban simultáneamente en la misma rama.

## Windows y Corepack

En algunos entornos Windows, `expo lint` intentó invocar `yarnpkg` y Corepack no pudo crear un shim dentro de un directorio protegido del sistema.

El proyecto evita esa dependencia ejecutando ESLint directamente mediante el script `lint`:

```powershell
corepack yarn --cwd frontend lint
```

Usa siempre `corepack yarn` para seleccionar la versión fijada por el repositorio. No es necesario ni recomendable resolver este problema instalando Yarn globalmente o modificando directorios protegidos.

## Dependencias y datos

- No ejecutes `yarn upgrade`, `npm update` ni instalaciones globales.
- No modifiques versiones o el lockfile sin autorización.
- Usa datos sintéticos en pruebas, ejemplos, logs y capturas.
- No agregues secretos, tokens, credenciales bancarias ni bases de datos locales al repositorio.
- Consulta [AGENTS.md](../AGENTS.md) para las reglas completas de colaboración.
