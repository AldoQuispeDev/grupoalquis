# App Grupo Alquis Perú

App web instalable (PWA) que usa Google Sheets como base de datos.

## Archivos
- `index.html`, `styles.css`, `app.js` — la app.
- `config.js` — aquí va la URL de tu Apps Script (si está vacía, funciona en modo demo con la contraseña `demo1234`).
- `manifest.json`, `sw.js`, `icons/` — permiten instalarla con ícono en el celular.
- `apps-script/Code.gs` — el servidor que guarda los datos en tu Google Sheet. Esta carpeta está en `.gitignore`: no se sube a GitHub.

## Puesta en marcha
1. Crea una hoja nueva en Google Sheets.
2. Extensiones > Apps Script: pega `apps-script/Code.gs`, guarda y ejecuta la función `configurar`.
3. En la pestaña Config de la hoja, revisa el nombre de tu negocio, tu WhatsApp, zonas, características y redes sociales.
4. Crea tu contraseña (ver abajo).
5. En Apps Script: Implementar > Nueva implementación > Aplicación web. Ejecutar como: Yo. Acceso: Cualquier usuario. Copia la URL /exec.
6. Pega esa URL en `config.js`.
7. Sube todos los archivos (menos la carpeta apps-script) a un repositorio de GitHub y activa GitHub Pages.
8. Abre el enlace de GitHub Pages en tu celular y elige "Agregar a pantalla de inicio".

## Contraseña del agente
- Mínimo 8 caracteres; acepta letras, números y símbolos.
- No se guarda en la hoja ni en el celular: el servidor guarda solo un hash con sal (10 000 rondas de SHA-256) en Apps Script > Configuración del proyecto > Propiedades del script.
- **Crearla o recuperarla:** en la pestaña Config escribe tu contraseña en la fila `NUEVA_CONTRASENA` (columna Valor; si la fila no existe, agrégala). En Apps Script ejecuta `establecerContrasena`. La fila se borra sola y se cierran todas las sesiones abiertas.
- **Cambiarla desde la app:** Inicio > Cambiar contraseña. Se cierran las sesiones de tus otros dispositivos.
- Al entrar, el celular recibe una sesión que dura 30 días. "Cerrar sesión" la anula en el servidor.
- Tras 5 intentos fallidos, el acceso se bloquea 15 minutos.

## Redes sociales
En la pestaña Config: `FACEBOOK`, `TIKTOK` e `INSTAGRAM`. Deben empezar con `https://`. Si dejas un valor vacío, ese ícono no aparece en el catálogo.

## Citas
- Hay tres tipos: **Visita** (con un interesado, para mostrar una propiedad), **Captación** (con un propietario, para conocer o captar su propiedad) y **Reunión** (con cualquier contacto: interesado, propietario u otro).
- Solo la fecha es obligatoria. La propiedad es opcional; en Captación solo aparecen las propiedades de ese propietario y la opción "Aún no registrada".
- En la pestaña Citas, las columnas `TipoCita`, `TipoContacto` e `ID_Contacto` están al final. Las citas antiguas (solo con `ID_Interesado`) se muestran como Visita con un interesado.
- En el detalle de un propietario está el botón "Agendar cita de captación".

## Reservas
- Pestaña `Reservas` (ID con prefijo `RES`). Estados: Activa, Concretada y Cancelada. Obligatorios: propiedad e interesado.
- El servidor cambia el estado de la propiedad automáticamente: reserva Activa → "Reservado"; Concretada → "Vendido" (o "Alquilado" si es alquiler); Cancelada → "Disponible", si no tiene otra reserva activa.
- Una propiedad no puede tener dos reservas activas. Mientras tenga una, su estado no se puede cambiar a mano ni se puede eliminar la propiedad.
- Una reserva concretada o cancelada no vuelve a activarse: si el cliente regresa, registra una reserva nueva.
- En Inicio, "Reservas por vencer" muestra las reservas activas que vencen hoy o en los próximos 3 días; las vencidas aparecen en rojo.

## Catálogo público
- Muestra las propiedades disponibles y, después, las reservadas, con la etiqueta "Reservado hasta el …". Si la reserva no tiene fecha límite o ya venció, dice solo "Reservado". Una propiedad reservada solo vuelve a estar disponible cuando cancelas la reserva.
- Del público solo salen el estado de la propiedad y la fecha límite. Nunca se envían el interesado, su celular, el monto ni las notas de la reserva.
- En una propiedad reservada, el botón de WhatsApp dice "Avísame si se libera".

## Actualizaciones
- Si cambias Code.gs: pega el archivo nuevo, guarda y ejecuta `configurar`. Puedes ejecutarla las veces que quieras: solo agrega al final las pestañas y columnas que falten, sin borrar, mover ni cambiar tus datos. Luego ve a Implementar > Administrar implementaciones > lápiz (Editar) > Versión: Nueva versión > Implementar. La URL /exec no cambia.
- No cambies el nombre de los encabezados de las columnas: el servidor ubica cada dato por el nombre de su columna. Sí puedes agregar columnas propias al final.
- Si cambias la app: sube la versión en `sw.js` (`inmo-v3`, `inmo-v4`…) para que los celulares descarguen los archivos nuevos.
