# App Grupo Alquis Perú

App web instalable (PWA) que usa Google Sheets como base de datos.

## Archivos
- `index.html`, `styles.css`, `app.js` — la app.
- `config.js` — aquí va la URL de tu Apps Script. Si está vacía, funciona en modo demo: usuarios `aldo` (administrador), `maria` y `jose`, todos con la contraseña `demo1234`.
- `manifest.json`, `sw.js`, `icons/` — permiten instalarla con ícono en el celular.
- `apps-script/Code.gs` — el servidor que guarda los datos en tu Google Sheet. Esta carpeta está en `.gitignore`: no se sube a GitHub.

## Puesta en marcha
1. Crea una hoja nueva en Google Sheets.
2. Extensiones > Apps Script: pega `apps-script/Code.gs`, guarda y ejecuta la función `configurar`. Crea las pestañas y el administrador con usuario `aldo`.
3. En la pestaña Config de la hoja, revisa el nombre de tu negocio, tu WhatsApp general, zonas, características y redes sociales.
4. Crea la contraseña del administrador (ver abajo).
5. En Apps Script: Implementar > Nueva implementación > Aplicación web. Ejecutar como: Yo. Acceso: Cualquier usuario. Copia la URL /exec.
6. Pega esa URL en `config.js`.
7. Sube todos los archivos (menos la carpeta apps-script) a un repositorio de GitHub y activa GitHub Pages.
8. Abre el enlace de GitHub Pages en tu celular y elige "Agregar a pantalla de inicio".

## Agentes y administrador
- Cada persona entra con su **usuario** y su **contraseña**. El usuario no distingue mayúsculas y solo admite letras sin tildes, números, punto y guion bajo (de 3 a 30 caracteres).
- Pestaña `Agentes` (ID con prefijo `AGE`): Usuario, Nombre, Celular, Rol (`Administrador` o `Agente`), Activo (`Sí` o `No`) y DebeCambiarContrasena (`Sí` o `No`).
- Cada agente solo ve, edita y elimina sus propios registros. Lo decide el servidor con la columna `ID_Agente` (al final de cada pestaña), no la app. Una cita, llamada, propiedad o reserva solo puede unir registros del mismo agente.
- El administrador ve todo. En sus listas hay un filtro "Agente" y cada registro lleva una etiqueta pequeña con el nombre de su agente. Si agenda una cita con el interesado de un agente, la cita queda para ese agente.
- **Gestionar agentes:** Inicio > Agentes. Ahí creas agentes (con una contraseña temporal que deberán cambiar al entrar), editas su nombre, celular y rol, restableces su contraseña y los desactivas o reactivas. Al desactivar a alguien eliges a quién pasan sus registros. Un agente desactivado no puede entrar y sus sesiones se cierran al instante. No se puede desactivar ni quitar el rol al último administrador.
- Si un agente registra un celular que ya tiene otro agente, la app avisa "Este número ya está registrado por otro agente. Consulta con el administrador." sin mostrar nada del otro registro, y deja guardar de todas formas.
- La primera vez que ejecutas `configurar` con esta versión, se crea el administrador `aldo` (con la contraseña que ya usabas) y todos los registros que ya tenías quedan a su nombre. Esto pasa una sola vez.

## Contraseñas
- Mínimo 8 caracteres; acepta letras, números y símbolos.
- No se guardan en la hoja ni en el celular: el servidor guarda solo un hash con sal (10 000 rondas de SHA-256) por agente en Apps Script > Configuración del proyecto > Propiedades del script (claves `CLAVE_AGE-…`).
- **Recuperar la del administrador:** en la pestaña Config escribe la nueva contraseña en la fila `NUEVA_CONTRASENA` (columna Valor; si la fila no existe, agrégala). En Apps Script ejecuta `establecerContrasena`. La fila se borra sola y se cierran las sesiones del administrador.
- **Recuperar la de un agente:** el administrador entra a Inicio > Agentes > el agente > Restablecer contraseña.
- **Cambiar la tuya:** Inicio > Cambiar contraseña. Se cierran las sesiones de tus otros dispositivos.
- Al entrar, el celular recibe una sesión de 30 días ligada a ese agente. "Cerrar sesión" la anula en el servidor.
- 5 intentos fallidos bloquean ese usuario 15 minutos. Si hay 50 intentos fallidos en 15 minutos entre todos los usuarios, el acceso se pausa 15 minutos para todos (las sesiones abiertas siguen funcionando).

