# HomeLedger - Add-on para Home Assistant

## Descripción

HomeLedger es una aplicación de gestión de finanzas personales auto-hospedada que se integra con Home Assistant como add-on. Permite controlar cuentas bancarias, transacciones, presupuestos, suscripciones y metas de ahorro directamente desde tu instancia de HA.

## Instalación

### Requisitos previos

- Home Assistant OS o Home Assistant Supervised
- Supervisor de Home Assistant activo

### Pasos de instalación

1. **Agregar el repositorio del add-on:**
   - Ve a **Configuración → Add-ons → Tienda de Add-ons**
   - Haz clic en el menú (⋮) en la esquina superior derecha
   - Selecciona **Repositorios**
   - Agrega la URL del repositorio: `https://github.com/TastingRogue/HomeLedger`
   - Haz clic en **Agregar**

2. **Instalar el add-on:**
   - Busca "HomeLedger" en la tienda de add-ons
   - Haz clic en **Instalar**
   - Espera a que se complete la descarga

3. **Configurar el add-on:**
   - Ve a la pestaña **Configuración** del add-on
   - Completa los campos obligatorios (ver sección de Configuración)
   - Haz clic en **Guardar**

4. **Iniciar el add-on:**
   - Ve a la pestaña **Información**
   - Haz clic en **Iniciar**
   - Activa "Mostrar en la barra lateral" si deseas acceso rápido

## Configuración

| Opción | Descripción | Requerido | Valor por defecto |
|--------|-------------|-----------|-------------------|
| `TZ` | Zona horaria | No | `America/Mexico_City` |
| `JWT_SECRET` | Clave secreta para tokens JWT (mínimo 32 caracteres) | **Sí** | — |
| `ADMIN_EMAIL` | Correo del usuario administrador | No | `admin@homeledger.local` |
| `ADMIN_PASSWORD` | Contraseña del administrador | **Sí** | — |

### Ejemplo de configuración

```yaml
TZ: "America/Mexico_City"
JWT_SECRET: "tu-clave-secreta-muy-segura-de-al-menos-32-caracteres"
ADMIN_EMAIL: "admin@homeledger.local"
ADMIN_PASSWORD: "una-contraseña-segura"
```

## Uso

### Acceso a la interfaz

Una vez iniciado el add-on, puedes acceder a HomeLedger de dos formas:

1. **Desde la barra lateral de HA:** Si activaste "Mostrar en la barra lateral", haz clic en el ícono de HomeLedger
2. **Vía puerto directo:** Abre `http://TU_IP_HA:3000` en tu navegador

### Primer inicio de sesión

1. Abre la interfaz de HomeLedger
2. Inicia sesión con el correo y contraseña configurados en las opciones del add-on
3. Comienza a agregar tus cuentas y transacciones

## Persistencia de datos

Los datos de HomeLedger se almacenan en `/data` dentro del contenedor, que está mapeado al almacenamiento persistente de Home Assistant. Esto significa que:

- Los datos sobreviven reinicios del add-on
- Los datos se incluyen en los respaldos de Home Assistant
- La base de datos SQLite y archivos adjuntos están seguros

## Integración con Home Assistant

Para obtener sensores financieros en HA (balance de cuentas, gastos mensuales, alertas, etc.), instala también la **integración personalizada HomeLedger** disponible vía HACS. La integración se comunica con el add-on vía API REST interna.

## Solución de problemas

### El add-on no inicia

1. Verifica que `JWT_SECRET` y `ADMIN_PASSWORD` estén configurados
2. Revisa los logs del add-on en la pestaña **Registro**
3. Asegúrate de que el puerto 3000 no esté en uso por otro add-on

### No puedo acceder a la interfaz

1. Verifica que el add-on esté en estado "Ejecutando"
2. Si usas ingress, prueba acceder desde la barra lateral
3. Si accedes por puerto, verifica que el puerto 3000 esté habilitado en la configuración de red

### Los datos se perdieron después de actualizar

Los datos se almacenan de forma persistente. Si experimentas pérdida de datos:

1. Verifica que tengas un respaldo reciente de HA
2. Restaura el respaldo desde **Configuración → Sistema → Respaldos**

## Soporte

Para reportar problemas o solicitar funcionalidades, visita el repositorio del proyecto en GitHub.
