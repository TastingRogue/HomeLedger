# Auditoría de código — 9 de noviembre de 2026

Base revisada: `6f55f91` (`main`). Los hallazgos siguientes documentan el estado previo a las correcciones. Se implementaron correcciones en la rama `codex/audit-fixes`, sin modificar datos reales de la aplicación.

## Seguimiento de correcciones

- **A01–A03:** estado/rol actual del usuario en autenticación, revocación de refresh tokens al deshabilitar/restablecer contraseña, JWT vinculado mediante HMAC a la credencial actual y registro inicial atómico. Las claves de integración se conservan pero no funcionan mientras el propietario esté deshabilitado. Los JWT anteriores a esta actualización requieren una renovación normal de sesión.
- **A04–A05:** esquema de actualización, comprobación de fondos excluyendo el movimiento anterior, cuentas activas y conversión obligatoria cuando cambian las cantidades/cuentas entre monedas.
- **A06–A08:** rechazo de importes incompatibles con divisiones y consulta común de gasto por categoría que integra divisiones y tipo de cambio, reutilizada por presupuestos/reportes.
- **A09–A10:** estado de meta recalculado preservando excedentes; pago y saldo de préstamo en una transacción.
- **A11–A12:** fallos de adjuntos abortan la restauración y limpian archivos nuevos; aviso para respaldos sin contenido binario. Snapshots validados en un archivo temporal, copia de seguridad obligatoria, reemplazo por rename y recuperación ante errores de reapertura/migración.
- **Repositorio:** retirados siete `.pyc`; exclusiones para cachés Python, configuraciones locales y temporales. Se conservan las imágenes referenciadas, documentación de diseño, fuentes y licencias.
- **Desktop:** override de `minimatch` alineado con el monorepo y auditoría separada en CI; npm reporta cero vulnerabilidades en el proyecto desktop actualizado.

Las regresiones permanentes están en `packages/backend/src/services/audit-regressions.test.ts` (18 casos con bases temporales y migraciones reales). Incluyen fallos inyectados de SQL, escritura de adjuntos, copia de seguridad y reapertura de snapshots, además de validación HTTP de autenticación/transferencias.

Validación posterior: **772 pruebas backend/shared + 148 frontend + 9 desktop = 929 aprobadas**; build y typechecks correctos; lint sin errores (112 advertencias preexistentes/restantes). Checks de temas y Pages correctos. Auditoría npm de producción y de herramientas desktop sin vulnerabilidades reportadas. El runtime Windows reconstruido pasó su smoke test (seguridad, persistencia, PDF/OCR, recuperación y adjuntos); el empaquetado Windows `--dir` pasó también la verificación de recursos y aislamiento. No se publicó un release ni se probó una instalación nueva en macOS/Linux.

## Alcance y límites

Revisión transversal del backend, autenticación y permisos, operaciones financieras, respaldos, cliente HTTP, integración de temas, arranque y aislamiento desktop, integración Home Assistant y workflows CI/Pages. Se ejecutaron compilación, análisis de tipos, lint, pruebas y comprobaciones de dependencias. Esto no equivale a una revisión manual de cada línea ni a una prueba exhaustiva de todas las pantallas. No se ejecutó una sesión visual de navegador, un instalador empaquetado, una instancia de Home Assistant ni una restauración de datos reales.

Los hallazgos marcados **reproducido** se comprobaron mediante un test temporal con una base SQLite nueva y migraciones reales. El test comprobaba el comportamiento defectuoso observado; su resultado exitoso confirma la reproducción, no la corrección. Se eliminaron el test y su base temporal al terminar. Los demás hallazgos se sustentan en el flujo de código indicado.

P1: alta prioridad por seguridad o integridad de datos. P2: comportamiento funcional incorrecto que debe corregirse.

## Hallazgos

### A01 — P1: deshabilitar usuarios no bloquea sesiones ni API keys

**Reproducido.** `packages/backend/src/services/auth.service.ts:345`, `:371`, `:506`; `packages/backend/src/services/user.service.ts:67`.

`setDisabled` modifica el indicador, pero la validación JWT no consulta el usuario y tanto `refresh` como `validateApiKey` omiten `disabled`. Un usuario previamente autenticado sigue accediendo, puede renovar acceso mientras su refresh token sea válido y conserva acceso mediante sus claves API. Si se deshabilita otro administrador, conserva también esos privilegios.

Corrección: comprobar existencia/estado y rol vigentes en todos los mecanismos de autenticación; revocar sesiones al deshabilitar y definir la revocación de claves. Añadir pruebas HTTP para JWT, refresh y API key después de deshabilitar/eliminar al usuario.

