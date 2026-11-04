# Correcciones de auditoría

## Implementado

- Seis rutas de capturas de Pages corregidas y galería Cyberpunk añadida.
  `node scripts/check-pages.mjs` comprueba src/href locales; se ejecuta en CI y
  antes de desplegar Pages. El sitio público solo cambiará al publicar esta rama.
- Dependencias de producción sin avisos en `npm audit --omit=dev`. Vitest 4 y
  ESLint 10 eliminan los avisos críticos y moderados de las herramientas anteriores.
  Los overrides de glob, minimatch, cookie y tinypool se comprueban con pruebas.
- Refresh del navegador en cookie HttpOnly/SameSite=Strict, Secure sobre HTTPS.
  El access token dura la sesión de la pestaña y no se persiste en localStorage.
  Se retiran las credenciales persistidas antiguas: puede requerirse iniciar sesión
  otra vez tras actualizar. Los clientes API siguen recibiendo sus tokens.
- CORS cerrado por defecto; allowlist explícita para despliegues separados.
- CSP con scripts del propio origen; bootstrap de apariencia externo compatible
  con la política y verificado en el build. Los access tokens siguen accesibles
  al JavaScript de la pestaña: esto reduce exposición, no elimina toda XSS posible.
- Contenedor con USER node y healthcheck; cachés OCR/Vite en directorios escribibles.
  El arranque HA prepara permisos y baja privilegios antes de ejecutar Node.
- Webhooks sin credenciales en URL, sin redirecciones y con validación de IP en
  la conexión DNS. Para conservar receptores LAN autorizados por el operador,
  WEBHOOK_ALLOWED_HOSTS admite nombres de host exactos; no admite comodines.

## Actualización de volúmenes existentes

La imagen principal no cambia propietarios automáticamente porque arranca sin
privilegios. Antes de actualizar un volumen creado como root, detener la app y
preparar sus permisos con un contenedor temporal del mismo volumen:

```sh
docker run --rm --user 0 --entrypoint chown \
  -v NOMBRE_DEL_VOLUMEN:/data IMAGEN_ACTUALIZADA -R 1000:1000 /data
```

Sustituir ambos nombres por los de la instalación. No eliminar el volumen.
Las instalaciones por bind mount necesitan los permisos equivalentes en el host.
El add-on HA hace esta preparación al arrancar.

## Validación realizada

- Suite completa: 736 pruebas backend/shared y 138 frontend aprobadas tras los
  cambios de sesión y red, incluyendo aislamiento de cuentas, destinos IPv6 y
  restauración de sesión en una pestaña nueva.
- Contenedor aislado en 3081: usuario efectivo UID 1000 y healthcheck healthy.
- HTTP real: login con cookie HttpOnly, renovación, ausencia de CORS para origen
  no autorizado y cabecera CSP presentes.
- `scripts/check-runtime.mjs` reproduce autenticación, renovación/revocación,
  CORS, CSP, rechazo de webhooks internos y restauración. Solo acepta una instancia
  local declarada desechable y se ejecuta en CI con su propio directorio temporal.
- UI: login, recarga de sesión, cambio Normal/Cyberpunk y Quick Entry comprobados
  en el contenedor aislado. No se publicaron cambios ni se tocaron datos de 3080.
- Exportación/restauración real de datos sintéticos comprobada en un volumen
  separado. Las pruebas existentes cubren rollback e importación sin alterar
  los datos de otro usuario. La prueba HTTP de cuentas comprueba lectura y edición
  cruzada denegadas.
- Las imágenes de Pages reservan sus dimensiones antes de cargar para evitar
  saltos de contenido al abrir enlaces a secciones. Las seis imágenes de la
  galería se comprobaron cargadas desde el navegador.
- Las imágenes principal y HA construyen correctamente. En la simulación de
  arranque del add-on, Node corre como usuario node y el endpoint de salud retorna
  ok. Se corrigió además la normalización CRLF de run.sh al construir en Windows.

## Límites pendientes

No hay una instancia real de Home Assistant conectada. No se declara validada
su instalación completa. La cadena de herramientas SvelteKit 2 conserva avisos
bajos heredados de deepmerge; la versión upstream compatible consultada no los
resuelve. No se ocultaron: migrar a SvelteKit 3 exige también Vite 8, plugin 7,
adapter-node 6 y TypeScript 6, y necesita una migración independiente con regresión
completa. Producción no presenta avisos en el escaneo omit=dev.
