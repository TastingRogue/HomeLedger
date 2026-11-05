# Desktop — evidencia y pendientes

Actualizado: 4 de noviembre de 2026. Rama: `codex/homeledger-desktop`.

Base: `d3a8114` más los cambios locales de esta rama, todavía sin commit. Los artifacts de prueba no representan una release publicada.

Este registro distingue implementación, builds y validación. No es una declaración de release estable. Alcance y criterios: [DESKTOP_PLAN.md](DESKTOP_PLAN.md).

## Implementado

- Electron con renderer sandboxed, sin Node/preload genérico, permiso denegado por defecto y navegación restringida.
- Backend Node 22.23.4 incluido; loopback, token efímero privado de la sesión y comprobación Host/Origin antes de auth/registro.
- Perfil persistente HomeLedger y bloqueo de instancia única; configuración/secretos separados de la instalación.
- Puerto persistido; error controlado si está ocupado. No fallback a otro servidor.
- Arranque por ruta protegida para restaurar la cookie HttpOnly y flush de cookies al salir.
- Cierre ordenado y proceso hijo vinculado a IPC del padre; timeout de salida.
- Snapshot WAL-aware antes de cambiar fingerprint de versión/migraciones y rechazo de versiones/esquemas más nuevos.
- PDF.js/canvas en worker con tiempo límite, máximo tres páginas y límite de píxeles; Tesseract con modelos spa/eng locales.
- Runtime con dependencias de producción aisladas, locks, notices y verificación de recursos tras empaquetar. Workspaces materializados para no llevar junctions de la máquina de build.
- NSIS Windows, DMG macOS y AppImage/deb Linux configurados. Matriz CI nativa y modo firmado manual sin publicación automática.

## Evidencia obtenida

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| Build aplicación raíz | Aprobado | Shared, TypeScript backend y SvelteKit producción |
| Regresión backend/shared | 742 pruebas aprobadas | `npx vitest run --maxWorkers=4`, incluida regresión de ingresos en presupuestos superpuestos |
| Regresión frontend | 145 pruebas aprobadas | `npm run test -w packages/frontend`, incluidas3regresiones de borrado y4de revisión/cambio de archivo en importación |
| Pruebas desktop | 9 aprobadas en Windows y Linux | Configuración, entorno, navegación, perfil QA, cierre IPC/forzado, proceso terminado por señal y diagnóstico sin permisos |
| Lint | 0 errores | 113 warnings existentes, principalmente any/non-null assertions |
| Typecheck | Aprobado | Backend y Svelte; frontend 0 errores/0 warnings |
| Seguridad HTTP desktop | Aprobado | Token requerido incluso en registro, Host/Origin externos rechazados |
| Smoke Windows runtime empaquetado | Aprobado | Resolución de dependencias interna, SQLite/bcrypt/sharp, registro, cookie refresh, persistencia, snapshot, downgrade/puerto, PDF/OCR |
| Recibo por API instalada | Aprobado en runtime Windows | PDF sintético subido/analizado: total125; export/import JSON conserva bytes del adjunto y cuenta |
| UI Windows desarrollo | Aprobado, recorrido básico | Registro local, cuenta débito2500, Quick Entry gasto125, saldo2375 y gráficas; temas Normal/Cyberpunk |
| UI Windows instalada fuera del repositorio | Aprobado, recorrido básico | Login con cuenta ficticia, saldo2375, tema Cyberpunk y gráfica; no se usan datos reales |
| Instalación NSIS | Aprobado | Instalación y reinstalación sobre build previa en carpeta QA, exit0; perfil fuera del repositorio |
| Sesión tras actualizar/reabrir | Aprobado en Windows instalado | Dashboard aparece sin login manual; tema Cyberpunk, cuenta y saldo2375 conservados en el mismo puerto |
| Segunda instancia Windows | Aprobado | Segundo launcher sale0 y mantiene la ventana/perfil existentes |
| Recuperación desde UI Windows | Aprobado en desarrollo | Caída real del backend, caída del renderer y puerto ocupado; Retry vuelve al dashboard con cuenta y saldo2375 conservados |
| Actualización NSIS entre versiones de QA | Aprobado en Windows | Variante sintética1.1.99→preview1.2.0; conserva sesión, Cyberpunk, saldo2400,3movimientos y2recibos; snapshot SQLite integrity_check=ok |
| Downgrade desde UI Windows | Aprobado | El paquete1.1.99 rechaza el perfil abierto por1.2.0 con aviso NEWER_DATA; SHA-256 de la base no cambia |
| Respaldo previo obstruido | Aprobado en Windows y Linux offline | Un archivo bloquea la carpeta backups: arranque falla, base y fingerprint anterior quedan intactos; tras retirar la obstrucción crea snapshot íntegro con la cuenta |
| Respaldo desde UI instalada | Aprobado | Diálogo nativo Save file; JSON leído con1cuenta/1transacción del perfil ficticio |
| Recibo PDF desde UI | Aprobado en Windows instalado con corrección del visor | Carga por selector nativo, extracción total125 y documento legible en iframe; recursos del visor integrados permitidos de forma acotada |
| PDF escaneado desde UI | Aprobado en Windows desarrollo | PDF sintético compuesto solo por imagen; OCR local reconoce comercio, fecha2026-11-04 y total125; original legible en visor |
| CSV desde UI | Aprobado desarrollo y Cyberpunk instalado | Selector nativo, preview de2filas, confirmación e historial completed; gasto25 e ingreso50 cambian saldo2375→2400; instalador corregido:−5/+15 aumenta250→260 y deshacer recupera250 |
| Desinstalación/reinstalación NSIS de QA | Aprobado | Uninstaller exit0; base del perfil temporal conservada; reinstalación restaura sesión, saldo y recibo; instalación temporal retirada después de QA |
| Linux x64 runtime empaquetado | Aprobado en contenedor Debian12 | Módulos nativos, persistencia, snapshots, PDF/OCR y límites de origen |
| Linux AppImage/deb | Generados | Esto no equivale a prueba de escritorio gráfico ni instalación en todas las distros |
| Linux offline | Aprobado | Smoke ampliado ejecutado con `docker run --network none`: PDF/OCR real, cookie refresh, análisis HTTP y respaldo/restauración con adjunto |
| Docker servidor | Aprobado | Build normal, contenedor QA separado, health DB=ok y login HTTP200 |
| Temas y GitHub Pages | Aprobado | `check-theme-build.mjs` y `check-pages.mjs` |
| Audit runtime de producción | 0 vulnerabilidades reportadas | `npm audit --prefix packages/desktop/runtime --omit=dev`; no equivale a auditoría completa del SO/Chromium |
| macOS arm64/x64 | Pendiente | Workflow preparado; no build/prueba Mac ejecutada todavía |
| Firmas de distribución | Pendiente | No hay certificados desktop configurados; builds actuales unsigned |

