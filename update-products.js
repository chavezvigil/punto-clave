const fs = require('fs');
const path = require('path');

// Paths
const configPath = path.join(__dirname, 'products-config.json');
const outputPath = path.join(__dirname, 'products.js');
const rootPath = path.resolve(__dirname, '..');

// Standard image file extensions
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function main() {
  console.log('--- Iniciando actualización del catálogo de productos ---');
  
  // 1. Read existing config or create default
  let config = { storeName: "Mercado Chalchuapa", whatsappNumber: "50376172548", products: {} };
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error('Error al leer products-config.json, usando valores por defecto:', e.message);
    }
  }

  // 2. Scan root directory for product folders
  const items = fs.readdirSync(rootPath, { withFileTypes: true });
  const productFolders = items.filter(item => {
    // Exclude 'tienda' directory, hidden folders, and check if it is a directory
    return item.isDirectory() && 
           item.name !== 'tienda' && 
           !item.name.startsWith('.') && 
           item.name !== 'node_modules';
  });

  console.log(`Carpetas de productos detectadas en la raíz: ${productFolders.map(f => f.name).join(', ')}`);

  let configUpdated = false;

  // 3. For each folder, check images and compile data
  const finalProducts = [];

  productFolders.forEach(folder => {
    const folderPath = path.join(rootPath, folder.name);
    
    // Read files in folder
    let files = [];
    try {
      files = fs.readdirSync(folderPath);
    } catch (e) {
      console.error(`Error al leer la carpeta ${folder.name}:`, e.message);
      return;
    }

    // Filter only image files
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return IMAGE_EXTENSIONS.has(ext);
    });

    if (images.length === 0) {
      console.log(`⚠️ La carpeta '${folder.name}' no contiene imágenes válidas. Se omitirá.`);
      return;
    }

    // If folder is not in config, add it as a new product placeholder
    if (!config.products[folder.name]) {
      console.log(`✨ Nueva carpeta detectada: '${folder.name}'. Registrando en config.`);
      config.products[folder.name] = {
        title: folder.name,
        price: 0,
        originalPrice: null,
        category: "Otros",
        condition: "Usado - Buen estado",
        availability: "Disponible",
        description: `Descripción pendiente para ${folder.name}.`
      };
      configUpdated = true;
    }

    const prodInfo = config.products[folder.name];
    
    // Build image paths relative to tienda/index.html (i.e. ../FolderName/FileName)
    // We encode the URI components of the folder and file name for safety in HTML/CSS
    const relativeImagePaths = images.map(img => {
      return `../${encodeURIComponent(folder.name)}/${encodeURIComponent(img)}`;
    });

    finalProducts.push({
      id: folder.name.replace(/\s+/g, '-').toLowerCase(),
      folderName: folder.name,
      title: prodInfo.title || folder.name,
      price: prodInfo.price ?? 0,
      originalPrice: prodInfo.originalPrice ?? null,
      category: prodInfo.category || "Otros",
      condition: prodInfo.condition || "Usado - Buen estado",
      availability: prodInfo.availability || "Disponible",
      description: prodInfo.description || "",
      images: relativeImagePaths
    });
  });

  // 4. Save config back if we added new products
  if (configUpdated) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log('💾 Archivo products-config.json actualizado con nuevos productos.');
    } catch (e) {
      console.error('Error al guardar products-config.json:', e.message);
    }
  }

  // 5. Generate final products.js file
  const jsContent = `// Archivo autogenerado. No editar directamente.
// Para modificar los datos de los productos, edita 'products-config.json' y ejecuta 'node update-products.js'

window.STORE_INFO = ${JSON.stringify({
    storeName: config.storeName || "Mi Tienda",
    whatsappNumber: config.whatsappNumber || "50376172548"
  }, null, 2)};

window.PRODUCTS = ${JSON.stringify(finalProducts, null, 2)};
`;

  try {
    fs.writeFileSync(outputPath, jsContent, 'utf8');
    console.log(`🚀 Base de datos compilada con éxito en: products.js (${finalProducts.length} productos registrados)`);
  } catch (e) {
    console.error('Error al escribir products.js:', e.message);
  }
}

main();
