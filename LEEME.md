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

## Actualizaciones
- Si cambias Code.gs: Implementar > Administrar implementaciones > lápiz (Editar) > Versión: Nueva versión > Implementar. La URL /exec no cambia.
- Si cambias la app: sube la versión en `sw.js` (`inmo-v2`, `inmo-v3`…) para que los celulares descarguen los archivos nuevos.
