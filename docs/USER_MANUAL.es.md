# HomeLedger — Manual de Usuario

> 🌐 **English:** [USER_MANUAL.md](USER_MANUAL.md)

Una guía completa de todas las funciones de HomeLedger. Este manual cubre la
interfaz web (la misma UI ya sea que uses Docker, el complemento de Home
Assistant o la app de escritorio). Todas las capturas usan datos de demostración;
no se muestra información financiera real.

**Nota de idioma.** HomeLedger es bilingüe (español / inglés). Cada etiqueta se
adapta al idioma que elijas en Ajustes. Este manual usa las etiquetas en español.

---

## Índice

1. [Primeros pasos](#1-primeros-pasos)
2. [Panel (Dashboard)](#2-panel-dashboard)
3. [Cuentas](#3-cuentas)
4. [Transacciones](#4-transacciones)
5. [Transferencias](#5-transferencias)
6. [Suscripciones](#6-suscripciones)
7. [Metas](#7-metas)
8. [Presupuestos](#8-presupuestos)
9. [Préstamos](#9-préstamos)
10. [Categorías](#10-categorías)
11. [Reglas (auto-categorización)](#11-reglas-auto-categorización)
12. [Reportes](#12-reportes)
13. [Patrimonio](#13-patrimonio)
14. [Recibos y facturas](#14-recibos-y-facturas)
15. [Importar del banco](#15-importar-del-banco)
16. [Buscar](#16-buscar)
17. [Alertas](#17-alertas)
18. [Calendario](#18-calendario)
19. [Registro rápido](#19-registro-rápido)
20. [Respaldo y restauración](#20-respaldo-y-restauración)
21. [Ajustes](#21-ajustes)
22. [Seguridad (2FA, sesiones, bloqueo)](#22-seguridad)
23. [Claves de API y Webhooks](#23-claves-de-api-y-webhooks)
24. [Panel de administración](#24-panel-de-administración)
25. [PWA / modo sin conexión](#25-pwa--modo-sin-conexión)
26. [Integración con Home Assistant](#26-integración-con-home-assistant)

---

## 1. Primeros pasos

### Primer inicio de sesión

1. Abre HomeLedger en tu navegador (por defecto `http://localhost:3000`).
2. **El primer usuario que se registre se convierte en administrador.** Usa la
   página de Registro para crear tu cuenta (nombre, correo, contraseña).
3. Tras registrarte inicias sesión automáticamente y llegas al Panel.

### Navegación

La **barra lateral** de la izquierda agrupa todas las páginas en cuatro secciones:

| Sección | Páginas |
|---|---|
| **Navegación** | Panel, Buscar, Cuentas, Transacciones, Transferencias, Suscripciones |
| **Planeación** | Metas, Presupuestos, Préstamos |
| **Análisis** | Categorías, Reglas, Reportes, Patrimonio, Recibos, Alertas |
| **Configuración** | Ajustes, Datos e Importar |

En **móvil**, la barra lateral se oculta tras un botón de menú (☰). Un **botón
flotante "+"** (abajo a la derecha) está siempre visible y abre la pantalla de
[Registro rápido](#19-registro-rápido) para capturar gastos al instante.

### Moneda e idioma

HomeLedger usa una **sola moneda por instalación** (p. ej. MXN, USD, EUR). El
administrador la define durante la configuración o en Ajustes. Las cuentas
individuales pueden opcionalmente usar otra moneda con un tipo de cambio (ver
[Cuentas](#3-cuentas)), y las agregaciones entre cuentas convierten a la moneda
base.

El idioma (español / inglés) es por usuario — cámbialo cuando quieras en Ajustes.

---

## 2. Panel (Dashboard)

Tu inicio financiero. Todo se actualiza en tiempo real conforme agregas datos.

### Tarjetas de resumen

| Tarjeta | Qué muestra |
|---|---|
| **Patrimonio** | Saldos de débito/efectivo/inversión menos la deuda de tarjetas de crédito |
| **Disponible** | Total en cuentas de cheques y ahorro |
| **Ingresos del mes** | Suma de ingresos de este mes (% de cambio vs. el mes anterior) |
| **Gastos del mes** | Suma de gastos de este mes (% de cambio vs. el mes anterior) |
| **Presupuesto restante** | Asignado menos gastado en presupuestos activos; o ingresos menos gastos si no hay presupuestos |

### Gráficas

- **Ingresos vs. Gastos** — gráfica de barras. Usa el selector de periodo
  (Hoy / Semana / Mes). "Hoy" agrupa por hora, "semana" por día de la semana,
  "mes" por día.
- **Gastos por categoría** — gráfica de dona con su propio selector de periodo.

### Acciones rápidas

Botones en la parte superior del panel abren ventanas modales para tareas
comunes sin salir de la página:

- **Agregar gasto / Agregar ingreso** — nombre, monto, cuenta, categoría.
- **Transferir** — mover dinero entre cuentas.
- **Agregar meta** — crear una meta de ahorro.
- **Adjuntar recibo** — subir un archivo y vincularlo a una transacción o
  transferencia.

### Edición en línea

Haz clic en cualquier **transacción**, **transferencia** o **suscripción**
próxima en las tarjetas del panel para abrir una ventana de edición donde puedes
modificarla o eliminarla directamente.

---

## 3. Cuentas

Administra todas tus cuentas financieras en un solo lugar.

### Tipos de cuenta

| Tipo | Descripción |
|---|---|
| Débito | Cuentas de cheques y tarjetas de débito |
| Crédito | Tarjetas de crédito — rastrea utilización e información del estado de cuenta |
| Inversión | Cuentas de inversión/corretaje |
| Vales | Vales de despensa, tarjetas de regalo |
| Efectivo | Dinero en efectivo |

### Crear una cuenta

1. Haz clic en **Nueva cuenta**.
2. Completa: **nombre**, **tipo**, **banco** (opcional), **saldo inicial**.
3. **Moneda y tipo de cambio** (opcional): si esta cuenta usa una moneda distinta
   a la moneda base de la instalación, selecciónala e ingresa el tipo de cambio.
   Las agregaciones (panel, reportes, patrimonio) convertirán con este tipo de
   cambio; las vistas por cuenta se mantienen en la moneda nativa.

### Campos de tarjeta de crédito (para cuentas de Crédito)

| Campo | Propósito |
|---|---|
| Límite de crédito | Línea de crédito máxima |
| Día de corte | Día del mes en que cierra el estado de cuenta |
| Día de pago | Día del mes en que vence el pago |
| Tasa (APR) | Tasa de interés anual (informativo) |
| Pago mínimo | Monto del pago mínimo actual |

La vista de detalle de la tarjeta muestra la **utilización de crédito** (deuda /
límite), el **estado de salud** (saludable / moderado / crítico), suscripciones
vinculadas y un **resumen del estado de cuenta** con los pagos realizados.

### Desactivar

Desactiva una cuenta para ocultarla de las listas activas sin borrar su
historial.

---

## 4. Transacciones

El núcleo de tu libro contable. Cada ingreso y gasto vive aquí.

### Crear una transacción

1. Haz clic en **Nueva transacción** (o usa [Registro rápido](#19-registro-rápido)).
2. Completa:
   - **Nombre** — para qué es la transacción.
   - **Monto** — el valor monetario.
   - **Tipo** — Ingreso o Gasto.
   - **Cuenta** — a qué cuenta pertenece.
   - **Categoría** — la categoría de gasto/ingreso.
   - **Fecha** — por defecto, ahora.
3. Campos opcionales: **comercio** (el establecimiento/beneficiario),
   **subcategoría**, **notas**, **subtipo** (reembolso / devolución / ajuste),
   **estado** (pendiente o registrada), marca de **conciliada**.

### Etiquetas

Las etiquetas son un sistema flexible por usuario, independiente de las
categorías.

- Crea etiquetas desde el formulario de transacción o la página de Etiquetas.
- Una transacción puede tener **varias etiquetas** (p. ej. "vacaciones",
  "compartido").
- Las etiquetas pueden tener color para agrupar visualmente.
- Puedes filtrar transacciones por etiqueta y crear
  [presupuestos por etiqueta](#8-presupuestos).

### Dividir una transacción

Divide una transacción entre varias categorías (p. ej. un ticket con comida +
artículos del hogar):

1. Abre una transacción y haz clic en **Dividir**.
2. Agrega filas: categoría + monto + nota opcional. Los montos deben sumar el
   total de la transacción.
3. Guarda. La división reemplaza cualquier división anterior.

### Historial de auditoría

Cada transacción guarda un historial de cambios: quién la creó, cuándo se editó
y qué campos cambiaron (valores anterior → nuevo). Míralo desde el detalle de la
transacción.

### Filtros y vistas

- Filtra por: cuenta, categoría, tipo, rango de fechas, conciliada, estado,
  subtipo, etiqueta.
- Alterna entre **vista de tarjetas** (agrupadas por mes) y **vista de tabla**.
- **Exportar CSV**: descarga el conjunto de datos filtrado completo como archivo
  CSV (UTF-8 con BOM para compatibilidad con Excel).

---

## 5. Transferencias

Mueve dinero entre tus propias cuentas sin crear transacciones de ingreso o
gasto.

### Crear una transferencia

1. Haz clic en **Nueva transferencia**.
2. Completa: **nombre**, **monto**, **fecha**, **cuenta origen**, **cuenta
   destino** (debe ser distinta al origen).
3. **Transferencias entre monedas**: si el origen y el destino tienen monedas
   distintas, aparece un campo adicional de **monto destino** — ingresa el monto
   que llega en la moneda del destino. El monto sale en la moneda del origen;
   cada lado se registra de forma nativa.

Eliminar una transferencia revierte el movimiento en ambas cuentas.

---

## 6. Suscripciones

Rastrea pagos recurrentes y nunca pierdas una fecha de vencimiento.

### Crear una suscripción

- **Nombre**, **monto**, **fecha de inicio** (= primer cargo), **ciclo**
  (semanal / mensual), **cuenta**, **categoría**.
- **Cargo automático**: cuando está activo, el sistema crea automáticamente una
  transacción de gasto en cada fecha de vencimiento. Si la app estuvo apagada o
  sin conexión, **se pone al día** con todos los ciclos perdidos al reiniciarse
  (una transacción por cada periodo perdido).

### Calendario e Insights

- **Calendario** (barra lateral → Suscripciones → Calendario): una cuadrícula
  mensual que muestra qué días tienen pagos de suscripción, con una lista de
  "próximos" ordenada por urgencia.
- **Insights** (P4.7): cada suscripción muestra su costo anualizado, el total
  gastado en los últimos 12 meses, el número de cargos y los cambios de precio
  detectados.

### Estados

- **Activa** — corriendo, cobrará si el cargo automático está activo.
- **Inactiva** — pausada, sin cargos.

---

## 7. Metas

Convierte tus objetivos de ahorro en progreso visible.

### Crear una meta

- **Nombre**, **monto objetivo**, **tipo** (Lista de deseos o Deuda), **fecha
  límite** opcional.

### Aportar y retirar

- **Aportar**: agrega dinero a la meta. El sistema limita el monto al restante
  del objetivo para que no te pases.
- **Retirar**: saca dinero. Limitado al monto ahorrado actual.
- Cuando el progreso llega al 100%, la meta se marca como **Completada**.

### Pronóstico

Cada meta muestra un **pronóstico de finalización**: según tu ritmo de aporte
reciente, cuántos meses faltan, la fecha estimada y si vas a tiempo para la fecha
límite.

---

## 8. Presupuestos

Controla el gasto con presupuestos por categoría y por etiqueta.

### Crear un presupuesto

1. Haz clic en **Nuevo presupuesto**.
2. **Nombre**, **periodo** (mensual / semanal), **fecha de inicio**.
3. Asigna montos por **categoría** y/o por **etiqueta**.
4. **Rollover**: actívalo para arrastrar automáticamente los montos no usados al
   siguiente periodo.
5. **Umbral de alerta** (80% por defecto): el % en que se genera una alerta de
   aviso.

### Progreso

Cada línea de presupuesto muestra:
- **Asignado** + **Rollover** = total disponible.
- **Gastado** = gastos reales del periodo.
- **Restante** = disponible − gastado.
- Una barra de progreso que se pone naranja/roja al acercarse/exceder el umbral.

### Disponible para gastar

El resumen del presupuesto muestra el **ingreso total** del periodo vs. el total
asignado, y el **sin asignar** — cuánto ingreso aún no está presupuestado.

### Alertas de sobregasto

Cuando el gasto excede la asignación, el sistema genera una alerta
**budget_exceeded** (crítica) y dispara un webhook si está configurado. Cuando
cruza el umbral de aviso (pero se mantiene bajo el 100%), se genera una alerta
**budget_threshold** (aviso). Ambas se limpian solas si el gasto baja del umbral.

---

## 9. Préstamos

Rastrea préstamos con amortización y registro de pagos.

### Crear un préstamo

- **Nombre**, **capital** (monto original), **tasa de interés** (anual %),
  **plazo** (meses), **fecha de inicio**.

### Tabla de amortización

Una tabla que muestra el desglose de cada mes: pago total, porción de capital,
porción de interés y saldo restante.

### Registrar pagos

Haz clic en **Registrar pago**: ingresa monto, capital, interés y fecha. El saldo
restante del préstamo se actualiza y el historial de pagos aparece en el detalle.

---

## 10. Categorías

Organiza tus finanzas con categorías y subcategorías.

- Cada usuario obtiene su propio conjunto editable de categorías por defecto al
  registrarse (en el idioma de la instalación). Puedes renombrarlas, recolorearlas,
  agregarlas o eliminarlas libremente.
- **Tipo**: Gasto, Ingreso o Ambos — controla qué categoría aparece en los
  formularios de gasto vs. ingreso.
- **Subcategorías**: anida desgloses más finos bajo una categoría padre.
- **Análisis de gastos**: un desglose filtrado por fecha con totales y
  porcentajes por categoría.
- Una categoría solo se puede eliminar si ninguna transacción la referencia.

---

## 11. Reglas (auto-categorización)

Automatiza la categorización de transacciones con un motor de reglas del tipo
"si esto, entonces aquello".

### Crear una regla

1. **Condiciones**: coincide en campos como `nombre`, `comercio`, `monto`,
   `cuenta`, `descripción`. Operadores: contiene, igual, empieza con, termina
   con, mayor que, menor que, entre, regex. Sensibilidad a mayúsculas opcional.
2. **Acciones**: qué pasa cuando una transacción coincide:
   - `setCategory` / `setSubcategory` / `setType` — asignar categoría,
     subcategoría o cambiar el tipo.
   - `addTag` — agregar una etiqueta.
   - `flagReview` — marcar para revisión manual.
   - `markRecurring` — marcar como recurrente.
   - `ignore` — omitir la transacción.
3. Las reglas tienen una **prioridad** (menor = corre primero) y un interruptor
   de **activada**.

### Probar y aplicar

- **Probar** (simulación): mira qué transacciones existentes coincidirían y qué
  acciones se aplicarían — sin cambiar nada.
- **Aplicar a sin categorizar**: corre todas las reglas activas contra las
  transacciones que aún no tienen categoría.

### Sugerencias por aprendizaje

Después de categorizar manualmente una transacción, el sistema puede **sugerir
una regla** basada en el patrón del comercio o el nombre. Acepta la sugerencia
para auto-categorizar transacciones similares en el futuro.

---

## 12. Reportes

Analíticas y visualizaciones de tus finanzas.

### Reportes disponibles

| Reporte | Qué muestra |
|---|---|
| **Panel** | Saldo consolidado, ingresos/gastos mensuales, desglose por categoría, salud de cuentas |
| **Flujo de efectivo** | Ingresos vs. gastos por mes (tendencias de 6 meses) |
| **Tasa de ahorro** | Cuánto de tu ingreso estás ahorrando (ahorro / ingreso) |
| **Reporte de deuda** | Panorama de deuda de tarjetas de crédito |
| **Utilización de crédito** | Utilización por tarjeta y global (deuda / límite) |
| **Reporte por comercio** | Gasto agrupado por comercio/beneficiario, ordenado por total |
| **Comparación mensual** | Barras lado a lado comparando meses consecutivos |

### Reportes personalizados guardados

Crea y guarda configuraciones de reporte personalizadas con un nombre y tipo para
volver a ellas después sin reconfigurar filtros.

---

## 13. Patrimonio

Rastrea tu panorama financiero total a lo largo del tiempo.

### Patrimonio actual

Muestra:
- **Activos totales** — saldos de cuentas + valores de activos ingresados
  manualmente.
- **Pasivos totales** — deuda de tarjetas + pasivos ingresados manualmente.
- **Patrimonio neto** = activos − pasivos.

### Activos y pasivos

Agrega elementos que no son cuentas bancarias (p. ej. un auto, una hipoteca, una
propiedad):
- **Nombre**, **valor/saldo**, **tipo** (propiedad, vehículo, otro…), **notas**.

### Gráfica histórica

Una gráfica de línea con instantáneas del patrimonio a lo largo del tiempo.
Selector de periodo: 1 mes, 6 meses, 1 año, 5 años o todo el tiempo.

---

## 14. Recibos y facturas

Sube recibos, ejecuta OCR y conviértelos en transacciones.

### Subir

- **Elegir archivo**: una imagen (JPG, PNG, WEBP, GIF), PDF o XML (CFDI).
- **Tomar foto** 📷: en móvil, abre la cámara trasera directamente. La foto pasa
  por el mismo flujo de subida → OCR en el servidor.

### Análisis

Después de subir, haz clic en **Analizar**:
- **Imágenes**: OCR en el servidor (Tesseract, español + inglés) extrae el texto.
- **PDFs**: extracción de texto (u OCR si es escaneado).
- **XML (CFDI)**: analiza la estructura de la factura digital mexicana — extrae
  UUID, RFC/nombre del emisor, IVA, conceptos y totales.

Campos extraídos: comercio, fecha, subtotal, impuesto, total, moneda, RFC, UUID.
Todos son editables si el OCR se equivocó en algo.

### Categorización por concepto

Para recibos con conceptos (común en CFDI), puedes asignar una categoría a cada
concepto individualmente.

### Crear una transacción desde un recibo

Haz clic en **Crear transacción**: elige una cuenta y una categoría. Si hay ≥2
conceptos categorizados y sus totales coinciden con el total del recibo, la
transacción se **divide** automáticamente por esas categorías. El UUID del CFDI
se guarda como el ID externo de la transacción, así que reimportar la misma
factura se detecta como duplicado.

---

## 15. Importar del banco

Importa estados de cuenta para agregar transacciones en lote.

### Formatos soportados

CSV, XLSX, OFX, QIF, JSON — con analizadores integrados para **BBVA**,
**Santander** y **Nu México**. Un analizador genérico maneja formatos CSV
estándar.

### Flujo de importación

1. **Subir**: selecciona un archivo y opcionalmente elige un analizador de banco
   y una cuenta destino.
2. **Vista previa**: el sistema normaliza comercios, fechas y monedas, luego
   muestra cada fila etiquetada como:
   - **Nueva** — se importará.
   - **Duplicada** — coincide con una transacción existente (por ID externo o la
     heurística fecha+monto+nombre) — se omite.
   - **Coincidencia pendiente** — coincide con una transacción "pendiente"
     existente que se actualizará a "registrada".
3. **Confirmar**: elige la cuenta (auto-detectada si es posible) y una categoría
   por defecto opcional. Las filas seleccionadas se importan; los duplicados se
   omiten.

### Historial de importación y deshacer

- **Historial**: ver importaciones pasadas con conteos.
- **Deshacer**: revertir una importación, eliminando todas las transacciones que
  creó.

---

## 16. Buscar

Una **búsqueda global** entre transacciones, recibos y suscripciones.

- Escribe una consulta en el cuadro de búsqueda para encontrar coincidencias por
  nombre, comercio, notas, RFC, UUID o descripción.
- **Filtros**: acota por tipo (transacción / recibo / suscripción), cuenta,
  categoría, comercio, etiqueta, rango de monto (mín/máx), tipo de transacción
  (ingreso/gasto) y rango de fechas.
- Los resultados se agrupan por tipo de entidad con un conteo total.

---

## 17. Alertas

Notificaciones automáticas sobre eventos financieros importantes.

### Tipos de alerta

| Tipo | Severidad | Cuándo se dispara |
|---|---|---|
| **Saldo bajo** | Aviso | El saldo de una cuenta cae por debajo de un umbral |
| **Utilización de crédito alta** | Aviso | La utilización de la tarjeta excede un umbral |
| **Pago próximo** | Aviso | Un pago de suscripción vence en 3 días o menos |
| **Pago vencido** | Crítica | Pasó la fecha de pago de una suscripción |
| **Meta completada** | Info | Una meta de ahorro llega al 100% |
| **Umbral de presupuesto** | Aviso | El gasto cruza el umbral de alerta del presupuesto |
| **Presupuesto excedido** | Crítica | El gasto excede la asignación del presupuesto |

### Gestionar alertas

- **Marcar como leída** / **Marcar todas como leídas**.
- **Eliminar** alertas individuales.
- **Evaluar ahora**: dispara manualmente la evaluación de alertas (normalmente
  corre cada hora).
- **Ajustes**: activa/desactiva cada tipo de alerta.

---

## 18. Calendario

Una vista de calendario mensual de las **fechas de pago de suscripciones**.

- Navega entre meses con ◀ / ▶ o salta a **Hoy**.
- Los días con pagos muestran puntos de color (hasta 2 visibles + un "+N" de
  desbordamiento).
- El panel lateral lista los próximos 8 pagos ordenados por urgencia, con estilo
  especial para los que vencen en 3 días o menos.

---

## 19. Registro rápido

Un teclado numérico de 3 pasos, pensado para móvil, que registra una transacción
en menos de 5 segundos.

### Paso 1 — Monto

- Alterna **Gasto** / **Ingreso**.
- Escribe el monto en el teclado numérico en pantalla. Admite decimales (hasta 2
  posiciones).
- Toca **Siguiente**.

### Paso 2 — Cuenta y categoría

- Elige una cuenta y una categoría de una cuadrícula. Los elementos **usados
  recientemente** suben al inicio (recordados por dispositivo) y se resaltan.
- Toca **Siguiente**.

### Paso 3 — Confirmar

- Revisa el resumen. Opcionalmente escribe un **nombre** (si lo dejas vacío, se
  usa el nombre de la categoría).
- Toca **Registrar**. Aparece un aviso de confirmación y el formulario se
  reinicia al paso 1 para capturar rápido de nuevo.

**Consejo.** Accede al Registro rápido desde el **botón flotante "+"** visible en
todas las páginas, o guarda `/registro-rapido` en favoritos.

---

## 20. Respaldo y restauración

### Exportar / importar JSON (por usuario)

- **Exportar**: descarga todos tus datos como un archivo JSON (cuentas,
  transacciones, transferencias, categorías, subcategorías, etiquetas,
  suscripciones, metas, presupuestos, préstamos, adjuntos, recibos).
- **Importar** (reemplazo destructivo):
  1. Sube un archivo de respaldo JSON.
  2. **Vista previa** (simulación): mira los conteos por entidad y advertencias
     antes de cualquier cambio. Las filas con referencias rotas se marcan.
  3. **Confirmar**: reemplaza tus datos actuales. Los IDs se remapean de forma
     segura — un respaldo de una instancia nunca choca con los datos de otro
     usuario.

### Admin: instantáneas de la base de datos completa

Los administradores pueden gestionar instantáneas gzip de toda la base SQLite:
- **Crear instantánea** — toma una ahora (también aplica la retención).
- **Listar** — ver instantáneas disponibles.
- **Restaurar** — reemplaza la base de datos para TODOS los usuarios
  (destructivo). Úsalo con cuidado.
- Las instantáneas diarias automáticas corren a las 03:00 por defecto
  (configurable con `BACKUP_CRON` y `BACKUP_RETENTION`).

---

## 21. Ajustes

Abre **Ajustes** desde la barra lateral (ícono de engrane).

### Pestaña Perfil

- Edita tu **nombre**. El correo y el rol son de solo lectura.
- **Idioma**: alterna entre español e inglés (surte efecto de inmediato).
- **Tema**: Oscuro o Claro.

### Pestaña Datos

- Enlaces a la página de [Importar](#15-importar-del-banco) y muestra información
  de la base de datos (SQLite, versión).

---

## 22. Seguridad

Todas las funciones de seguridad están en la pestaña **Seguridad** de Ajustes.

### Cambiar contraseña

Ingresa tu contraseña actual, luego una nueva (mínimo 6 caracteres) con
confirmación.

### Verificación en dos pasos (2FA)

HomeLedger soporta **TOTP sin conexión** (contraseña de un solo uso basada en
tiempo) — funciona con cualquier app de autenticación (Google Authenticator,
Aegis, etc.) y no requiere conexión a internet.

**Para activar:**
1. Haz clic en **Activar** en la sección de 2FA.
2. Agrega la clave secreta mostrada a tu app de autenticación (o escanea el URI
   `otpauth://`).
3. Ingresa el código de 6 dígitos de tu app para **confirmar** — esto activa el
   2FA.
4. **Guarda tus códigos de respaldo** — se muestran 10 códigos de un solo uso
   (cada uno funciona una vez). Guárdalos en un lugar seguro; no se volverán a
   mostrar.

**Al iniciar sesión**, tras ingresar correo y contraseña, un segundo paso pide el
código de 6 dígitos de tu autenticador (o un código de respaldo).

**Para desactivar**, ingresa un código válido o un código de respaldo.

### Sesiones activas

Ve todos los dispositivos/navegadores donde tienes sesión iniciada:
- Cada sesión muestra dirección IP, agente de usuario, última vez usada y si es
  la sesión actual.
- **Revoca** cualquier sesión individual (revocar la actual cierra tu sesión).
- **Cerrar todas las sesiones** cierra sesión en todos lados.

### Bloqueo de la app (opcional)

Un bloqueo local, opcional, que protege la app en este dispositivo:
- **Biométrico** (WebAuthn): usa la huella o el reconocimiento facial de tu
  dispositivo.
- **PIN** (4–8 dígitos): alternativa cuando la biometría no está disponible.

Es un bloqueo de conveniencia (como el bloqueo de apps del teléfono). **No**
reemplaza tu sesión de inicio ni afecta al servidor — si alguien lo evade con
herramientas de desarrollador, aún no puede llamar a la API sin tu token JWT.

---

## 23. Claves de API y Webhooks

La pestaña **API** de Ajustes te permite integrar HomeLedger con otras
herramientas.

### Claves de API

Crea claves para acceder a la API REST de forma programática (mediante el
encabezado `X-API-Key`).

1. Haz clic en **Crear clave**, dale un nombre.
2. **Permisos (scopes)** (opcional): selecciona qué permisos tiene la clave (p.
   ej. `read:transactions`, `write:accounts`). Si no seleccionas ninguno, la
   clave tiene **acceso completo**.
3. La clave se muestra **una sola vez** — cópiala. Después de cerrar, solo la
   metadata (nombre, permisos, último uso) es visible.
4. **Revoca** una clave para invalidarla permanentemente.

La **documentación de la API** está en `/api/docs` (Swagger UI) — hay un enlace
en la pestaña API.

### Webhooks

Envía notificaciones de eventos en tiempo real a tus propios endpoints (p. ej.
Home Assistant, un script local o cualquier servidor HTTP).

1. Haz clic en **Agregar webhook**.
2. **URL**: el endpoint HTTP(S) al que se hará POST.
3. **Secreto** (opcional): cuando se define, cada entrega incluye un encabezado
   `X-HomeLedger-Signature: sha256=<hex>` (HMAC-SHA256 del cuerpo) para que
   verifiques su autenticidad.
4. **Eventos**: elige cuáles disparan una entrega:
   - `transaction.created` — se creó una transacción.
   - `budget.exceeded` — una línea de presupuesto excedió su asignación.
   - `goal.completed` — una meta de ahorro llegó al 100%.
   - `subscription.upcoming` — un pago de suscripción vence pronto (≤3 días).
5. Interruptor de **Activado**.
6. El botón **Probar** envía un evento de prueba para verificar la conexión.

Las entregas son **de tipo "dispara y olvida"** (no bloqueantes, mejor esfuerzo)
con un tiempo de espera de 5 segundos. El estado de la última entrega se muestra
junto a cada webhook.

---

## 24. Panel de administración

Visible solo para usuarios con el rol de **administrador** (el primer usuario
registrado).

### Gestión de usuarios

- **Listar** todos los usuarios con su rol y estado.
- **Activar / Desactivar** una cuenta (los usuarios desactivados no pueden
  iniciar sesión).
- **Restablecer contraseña** de cualquier usuario (genera una fuerte o define la
  tuya).
- **Eliminar** un usuario y todos sus datos.

### Política de registro

Controla quién puede crear una cuenta:

| Modo | Comportamiento |
|---|---|
| **Solo primer usuario** (predeterminado, seguro) | Solo el primer usuario puede registrarse (crea el admin), luego el registro se cierra |
| **Abierto** | Cualquiera puede registrarse (opcionalmente restringido por una lista de correos permitidos) |
| **Cerrado** | Nadie puede registrarse; el admin crea las cuentas |

### Moneda de la instancia

Cambia la moneda de visualización de la instalación (MXN, USD, EUR, COP, ARS,
CLP, PEN, BRL). Afecta todos los montos y símbolos en toda la app.

---

## 25. PWA / modo sin conexión

HomeLedger es una **Aplicación Web Progresiva instalable**.

### Instalar

En navegadores compatibles (Chrome, Edge, Safari), usa la opción "Instalar" o
"Agregar a la pantalla de inicio" del navegador. La app obtiene su propia
ventana, ícono y entrada en el menú inicio (o pantalla de inicio).

### Modo sin conexión

Cuando pierdes conectividad a internet:
- Aparece un pequeño aviso **"Estás sin conexión"** en la parte superior.
- Las páginas y datos en caché siguen funcionando (el service worker usa una
  estrategia de red primero con respaldo en caché).
- Si una página aún no se ha cacheado, se muestra una **página sin conexión**
  dedicada con un botón de Reintentar.
- Cuando vuelve la conexión, el aviso desaparece automáticamente.

---

## 26. Integración con Home Assistant

HomeLedger ofrece dos piezas independientes de Home Assistant.

### Complemento (ejecutar HomeLedger dentro de HA)

Instala el complemento desde el repositorio
(`https://github.com/TastingRogue/HomeLedger`). Ejecuta la app completa dentro de
Home Assistant con Ingress (acceso desde la barra lateral). Consulta el README
para las opciones de configuración.

### Integración personalizada vía HACS (sensores en HA)

Conecta una instancia de HomeLedger en ejecución a Home Assistant para exponer
tus finanzas como entidades de HA.

**Sensores creados:**
- Gastos mensuales, ingresos mensuales, ahorro mensual.
- Presupuesto restante, patrimonio neto, saldo total.
- Utilización de la tarjeta de crédito.

**Sensores binarios:**
- Sobre el presupuesto, utilización de crédito alta, pago próximo, saldo bajo.

**Servicios (invocables desde automatizaciones):**
- `homeledger.create_transaction` — crear un ingreso/gasto.
- `homeledger.create_quick_expense` — gasto rápido.
- `homeledger.refresh_data` — forzar una actualización de datos.

**Ejemplos de automatización:** notificar cuando un pago de suscripción vence
pronto (usando el sensor binario `payment_due_soon`), o cuando la utilización de
crédito cruza un umbral.

---

## Consejos y atajos

- **Escape** cierra cualquier ventana o panel abierto.
- El teclado de **Registro rápido** recuerda tus cuentas y categorías usadas
  recientemente para capturar más rápido.
- Usa **etiquetas** para clasificaciones transversales (p. ej. "vacaciones",
  "deducible de impuestos") que no encajan en una sola categoría.
- El **rollover de presupuesto** arrastra los montos no usados al siguiente
  periodo automáticamente — no pierdes lo no gastado.
- **Deduplicación por UUID de CFDI**: importar la misma factura digital mexicana
  dos veces no creará una transacción duplicada.
- **Respalda antes de actualizar**: siempre exporta un respaldo JSON antes de
  actualizar HomeLedger. Las importaciones remapean IDs de forma segura, así que
  una restauración nunca choca con datos existentes.

---

*HomeLedger es software libre y de código abierto bajo la licencia MIT. Las
contribuciones, reportes de errores y solicitudes de funciones son bienvenidos en
[github.com/TastingRogue/HomeLedger](https://github.com/TastingRogue/HomeLedger).*
