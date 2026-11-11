# Auditoría de documentación — 2026-11-10

## Alcance y resultado

Revisión de los 31 archivos Markdown versionados, GitHub Pages, plantillas de
contribución y documentación de Docker, escritorio y Home Assistant. Se contrastaron
las instrucciones con el código, los manifiestos y los workflows actuales.

La estructura de enlaces está bien, pero varias instrucciones operativas y
descripciones del producto necesitan corrección. Los hallazgos originales se conservan abajo como registro; el seguimiento
de correcciones indica los cambios y pruebas posteriores.

Validación realizada:

- 169 referencias locales revisadas: sin archivos o anclas ausentes detectados.
- `node scripts/check-pages.mjs`: correcto; recursos locales de Pages presentes.
- Releases de GitHub consultados: `v1.2.0` y `v1.2.0-desktop-preview.1` contienen el
  instalador Windows. El enlace de descarga del README es válido.
- Comparación estática con autenticación, CORS, SQLite, backups, idiomas y scripts
  de empaquetado. No se ejecutó una restauración, una compilación completa Linux
  ni una instalación limpia siguiendo cada guía. No se verificaron todos los
  enlaces externos ni el aspecto visual del sitio publicado.

Prioridades: P1 = riesgo para datos o disponibilidad; P2 = instrucciones que
fallan o expectativas incorrectas; P3 = mantenimiento y claridad.

## Seguimiento de correcciones

Correcciones aplicadas el 2026-11-10, pendientes de commit/publicación:

| Hallazgos | Resolución |
| --- | --- |
| D01–D02 | Respaldo offline del montaje real, restauración en volumen vacío y explicación de archivos excluidos de snapshots; permisos del usuario `node`. |
| D03 | DOCKER.md pasa a ser un índice con comandos correctos; plantilla de incidencias corregida. |
| D04–D06 | CORS, generación de secretos, conservación de configuración y límites del rollback corregidos. |
| D07 | Contexto Linux incluye el validador, paquetes JSON de idiomas y configuración HA requerida. |
| D08–D11 | Manuales, Pages, moneda de HA, bloqueo local, idiomas y política de soporte actualizados. Se distingue el instalador publicado del código actual. |
| D12–D13 | Referencia API ampliada, plantillas corregidas y documentos históricos identificados. |

Validación posterior:

- 181 referencias locales de los documentos versionados: sin errores detectados.
- Verificador de recursos de Pages y `git diff --check`: correctos.
- Contexto Linux generado: tres idiomas y ocho artefactos derivados verificados.
- Respaldo/restauración con volúmenes Docker temporales: integridad SQLite,
  registros, archivo adjunto y escritura como usuario no root correctos;
  restauración sobre un volumen poblado rechazada. Todos los volúmenes de prueba
  se retiraron. Se usó la imagen local `homeledger:audit-fixes`, sin datos reales.
- Instalación aislada con archivo privado de entorno, registro inicial y
  recreación del contenedor con la misma configuración/volumen: login posterior
  correcto. Misma imagen local; no constituye una prueba del tag remoto `latest`
  ni de una migración entre versiones distintas.
- Generación de secretos de PowerShell y Node: longitud/formato válidos, sin
  mostrar sus valores. Contexto generado sin archivos de entorno ni bases de datos.
- Procedimiento Linux: build de los tres paquetes, 11 tests de escritorio,
  staging del runtime y generación de AppImage/deb con checksums completados.
  Smoke tests del runtime antes y después de empaquetar: registro, refresh,
  persistencia, snapshot de actualización, rechazo de downgrade/puerto ocupado,
  SQLite/bcrypt/sharp, PDF, OCR inglés/español, recibos HTTP, backup/restore con
  adjuntos y cierre correctos. Esto no certifica una instalación gráfica Linux.

No se han probado instalaciones gráficas de Linux/macOS, certificados HTTPS ni
una migración de una base de producción. Las guías ya no prometen que esos casos
estén certificados. Los recursos locales de Pages están comprobados; publicar
estos cambios sigue siendo necesario para actualizar el sitio público.

## Hallazgos

### D01 · P1 · Respaldo de volumen sin detener las escrituras

