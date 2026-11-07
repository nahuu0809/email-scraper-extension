# Email Scraper Pro

Extensión de Chrome (Manifest V3) que busca direcciones de correo en el sitio web de una empresa. Está pensada para encontrar el contacto de Recursos Humanos o de la página de empleo cuando una postulación no tiene un formulario claro.

## Qué hace

- **Sitio completo:** a partir de una URL base, prueba una lista de rutas habituales de contacto y empleo (`/contacto`, `/trabaja-con-nosotros`, `/careers`, `/rrhh`, `/vacantes` y similares, en español e inglés) y extrae los emails que encuentra.
- **Página actual:** extrae los emails de la pestaña abierta.
- Muestra el avance y las estadísticas en el popup, y permite detener la búsqueda.
- Recuerda la URL base con `chrome.storage`.

## Instalación (modo desarrollador)

1. Abrí `chrome://extensions` y activá **Modo de desarrollador**.
2. Elegí **Cargar descomprimida** y seleccioná esta carpeta.
3. Fijá la extensión en la barra y abrí el popup.

## Archivos

| Archivo | Función |
| --- | --- |
| `manifest.json` | Configuración MV3 y permisos (`activeTab`, `scripting`, `storage` y acceso a sitios http/https) |
| `popup.html` / `popup.js` | Interfaz y lógica de búsqueda: rutas candidatas, palabras clave, extracción y deduplicación |
| `background.js` | Service worker |
| `icon*.png` | Íconos |

## Uso responsable

Respetá los términos de cada sitio y las leyes de protección de datos personales. La herramienta lee páginas públicas, pero un email encontrado no es un permiso para enviar mensajes masivos.

## Notas

- La extensión pide acceso a todos los sitios para poder consultarlos sin las restricciones de CORS. Es práctico para uso personal, pero no es una configuración apta para publicarla en la Chrome Web Store sin restringir los permisos.

## Licencia

Código bajo [licencia MIT](LICENSE). © 2026 Nahuel Emiliano Diaz.
