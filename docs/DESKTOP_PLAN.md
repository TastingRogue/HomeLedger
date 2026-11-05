# HomeLedger Desktop — plan de implementación

Fecha: 3 de noviembre de 2026. Rama: `codex/homeledger-desktop`.

Estado: **implementación en curso; builds de prueba Windows/Linux; release estable pendiente de QA y firma**. Última actualización: 4 de noviembre de 2026.

Este documento define el alcance de la primera versión de escritorio. Es la referencia para retomar el trabajo entre sesiones. Las tareas pendientes no constituyen funcionalidades ya disponibles.

## 1. Objetivo y experiencia esperada

Ofrecer HomeLedger como aplicación local para personas que no quieren administrar un servidor. El usuario descarga un instalador de GitHub Releases, instala, abre la aplicación, crea su cuenta y empieza a registrar sus finanzas. No instala Docker, Node.js, herramientas de compilación ni una base de datos.

La interfaz, los temas Normal y Cyberpunk, los idiomas y los modelos de datos siguen siendo los de HomeLedger. El backend se ejecuta automáticamente dentro del ciclo de vida de la aplicación. Los datos permanecen en la máquina; no se introduce una nube ni una cuenta externa.

La versión de servidor, Docker y Home Assistant siguen funcionando y teniendo su propio proceso de distribución.

## 2. Reglas para mantener el alcance

1. Cada tarea de implementación debe corresponder a una fase y un criterio de aceptación de este documento.
2. Corregir problemas necesarios para escritorio; no aprovechar la rama para rediseños generales, nuevas funciones financieras o refactorizaciones ajenas.
3. Compartir frontend y servicios existentes. No mantener una segunda aplicación financiera ni copiar vistas para escritorio.
4. No eliminar campos, controles o funciones existentes para facilitar el empaquetado.
5. No afirmar compatibilidad de un sistema o arquitectura solo porque compiló. Registrar por separado compilación, prueba automática y prueba real del instalador.
6. No publicar una release estable mientras falten verificaciones obligatorias. Una pre-release puede documentar restricciones explícitas.
7. Actualizar el registro de avances al terminar cada fase: cambios, pruebas, limitaciones y siguiente paso.
8. Los cambios de alcance se registran en la sección 16 antes de implementarlos. Una decisión técnica rutinaria dentro del alcance no necesita interrumpir al usuario.

## 3. Alcance de la primera versión

### Incluido

- Ventana de escritorio con Electron y la interfaz actual.
- Backend Fastify local, SQLite, migraciones y tareas programadas existentes.
- Datos persistentes por usuario del sistema operativo, separados del directorio de instalación.
- Primer registro y autenticación existentes, sin credenciales predeterminadas.
- Un único proceso propietario de los datos por perfil y una sola instancia de la aplicación.
- Inicio, estado de carga, errores recuperables, cierre ordenado y reapertura.
- Ambos temas, inglés/español y diseño adaptable.
- Importación CSV, recibos, imágenes, PDF y OCR sin instalaciones adicionales.
- Exportación/importación de respaldos existentes y protección antes de migrar datos.
- Descargas y enlaces externos controlados desde la ventana.
- Instaladores, builds automatizados, sumas SHA-256 y documentación de instalación.
- Actualización manual instalando una versión posterior sobre la anterior, conservando datos.
- Información básica de versión, ruta de datos y acceso a logs para diagnóstico.

### Fuera de alcance

- Sincronización entre dispositivos, nube, colaboración o una nueva cuenta central.
- Conexión de la app de escritorio a un servidor remoto.
- Acceso LAN, puertos públicos, servidor siempre encendido o túneles.
- Autoactualización y descarga automática de nuevas versiones.
- App Store, Microsoft Store, Flatpak, Snap y gestores de paquetes adicionales.
- Windows ARM64, Linux ARM64, sistemas de 32 bits y una edición portable de Windows.
- Inicio automático con el sistema, bandeja y notificaciones nativas.
- Autologin, eliminación del login, biometría o cifrado completo de la base de datos.
- Múltiples perfiles de datos o selector de bases de datos.
- Migración directa de volúmenes Docker/HA o copia de bases de datos activas.
- Rediseño general de vistas, nuevos temas o nuevas funciones financieras.
- Ejecución de tareas cuando la aplicación está cerrada.