`docs/DEPLOYMENT.md:190` y `DOCKER.md:140` muestran un tar del volumen sin detener
la aplicación antes del respaldo. SQLite usa WAL (`packages/backend/src/db/connection.ts:75`):
copiar sus archivos mientras cambian no garantiza una copia consistente. Además,
el volumen literal `homeledger-data` corresponde al ejemplo standalone; Compose
normalmente añade el nombre del proyecto, porque no hay un `name` explícito.

**Corrección:** separar standalone y Compose; identificar el volumen real y
detener todos los escritores para el tar, o utilizar la API de backup consistente
para la base. Documentar y probar una restauración completa. Aclarar que los
snapshots automáticos contienen la base, no los archivos de recibos ni la
configuración externa; por sí solos no recuperan toda la instalación.

### D02 · P1 · Corrección de permisos incompatible con el contenedor

`DOCKER.md:206–209` afirma que el contenedor corre como root y recomienda cambiar
`/data` a `root:root`. `Dockerfile:76` ejecuta como `node`. Seguir esa instrucción
puede impedir escribir en la base de datos.

**Corrección:** documentar el usuario efectivo y los permisos adecuados para cada
tipo de montaje. Eliminar la recomendación de cambiar el propietario a root.

### D03 · P2 · Comandos Compose con un servicio inexistente

`DOCKER.md` usa `docker compose logs/exec/restart homeledger`, y la plantilla
`.github/ISSUE_TEMPLATE/bug_report.md` repite ese nombre. Los servicios reales de
`docker-compose.yml` son `backend` y `frontend`.

**Corrección:** distinguir los comandos del contenedor standalone de los de
Compose. Consolidar instalación y operación en `docs/INSTALLATION.md` y
`docs/DEPLOYMENT.md`, dejando enlaces desde las guías antiguas.

### D04 · P2 · CORS documentado al revés

`docs/INSTALLATION.md:89` y `docs/DEPLOYMENT.md:136` dicen que, sin `CORS_ORIGIN`,
se refleja el origen recibido. `packages/backend/src/server.ts:60–68` utiliza
`false` cuando no hay una lista configurada. `.github/SECURITY.md` también conserva
la descripción antigua.

**Corrección:** explicar el comportamiento del mismo origen y la lista explícita
necesaria para clientes web en otros orígenes. No presentar la reflexión como valor
predeterminado.

### D05 · P2 · Ejemplos que no arrancan si se copian literalmente

Los ejemplos de instalación, Pages y contribución contienen
`your-strong-random-secret-min-32-chars` y `your-strong-password`. El validador
`packages/backend/src/security-check.ts` rechaza expresamente esos valores en
producción. Son placeholders, no credenciales filtradas, pero falta un paso claro
y ejecutable para sustituirlos. El ejemplo de actualización también debe preservar
la configuración existente en lugar de usar `JWT_SECRET="..."`.

**Corrección:** generar secretos antes del primer arranque y reutilizar un archivo
de configuración en las actualizaciones. Probar el recorrido de instalación desde
cero con las instrucciones publicadas.

### D06 · P2 · Promesa excesiva de compatibilidad al retroceder versiones

`docs/DEPLOYMENT.md:226` indica que volver a una imagen antigua es sencillo porque
las migraciones son aditivas. Eso no demuestra compatibilidad del esquema o los
datos con versiones anteriores. Escritorio, además, bloquea expresamente ciertos
downgrades (`packages/desktop/src/backend.cjs`).

**Corrección:** separar servidor y escritorio; documentar rollback a una versión
compatible junto con su respaldo previo, sin garantías generales no verificadas.

### D07 · P2 · Compilación Linux documentada omite dependencias

`docs/desktop.md:104–105` indica generar el contexto con `linux-context.mjs` y
compilarlo. El script copia paquetes y algunos archivos raíz, pero omite
`scripts/locales.mjs`, `locales/` y `ha-addon/config.yaml`. El Dockerfile de QA
ejecuta `npm run build`, cuyo `prebuild` exige esos archivos; los módulos de
traducción también importan los JSON de la raíz.