La primera ejecución completa de tests con concurrencia ilimitada produjo un timeout de5s en una prueba existente de cuentas bajo carga. La suite completa pasó con4workers sin cambiar límites ni eliminar tests.

## Fallos detectados y corregidos durante QA

1. PDF.js6: corregidas rutas de fuentes/CMaps Windows y cierre mediante loadingTask.
2. El empaquetador omitía el node_modules raíz de extraResources: ahora se copia explícitamente y se verifica tras empaquetar.
3. Junctions npm workspaces apuntaban al staging original: ahora se materializan como directorios propios antes de empaquetar.
4. La entrada `/` enviaba a login por falta de sessionStorage sin restaurar cookie: desktop entra por `/dashboard` y fuerza flush de cookies al salir. Verificar reapertura en el instalador más reciente antes de aceptar esta tarea.
5. Paquete Debian requería homepage: metadatos añadidos; asociación de ventana Linux mediante desktopName.
6. El runtime aislado necesitaba los mismos overrides glob/minimatch del servidor para mantener audit limpio: incorporados al lock independiente.
7. El visor PDF de Electron está deshabilitado por defecto. Se habilitó su plugin integrado y se permitió únicamente su extensión de Chromium y `chrome://resources` desde ese marco; no se relajaron CSP, sandbox ni la autorización del backend. Verificado el texto del PDF en UI.
8. El último recurso de cierre usa SIGKILL tras10s: SIGTERM podía ser capturado nuevamente por el backend en Unix y prolongar una salida bloqueada. El cierre normal sigue usando IPC y liberación ordenada.
9. Un proceso terminado por señal conserva exitCode=null: ahora se comprueba signalCode y se elimina la referencia al hijo terminado para que Retry no espere un evento pasado. Probado con procesos reales en Windows/Linux y con caída del backend desde UI Windows.
10. Un fallo al escribir logs ya no bloquea la recuperación; los mensajes distinguen caída del servicio, caída de ventana y conflicto de puerto.
11. La confirmación de borrado de transacciones limpiaba deletingTransaction antes de leer de nuevo su id: el servidor borraba, pero un TypeError impedía refrescar la lista. Se captura el id antes de cerrar y se informa de fallos de red. Verificado desde el instalador reconstruido en Normal (detalle/galería) y Cyberpunk (tabla), sin cambiar de ruta para refrescar.
12. El resumen de presupuestos sumaba ingresos por cada presupuesto activo y duplicaba pagos cuando sus periodos se superponían. Ahora agrega una vez sobre la unión de periodos. Regresión: pagos distintos de igual importe, moneda convertida, exclusión de gastos/fechas externas, ausencia de presupuestos y consulta individual. Verificado en el instalador Windows actualizado.
13. Las fechas del presupuesto Normal usaban es-MX fijo: ahora usan el idioma activo. Verificado en Normal con rangos Nov1–Dec1 y Nov4–Dec3 en inglés.
14. Abrir el PDF en una nueva pestaña reemplazaba la vista principal sin forma nativa de volver. Se añadieron View→Back (Alt+Left / Cmd+[) y Return to HomeLedger (Ctrl/Cmd+Shift+H), conservando el límite de navegación local. Verificado en el instalador Windows actualizado.

15. La revisión JSON no mostraba el aviso de reemplazo y tenía etiquetas en español fijo. Ahora valida sin mutar mediante /backup/preview, muestra la advertencia localizada y restaura el payload revisado. Respuestas atrasadas de JSON/CSV no autorizan otro archivo. Cuatro regresiones aprobadas. Restauración nativa Normal completada: aviso inglés,9cuentas/5transacciones, saldo4025→4065,2recibos y PDF escaneado legible con vínculo a gasto125 conservado.

16. Un CSV genérico date/description/amount se detectaba como Nu y se invertían ingreso/gasto. La detección ya no usa columnas genéricas ni subcadenas arbitrarias del nombre: requiere marca bancaria o encabezados distintivos. Cuatro regresiones nuevas y742pruebas backend/shared pasan. El CSV erróneo se deshizo. En el instalador corregido, Cyberpunk muestra Generic CSV y−5/+15; cuenta250→260, importación2sin errores; Confirm Undo la devuelve a250.

## Matriz UI Windows instalada — avance por recorrido

Todos los datos de esta matriz son ficticios y pertenecen al perfil temporal de QA.

| Recorrido | Normal | Cyberpunk | Evidencia concreta |
| --- | --- | --- | --- |
| Crear débito, efectivo, inversión y crédito | Aprobado | Aprobado | Cuatro tipos creados por UI en cada tema; crédito con opcionales vacíos y edición con banco, umbral, corte/pago, APR y mínimo completos |
| Transferencia entre cuentas | Aprobado | Aprobado | Normal:40, débito300→260/efectivo100→140; Cyberpunk:25, débito200→175/efectivo100→125 |
| Crear gasto y abrir detalle | Aprobado | Aprobado | Normal:12 por formulario; Cyberpunk:20 por Quick Entry popup |
| Editar y dividir transacción | Aprobado | Aprobado | Normal:30→40, splits15+25; Cyberpunk:20→30, splits10+20; notas conservadas al reabrir |
| Eliminar y refrescar lista | Aprobado tras corrección | Aprobado tras corrección | Fila y total se actualizan al confirmar; ingreso15 creado/eliminado en Cyberpunk |
| Exportar CSV con diálogo nativo | Aprobado | Aprobado | Normal:6movimientos, gasto editado40; Cyberpunk:4movimientos, gasto editado30; archivos leídos desde staging |
| Crear/editar meta y aportar | Aprobado | Aprobado | Cyberpunk:1000+aporte100=10%, objetivo1200/restante1100; Normal:800+aporte80=10%, objetivo1000/avance8% |
| Crear/editar presupuesto individual | Aprobado | Aprobado | Cyberpunk:Groceries500/gastado125/restante375, editado600; Normal:Uncategorized300/gastado25, editado400. Resumen superpuesto verificado: ingreso50, sin duplicarse a100 |
| Préstamo y amortización/pago | Aprobado | Parcial | Normal:1200 al12%/12meses; cuota106.62=capital94.62+interés12; saldo1105.38; tabla12filas termina0. Cyberpunk:formulario pago10capital+1interés reduce1105.38→1095.38; alta todavía pendiente |
| Activo/pasivo y actualización | Aprobado | Parcial | Cuentas4200+activo500−pasivo200=4500; activo600→neto4600; gráfico y cambio 1M/6M verificados con3snapshots ficticios insertados para QA; no certifica scheduler diario. Cyberpunk:edición activo600→650 actualiza neto4465→4515; alta pendiente |
| Suscripción/cargo inmediato/calendario | Aprobado | Parcial | Normal:mensual10, autocharge de hoy registra10; próximo cargo4dic, visible en calendario. Cyberpunk:edición del nombre persiste y calendario diciembre muestra próximo cargo10; alta/cargo inmediato en ese tema pendiente. Esto no prueba cron a medianoche ni suspensión real |
| Categoría Both en inglés | Aprobado | Aprobado | Categorías QA Normal both y QA Cyberpunk both creadas desde UI con Both (Expense & Income) en inglés |
| Regla: probar, guardar y aplicar | Aprobado | Parcial | Name contains Desktop QA CSV grocery→Groceries; prueba1de4, aplicación1de2uncategorized; contador1 y reportes reflejan Groceries160. Cyberpunk:editor conserva condiciones/acciones, Test1de5 y guardar pasa; aplicación con nuevo match pendiente |
| Reportes con datos coherentes | Aprobado | Aprobado | Normal:ingreso50/gasto160/ahorro−110/deuda1105.38. La vista original tiene rangos fijos y no ofrece exportación directa; CSV se comprueba en Transacciones. Cyberpunk tras restauración/Undo:ingreso50/gasto285/neto−235/saldocuentas4065/deuda1095.38 |
| Restaurar JSON con aviso y adjuntos | Aprobado | Pendiente | Respaldo previo9cuentas/5transacciones; importación sin errores; saldo4065 y recibo escaneado legible/vinculado |
| Descargar recibo PDF | Aprobado | Pendiente | Selector nativo; SHA-256 del PDF descargado coincide con el original sintético |

Esta tabla no sustituye los pendientes generales de plataformas ni marca aprobados los flujos todavía no recorridos.

## Pendientes obligatorios antes de estable

- [x] Reinstalar la última build Windows con corrección de entrada y comprobar que al cerrar/abrir restaura sesión, tema y saldo sin login innecesario.
- [x] Segunda instancia mantiene ventana y perfil existentes en Windows.
- [x] Fallo del backend, renderizador y puerto muestra recuperación usable desde UI Windows en desarrollo (el rechazo del puerto también está probado por integración).
- [x] Exportación JSON desde UI instalada con diálogo nativo de guardado.
- [x] PDF digital analizado y visible en iframe con la corrección del visor.
- [x] Revalidar visor en el último instalador reconstruido.
- [x] PDF escaneado y CSV desde UI Windows en desarrollo.
- [ ] Completar la matriz funcional UI del plan en ambos temas; no marcar flujos solo por tests de API.
- [x] Windows: actualización mediante instaladores con versiones distintas de QA, backup previo, downgrade y conservación de sesión/perfil/adjuntos; desinstalación/reinstalación aprobada anteriormente.
- [ ] Repetir actualización con una futura migración SQL real y en macOS/Linux. La variante1.1.99 usa el mismo código/esquema de prueba; no representa una release histórica ni certifica migraciones futuras.
- [x] Linux: ejecutar smoke con red externa deshabilitada.
- [ ] Linux: instalar deb y probar AppImage en un escritorio gráfico soportado; documentar dependencias de sistema/FUSE según pruebas.
- [ ] Ejecutar builds macOS arm64/x64 en runners nativos; probar ventana, sesiones, ciclo Dock/quit, PDF/OCR y actualización.
- [ ] Configurar certificados Windows/Apple y credenciales de notarización por el propietario; no subir secretos a archivos ni omitir el gate cuando se solicite firma.
- [ ] Firmar y verificar ejecutable/instalador y todos los binarios macOS, incluyendo Node y módulos nativos; validar stapling/Gatekeeper.
- [ ] Completar materiales de licencia/fuentes de binarios y modelos antes de distribución estable. La revisión inicial detectó huecos concretos: [DESKTOP_LICENSES.md](DESKTOP_LICENSES.md).
- [ ] Capturas finales, notas de release, mínimos de SO realmente probados y revisión final del diff.

## Dónde están los resultados locales

La preview pública Windows incluye ahora avisos nativos, manifiesto de binarios/fuentes, SBOM y procedencia de modelos dentro del runtime. El ZIP de materiales contiene494archivos de fuentes verificados; CRC del ZIP y número de entradas aprobados. El smoke del runtime Windows reconstruido y9pruebas desktop pasan. Staging valida los hashes de los binarios revisados y afterPack exige los materiales Windows. Las fuentes comprimidas permanecen fuera de Git; el generador reproduce el ZIP desde el manifiesto versionado. Esto no certifica las variantes Linux/macOS ni elimina los pendientes de firma/QA estable.

La prueba de actualización usa una copia del perfil ficticio. Las rutas absolutas de los adjuntos se rebasan a esa copia antes de repetir el arranque1.1.99→1.2.0 y abrir el PDF desde el instalador actual; no se certifica la conservación leyendo adjuntos de otro perfil. El snapshot comprobado contiene1cuenta,3transacciones y2adjuntos. El rechazo de downgrade se probó antes de restablecer el fixture de QA para esa repetición.

Todos los outputs son ignorados por Git:

- Windows: `packages/desktop/dist/HomeLedger-1.2.0-win-x64.exe` y `SHA256SUMS.txt`.
- Linux: `packages/desktop/.staging/linux-artifacts/`.
- Builds/logs/perfil ficticio: `packages/desktop/.staging/`.
- Runtime reconstruible: `packages/desktop/runtime/`.

Los hashes cambian tras cada rebuild. Regenerar con `node packages/desktop/scripts/checksums.mjs`; no usar un hash de un intento anterior. Los números1.2.0 de estos artifacts reflejan la versión actual del repositorio, **no una nueva release pública**.

## Cómo continuar

Por solicitud del usuario, el menú QA y las acciones de simular caída del backend/renderizador se eliminaron del código de la aplicación. La evidencia histórica de recuperación sigue siendo válida; nuevas pruebas de fallos usan herramientas de desarrollo. El perfil temporal aislado se conserva únicamente para proteger los datos durante pruebas internas y no añade opciones al menú. Verificado en el ejecutable Windows reconstruido: solo File, Edit, View, Window y Help;9pruebas desktop aprobadas.

### Recuperación externa sin menú QA — Windows, 4 noviembre 2026

Verificado en `dist/win-unpacked/homeledger.exe`, generado junto al instalador sin menú QA, con el perfil temporal ficticio existente. No es una nueva prueba de actualización/reinstalación ni certifica macOS/Linux.

| Fallo provocado externamente | Resultado observado desde UI |
| --- | --- |
| Terminar solo el proceso Node hijo del ejecutable QA identificado por ruta/ParentProcessId | Mensaje de servicio detenido; Retry reinicia y vuelve al dashboard |
| Terminar solo el hijo de ese ejecutable con `--type=renderer` | Mensaje de ventana detenida y posible pérdida de cambios sin guardar; Retry recupera la interfaz |
| Cerrar la app, reservar su puerto50484 con un servidor TCP local de prueba y volver a abrir | Mensaje explícito de puerto ocupado; al detener el servidor temporal, Retry abre el dashboard |

En los tres casos reaparece Cyberpunk con sesión y saldo4065 conservados. La comparación de hashes de filas antes/después conserva exactamente9cuentas,5transacciones,2adjuntos y2análisis; hashes SHA-256 de ambos archivos adjuntos iguales e `integrity_check=ok`. El cierre/reapertura para el conflicto de puerto conserva la cookie. El proceso que reservaba el puerto se detuvo al finalizar.

Para repetir, usar exclusivamente un perfil sintético aislado, obtener el árbol de procesos por la ruta exacta del ejecutable y comprobar que existe un único objetivo antes de terminarlo. Nunca terminar todos los procesos Node/Electron por nombre. Las herramientas externas y sus outputs están en staging ignorado; no se agregan hooks de fallos al producto.

1. Leer este registro y el estado de los procesos/builds antes de reconstruir.
2. Terminar las pruebas Windows pendientes con perfil QA temporal y datos sintéticos. Instalación/reinstalación, sesión, visor PDF y descarga JSON ya están aprobados; no repetirlos sin cambios que lo justifiquen.
3. Completar Linux offline/GUI y ejecutar matriz macOS en CI. La implementación ya está integrada en main; la distribución de esta preview se limita a Windows, con fuentes/avisos adjuntos y sin marcarla como Latest.
4. Mantener los gates de firma y los límites de alcance; documentar gaps concretos en lugar de declararlos aprobados.