Las integraciones existentes dependientes de red no se convierten en promesas de funcionamiento sin conexión. Home Assistant y clientes MCP externos no forman parte de la experiencia local soportada en esta versión; no se habilitará acceso de red para acomodarlos.

## 4. Matriz de distribución objetivo

| Sistema | Arquitectura | Formato inicial | Validación requerida |
| --- | --- | --- | --- |
| Windows | x64 | Instalador `.exe`, por usuario | Instalación, uso, actualización y desinstalación |
| macOS | arm64 / Apple Silicon | `.dmg` separado | Instalación, firma/notarización, uso y actualización |
| macOS | x64 / Intel | `.dmg` separado | Lo mismo, con evidencia para esa arquitectura |
| Linux | x64 | `.AppImage` y `.deb` | Arranque AppImage e instalación Debian/Ubuntu |

No se promete un binario universal para macOS. Las versiones mínimas de sistema operativo se fijarán en la fase 0 según Electron, dependencias nativas y pruebas; no se anunciarán antes de verificarlas. Para Linux, identificar explícitamente la distribución base y requisitos del entorno gráfico. Un `.deb` no implica soporte de todas las distribuciones.

## 5. Estado técnico observado en el repositorio

- Monorepo npm: `packages/shared`, `packages/backend`, `packages/frontend`.
- Frontend SvelteKit con `adapter-node`; backend Fastify sirve páginas y API en el mismo origen.
- `packages/backend/src/server.ts` combina construcción de app, arranque, seeding, scheduler y cierre; el arranque está protegido por detección de entrypoint.
- `DATA_DIR` determina el SQLite y otros archivos. Las migraciones se resuelven junto al módulo de conexión compilado.
- El build de TypeScript no copia SQL/meta automáticamente; Docker ya los copia de forma explícita.
- `better-sqlite3`, `bcrypt` y `sharp` requieren revisar compatibilidad y distribución nativa.
- PDF usa `pdftotext` y `pdftoppm`; hoy Docker provee Poppler. No asumir que está instalado en el equipo.
- OCR usa `tesseract.js`; verificar y empaquetar worker, WASM y modelos de idioma para evitar descargas al primer uso.
- El frontend usa rutas relativas `/api/v1`, lo que permite reutilizar un origen local único.
- La configuración de producción exige un `JWT_SECRET` seguro. Escritorio debe generarlo y conservarlo, sin desactivar la validación.
- Las sesiones y preferencias tienen almacenamiento ligado al origen. Un puerto dinámico obliga a revisar continuidad de sesión y tema/idioma.
- Los workflows existentes cubren CI, Docker y Pages; aún no existe un paquete desktop.

## 6. Arquitectura propuesta

```text
Aplicación Electron
  proceso principal: ventana, ciclo de vida, configuración, diagnóstico
    ├─ proceso de backend aislado: Fastify + SQLite + scheduler + OCR
    └─ ventana con sandbox: frontend SvelteKit actual
          └─ HTTP mismo origen -> 127.0.0.1:<puerto local>

Datos del usuario: SQLite + adjuntos + respaldos + configuración + logs
Recursos instalados: código compilado + migraciones + binarios + modelos OCR
```

### Decisiones base

