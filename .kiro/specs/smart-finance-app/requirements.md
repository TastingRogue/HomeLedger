# Requirements Document

## Introduction

Smart Finance es una aplicación móvil nativa para Android diseñada para reemplazar un sistema existente en Notion. La aplicación permite el seguimiento completo de cuentas bancarias, transacciones, suscripciones, tarjetas de crédito y metas de ahorro. Todos los datos se almacenan localmente en el dispositivo (SQLite/Hive) sin depender de un servidor externo ni base de datos en la nube, garantizando funcionamiento 100% offline. La aplicación se distribuye como compra única en Google Play Store (~$49-79 MXN) con todas las funcionalidades desbloqueadas, sin compras dentro de la app ni suscripciones. Opcionalmente el usuario puede respaldar sus datos exportándolos a su propia cuenta de Google Drive. El idioma principal es español y la moneda base es el Peso Mexicano (MXN). La aplicación ofrece entrada rápida de datos optimizada para la experiencia móvil nativa.

## Glossary

- **Sistema**: La aplicación Smart Finance en su totalidad (aplicación móvil Android nativa)
- **Gestor_de_Cuentas**: Módulo responsable de crear, editar y administrar cuentas financieras
- **Registrador_de_Transacciones**: Módulo que captura y almacena ingresos y gastos
- **Motor_de_Transferencias**: Módulo que procesa movimientos de dinero entre cuentas propias
- **Gestor_de_Suscripciones**: Módulo que administra pagos recurrentes y calcula próximos cobros
- **Monitor_de_Crédito**: Módulo que rastrea el uso y disponibilidad de tarjetas de crédito
- **Gestor_de_Metas**: Módulo que administra objetivos de ahorro y su progreso
- **Panel_Principal**: Vista de resumen con indicadores financieros clave
- **Calendario_de_Pagos**: Vista que muestra pagos próximos con cuenta regresiva
- **Motor_de_Alertas**: Módulo que genera notificaciones sobre estados financieros
- **Analizador_de_Categorías**: Módulo que agrupa y resume gastos por categoría
- **Almacén_Local**: Base de datos local en el dispositivo (SQLite/Hive) que persiste todos los datos de la aplicación sin conexión a internet
- **Gestor_de_Respaldo**: Módulo que exporta e importa datos de la aplicación y gestiona respaldos opcionales en Google Drive del usuario
- **Cuenta**: Entidad financiera (ahorros, crédito, inversión, vales o efectivo) con balance y propiedades
- **Transacción**: Registro individual de ingreso o gasto asociado a una cuenta y categoría
- **Transferencia**: Movimiento de fondos entre dos cuentas propias del usuario
- **Suscripción**: Pago recurrente con ciclo definido (semanal o mensual)
- **Meta_de_Ahorro**: Objetivo financiero con monto target y seguimiento de progreso
- **Categoría**: Clasificación de gastos o ingresos (ej: Comida, Renta, Nómina)
- **Tipo_de_Cuenta**: Clasificación de cuenta: Ahorros, Crédito, Inversión, Vales, Efectivo
- **Ciclo_de_Pago**: Frecuencia de cobro de una suscripción: Semanal o Mensual
- **Límite_de_Balance**: Umbral mínimo configurado por cuenta que activa alertas
- **Utilización_de_Crédito**: Porcentaje del límite de crédito actualmente en uso
- **Respaldo**: Copia completa de los datos de la aplicación exportada en formato JSON o compatible
- **Google_Drive_del_Usuario**: Almacenamiento en la nube personal del usuario utilizado opcionalmente para guardar respaldos

## Requirements

### Requirement 1: Gestión de Cuentas Financieras

**User Story:** Como usuario, quiero administrar múltiples cuentas financieras de diferentes tipos, para tener visibilidad completa de mis activos y pasivos.

#### Acceptance Criteria