## Redes sociales
En la pestaña Config: `FACEBOOK`, `TIKTOK` e `INSTAGRAM`. Deben empezar con `https://`. Si dejas un valor vacío, ese ícono no aparece en el catálogo.

## Citas
- Hay tres tipos: **Visita** (con un interesado, para mostrar una propiedad), **Captación** (con un propietario, para conocer o captar su propiedad) y **Reunión** (con cualquier contacto: interesado, propietario u otro).
- Solo la fecha es obligatoria. La propiedad es opcional; en Captación solo aparecen las propiedades de ese propietario y la opción "Aún no registrada".
- En la pestaña Citas, las columnas `TipoCita`, `TipoContacto` e `ID_Contacto` están al final. Las citas antiguas (solo con `ID_Interesado`) se muestran como Visita con un interesado.
- En el detalle de un propietario está el botón "Agendar cita de captación".

## Temperatura del interesado
- Tres niveles: **Frío** (aún no conoce la propiedad), **Tibio** (ya la conoce y está algo interesado) y **Caliente** (tiene interés real en comprar).
- Se elige con tres botones en el formulario del interesado, justo después del nombre y el celular, junto con "Describe su interés". Al registrar viene marcado Frío.
- El formulario público "Cuéntanos qué buscas" no la muestra: esos interesados se guardan como Frío. Los interesados antiguos sin valor también cuentan como Frío.
- Aparece como etiqueta de color en Contactos (con filtro rápido Todos, Caliente, Tibio y Frío), en el detalle del interesado, en las citas y en "Interesados que coinciden", que se ordena primero por temperatura y después por porcentaje.
- En la pestaña Interesados, las columnas `Temperatura` y `DetalleInteres` están al final. Si escribes a mano en la hoja, usa exactamente Frío, Tibio o Caliente.

## ¿Cómo te fue? (cerrar una cita)
- Se abre desde el detalle de la cita, desde Inicio (sección "¿Cómo te fue?", con las citas que ya pasaron y siguen pendientes) o desde la agenda, donde las citas pasadas sin resultado dicen "Falta resultado".
- **Se realizó** → Realizada. **Se reprogramó** → eliges la nueva fecha y hora y queda Pendiente. **No asistió** → Cancelada, y el resultado empieza con "No asistió".
- "¿En qué quedaron?" se guarda en la columna `Resultado` de la pestaña Citas (al final).
- Si la cita es con un interesado, también actualizas su temperatura, "Describe su interés" y, con "Editar datos del interesado", lo que busca.
- Siguiente paso opcional: programar una llamada, agendar otra cita o registrar una reserva (estas dos se abren al guardar, con el contacto y la propiedad ya elegidos).
- Un solo botón Guardar: el servidor actualiza la cita, el interesado y la llamada en un solo paso, sin dejar nada a medias.
- En el detalle de cada interesado, "Historial" muestra sus citas de la más reciente a la más antigua, con su resultado.

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
- Muestra las propiedades de los agentes activos. El botón de WhatsApp escribe al celular del agente de esa propiedad; si no tiene celular, al `WHATSAPP` general de Config. Del agente no se envía ningún otro dato.

## Sin asignar
- Lo que llega desde "Publica tu propiedad gratis" y "Cuéntanos qué buscas" se guarda sin agente.
- El administrador lo ve en Inicio > "Sin asignar" y con "Asignar a…" elige el agente. Al asignar un propietario también se asignan sus propiedades. Los agentes no ven lo que está sin asignar.

## Actualizaciones
- Si cambias Code.gs: pega el archivo nuevo, guarda y ejecuta `configurar`. Puedes ejecutarla las veces que quieras: solo agrega al final las pestañas y columnas que falten, sin borrar, mover ni cambiar tus datos. Luego ve a Implementar > Administrar implementaciones > lápiz (Editar) > Versión: Nueva versión > Implementar. La URL /exec no cambia.
- No cambies el nombre de los encabezados de las columnas: el servidor ubica cada dato por el nombre de su columna. Sí puedes agregar columnas propias al final.
- Si cambias la app: sube la versión en `sw.js` (`inmo-v5`, `inmo-v6`…) para que los celulares descarguen los archivos nuevos.