- Electron como contenedor; backend fuera del proceso de renderizado. La prueba de viabilidad eligió un **Node LTS incluido en el paquete** en vez de `utilityProcess`: conserva la ABI Node del backend y evita reconstruir las dependencias de Docker para Electron.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`.
- Ventana solo carga la instancia local que inició esta app. Sin navegación arbitraria ni acceso de Node desde la UI.
- Preload/IPC solo si es necesario, con métodos mínimos, argumentos validados y validación del emisor; nunca exponer `fs`, shell o una API IPC genérica.
- Backend escuchando exclusivamente en `127.0.0.1`. El modo desktop no aceptará `HOST=0.0.0.0` heredado accidentalmente.
- Elegir puerto mediante el propio servidor y comunicar el puerto real tras escuchar. No buscar puerto libre y liberarlo antes del arranque.
- No reutilizar un servidor ajeno que responda en un puerto conocido. Validar que la preparación corresponde al proceso hijo iniciado.
- Separar explícitamente configuración de escritorio y variables de un despliegue Docker. No heredar `.env` del directorio desde donde se abre la app.
- Empaquetador propuesto: `electron-builder`, condicionado a validar compatibilidad actual y licencia/configuración en fase 0. No introducir dos empaquetadores.
- Versionado alineado con HomeLedger; no fijar todavía el número de la siguiente release.

### Origen local y sesiones: decisión obligatoria temprana

El puerto dinámico evita colisiones, pero cambia el origen y puede perder preferencias o sesiones ligadas a ese origen. Antes de construir toda la integración:

1. Probar preferencias de tema/idioma, cookie de refresh y sesión al cerrar/abrir y cambiar puerto.
2. Elegir una estrategia documentada: puerto preferido persistente con recuperación controlada, o puente muy limitado para restaurar únicamente estado permitido a un origen nuevo.
3. No copiar todos los datos de almacenamiento ni entregar tokens por URL, logs o argumentos de proceso.
4. Si se elige puerto persistente, definir recuperación cuando esté ocupado sin conectarse a otro proceso.
5. Mantener los controles de autenticación. La app no debe depender de un secreto incrustado igual para todas las instalaciones.

## 7. Datos, configuración y seguridad local

### Ubicación y persistencia

- Usar una identidad estable de aplicación y `app.getPath('userData')`; confirmar rutas reales para cada plataforma.
- Separar datos financieros, configuración local, logs y caché cuando corresponda.
- Base/adjuntos/respaldos fuera de ASAR, carpeta de instalación, directorio temporal y cwd.
- Instalación nueva vacía; sin usuarios, contraseña ni datos demo pregrabados.
- Generar secreto criptográfico por instalación, guardarlo con permisos restringidos y no regenerarlo en cada arranque.
- No prometer cifrado de SQLite: los datos están protegidos por los permisos y seguridad del sistema operativo en esta versión.
- Actualizaciones conservan datos. Desinstalar no los borra automáticamente. Documentar borrado manual deliberado.
- La aplicación no modifica bases de Docker/HA ni detecta/importa datos sin acción del usuario.

### Protección de la interfaz local

- Revisar Host/Origin, CORS, CSRF, cookies y rutas sensibles para el origen local; CORS por sí solo no autentica peticiones.
- Probar que una web externa no pueda registrar el primer usuario ni modificar datos por peticiones al puerto local.
- Si hace falta una credencial de arranque de escritorio, mantenerla efímera, fuera del renderer y restringida a la instancia local; conservar además el login de usuario.
- Bloquear `window.open`, navegación externa, esquemas no autorizados y permisos no necesarios.
- Abrir únicamente enlaces HTTP(S) aprobados en el navegador del sistema; no ejecutar comandos derivados de URL.
- Mantener CSP y validaciones actuales; no relajar globalmente para que Electron funcione.
- Descargas con nombre/ruta controlados, confirmación del usuario cuando corresponda y sin escritura arbitraria desde el renderer.
- Logs sin contraseñas, tokens, secretos, contenido de recibos ni registros financieros completos.
- Backend y OCR con cierre/tiempos límite; no procesos huérfanos ni recursión infinita de reintentos.

## 8. PDF, OCR y dependencias nativas

Esta fase es requisito de paridad, no una mejora opcional posterior.

- Crear una tabla de dependencias por SO/arquitectura: versión, licencia, fuente, checksum y ubicación instalada.
- Compilar/reconstruir `better-sqlite3`, `bcrypt` y dependencias pertinentes para la ABI de Electron y cada arquitectura.
- Realizar reconstrucción en staging aislado: no dejar `node_modules` de desarrollo/backend con binarios incompatibles con Node normal.
- Configurar extracción de ASAR de módulos `.node`, ejecutables y recursos que necesitan rutas reales.
- Empaquetar worker/core/WASM/modelos inglés/español de Tesseract y apuntar a rutas locales verificadas.
- Probar `sharp` con imágenes reales en el artefacto instalado.
- Evaluar distribución de Poppler con sus bibliotecas y obligaciones de licencia. Verificar redistribución del paquete completo, no solo del ejecutable.
- Fijar fuentes y hashes; no descargar binarios sin validar en cada ejecución.
- Preferir rutas absolutas para herramientas empaquetadas, sin depender de PATH ni invocar shell.
- Conservar el límite de páginas y tiempos de procesamiento de PDF existentes.
- Si redistribuir Poppler no resulta viable, registrar la alternativa y sus implicaciones antes de sustituirlo. No publicar pérdida silenciosa de lectura PDF.
- Errores de documentos dañados, cifrados o ilegibles comprensibles, sin cerrar la aplicación.

## 9. Fases y entregables

### Fase 0 — prueba de viabilidad y decisiones

- [ ] Registrar sistema/arquitecturas y versiones mínimas objetivo.
- [ ] Fijar versiones compatibles de Electron, empaquetador y Node para builds.
- [ ] Validar backend en proceso Electron con SQLite, bcrypt y sharp.
- [ ] Resolver origen/puerto, persistencia de preferencias y autenticación.
- [ ] Resolver distribución PDF/OCR y licencias por plataforma.
- [ ] Inventariar certificados y acceso a runners/pruebas macOS; no contratar ni comprar nada automáticamente.
- [ ] Registrar decisión de firma y qué canales pueden ser estables o solo de prueba.

**Salida:** prueba mínima ejecutable y decisiones registradas. Si falla una dependencia crítica, resolverla aquí antes de expandir UI/CI.

### Fase 1 — paquete y runtime de escritorio

- [ ] Añadir `packages/desktop` y scripts claros de desarrollo/build/staging.
- [ ] Aislar dependencias Electron del runtime Docker/HA; comprobar impacto del lockfile/workspaces.
- [ ] Extraer arranque/cierre reutilizable del backend con el mínimo cambio necesario.
- [ ] Configurar variables antes de importar módulos que capturan `DATA_DIR` al cargarse.
- [ ] Mantener el entrypoint Node actual funcionando.
- [ ] Preparar recursos frontend/backend/shared y migraciones con rutas independientes del cwd.
- [ ] Implementar protocolo de ready/error/shutdown y timeout de arranque.
- [ ] Bloqueo de instancia única antes de abrir SQLite; segundo lanzamiento enfoca la ventana existente.
- [ ] Cierre idempotente: scheduler, peticiones, SQLite y proceso hijo; manejo de fallos y salida forzada como último recurso.
- [ ] Manejar ciclo macOS (cerrar ventana frente a salir, reactivar desde Dock) sin segunda instancia del backend.

**Salida:** abrir/cerrar/reabrir localmente funciona; servidor normal mantiene sus pruebas.

### Fase 2 — experiencia y persistencia

- [ ] Estado inicial de carga con identidad HomeLedger; sin pantalla en blanco.
- [ ] Primer registro, login, refresh, logout y recuperación de sesión verificados.
- [ ] Temas/idioma conservados al reiniciar y actualizar.
- [ ] Guardar tamaño/posición de ventana y recuperar ventanas fuera de pantalla.
- [ ] Errores de arranque con reintentar, abrir logs/carpeta y salir; sin bucle de reinicio ni detalles sensibles.
- [ ] Menú mínimo accesible: copiar/pegar, zoom, versión, ayuda, carpeta de datos/logs; atajos adecuados por SO.
- [ ] Enlaces externos, descargas CSV/JSON/adjuntos y vista PDF probados.
- [ ] Restricciones de navegación, permisos, IPC y origen implementadas y verificadas.
- [ ] Sin conexión: operaciones financieras básicas y OCR local funcionan desde primer arranque instalado.
- [ ] Documentar que recordatorios/scheduler corren mientras la app está abierta; verificar reanudación tras suspensión.

**Salida:** experiencia completa usable sin terminal ni configuración manual.

### Fase 3 — documentos y protección de datos

- [ ] Integrar dependencias nativas y PDF/OCR resueltas en fase 0.
- [ ] Probar imagen, PDF digital y PDF escaneado en cada familia de SO.
- [ ] Respaldos JSON actuales con adjuntos exportan/restauran correctamente.
- [ ] Snapshot SQLite consistente antes de migraciones de una actualización; no copiar solo `.db` mientras WAL está activo.
- [ ] Fallo de snapshot o migración impide continuar con una actualización destructiva y muestra recuperación.
- [ ] Definir recuperación de una migración incompleta y rechazo de downgrade incompatible.
- [ ] Distinguir snapshot de instancia de exportación JSON del usuario; documentar qué restaura cada uno.
- [ ] Probar ruta con espacios/caracteres no ASCII, carpeta sin permisos y falta de espacio.

**Salida:** datos y documentos conservados entre cierres y actualización; recuperación comprobada con datos de prueba.

### Fase 4 — instaladores y CI

- [ ] Configurar iconos existentes adaptados a `.ico`/`.icns`/PNG sin rediseñar marca.
- [ ] Crear staging mínimo reproducible, sin `.env`, bases, logs, screenshots QA ni herramientas de desarrollo.
- [ ] Matriz nativa Windows/macOS/Linux y arquitecturas objetivo; sin afirmar soporte cruzado por emulación.
- [ ] Ejecutar tests, typecheck y build antes de empaquetar.
- [ ] Smoke test de la aplicación empaquetada, no solamente de `npm run dev`.
- [ ] Artifacts de CI en PR y ejecución manual; ninguna publicación desde PR/fork.
- [ ] Workflow desktop separado del de Docker y Pages.
- [ ] Firma Windows y firma/notarización/stapling macOS cuando existan credenciales; secretos solo en jobs confiables.
- [ ] Builds estables que requieren firma fallan si falta; no hacer fallback silencioso a unsigned.
- [ ] Una única tarea de publicación reúne matriz completa, hashes, licencias y notas; permisos mínimos.
- [ ] Publicar inicialmente como draft/pre-release para QA; no sobrescribir una release existente ni crear tags sin decisión de publicación.

**Salida:** todos los instaladores objetivo disponibles como artifacts y trazables al commit.

### Fase 5 — QA de instalación y regresión

- [ ] Instalar desde cero sin Node/Docker/Poppler presentes.
- [ ] Completar matriz funcional de sección 10 con datos ficticios.
- [ ] Actualizar sobre versión de prueba anterior y comprobar datos/adjuntos/configuración.
- [ ] Desinstalar/reinstalar conservando datos y verificar documentación de borrado.
- [ ] Confirmar procesos/puertos liberados al salir y recuperación tras cierre inesperado.
- [ ] Revisar ambos temas en ventana pequeña, normal y maximizada; navegación con teclado.
- [ ] Registrar tiempos de inicio, consumo en reposo y tamaño de instaladores; investigar bloqueos/crecimiento continuo, sin inventar umbrales antes del baseline.
- [ ] Ejecutar regresión backend/frontend, build Docker y smoke test servidor/HA cuando el código compartido cambie.
- [ ] Revisar dependencias, licencias y contenido de artifacts.

**Salida:** evidencia por plataforma; los gaps se registran, no se marcan como aprobados.

### Fase 6 — documentación y preparación de release

- [ ] README: opciones Desktop / Docker / HA, descargas y requisitos reales.
- [ ] Guía desktop: instalación, primer uso, almacenamiento, privacidad, respaldo, actualización, desinstalación y diagnóstico.
- [ ] Explicar límites offline y scheduler; no prometer conectividad o sincronización automática.
- [ ] Capturas actuales de la aplicación instalada, sin datos personales ni espacio vacío innecesario.
- [ ] Notas de release con SO/arquitecturas, restricciones de firma, hashes y novedades reales.
- [ ] Actualizar roadmap/changelog solo con lo implementado.
- [ ] Revisión final del diff, estado de tests y archivos; separar herramientas temporales de assets finales.
- [ ] Preparar commit y propuesta de publicación; merge/push/release cuando el usuario lo solicite.

**Salida:** cambio concreto listo para revisión y publicación, sin release pública implícita.

## 10. Matriz funcional mínima de QA

Cada fila se comprueba en ambos temas; el recorrido completo en cada familia de SO y smoke test del artefacto de cada arquitectura. No basta con llamar a la API: verificar las acciones desde UI instalada.

| Área | Recorrido / resultado |
| --- | --- |
| Inicio | Instalación limpia, registro sin credenciales predefinidas, reinicio y login |
| Dashboard | Métricas/gráficas, filtros y acciones rápidas sin funciones ocultas o perdidas |
| Cuentas | Alta/edición débito, efectivo, inversión y crédito con campos opcionales vacíos y completos |
| Transacciones | Ingreso/gasto, Quick Entry popup, detalle, edición, split y eliminación |
| Transferencias | Movimiento entre cuentas y saldos correctos |
| Presupuestos/metas | Crear, editar, registrar progreso y verificar resultados |
| Préstamos/patrimonio | Alta, pagos/actualizaciones y gráficas |
| Suscripciones/calendario | Crear vencimiento, verificar calendario y ejecución mientras app abierta |
| Categorías/reglas | Tipos correctos, incluidos Both/Ambos, creación y aplicación |
| Reportes | Rangos, gráficas y exportaciones con datos coherentes |
| Recibos | Imagen/PDF digital/escaneado, analizar, editar, crear transacción y descargar |
| CSV | Seleccionar archivo, previsualizar/mapear/importar y mostrar errores |
| Respaldos | Exportar/importar JSON con adjuntos y comprobar contenido restaurado |
| Configuración | Idioma, moneda, ambos temas, seguridad y opciones administrativas existentes |
| Ventanas | Modales, scroll, campos legibles, foco, Escape y ventana reducida |
| Ciclo de vida | Segunda instancia, cerrar/reabrir, suspensión y fallo del proceso hijo |
| Red | Operaciones locales offline, rechazo LAN y origen externo |
| Actualización | Datos reales de prueba preservados, snapshot previo y error recuperable |

## 11. Pruebas automatizadas y evidencia

- Unitarias solo donde aporten: resolución de rutas, configuración segura, allowlist de navegación, protocolo de ciclo de vida y recuperación.
- Integración: backend con `DATA_DIR` temporal aislado, puerto dinámico, migraciones y shutdown.
- Seguridad: solicitudes desde origen externo y Host no permitido; renderer sin acceso Node; IPC no autorizado rechazado.
- Empaquetado: migraciones/recursos/modelos/binarios existen y cargan en el artefacto por plataforma.
- E2E o smoke dirigido al binario instalado/empaquetado para primer registro, cuenta, transacción y persistencia.
- Regresión: suite existente, lint/typecheck según scripts vigentes y builds aplicables.
- Datos siempre sintéticos; no reutilizar ni eliminar datos de la instalación del usuario.
- Evidencia en CI y registro resumido; capturas temporales fuera del repositorio. Solo incluir screenshots finales para documentación.
- Registrar comandos, SO, arquitectura, commit y resultado; distinguir «no probado» de «falló» y «aprobado».

## 12. Organización prevista de archivos

```text
packages/desktop/
  package.json
  src/                 # main, bootstrap, config, lifecycle; preload si necesario
  resources/           # iconos y recursos redistribuibles documentados
  scripts/             # staging y comprobación de artifacts
  tests/               # pruebas específicas útiles
  <config-empaquetado> # un único empaquetador