1. THE Gestor_de_Cuentas SHALL permitir crear una Cuenta con los campos obligatorios: nombre (máximo 50 caracteres, no vacío), balance inicial (valor numérico de -999,999,999.99 a 999,999,999.99), divisa (MXN por defecto), Tipo_de_Cuenta, banco (máximo 50 caracteres, opcional), estado (Activo por defecto) y Límite_de_Balance (valor numérico, opcional)
2. THE Gestor_de_Cuentas SHALL soportar los siguientes valores de Tipo_de_Cuenta: Ahorros, Crédito, Inversión, Vales y Efectivo
3. WHEN el usuario modifica los datos de una Cuenta, THE Gestor_de_Cuentas SHALL persistir los cambios en el Almacén_Local y actualizar el balance actual reflejado en el Panel_Principal en un máximo de 2 segundos
4. WHEN el usuario desactiva una Cuenta, THE Gestor_de_Cuentas SHALL cambiar el estado a Inactivo y excluir la Cuenta de los cálculos del Panel_Principal
5. THE Gestor_de_Cuentas SHALL calcular y mostrar el balance actual de cada Cuenta como: balance inicial + suma de ingresos − suma de gastos + suma de transferencias recibidas − suma de transferencias enviadas
6. IF el usuario intenta crear una Cuenta sin completar los campos obligatorios (nombre, balance inicial, Tipo_de_Cuenta), THEN THE Gestor_de_Cuentas SHALL rechazar la operación e indicar los campos faltantes
7. IF el usuario intenta crear o editar una Cuenta con un nombre que ya existe en otra Cuenta activa, THEN THE Gestor_de_Cuentas SHALL rechazar la operación e indicar que el nombre ya está en uso

### Requirement 2: Registro de Transacciones

**User Story:** Como usuario, quiero registrar mis ingresos y gastos con detalle, para tener un historial completo de mis movimientos financieros.

#### Acceptance Criteria

1. THE Registrador_de_Transacciones SHALL permitir crear una Transacción con los campos obligatorios: nombre (máximo 100 caracteres), cuenta asociada, fecha con hora y zona horaria (CST), categoría, monto (valor mayor a 0 con exactamente 2 decimales, máximo 999,999,999.99), tipo (Ingreso o Gasto); y campo opcional: factura (archivo de imagen adjunto)
2. WHEN el usuario registra una Transacción de tipo Gasto, THE Registrador_de_Transacciones SHALL restar el monto del balance de la Cuenta asociada
3. WHEN el usuario registra una Transacción de tipo Ingreso, THE Registrador_de_Transacciones SHALL sumar el monto al balance de la Cuenta asociada
4. THE Registrador_de_Transacciones SHALL asociar cada Transacción a exactamente una Categoría y una Cuenta
5. WHEN el usuario elimina una Transacción, THE Registrador_de_Transacciones SHALL revertir el efecto en el balance de la Cuenta asociada
6. THE Registrador_de_Transacciones SHALL mostrar el listado de Transacciones ordenado por fecha descendente con filtros por cuenta, categoría, tipo y rango de fechas
7. IF el usuario intenta registrar una Transacción con algún campo obligatorio vacío o con un monto menor o igual a 0, THEN THE Registrador_de_Transacciones SHALL rechazar la operación y mostrar un mensaje de error indicando los campos inválidos
8. WHEN el usuario edita una Transacción existente, THE Registrador_de_Transacciones SHALL revertir el efecto previo en el balance de la Cuenta asociada y aplicar el nuevo efecto según los valores actualizados
9. IF el usuario edita una Transacción y cambia la Cuenta asociada, THEN THE Registrador_de_Transacciones SHALL revertir el efecto en la Cuenta original y aplicar el efecto en la nueva Cuenta seleccionada

### Requirement 3: Transferencias entre Cuentas

**User Story:** Como usuario, quiero registrar transferencias entre mis cuentas propias, para reflejar movimientos internos sin afectar mi balance total.

#### Acceptance Criteria

