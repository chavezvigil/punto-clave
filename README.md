# 🏪 Tienda Online - Mercado Chalchuapa

Esta es tu tienda online integrada de forma nativa con WhatsApp. Está diseñada para funcionar como un sitio estático ultra rápido, premium, responsive y autoadministrable, ideal para subirse a **GitHub Pages** de forma gratuita.

---

## 🚀 Cómo Empezar Localmente

Para abrir y ver la tienda en tu computadora, no necesitas instalar servidores ni bases de datos complejas.
1. Entra a la carpeta `tienda`.
2. Haz doble clic sobre el archivo [index.html](file:///c:/Users/ljosu/Desktop/Mercado%20Chalchuapa/Tienda%20Online/tienda/index.html) para abrirlo directamente en tu navegador (Chrome, Edge, Firefox, etc.).

---

## 🔄 Cómo Actualizar tus Productos (Catálogo)

Todo el catálogo es administrable a través del archivo de configuración **[products-config.json](file:///c:/Users/ljosu/Desktop/Mercado%20Chalchuapa/Tienda%20Online/tienda/products-config.json)**.

### Paso 1: Editar Datos (Precios, Descripciones y Disponibilidad)
Abre [products-config.json](file:///c:/Users/ljosu/Desktop/Mercado%20Chalchuapa/Tienda%20Online/tienda/products-config.json) con un editor de texto (como el bloc de notas o VS Code) y modifica los campos de cada producto según corresponda:
- `"title"`: El nombre comercial del producto (el que verá la gente).
- `"price"`: El precio en dólares (ej. `125` o `7`). No pongas el signo `$`.
- `"originalPrice"`: Si deseas mostrar una oferta tachada, ingresa el precio original aquí. Si no está en oferta, déjalo como `null`.
- `"category"`: Asigna una categoría para los filtros (ej. `"Tecnología"`, `"Electrónicos"`, `"Videojuegos"`, `"Juguetes"`).
- `"condition"`: El estado del artículo (ej. `"Usado - Como nuevo"`, `"Usado - Buen estado"`, `"Nuevo"`).
- `"availability"`: Estado de stock. Usa `"Disponible"` para que la gente pueda añadirlo al carrito, o `"Agotado"` (se mostrará en la tienda pero no se podrá comprar).
- `"description"`: La descripción completa del producto. Puedes usar saltos de línea con `\n`.

### Paso 2: Agregar Nuevos Productos (Carpetas)
Si tienes un producto nuevo:
1. Crea una nueva carpeta en la raíz del proyecto (al mismo nivel de `tienda`, no adentro).
2. Pon dentro todas las imágenes (`.jpg`, `.png`, etc.) de ese producto.
3. Haz doble clic en el archivo **[actualizar.bat](file:///c:/Users/ljosu/Desktop/Mercado%20Chalchuapa/Tienda%20Online/tienda/actualizar.bat)**.
4. El script detectará la nueva carpeta, la registrará en `products-config.json` con valores vacíos para que los personalices, y reconstruirá tu base de datos automáticamente.

### Paso 3: Aplicar los cambios
Siempre que edites el archivo `products-config.json` o agregues/elimines fotos de las carpetas, ejecuta el archivo **[actualizar.bat](file:///c:/Users/ljosu/Desktop/Mercado%20Chalchuapa/Tienda%20Online/tienda/actualizar.bat)** haciendo doble clic sobre él. Esto regenera `products.js` para aplicar los cambios a la web.

---

## 🌐 Cómo Publicar tu Tienda en GitHub Pages (Gratis)

Subir la tienda a internet es gratis y toma pocos minutos:

1. **Crear un Repositorio en GitHub**:
   - Ve a [github.com](https://github.com) y crea un repositorio vacío (público) llamado, por ejemplo, `tienda-online`.

2. **Subir los Archivos**:
   - Inicializa git en tu carpeta raíz (`Tienda Online`):
     ```bash
     git init
     git add .
     git commit -m "Inicializar tienda online"
     git branch -M main
     git remote add origin https://github.com/TU_USUARIO/tienda-online.git
     git push -u origin main
     ```
   *(Nota: Asegúrate de subir tanto las carpetas de imágenes como la carpeta `tienda`)*

3. **Activar GitHub Pages**:
   - En tu repositorio de GitHub, ve a **Settings** (Configuración) > **Pages** (Páginas).
   - En **Build and deployment** (Compilación y despliegue), selecciona la rama `main` en *Branch*.
   - Selecciona la carpeta **`/ (root)`** en lugar de `/docs` y haz clic en **Save** (Guardar).
   - Espera 1 o 2 minutos. GitHub te dará un enlace público como: `https://TU_USUARIO.github.io/tienda-online/tienda/`

¡Listo! Tu tienda estará online para todo el mundo, cargando imágenes directamente desde tus carpetas del repositorio y redirigiendo pedidos a tu número de WhatsApp.