### A02 — P1: dos registros simultáneos pueden crear dos primeros administradores

**Reproducido.** `packages/backend/src/services/auth.service.ts:137`.

El conteo de usuarios y la política de registro se evalúan antes del `await bcrypt.hash`. En una instalación vacía, dos solicitudes concurrentes observan cero usuarios y ambas insertan administradores, incluso con `first_user_only`. El riesgo se limita al arranque inicial sin usuarios, pero rompe una barrera de seguridad explícita.

Corrección: calcular el hash antes de la sección crítica y comprobar política/conteo e insertar dentro de una transacción síncrona. Probar registros concurrentes con correos distintos y verificar un único administrador inicial.

### A03 — P1: restablecer contraseña conserva las sesiones anteriores

**Reproducido.** `packages/backend/src/services/user.service.ts:107`.

El restablecimiento administrativo solo reemplaza `passwordHash`. Un refresh token obtenido antes del cambio continúa emitiendo tokens de acceso. Esto impide expulsar una sesión comprometida mediante recuperación de contraseña.

Corrección: revocar refresh tokens y usar una versión de sesión o marca de invalidación para tokens de acceso. Definir explícitamente qué ocurre con las claves de integración, sin revocarlas accidentalmente.

### A04 — P1: editar transferencias evita validación de importes y fondos

**Reproducido en servicio; ruta de entrada verificada.** `packages/backend/src/routes/v1/transfers.routes.ts:109`; `packages/backend/src/services/transfer.service.ts:246`.

El PUT convierte campos con `Number` y fuerza `any`, sin esquema Zod. El servicio acepta un importe negativo y uno superior al saldo disponible; tampoco replica la comprobación de cuentas activas. Esto permite invertir el efecto de una transferencia o dejar un saldo que la creación habría rechazado.

Corrección: esquema de actualización, validación del estado efectivo de la transferencia y cálculo de fondos excluyendo el movimiento que se está reemplazando. Probar negativos, precisión, fechas, saldo insuficiente y cuentas inactivas.

### A05 — P2: la actualización de transferencias pierde la coherencia entre monedas

**Verificado por código.** `packages/backend/src/routes/v1/transfers.routes.ts:109`; `packages/backend/src/services/transfer.service.ts:278`.

El PUT no copia `destinationAmount`, aunque el servicio declara admitirlo. Cambiar la cuenta destino conserva el importe convertido anterior o un valor nulo, sin volver a comprobar monedas. Un destino en otra divisa puede recibir numéricamente el importe origen o una conversión de la cuenta anterior.

Corrección: aceptar el campo validado y resolver las monedas efectivas al actualizar; exigir conversión cuando corresponda y limpiar el valor al pasar a cuentas de la misma moneda.

### A06 — P2: editar el importe de una transacción dividida invalida sus divisiones

**Reproducido.** `packages/backend/src/services/transaction.service.ts:275`.

Crear una transacción de 100, dividirla por 100 y luego cambiarla a 200 deja divisiones que suman 100. La actualización no verifica ni ajusta las divisiones existentes, pese a que `split` exige igualdad con el importe padre.

Corrección: rechazar cambios incompatibles o actualizar transacción y divisiones de forma atómica mediante una decisión explícita del usuario.

### A07 — P2: análisis por categoría y presupuestos ignoran divisiones

**Reproducido en análisis; presupuestos verificados por código.** `packages/backend/src/services/category.service.ts:294`; `packages/backend/src/services/budget.service.ts:274`.

Una transacción asignada íntegramente mediante split a otra categoría sigue apareciendo en la categoría del padre. Las consultas agrupan/filtran `transactions.categoryId`, sin integrar `transactionSplits`. Los presupuestos y alertas basados en estas consultas también pueden atribuir gasto a la categoría incorrecta.

Corrección: centralizar una consulta de asignaciones que use divisiones cuando existan y el padre cuando no existan, sin contar ambos.

### A08 — P2: el análisis por categorías suma monedas distintas sin conversión

**Reproducido.** `packages/backend/src/services/category.service.ts:297`.

Con una cuenta USD y tipo de cambio 20, un gasto de 100 aporta 100 al reporte en lugar de 2000 en moneda base. La consulta suma `transactions.amount` sin unir cuentas ni usar `exchangeRate`. Dashboard y reportes reutilizan esta función, mientras otros agregados sí convierten monedas.

Corrección: utilizar el mismo criterio de conversión y redondeo que el resto de agregados. Comprobar que desglose y total coincidan con dos o más monedas.