docs/DESKTOP_PLAN.md    # este contrato de alcance y avances
docs/desktop.md        # guía del usuario, cuando exista producto verificable
.github/workflows/desktop-build.yml
```

La estructura exacta se ajusta en fase 0 sin duplicar backend/frontend. Outputs, instaladores, staging, datos de prueba y descargas grandes no se versionan. Las dependencias binarias se fijan/reproducen mediante el proceso documentado y licencias, sin guardar ejecutables arbitrarios en Git.

## 13. Riesgos y condición para resolverlos

| Riesgo | Mitigación / bloqueo |
| --- | --- |
| ABI nativa incompatible | Reconstrucción aislada y carga real por plataforma antes de continuar |
| Sesión/tema perdidos al cambiar puerto | Resolver origen y persistencia en fase 0; prueba de reapertura |
| PDF/OCR depende de internet o PATH | Recursos locales completos y prueba instalada offline |
| Poppler/licencias | Revisar distribución y obligaciones antes de adjuntar binarios |
| Exposición del servicio local | Loopback obligatorio, validación origen/Host y pruebas de primer registro |
| Corrupción por doble instancia/cierre | Lock temprano, cierre ordenado y snapshot consistente |
| Instalador borra datos | Datos fuera de instalación y prueba actualización/reinstalación |
| Firma/certificados ausentes | Bloquear estable firmado; pre-release explícita si se decide usarla |
| Sin máquina de prueba macOS | Build no equivale a QA; registrar pendiente y no anunciar verificación |
| Nuevos workspaces afectan Docker | Aislar staging y probar npm ci/build de despliegues actuales |
| Scheduler solo cuando abierta | Comunicación clara y prueba de reanudación; sin servicio de fondo |

## 14. Criterio de finalización de la primera versión

Se considera terminada cuando las fases 0–6 están verificadas, los formatos de sección 4 funcionan en los entornos declarados, la instalación no requiere herramientas manuales y los datos sobreviven a cierre/actualización/reinstalación. Ambos temas y los flujos existentes conservan funcionalidad. PDF/OCR funciona con recursos locales, la seguridad del servidor no se debilita y Docker/HA/Pages no sufren regresiones.

Un artefacto sin firma o sin prueba real de una plataforma no se presenta como experiencia estable verificada. Cualquier exclusión respecto a esa definición requiere un cambio explícito del alcance, no marcar tareas incompletas como hechas.

## 15. Orden de trabajo y siguiente paso

1. Completar fase 0: backend/Electron + SQLite + origen/sesión + PDF/OCR.
2. Resolver runtime y almacenamiento antes de pulir la ventana.
3. Probar Windows localmente en cada hito, y habilitar builds nativos tempranos para detectar incompatibilidades macOS/Linux.
4. Completar paridad, protección de datos e instaladores.
5. QA de artefactos, regresión y documentación.
6. Preparar revisión/commit y posteriormente publicación autorizada.

**Siguiente acción al retomar:** consultar primero [DESKTOP_QA.md](DESKTOP_QA.md), ejecutar la matriz macOS en CI y completar los recorridos UI y QA de actualización por versiones/plataformas pendientes. Reapertura, reinstalación, cookie, ambos temas, PDF y descarga JSON de Windows ya están verificados. No publicar como estable sin firma/notarización y evidencia pendiente. No añadir autoactualización ni rediseñar vistas.

## 16. Registro de decisiones y cambios de alcance

| Fecha | Decisión | Estado / motivo |
| --- | --- | --- |
| 2026-11-03 | Rama `codex/homeledger-desktop` desde `main` | Creada; trabajo separado |
| 2026-11-03 | Electron, UI/backend compartidos y datos locales | Arquitectura propuesta para validar en fase 0 |
| 2026-11-03 | Actualización manual; sin nube/autoactualización/servidor remoto | Límite de primera versión |
| 2026-11-03 | Firma, origen local y PDF/OCR deben resolverse temprano | No suponer que empaquetar equivale a producto terminado |
| 2026-11-04 | Electron 45.2.2 + electron-builder 26.18.0 + Node 22.23.4 incluido | Locks independientes, archivos oficiales de Node verificados con SHA-256; sin nuevo workspace en el monorepo raíz |
| 2026-11-04 | Backend en proceso Node separado en lugar de utilityProcess | Evita ABI Electron para SQLite/bcrypt/sharp; dependencia mínima del código de servidor existente |
| 2026-11-04 | Puerto asignado por listen(0) al primer arranque y persistido | Colisión produce error/reintento; nunca conectar a un servidor ajeno ni cambiar silenciosamente el origen |
| 2026-11-04 | Credencial de instancia inyectada por Electron, más Host/Origin y login existente | La credencial no se expone al renderer; protege también el primer registro |
| 2026-11-04 | PDF.js 6.5.438 y canvas 1.1.0 solo en runtime desktop | Sustituye Poppler para escritorio; Docker mantiene su implementación. Modelos spa/eng locales de Tesseract |
| 2026-11-04 | Entrar por /dashboard y restaurar cookie HttpOnly | La página raíz existente solo consultaba sessionStorage; no eliminar autenticación ni guardar tokens en disco desde JS |
| 2026-11-04 | Materializar enlaces de workspaces e incluir node_modules explícitamente | Las primeras pruebas de artefacto detectaron omisiones/referencias a la máquina de build; afterPack y smoke ahora las rechazan |
| 2026-11-04 | Sin certificados desktop configurados en el repositorio | Solo existen secretos Docker; modo firmado manual con gates preparado, sin contratación ni publicación automática |

Al cambiar alcance añadir: solicitud del usuario o motivo, impacto, alternativas, criterios afectados y estado. No borrar decisiones anteriores sin dejar su sustitución documentada.

## 17. Registro de avances

| Fase | Estado | Evidencia / pendientes |
| --- | --- | --- |
| Plan | Actualizado | Alcance original conservado; decisiones y pendientes explícitos |
| 0 | Viabilidad Windows/Linux comprobada; macOS pendiente | Native SQLite/bcrypt/sharp, PDF/OCR y origen local pasan; mínimos objetivo: Win10/11 x64, macOS13+, Linux x64 con glibc; no afirmar todos como certificados |
| 1 | Implementado; pruebas Windows/Linux | Paquete aislado, Node verificado, staging, IPC ready/shutdown, migraciones y datos fuera de instalación; ciclo macOS por validar |
| 2 | Implementado; QA parcial | UI nativa Windows, cuenta, gasto Quick Entry, ambos temas, cookie tras reapertura, segunda instancia y descarga JSON; faltan recorridos completos y ciclo macOS |
| 3 | Implementado; pruebas de runtime | Snapshots previos a migración, rechazo downgrade/colisión, PDF texto/render/OCR; JSON con adjuntos y recuperación se comprueban con datos sintéticos |
| 4 | Builds preview Windows/Linux; matriz CI preparada | .exe/.AppImage/.deb generados; afterPack verifica dependencias autocontenidas; .dmg y firma/notarización aún sin ejecutar |
| 5 | En curso | 742 backend/shared + 145 frontend + 9 desktop, lint sin errores, typecheck limpio; Docker health y recursos de Pages/temas correctos; falta QA final por SO |
| 6 | Guía/README preview preparados | Sin commit/push/release; faltan screenshots finales, revisión de licencias binarias y cierre de matriz antes de release estable |

Las casillas originales de fase son el checklist de aceptación **completa de las plataformas objetivo**. Un estado «implementado» no marca automáticamente aceptadas las casillas de QA todavía pendientes. La evidencia y el siguiente punto exacto de continuación se mantienen en [DESKTOP_QA.md](DESKTOP_QA.md).

## 18. Referencias técnicas

Consultadas al preparar el plan; volver a verificar versiones y capacidades al implementar:

- [Modelo de procesos Electron](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [utilityProcess](https://www.electronjs.org/docs/latest/api/utility-process)
- [Seguridad Electron](https://www.electronjs.org/docs/latest/tutorial/security)
- [Módulos nativos y ABI Electron](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [Firma y notarización](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [Documentación electron-builder](https://www.electron.build/)