1. THE Motor_de_Transferencias SHALL permitir crear una Transferencia con los campos: nombre (máximo 100 caracteres), fecha, monto (valor mayor a 0 y menor o igual a 999,999,999.99 MXN), cuenta origen y cuenta destino
2. WHEN el usuario registra una Transferencia, THE Motor_de_Transferencias SHALL restar el monto de la cuenta origen y sumar el monto a la cuenta destino de forma atómica, de modo que el balance total consolidado no se altere
3. IF el usuario intenta crear una Transferencia donde la cuenta origen y la cuenta destino son la misma, THEN THE Motor_de_Transferencias SHALL rechazar la operación y mostrar un mensaje de error indicando que las cuentas deben ser diferentes
4. THE Motor_de_Transferencias SHALL mostrar el historial de Transferencias ordenado por fecha descendente
5. WHEN el usuario elimina una Transferencia, THE Motor_de_Transferencias SHALL sumar el monto a la cuenta origen y restar el monto de la cuenta destino para revertir el movimiento original
6. IF el usuario intenta crear una Transferencia con un monto que excede el balance disponible en la cuenta origen, THEN THE Motor_de_Transferencias SHALL rechazar la operación y mostrar un mensaje de error indicando fondos insuficientes

### Requirement 4: Gestión de Suscripciones y Pagos Recurrentes

**User Story:** Como usuario, quiero administrar mis suscripciones y pagos recurrentes, para anticipar mis gastos fijos y controlar mis compromisos financieros.

#### Acceptance Criteria

1. THE Gestor_de_Suscripciones SHALL permitir crear una Suscripción con los campos: nombre (máximo 100 caracteres), fecha de inicio, monto (entre 0.01 y 999,999,999.99 MXN), Ciclo_de_Pago (Semanal o Mensual), categoría, cuenta asociada, estado (Activa/Inactiva) y bandera de cargo automático
2. THE Gestor_de_Suscripciones SHALL calcular la fecha del próximo pago sumando 7 días a la última fecha de pago para ciclo Semanal, o sumando 1 mes calendario para ciclo Mensual; si el día resultante no existe en el mes destino (por ejemplo, 31 en un mes de 30 días), se utilizará el último día de ese mes
3. THE Gestor_de_Suscripciones SHALL calcular y mostrar los días restantes hasta el próximo pago de cada Suscripción activa, mostrando 0 cuando la fecha de pago es hoy
4. WHEN una Suscripción tiene la bandera de cargo automático activada y llega la fecha del próximo pago, THE Gestor_de_Suscripciones SHALL registrar automáticamente una Transacción de tipo Gasto en la cuenta asociada utilizando el nombre de la Suscripción como nombre de la Transacción, el monto de la Suscripción, y la Categoría asignada a la Suscripción
5. WHEN el usuario desactiva una Suscripción, THE Gestor_de_Suscripciones SHALL detener el cálculo de próximos pagos y excluir la Suscripción del Calendario_de_Pagos
6. THE Gestor_de_Suscripciones SHALL permitir asociar cada Suscripción a exactamente una Categoría del catálogo de Categorías existente para el seguimiento de gastos
7. IF una Suscripción con cargo automático llega a su fecha de pago y la cuenta asociada no tiene balance suficiente para cubrir el monto, THEN THE Gestor_de_Suscripciones SHALL registrar la Transacción de tipo Gasto igualmente, permitiendo que el balance de la cuenta resulte negativo

### Requirement 5: Monitoreo de Tarjetas de Crédito

**User Story:** Como usuario, quiero monitorear el estado de mis tarjetas de crédito, para controlar mi nivel de endeudamiento y evitar exceder mis límites.

#### Acceptance Criteria

1. WHEN una Cuenta de Tipo_de_Cuenta Crédito es creada, THE Monitor_de_Crédito SHALL requerir los campos adicionales: límite de crédito (valor entre 0.01 y 999,999,999.99 MXN) y suscripciones vinculadas (selección de 0 o más Suscripciones existentes)
2. THE Monitor_de_Crédito SHALL calcular la Utilización_de_Crédito como el valor absoluto del balance actual de la Cuenta de crédito dividido entre el límite de crédito, expresado en porcentaje con hasta 2 decimales
3. THE Monitor_de_Crédito SHALL mostrar un indicador visual del nivel de Utilización_de_Crédito con estados: saludable (0-30%), moderado (31-70%) y crítico (71-100% o superior)
4. WHEN la Utilización_de_Crédito cruza el umbral del 80% al registrarse una Transacción o Transferencia, THE Motor_de_Alertas SHALL generar una única alerta de utilización alta que no se repita hasta que la utilización baje por debajo del 80% y vuelva a superarlo
5. THE Monitor_de_Crédito SHALL mostrar el listado de Suscripciones vinculadas a cada tarjeta de crédito incluyendo por cada una: nombre, monto, Ciclo_de_Pago y días restantes para el próximo cobro
6. WHEN el usuario modifica el límite de crédito de una Cuenta de tipo Crédito, THE Monitor_de_Crédito SHALL recalcular la Utilización_de_Crédito y actualizar el indicador visual inmediatamente

