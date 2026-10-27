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

## Cómo se usa (el día a día)
- **Mi día** (primera pestaña) es la pantalla de trabajo. Arriba, un resumen: "Hoy: 3 citas · 5 llamadas · 2 nuevas opciones". Debajo, en este orden:
  1. **Citas de hoy**, por hora, con botón para llamar. Si la cita ya pasó, la misma tarjeta trae ✅ Se realizó, 🔄 Reprogramar y ❌ No asistió. También aparecen las citas de días anteriores que siguen sin resultado.
  2. **Seguimientos de hoy**: llamadas de hoy y atrasadas (estas primero, en rojo), con casilla para marcarlas como hechas.
  3. **Clientes en espera**: primero los que tienen una propiedad nueva que les coincide ("¡Nueva opción!"), con botones para llamar o escribir por WhatsApp con un mensaje listo.
  4. **Sin seguimiento**: clientes Calientes o Tibios activos sin cita ni llamada pendiente, con "Programar seguimiento".
  Cada sección muestra hasta 5 y "Ver todo". Lo demás (todas las llamadas, catálogo, contraseña, agentes, cerrar sesión) está en el menú ⋯ de arriba.
- **Botón +** (abajo a la derecha): "¿Qué quieres registrar?" Cliente, Cita, Llamada, Propietario o Propiedad.
- **Cliente:** a la vista solo nombre, celular y temperatura (Frío por defecto). "¿Qué busca?" va plegado. Al guardar, la app ofrece el siguiente paso en un toque: ver recomendadas, agendar cita, agregar qué busca o "No tengo nada aún: dejarlo En espera".
- **Propietario:** nombre y celular, y en la misma pantalla "Su propiedad" (tipo, zona y precio; el resto en "Más detalles"). Al guardar puedes agregar otra propiedad con un toque.
- **Cita:** tres preguntas: ¿Con quién? (buscador; los recientes y Calientes primero, y "+ Nuevo contacto" ahí mismo), ¿Cuándo? (botones de día y hora) y ¿Qué propiedad? (tarjetas sugeridas, opcional). El tipo se deduce solo (cliente = Visita, propietario = Captación, otro = Reunión); toca la etiqueta para cambiarlo. Notas en "Más detalles".
- **Llamada:** ¿A quién?, motivo con respuestas rápidas (Seguimiento, Confirmar cita, Enviar información, Negociar precio, Avisar nueva opción) y ¿Cuándo?.
- **Temperatura en 2 toques:** toca la etiqueta de color (❄️ Frío, 🌤️ Tibio, 🔥 Caliente) en Mi día, Contactos o la ficha del cliente y elige.
- En cada ficha se ven solo las acciones principales (cliente: Llamar y WhatsApp; cita: ¿Cómo te fue?; propiedad: Agendar visita). El resto está en el menú ⋯.
- El celular se ordena solo (987 654 321) y los precios llevan separador de miles; en la hoja se guardan sin espacios.

## Guardado al instante y sin señal
- Al guardar, la pantalla se actualiza en el acto y el envío al servidor ocurre en segundo plano, todo junto en una sola petición.
- Si no hay señal, lo guardado queda en el celular (aunque cierres la app) y se envía solo cuando vuelve la conexión; también hay un botón "Reintentar". Si el servidor rechaza algo, la app avisa y ofrece "Corregir" con lo que escribiste.
- Las reservas y lo que se elimina sí esperan la respuesta del servidor, porque no se pueden deshacer.
- La app abre al instante con los datos guardados en el celular y los actualiza en segundo plano, sin interrumpir si estás escribiendo.

## Agentes y administrador
- Cada persona entra con su **usuario** y su **contraseña**. El usuario no distingue mayúsculas y solo admite letras sin tildes, números, punto y guion bajo (de 3 a 30 caracteres).
- Pestaña `Agentes` (ID con prefijo `AGE`): Usuario, Nombre, Celular, Rol (`Administrador` o `Agente`), Activo (`Sí` o `No`) y DebeCambiarContrasena (`Sí` o `No`).
- Cada agente solo ve, edita y elimina sus propios registros. Lo decide el servidor con la columna `ID_Agente` (al final de cada pestaña), no la app. Una cita, llamada, propiedad o reserva solo puede unir registros del mismo agente.
- El administrador ve todo. En Mi día y en sus listas hay un filtro "Agente" y cada registro lleva una etiqueta pequeña con el nombre de su agente. Si agenda una cita con el interesado de un agente, la cita queda para ese agente.
- **Gestionar agentes:** Mi día > menú ⋯ > Agentes. Ahí creas agentes (con una contraseña temporal que deberán cambiar al entrar), editas su nombre, celular y rol, restableces su contraseña y los desactivas o reactivas. Al desactivar a alguien eliges a quién pasan sus registros. Un agente desactivado no puede entrar y sus sesiones se cierran al instante. No se puede desactivar ni quitar el rol al último administrador.
- Si un agente registra un celular que ya tiene otro agente, la app avisa "Este número ya está registrado por otro agente. Consulta con el administrador." sin mostrar nada del otro registro, y deja guardar de todas formas.
- La primera vez que ejecutas `configurar` con esta versión, se crea el administrador `aldo` (con la contraseña que ya usabas) y todos los registros que ya tenías quedan a su nombre. Esto pasa una sola vez.