### A09 — P2: cambiar el objetivo de una meta no actualiza su estado

**Reproducido.** `packages/backend/src/services/goal.service.ts:130`.

Una meta completada en 100, modificada a objetivo 200, permanece `Completada`; un aporte posterior falla con `GOAL_ALREADY_COMPLETED`. Reducir el objetivo por debajo de lo ahorrado también deja estado y cantidades inconsistentes: un aporte puede calcular un efectivo negativo.

Corrección: recalcular estado al modificar el objetivo y mantener una política explícita para ahorro superior al nuevo objetivo; un aporte nunca debe reducir el ahorro.

### A10 — P1: registrar un pago de préstamo no es atómico

**Reproducido mediante fallo SQLite inyectado.** `packages/backend/src/services/loan.service.ts:166`.

Se inserta el pago y después se actualiza el saldo sin transacción conjunta. Al provocar un error en el UPDATE, la operación falla pero el pago ya existe y el saldo sigue intacto. Reintentar puede duplicar el pago.

Corrección: incluir lectura, validación, inserción y actualización en una transacción; probar que un fallo intermedio no deja cambios parciales.

### A11 — P1: restaurar JSON puede declarar éxito sin restaurar adjuntos

**Verificado por código.** `packages/backend/src/services/backup.service.ts:801`.

Los errores de escritura de archivos se ignoran con `catch { /* best effort */ }`, pero se crean los registros de adjuntos y se confirma el reemplazo de datos. Un disco lleno o permisos insuficientes producen una restauración aparentemente exitosa con recibos inaccesibles. Las escrituras tampoco se revierten si después falla la transacción SQL.

Corrección: preparar archivos en un directorio temporal, abortar ante errores, coordinar la confirmación con la base y limpiar archivos parciales. Informar explícitamente adjuntos ausentes en el respaldo.

### A12 — P1: restauración de snapshot sobrescribe la base sin validar su integridad completa

**Verificado por código.** `packages/backend/src/services/snapshot.service.ts:124`.

Solo se verifica la cabecera SQLite; un snapshot truncado que conserve la cabecera puede superar ese control. Después se ignora un posible fallo de la copia de seguridad y se sobrescribe directamente la base activa. Una escritura fallida o un snapshot corrupto puede dejar la aplicación sin base utilizable.

Corrección: descomprimir a un archivo temporal, comprobar integridad/esquema y compatibilidad, exigir copia de seguridad válida y reemplazar mediante un procedimiento recuperable. Probar archivo truncado y fallos de copia/escritura en un entorno desechable.

## Verificaciones y observaciones adicionales

- Backend/shared: **754 pruebas aprobadas**; frontend: **148**; desktop: **9**. Total: **911 pruebas existentes**.
- Prueba temporal adicional: reprodujo A01–A04, A06–A10; A07 solo análisis de categorías. A05, A11 y A12 son hallazgos de revisión estática.
- `npm run build`: correcto.
- Typecheck backend y frontend: correcto; Svelte: cero errores y cero advertencias.
- Lint: cero errores, **113 advertencias**. No se consideran por sí solas fallos de producto.
- Verificación de temas compilados y recursos/enlaces locales de Pages: correcta. No acredita el estado del despliegue remoto.
- `npm audit --omit=dev` raíz: cero vulnerabilidades reportadas en dependencias de producción.
- Auditoría separada de desktop: **6 entradas moderadas derivadas de una vulnerabilidad de minimatch** en la cadena de `electron-builder`, no seis vulnerabilidades independientes del runtime. Advisory: https://github.com/advisories/GHSA-g3hv-75wg-m249. Revisar actualización/override compatible y volver a empaquetar; no aplicar automáticamente el downgrade sugerido por npm. El audit raíz no cubre este proyecto separado.
- Las primeras ejecuciones de pruebas y verificación de temas fallaron por permisos del sandbox (EPERM/EACCES). Las repeticiones autorizadas fuera del sandbox aprobaron; esos errores no se clasifican como fallos de la aplicación.

## Orden propuesto de corrección

1. Bloqueo de usuarios, bootstrap de administradores y revocación de sesiones (A01–A03).
2. Validación de transferencias y atomicidad de pagos/restauraciones (A04, A05, A10–A12).
3. Consistencia de divisiones, categorías, monedas y metas (A06–A09).
4. Dependencias del empaquetador y ampliación de regresiones HTTP/UI para ambos temas.

El seguimiento y la validación de las correcciones se documentan al inicio de este informe.