### Requirement 6: Metas de Ahorro

**User Story:** Como usuario, quiero establecer metas de ahorro con montos objetivo, para planificar y dar seguimiento a mis objetivos financieros.

#### Acceptance Criteria

1. THE Gestor_de_Metas SHALL permitir crear una Meta_de_Ahorro con los campos: nombre (máximo 100 caracteres), monto objetivo (de MX$0.01 a MX$999,999,999.99), tipo (Lista de Deseos o Deuda), fecha límite opcional y estado (Activa o Completada)
2. THE Gestor_de_Metas SHALL calcular el progreso de cada Meta_de_Ahorro como el porcentaje del monto ahorrado respecto al monto objetivo, con un rango de 0% a 100%
3. THE Gestor_de_Metas SHALL mostrar una barra de progreso visual para cada Meta_de_Ahorro que represente el porcentaje de progreso calculado
4. WHEN el usuario asigna fondos a una Meta_de_Ahorro, THE Gestor_de_Metas SHALL incrementar el monto ahorrado en la cantidad asignada, actualizar el porcentaje de progreso y limitar el monto ahorrado al monto objetivo
5. WHEN una Meta_de_Ahorro alcanza el 100% de progreso, THE Motor_de_Alertas SHALL generar una notificación de meta cumplida y THE Gestor_de_Metas SHALL cambiar el estado de la Meta_de_Ahorro a Completada
6. WHEN el usuario retira fondos de una Meta_de_Ahorro, THE Gestor_de_Metas SHALL decrementar el monto ahorrado en la cantidad retirada sin permitir que el monto ahorrado sea menor a MX$0.00, y actualizar el porcentaje de progreso
7. IF el monto a asignar excede la diferencia entre el monto objetivo y el monto ahorrado actual, THEN THE Gestor_de_Metas SHALL asignar únicamente la diferencia restante para alcanzar el monto objetivo

### Requirement 7: Panel Principal y Resumen Financiero

**User Story:** Como usuario, quiero ver un resumen completo de mi situación financiera en un solo lugar, para tomar decisiones informadas sobre mi dinero.

#### Acceptance Criteria

1. THE Panel_Principal SHALL mostrar el balance consolidado como la suma de los balances de todas las Cuentas activas, incluyendo Cuentas de tipo Crédito con su saldo como valor negativo
2. THE Panel_Principal SHALL mostrar un resumen de ingresos y gastos del período actual (mes en curso) con el total de ingresos, el total de gastos y el desglose de montos por cada Categoría que tenga al menos una Transacción en el período
3. THE Panel_Principal SHALL mostrar el estado de cada Cuenta activa con su nombre, balance actual y el indicador de salud basado en el Límite_de_Balance configurado (balance correcto si está por encima, balance bajo si está por debajo)
4. THE Panel_Principal SHALL mostrar las próximas Suscripciones activas por vencer ordenadas por días restantes ascendente, hasta un máximo de 5 elementos, mostrando nombre, monto, días restantes y cuenta asociada
5. THE Panel_Principal SHALL mostrar el progreso de cada Meta_de_Ahorro activa incluyendo nombre, monto ahorrado, monto objetivo, porcentaje de progreso y barra de progreso visual
6. WHEN se registra una Transacción, Transferencia o asignación a Meta_de_Ahorro, THE Panel_Principal SHALL actualizar todos los valores afectados en un máximo de 2 segundos
7. IF no existen Cuentas activas, Transacciones en el mes, Suscripciones activas o Metas de Ahorro activas, THEN THE Panel_Principal SHALL mostrar un estado vacío con un mensaje indicando la ausencia de datos en cada sección correspondiente

