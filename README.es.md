# RSVP Reader

[English](README.md) · [Español](README.es.md)

RSVP Reader es una aplicación web local-first para preparar textos largos y leerlos con técnicas RSVP, páginas fijas tipo Ebook, marcadores y sesiones locales.


## Funciones

- Importación desde texto pegado, archivos, extracción de URL, búsqueda en Wikipedia y biblioteca de dominio público.
- Modos de lectura: palabra ORP, Flujo por líneas, Bloques y Ebook.
- Navegación global con campo de página, barra de progreso usada como slider, búsqueda, índice, navegador de líneas, saltos por frase/párrafo y marcadores.
- Ebook con una página, dos páginas, orientación vertical/horizontal, altura fija, contexto de capítulo, flechas de teclado, marcador de línea y resaltado/avance automático opcional.
- Sesiones locales con texto, metadatos, ajustes, tema, idioma, progreso y marcadores.
- Interfaz en inglés y español.
- Modo Markdown para que encabezados funcionen como navegación y se rendericen mejor en Ebook.
- Instalación local y estructura Next.js lista para Vercel.

No hay backend, login, cuentas ni sincronización cloud en esta fase. Los datos se guardan en el navegador del usuario.

## Requisitos

- Node.js 20+
- npm 10+

Si no tienes Node.js, instala la versión LTS desde [nodejs.org](https://nodejs.org/). npm viene incluido con Node.js.

## Ejecutar en local

```bash
git clone https://github.com/daclapo/RSVP-Reader.git
cd RSVP-Reader
npm install
npm run dev
```

Abre `http://localhost:3000`.

Build de producción:

```bash
npm run build
npm run start
```

Comprobaciones:

```bash
npm run lint
npm run build
```

## Uso

1. Abre `Source` y pega texto, sube un archivo, carga una URL o elige un libro.
2. Si el texto pegado es Markdown, usa `Text format > Markdown` para convertir encabezados en puntos de navegación.
3. Abre `Reader` y elige ORP, Line flow, Chunk o Ebook.
4. Usa el slider de progreso o el campo de página para moverte por el texto.
5. Añade marcadores en posiciones importantes.
6. Guarda una sesión desde `Sessions` para continuar más tarde.
7. Usa `Classic` si prefieres la vista antigua de tres columnas.
8. Usa `Settings` para tema, idioma, tipografía, Zen y reset de datos locales.

Atajos de teclado:

- `Space` / `K`: reproducir o pausar
- `ArrowLeft`: palabra anterior, o página anterior en Ebook
- `ArrowRight`: palabra siguiente, o página siguiente en Ebook
- `[` y `]`: bajar o subir WPM
- `F` en Reader: enfocar búsqueda
- `Esc`: salir de Zen

## Sobre la App

Las capturas siguen el flujo normal de trabajo: preparar una fuente, elegir un modo de lectura y usar herramientas enfocadas como Zen, vista clásica, temas, sesiones y marcadores.

### Preparar una Fuente

Pega texto directamente y revisa el contenido exacto que se enviará al lector.

![Pegar texto](docs/img/source-paste.png)

Sube formatos habituales como `.pdf`, `.txt`, `.epub`, `.md` y `.docx`.

![Subir archivo](docs/img/source-upload.png)

Carga una URL única, encola varias URLs o busca e importa un artículo de Wikipedia desde el panel URL / Wikipedia.

![URL y Wikipedia](docs/img/source-url.png)

Abre una obra de dominio público desde la biblioteca integrada.

![Biblioteca](docs/img/source-library.png)

### Leer con Modos RSVP

El modo ORP centra una palabra cada vez y marca el punto óptimo de reconocimiento.

![Lector ORP](docs/img/read-orp.png)

Line Flow mantiene la línea actual centrada mientras conserva contexto antes y después de la posición activa.

![Lector Line Flow](docs/img/read-lineflow.png)

Chunk avanza por pequeños grupos de palabras en vez de palabra por palabra.

![Lector Chunk](docs/img/read-chunk.png)

### Leer de Forma Natural en Ebook

El diseño Ebook a dos páginas está pensado para una lectura más tradicional, con navegación por páginas, contexto de capítulo y marcador de línea opcional.

![Ebook a dos páginas](docs/img/read-twopage.png)

También puedes leer en diseño de una sola página.

![Ebook una página](docs/img/read-onepage.png)

O el modo de una pagina horizontal que utiliza una página más amplia, donde cabe más texto y se reduce el salto entre líneas para ofrecer una experiencia de lectura más fluida. Esta imagen también muestra el “reproductor” de este modo, donde las palabras se resaltarán y habrá un punto que indicará la línea que estás leyendo actualmente, facilitando el salto entre líneas.

![Ebook horizontal](docs/img/read-landscape.png)

### Otras Funciones

#### Modo zen
El modo Zen lleva el lector a pantalla completa y elimina la interfaz alrededor. Usa `Esc` para salir, y `Space` o `K` para reproducir o pausar.

![Modo Zen](docs/img/zen-mode.png)

#### Vista clasica
La vista clásica mantiene fuente, lector y herramientas de resumen visibles en un único espacio para quienes prefieren la disposición anterior.

![Vista clásica](docs/img/classic-arrangement.png)

#### Temas
Hay siete temas visuales disponibles desde el menú Theme de la barra de navegación.

![Temas](docs/img/themes.png)

#### Sesiones
Las sesiones permiten guardar localmente múltiples estados de lectura, incluyendo el texto, los metadatos de la fuente, la posición de lectura, los marcadores, el tema, el idioma y la configuración del lector.
![Sesiones](docs/img/sessions.png)


## Fuentes

Los archivos soportados son best effort:

- `.txt`, `.md`, `.markdown`
- `.html`, `.htm`
- `.pdf`
- `.doc`, `.docx`
- `.odt`
- `.epub`

Las URLs usan `src/app/api/proxy/route.ts`, `@mozilla/readability` y limpieza local. Algunas páginas bloquean extracción; en esos casos conviene pegar el texto manualmente.

Wikipedia usa las APIs de MediaWiki `opensearch` y parseo de página desde `src/app/api/wikipedia/route.ts`, y luego limpia el artículo como texto legible tipo Markdown.

La biblioteca integrada usa textos de dominio público, principalmente de Project Gutenberg.

## Datos locales

La app guarda texto activo, ajustes, sesiones y marcadores en el almacenamiento del navegador. Textos muy grandes pueden llegar al límite del navegador, así que la persistencia activa se limita de forma defensiva. La app no debería romperse por errores de cuota.

Usa `Settings > Clear local data` para borrar texto activo, sesiones, marcadores, tema, idioma y ajustes del navegador actual.

## Despliegue

Es una aplicación estándar de Next.js y se puede desplegar en Vercel.

```bash
npm run build
```

En Vercel, importa el repositorio, conserva los ajustes por defecto de Next.js y despliega. No se requiere base de datos ni variables de entorno en la versión local-first actual.

## Estructura

- `src/app/page.tsx`: shell principal y composición de vistas.
- `src/app/api/proxy/route.ts`: proxy de URL y extracción con Readability.
- `src/components/`: componentes de producto y UI local.
- `src/hooks/`: reproducción, preferencias y sesiones.
- `src/lib/i18n/`: diccionarios locales.
- `src/lib/library/`: catálogo de libros de dominio público.
- `src/lib/reader/`: parser, limpieza, defaults, presets, fuentes y tipos.
- `src/lib/storage/`: helpers de almacenamiento local.
- `docs/`: uso, instalación local, despliegue y contribución.

## Contribuir

Se agradecen contribuciones: modos de lectura, calidad de extracción, fuentes de dominio público, accesibilidad, pulido móvil, documentación y tests.

## Licencia

MIT. Consulta `LICENSE`.