## Contraseñas
- Mínimo 8 caracteres; acepta letras, números y símbolos.
- No se guardan en la hoja ni en el celular: el servidor guarda solo un hash con sal (10 000 rondas de SHA-256) por agente en Apps Script > Configuración del proyecto > Propiedades del script (claves `CLAVE_AGE-…`).
- **Recuperar la del administrador:** en la pestaña Config escribe la nueva contraseña en la fila `NUEVA_CONTRASENA` (columna Valor; si la fila no existe, agrégala). En Apps Script ejecuta `establecerContrasena`. La fila se borra sola y se cierran las sesiones del administrador.
- **Recuperar la de un agente:** el administrador entra a Mi día > ⋯ > Agentes > el agente > Restablecer contraseña.
- **Cambiar la tuya:** Mi día > ⋯ > Cambiar contraseña. Se cierran las sesiones de tus otros dispositivos.
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
- Se elige con tres botones en el formulario del cliente, justo después del nombre y el celular. Al registrar viene marcado Frío. "Describe su interés" está en "¿Qué busca?".
- El formulario público "Cuéntanos qué buscas" no la muestra: esos interesados se guardan como Frío. Los interesados antiguos sin valor también cuentan como Frío.
- Aparece como etiqueta de color en Mi día, Contactos (con filtro rápido), el detalle del cliente, las citas y "Clientes que coinciden", que se ordena primero por temperatura y después por porcentaje.
- En la pestaña Interesados, las columnas `Temperatura` y `DetalleInteres` están al final. Si escribes a mano en la hoja, usa exactamente Frío, Tibio o Caliente.

## Seguimiento del cliente
- Columna `EstadoSeguimiento` (al final de Interesados): **Activo** (por defecto; también los clientes antiguos sin valor), **En espera** (busca algo que aún no tienes), **Compró** y **Descartado**.
- "Te aviso cuando lo tenga" lo deja En espera: al registrarlo, en "¿Cómo te fue?" o en el menú ⋯ de su ficha (2 toques). Ahí mismo, "Cambiar seguimiento" pasa por los cuatro estados.
- Cuando una reserva se concreta, el cliente pasa solo a "Compró".
- Compró y Descartado no salen en Mi día ni en las recomendaciones, pero siguen en Contactos con su filtro.
- Al registrar una propiedad o volverla Disponible, si coincide al 60 % o más con clientes En espera (del mismo agente; el administrador ve todos), la app avisa "X clientes en espera buscan algo así" con un botón para verlos.
- Columna `OpcionesAvisadas` (al final de Interesados): las propiedades que ya se le ofrecieron a un cliente En espera. Así "¡Nueva opción!" solo aparece con las nuevas; al llamarlo o escribirle desde Mi día, esa opción deja de ser nueva.

## ¿Cómo te fue? (cerrar una cita)
- Rápido (3 toques): en la tarjeta de la cita toca ✅ Se realizó, elige una o varias respuestas ("Le gustó", "Lo pensará", "Quiere volver a verla", "Va a separar", "Le pareció caro", "No le interesó", "Te aviso cuando lo tenga") y Guardar. La temperatura se sugiere sola según las respuestas y puedes cambiarla. "¿Algo más?" es opcional. Después, la app ofrece una sola sugerencia de un toque (por ejemplo "Registrar reserva" o "Programar llamada para mañana"), que se va sola si no la usas.
- 🔄 Reprogramar abre directo los botones de día y hora. ❌ No asistió guarda con un toque y ofrece "Reprogramar".
- La pantalla completa sigue en el menú ⋯ de la cita, y en la agenda las citas pasadas sin resultado dicen "Falta resultado".
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
- En Mi día, "Reservas por vencer" muestra las reservas activas que vencen hoy o en los próximos 3 días; las vencidas aparecen en rojo.

## Catálogo público
- Muestra las propiedades disponibles y, después, las reservadas, con la etiqueta "Reservado hasta el …". Si la reserva no tiene fecha límite o ya venció, dice solo "Reservado". Una propiedad reservada solo vuelve a estar disponible cuando cancelas la reserva.
- Del público solo salen el estado de la propiedad y la fecha límite. Nunca se envían el interesado, su celular, el monto ni las notas de la reserva.
- En una propiedad reservada, el botón de WhatsApp dice "Avísame si se libera".
- El servidor guarda el catálogo unos 60 segundos para responder más rápido y lo renueva en cuanto cambia una propiedad, una reserva o un agente.
- Muestra las propiedades de los agentes activos. El botón de WhatsApp escribe al celular del agente de esa propiedad; si no tiene celular, al `WHATSAPP` general de Config. Del agente no se envía ningún otro dato.

## Sin asignar
- Lo que llega desde "Publica tu propiedad gratis" y "Cuéntanos qué buscas" se guarda sin agente.
- El administrador lo ve en Mi día > "Sin asignar" y con "Asignar a…" elige el agente. Al asignar un propietario también se asignan sus propiedades. Los agentes no ven lo que está sin asignar.

## Actualizaciones
- Si cambias Code.gs: pega el archivo nuevo, guarda y ejecuta `configurar`. Puedes ejecutarla las veces que quieras: solo agrega al final las pestañas y columnas que falten, sin borrar, mover ni cambiar tus datos. Luego ve a Implementar > Administrar implementaciones > lápiz (Editar) > Versión: Nueva versión > Implementar. La URL /exec no cambia.
- No cambies el nombre de los encabezados de las columnas: el servidor ubica cada dato por el nombre de su columna. Sí puedes agregar columnas propias (también con fórmulas): al guardar, el servidor escribe la fila completa de una vez y conserva lo que tengan esas columnas.
- Si cambias la app: sube la versión en `sw.js` (`inmo-v6`, `inmo-v7`…) para que los celulares descarguen los archivos nuevos.