### Requirement 8: Calendario de Pagos

**User Story:** Como usuario, quiero ver un calendario con mis próximos pagos, para planificar mi flujo de efectivo y evitar retrasos.

#### Acceptance Criteria

1. THE Calendario_de_Pagos SHALL mostrar todas las Suscripciones activas con su fecha de próximo pago y días restantes calculados desde la fecha actual
2. THE Calendario_de_Pagos SHALL ordenar los pagos por proximidad (días restantes ascendente), mostrando primero los pagos vencidos (días restantes negativos) y luego los próximos a vencer
3. THE Calendario_de_Pagos SHALL mostrar para cada pago: nombre, monto en formato MX$X,XXX.XX, cuenta asociada, categoría y días restantes
4. WHILE un pago tiene entre 1 y 3 días restantes, THE Calendario_de_Pagos SHALL mostrar el pago con un indicador visual distintivo etiquetado como "Urgente" que lo diferencie de los pagos no urgentes
5. WHEN los días restantes de una Suscripción alcanzan 0, THE Motor_de_Alertas SHALL generar una notificación de pago vencido indicando el nombre de la Suscripción, el monto y la cuenta asociada
6. IF una Suscripción tiene días restantes negativos (fecha de pago pasada sin registro de Transacción), THEN THE Calendario_de_Pagos SHALL mostrar el pago con un indicador visual de "Vencido" diferenciado del indicador "Urgente"
7. IF no existen Suscripciones activas, THEN THE Calendario_de_Pagos SHALL mostrar un mensaje indicando que no hay pagos programados

### Requirement 9: Alertas y Notificaciones

**User Story:** Como usuario, quiero recibir alertas sobre estados importantes de mis finanzas, para reaccionar a tiempo ante situaciones que requieren mi atención.

#### Acceptance Criteria

1. WHEN el balance de una Cuenta cae por debajo de su Límite_de_Balance configurado tras registrar una Transacción o Transferencia, THE Motor_de_Alertas SHALL generar una alerta de balance bajo para esa Cuenta indicando el nombre de la Cuenta, el balance actual y el Límite_de_Balance configurado
2. WHILE el balance de una Cuenta es igual o superior a su Límite_de_Balance configurado, THE Motor_de_Alertas SHALL mostrar el indicador de balance correcto para esa Cuenta
3. WHEN una Suscripción activa alcanza 3 días o menos restantes para su próximo pago, THE Motor_de_Alertas SHALL generar una notificación de pago próximo indicando el nombre de la Suscripción, el monto, la cuenta asociada y los días restantes
4. WHEN la Utilización_de_Crédito de una Cuenta de tipo Crédito supera el 80%, THE Motor_de_Alertas SHALL generar una notificación de utilización alta indicando el nombre de la Cuenta, el porcentaje de utilización actual y el límite de crédito
5. WHEN una Meta_de_Ahorro alcanza el 100% de progreso, THE Motor_de_Alertas SHALL generar una notificación de meta cumplida indicando el nombre de la Meta_de_Ahorro y el monto objetivo alcanzado
6. IF una Cuenta no tiene un Límite_de_Balance configurado, THEN THE Motor_de_Alertas SHALL omitir la evaluación de alertas de balance bajo y del indicador de balance correcto para esa Cuenta

### Requirement 10: Análisis por Categorías

**User Story:** Como usuario, quiero ver un desglose de mis gastos por categoría, para identificar en qué áreas estoy gastando más y optimizar mi presupuesto.

#### Acceptance Criteria