**Corrección:** actualizar la lista acotada de archivos del contexto y verificar
la compilación Linux. Es un defecto del procedimiento y de su script, no solo de
redacción. Confirmado por inspección de dependencias; no se ejecutó Docker build
en esta auditoría.

### D08 · P2 · Manuales indican una contraseña mínima incorrecta

`docs/USER_MANUAL.md:641` y `docs/USER_MANUAL.es.md:660` indican seis caracteres.
La validación de cambio de contraseña exige ocho
(`packages/backend/src/routes/v1/auth.routes.ts:213`).

**Corrección:** sincronizar ambos manuales con la validación de registro y cambio.

### D09 · P2 · Idiomas y capacidades desactualizados

Pages (`docs/index.html:272,383,396`) y ambos manuales siguen describiendo una
interfaz bilingüe en inglés/español. El código actual y el README incluyen `pt-BR`.
`ha-addon/DOCS.md` conserva una descripción de moneda única sin conversión que
no explica las capacidades actuales por cuenta y los tipos de cambio manuales.

**Corrección:** enlazar el catálogo de idiomas mantenido y revisar moneda y flujos
en ambos temas. Quick Entry necesita explicar su apertura modal y la diferencia de
distribución entre temas; el formulario normal conserva sus pasos.

**Distinción de versiones:** el instalador Windows publicado se construyó desde
`e180175`, anterior a cambios posteriores de main. No atribuirle automáticamente
todos los idiomas o funciones presentes hoy en el repositorio.

### D10 · P2 · Explicación ambigua de la protección del bloqueo local

Los manuales describen correctamente el bloqueo como una comodidad, pero añaden
que quien lo salte desde devtools todavía necesita el JWT. La sesión autenticada
ya guarda sus tokens en `sessionStorage`
(`packages/frontend/src/lib/api/client.ts:37–48`). Esa frase puede sugerir una
protección adicional que el bloqueo visual no ofrece frente a acceso al navegador.

**Corrección:** explicar claramente que el bloqueo local no sustituye el cierre
de sesión ni protege contra alguien con acceso al perfil y herramientas del
navegador. Esto no implica una omisión de autenticación en la API.

### D11 · P2 · Política de versiones soportadas desactualizada

`.github/SECURITY.md:14` solo marca `1.1.x` como soportada; existe el release servidor
`1.2.0`. El instalador adjunto sigue siendo un preview sin firma, como explica el
release, aunque se descargue desde el mismo lugar.

**Corrección:** publicar la política vigente y distinguir soporte del servidor de
la validación y firma pendientes del escritorio.

### D12 · P3 · Referencia API y plantillas incompletas

La tabla de `docs/REFERENCE.md` omite rutas registradas como reglas, etiquetas,
búsqueda, claves API, webhooks y MCP. La plantilla de PR todavía pide actualizar
una tabla de variables del README que ahora está en instalación; STABILITY
también conserva una referencia textual antigua al README para la API.

**Corrección:** definir si la tabla es un resumen o un catálogo completo, enlazar
Swagger como referencia detallada y actualizar las instrucciones de contribución.

### D13 · P3 · Documentos históricos parecen instrucciones vigentes

`ROADMAP.md` sigue enmarcado en el recorrido hacia 1.0; `DOCKER_SETUP.md` contiene
datos de tamaño, etapas de imagen y multiarch que no representan el Dockerfile y
workflow actuales. Mantener varias guías equivalentes favorece divergencias.

**Corrección:** marcar los documentos históricos con fecha y alcance, conservar
la evidencia de auditorías/QA sin reescribirla como si fuera actual y establecer
una guía canónica por tema. No borrar indiscriminadamente planes o registros.

## Orden propuesto

1. Corregir y validar backups, restauración y permisos (D01–D02).
2. Reparar el contexto Linux y probar instalación/actualización documentadas (D03–D07).
3. Sincronizar manuales, Pages y política de seguridad (D08–D11).
4. Consolidar referencias y marcar archivos históricos (D12–D13).
5. Repetir checks de enlaces y realizar pruebas de los recorridos operativos
   corregidos antes de considerar cerrados los hallazgos.
