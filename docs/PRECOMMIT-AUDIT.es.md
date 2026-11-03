# Revisión previa al commit — cierre

Los hallazgos funcionales de la auditoría del 2 de noviembre de 2026 están corregidos. No se creó un commit ni se modificaron credenciales o datos financieros al cerrar esta revisión.

## Cambios comprobados

- Dashboard y calendario recorren todas las páginas de movimientos. Una prueba usa 237 registros para superar el límite de 100 de la API.
- Las series convierten las monedas usando el tipo de cambio de cada cuenta y conservan intactos los importes de los editores.
- El mes financiero usa la fecha civil almacenada (prefijo YYYY-MM-DD), como los reportes. Ya no se consulta con un final inclusivo del mes siguiente. Pruebas de primer/último día, medianoche ISO y año bisiesto.
- Dashboard, reportes y calendario muestran gastos de noviembre por **6,741.75 MXN** con el mismo dataset. La discrepancia anterior de 19.75 correspondía a movimientos que cambiaban de día al interpretar la medianoche UTC en hora local.
- La tabla de presupuestos incluye categorías y etiquetas. El restante incorpora saldo arrastrado. Dos pruebas de componente cubren presupuesto solo por etiquetas y mixto.
- Alertas recupera evaluación manual y filtro por tipo. Ambos se comprobaron en el contenedor; el filtro por pago próximo mostró únicamente la alerta correspondiente.
- El dashboard consulta alertas reales sin leer, en lugar de presentar únicamente cuentas con saldo bajo.
- Eventos del calendario abren el detalle completo de Transacciones o el formulario completo de Suscripciones mediante enlaces de registro. Se comprobaron historial/división/estado/conciliación y cargo automático, sin guardar cambios.
- Calendario y selección de recibos descartan respuestas de peticiones anteriores; los Blob URL se liberan. Se comprobaron cambios rápidos en la UI, sin simular una conexión lenta.
- La agenda móvil muestra todos los eventos. Los días de escritorio permiten expandir los eventos adicionales.
- Se reparó el verificador de producción de los temas y se añadió a CI después del build.
- Textos de moneda de Settings actualizados en inglés y español.

## Validación

- Backend/shared: **717 pruebas aprobadas**.
- Frontend: **135 pruebas aprobadas** en la suite general, más **2 pruebas de componente** de presupuestos aprobadas tras añadirlas: 137 en total.
- Typecheck backend aprobado; frontend sin errores ni advertencias.
- Lint: **cero errores, 113 advertencias preexistentes**. No se suprimieron reglas ni se cambiaron archivos ajenos para ocultarlas. El lint actual analiza TypeScript; los componentes Svelte están cubiertos por typecheck y pruebas, no por un nuevo parser de ESLint.
- Build de producción local y Docker aprobados. Verificador de bootstrap, CSS, fallback y chrome del navegador aprobado.
- Se comprobó el cambio Normal → Cyberpunk y se restauró Cyberpunk. Responsive a 390 y 1920 px sin overflow horizontal de página en las vistas comprobadas.
- Contenedor local actualizado en `127.0.0.1:3080`, conservando volumen y configuración.

## Limpieza y documentación

Se eliminaron 95 imágenes, galerías y archivos de prompts de las exploraciones y validaciones del tema, ocho capturas antiguas del README y los informes intermedios duplicados. El README contiene capturas actuales del contenedor con datos sintéticos: nueve vistas del tema Normal y tres del tema Cyberpunk. La galería desplegable de Normal conserva acceso a sus vistas sin alargar la presentación inicial. Las fuentes y sus licencias OFL permanecen en `packages/frontend/static/fonts/cyberpunk`. La guía de contribución de temas está en `THEMES.md`.

## Límites de esta revisión

No es una prueba de penetración ni un análisis de CVE de dependencias. No se probó una instalación real de Home Assistant ni se repitió cada operación destructiva/importación/restauración. Para historiales muy grandes, recorrer todas las páginas puede resultar más lento que ofrecer agregados por período en el backend; los importes ya no se truncan silenciosamente. No se hizo commit, staging ni push. Los cambios previos de infraestructura, integración y tema siguen disponibles para dividirse en commits revisables.