1. THE Analizador_de_Categorías SHALL calcular el total de gastos acumulados por cada Categoría sumando los montos de todas las Transacciones de tipo Gasto asociadas a esa Categoría
2. THE Analizador_de_Categorías SHALL mostrar el listado de Categorías ordenado por monto total de gastos descendente, excluyendo Categorías con total de MX$0.00 del listado por defecto
3. THE Analizador_de_Categorías SHALL permitir filtrar los totales por rango de fechas con fecha de inicio y fecha de fin; si no se especifica rango, mostrará los totales del mes en curso
4. THE Analizador_de_Categorías SHALL soportar las siguientes Categorías predefinidas: Comida, Compras, Corrección, Despensa, Dividendos, Educación, Entretenimiento, Gasolina, ISP, Limpieza, Luz, MX-5, Nómina, Préstamo, Renta, Salud, Telefonía, Transporte y Vales
5. THE Analizador_de_Categorías SHALL permitir al usuario crear Categorías adicionales con nombre único (máximo 50 caracteres) que no duplique una Categoría existente
6. THE Analizador_de_Categorías SHALL mostrar para cada Categoría el porcentaje que representa respecto al total de gastos del período seleccionado

### Requirement 11: Entrada Rápida de Datos desde Móvil

**User Story:** Como usuario, quiero registrar transacciones de forma rápida desde mi teléfono, para capturar gastos en el momento en que ocurren sin fricción.

#### Acceptance Criteria

1. THE Sistema SHALL proporcionar una interfaz nativa de registro rápido optimizada para la experiencia táctil del dispositivo Android, con campos: monto (valor numérico entre 0.01 y 999,999,999.99), cuenta, categoría y tipo (Ingreso o Gasto, con Gasto seleccionado por defecto)
2. WHEN el usuario utiliza el registro rápido, THE Registrador_de_Transacciones SHALL completar automáticamente la fecha y hora actual con zona horaria CST y asignar como nombre de la Transacción el nombre de la Categoría seleccionada
3. THE Sistema SHALL permitir seleccionar cuenta y categoría mediante listas desplegables que muestren las 5 opciones utilizadas más recientemente en primer lugar, seguidas del resto en orden alfabético
4. THE Sistema SHALL completar el registro de una Transacción en un máximo de 3 pasos desde la pantalla principal
5. THE Sistema SHALL proporcionar un teclado numérico nativo del dispositivo para la entrada de montos, con botones de tamaño mínimo de 48x48 dp para facilitar la interacción táctil
6. WHEN el usuario confirma el registro rápido con datos válidos, THE Registrador_de_Transacciones SHALL guardar la Transacción en el Almacén_Local, actualizar el balance de la Cuenta asociada y mostrar una confirmación visual durante al menos 2 segundos indicando el registro exitoso
7. IF el usuario intenta confirmar el registro rápido sin haber ingresado un monto válido o sin haber seleccionado cuenta y categoría, THEN THE Sistema SHALL indicar los campos faltantes y no registrar la Transacción

### Requirement 12: Soporte de Idioma y Moneda

**User Story:** Como usuario hispanohablante en México, quiero que la aplicación esté en español y maneje pesos mexicanos, para interactuar con la aplicación en mi idioma y moneda nativos.

#### Acceptance Criteria

1. THE Sistema SHALL presentar toda la interfaz de usuario en idioma español como idioma predeterminado, incluyendo etiquetas de navegación, campos de formulario, mensajes de confirmación e indicaciones de error
2. THE Sistema SHALL utilizar MXN (Peso Mexicano) como moneda predeterminada para todas las cuentas y transacciones
3. THE Sistema SHALL formatear montos monetarios con el formato "MX$X,XXX.XX" utilizando coma como separador de miles, punto como separador decimal, siempre mostrando exactamente 2 decimales, y anteponiendo el signo "-" para montos negativos (ej: "-MX$1,500.00")
4. THE Sistema SHALL mostrar fechas en formato "d de MMMM de yyyy" en español (ej: "1 de enero de 2024") y horas en formato "HH:mm" con zona horaria América/Ciudad_de_México (CST/CDT)
5. THE Sistema SHALL utilizar terminología financiera en español consistente en toda la aplicación (ej: "Gasto" en lugar de "Expense", "Ingreso" en lugar de "Income")
6. IF el Sistema muestra un monto monetario con valor cero, THEN THE Sistema SHALL presentarlo como "MX$0.00"

