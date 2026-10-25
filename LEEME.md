# App Inmobiliaria

App web instalable (PWA) que usa Google Sheets como base de datos.

## Archivos
- `index.html`, `styles.css`, `app.js` — la app.
- `config.js` — aquí va la URL de tu Apps Script (si está vacía, funciona en modo demo).
- `manifest.json`, `sw.js`, `icons/` — permiten instalarla con ícono en el celular.
- `apps-script/Code.gs` — el servidor que guarda los datos en tu Google Sheet.

## Puesta en marcha
1. Crea una hoja nueva en Google Sheets.
2. Extensiones > Apps Script: pega `apps-script/Code.gs`, guarda y ejecuta la función `configurar`.
3. En la pestaña Config de la hoja, cambia el PIN, el nombre de tu negocio, tu WhatsApp, zonas y características.
4. En Apps Script: Implementar > Nueva implementación > Aplicación web. Ejecutar como: Yo. Acceso: Cualquier usuario. Copia la URL /exec.
5. Pega esa URL en `config.js`.
6. Sube todos los archivos (menos la carpeta apps-script) a un repositorio de GitHub y activa GitHub Pages.
7. Abre el enlace de GitHub Pages en tu celular y elige "Agregar a pantalla de inicio".

Si cambias Code.gs más adelante: Implementar > Administrar implementaciones > Editar > Nueva versión (la URL no cambia).