### Requirement 13: Almacenamiento Local y Respaldo de Datos

**User Story:** Como usuario, quiero que mis datos financieros se almacenen de forma segura en mi dispositivo y tener la opción de respaldarlos, para no depender de internet y no perder mi información.

#### Acceptance Criteria

1. THE Almacén_Local SHALL persistir todos los datos de la aplicación (Cuentas, Transacciones, Transferencias, Suscripciones, Metas de Ahorro y Categorías) en una base de datos local en el dispositivo Android sin requerir conexión a internet
2. THE Almacén_Local SHALL garantizar la integridad de los datos utilizando transacciones atómicas para operaciones que afecten múltiples registros (creación de Transferencias, eliminación de Transacciones con reversión de balance)
3. THE Gestor_de_Respaldo SHALL permitir exportar todos los datos de la aplicación a un archivo en formato JSON que el usuario pueda almacenar en el almacenamiento del dispositivo
4. THE Gestor_de_Respaldo SHALL permitir importar un archivo JSON de respaldo previamente exportado, restaurando todos los datos contenidos y reemplazando los datos actuales de la aplicación
5. WHERE el usuario ha vinculado su cuenta de Google Drive, THE Gestor_de_Respaldo SHALL permitir subir el archivo de respaldo directamente al Google_Drive_del_Usuario sin requerir un servidor intermediario
6. WHERE el usuario ha vinculado su cuenta de Google Drive, THE Gestor_de_Respaldo SHALL permitir descargar y restaurar un archivo de respaldo previamente guardado en el Google_Drive_del_Usuario
7. WHEN el usuario inicia una exportación de datos, THE Gestor_de_Respaldo SHALL incluir en el archivo JSON: la versión de la aplicación, la fecha de exportación en formato ISO 8601, y la totalidad de los registros de cada entidad
8. IF el usuario intenta importar un archivo de respaldo con formato inválido o con una versión de esquema incompatible, THEN THE Gestor_de_Respaldo SHALL rechazar la importación y mostrar un mensaje de error indicando el problema detectado
9. WHEN el usuario inicia una importación de datos, THE Gestor_de_Respaldo SHALL solicitar confirmación explícita al usuario advirtiendo que los datos actuales serán reemplazados antes de proceder con la operación

### Requirement 14: Plataforma y Distribución

**User Story:** Como usuario de Android en México, quiero descargar la aplicación desde Google Play Store con todas las funciones disponibles desde la compra, para tener una experiencia completa sin costos adicionales.

#### Acceptance Criteria

1. THE Sistema SHALL funcionar como aplicación nativa de Android compatible con la versión mínima de Android 8.0 (API nivel 26) y versiones superiores
2. THE Sistema SHALL operar con todas sus funcionalidades de forma completamente offline sin requerir conexión a internet, excepto para la funcionalidad opcional de respaldo en Google Drive
3. THE Sistema SHALL desbloquear todas las funcionalidades desde la instalación sin compras dentro de la aplicación, suscripciones ni contenido bloqueado
4. THE Sistema SHALL cumplir con las políticas de publicación de Google Play Store incluyendo: clasificación de contenido apropiada, declaración de permisos utilizados y política de privacidad accesible
5. THE Sistema SHALL solicitar únicamente los permisos estrictamente necesarios para su funcionamiento: almacenamiento local para la base de datos, y acceso a Google Drive solo cuando el usuario active la funcionalidad de respaldo en la nube
6. THE Sistema SHALL mantener un tamaño de instalación menor a 50 MB para facilitar la descarga y minimizar el uso de almacenamiento del dispositivo
7. THE Sistema SHALL iniciar y mostrar la pantalla principal en un tiempo máximo de 3 segundos en dispositivos con las especificaciones mínimas soportadas (Android 8.0, 2 GB RAM)
8. IF el dispositivo no cuenta con conexión a internet y el usuario intenta realizar un respaldo en Google Drive, THEN THE Sistema SHALL informar al usuario que la operación requiere conexión a internet y ofrecer la alternativa de exportar el respaldo al almacenamiento local del dispositivo
