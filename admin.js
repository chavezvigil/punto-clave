// --- LÓGICA DEL PANEL ADMINISTRADOR (PUNTO CLAVE) ---

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO Y CONFIGURACIÓN GLOBAL ---
    const CONFIG_STORAGE_KEY = 'punto_clave_admin_settings';
    
    let adminSettings = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY)) || {
        pin: '1234',
        token: '',
        repo: 'chavezvigil/punto-clave',
        storeName: 'Punto Clave',
        whatsappNumber: '50376172548'
    };

    let catalogConfig = {
        storeName: adminSettings.storeName,
        whatsappNumber: adminSettings.whatsappNumber,
        products: {}
    };

    // Colección temporal de imágenes para el producto actual en edición
    let currentImageFiles = []; // Array of { name, dataUrl, rawFile, isExisting, path }
    let editingProductKey = null;

    // --- ELEMENTOS DOM ---
    const loginModal = document.getElementById('login-modal');
    const loginForm = document.getElementById('login-form');
    const pinDigits = document.querySelectorAll('.pin-digit');
    const loginError = document.getElementById('login-error');
    const adminDashboard = document.getElementById('admin-dashboard');

    const headerStoreName = document.getElementById('header-store-name');
    const logoutBtn = document.getElementById('logout-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab 1: productos
    const productsCountSpan = document.getElementById('products-count');
    const adminSearchInput = document.getElementById('admin-search-input');
    const adminCategoryFilter = document.getElementById('admin-category-filter');
    const adminStatusFilter = document.getElementById('admin-status-filter');
    const adminProductsGrid = document.getElementById('admin-products-grid');

    // Tab 2: editor
    const editorHeading = document.getElementById('editor-heading');
    const productForm = document.getElementById('product-form');
    const prodTitle = document.getElementById('prod-title');
    const prodFolder = document.getElementById('prod-folder');
    const prodCategory = document.getElementById('prod-category');
    const prodPrice = document.getElementById('prod-price');
    const prodOriginalPrice = document.getElementById('prod-original-price');
    const prodCondition = document.getElementById('prod-condition');
    const prodAvailability = document.getElementById('prod-availability');
    const prodDescription = document.getElementById('prod-description');
    const imageDropzone = document.getElementById('image-dropzone');
    const prodImagesInput = document.getElementById('prod-images-input');
    const imagePreviews = document.getElementById('image-previews');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveProductBtn = document.getElementById('save-product-btn');

    // Tab 3: ajustes
    const settingsForm = document.getElementById('settings-form');
    const settingRepo = document.getElementById('setting-repo');
    const settingToken = document.getElementById('setting-token');
    const settingPin = document.getElementById('setting-pin');
    const settingStoreName = document.getElementById('setting-store-name');
    const settingWhatsapp = document.getElementById('setting-whatsapp');

    // Progress Modal
    const progressModal = document.getElementById('progress-modal');
    const progressTitle = document.getElementById('progress-title');
    const progressSubtitle = document.getElementById('progress-subtitle');

    // --- INICIALIZACIÓN ---
    initPinInputs();
    loadCatalogFromWindow();
    populateSettingsForm();

    // --- MANEJO DE AUTENTICACIÓN / PIN ---
    function initPinInputs() {
        pinDigits.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value && index < pinDigits.length - 1) {
                    pinDigits[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    pinDigits[index - 1].focus();
                }
            });
        });
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPin = Array.from(pinDigits).map(input => input.value).join('');
        if (enteredPin === adminSettings.pin) {
            loginModal.style.display = 'none';
            adminDashboard.style.display = 'block';
            renderProductsList();
            tryFetchConfigFromGitHub();
        } else {
            loginError.textContent = '❌ PIN incorrecto. Inténtalo de nuevo.';
            pinDigits.forEach(input => input.value = '');
            pinDigits[0].focus();
        }
    });

    logoutBtn.addEventListener('addEventListener' in window ? 'click' : 'onclick', () => {
        adminDashboard.style.display = 'none';
        loginModal.style.display = 'flex';
        pinDigits.forEach(input => input.value = '');
        loginError.textContent = '';
        pinDigits[0].focus();
    });

    // --- MANEJO DE PESTAÑAS ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');

            if (targetTab === 'products') {
                renderProductsList();
            }
        });
    });

    // --- CÁRGAR DATOS DE PRODUCTOS ---
    function loadCatalogFromWindow() {
        if (window.STORE_INFO) {
            catalogConfig.storeName = window.STORE_INFO.storeName || adminSettings.storeName;
            catalogConfig.whatsappNumber = window.STORE_INFO.whatsappNumber || adminSettings.whatsappNumber;
            headerStoreName.textContent = catalogConfig.storeName;
        }

        if (window.PRODUCTS && Array.isArray(window.PRODUCTS)) {
            catalogConfig.products = {};
            window.PRODUCTS.forEach(p => {
                const folderName = p.folderName || p.title;
                catalogConfig.products[folderName] = {
                    title: p.title,
                    price: p.price,
                    originalPrice: p.originalPrice || null,
                    category: p.category || 'Otros',
                    condition: p.condition || 'Usado - Buen estado',
                    availability: p.availability || 'Disponible',
                    description: p.description || '',
                    date: p.date || new Date().toISOString().split('T')[0],
                    images: p.images || []
                };
            });
        }
    }

    // Intentar descargar products-config.json directamente desde GitHub API si hay Token
    async function tryFetchConfigFromGitHub() {
        if (!adminSettings.token || !adminSettings.repo) return;

        try {
            const res = await fetch(`https://api.github.com/repos/${adminSettings.repo}/contents/products-config.json`, {
                headers: {
                    'Authorization': `token ${adminSettings.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                const decodedJson = JSON.parse(decodeURIComponent(escape(atob(data.content))));
                if (decodedJson && decodedJson.products) {
                    // Preservar las imágenes si la versión remota no las trae
                    Object.keys(decodedJson.products).forEach(k => {
                        if (!decodedJson.products[k].images || decodedJson.products[k].images.length === 0) {
                            if (catalogConfig.products[k] && catalogConfig.products[k].images) {
                                decodedJson.products[k].images = catalogConfig.products[k].images;
                            }
                        }
                    });
                    catalogConfig = decodedJson;
                    if (catalogConfig.storeName) headerStoreName.textContent = catalogConfig.storeName;
                    renderProductsList();
                    console.log('✅ Configuración cargada en tiempo real desde GitHub.');
                }
            }
        } catch (err) {
            console.warn('No se pudo actualizar config desde GitHub API en el inicio:', err);
        }
    }

    // --- TAB 1: RENDERIZAR PRODUCTOS ---
    function renderProductsList() {
        const searchTerm = adminSearchInput.value.toLowerCase().trim();
        const selectedCategory = adminCategoryFilter.value;
        const selectedStatus = adminStatusFilter.value;

        // Actualizar selector de categorías
        const categoriesSet = new Set();
        Object.values(catalogConfig.products).forEach(p => {
            if (p.category) categoriesSet.add(p.category);
        });

        adminCategoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
        categoriesSet.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            if (cat === selectedCategory) opt.selected = true;
            adminCategoryFilter.appendChild(opt);
        });

        adminProductsGrid.innerHTML = '';

        const productEntries = Object.entries(catalogConfig.products);
        productsCountSpan.textContent = productEntries.length;

        let filteredCount = 0;

        productEntries.forEach(([folderName, p]) => {
            // Filtrar búsqueda
            const matchesSearch = p.title.toLowerCase().includes(searchTerm) || 
                                 (p.description && p.description.toLowerCase().includes(searchTerm));
            const matchesCat = !selectedCategory || p.category === selectedCategory;
            const matchesStatus = !selectedStatus || p.availability === selectedStatus;

            if (!matchesSearch || !matchesCat || !matchesStatus) return;

            filteredCount++;

            // Imagen principal
            let coverImg = 'thumbnail.png';
            if (p.images && p.images.length > 0) {
                try {
                    coverImg = decodeURIComponent(p.images[0]);
                } catch (e) {
                    coverImg = p.images[0];
                }
            } else {
                coverImg = `productos/${folderName}/cover.jpg`;
            }

            const card = document.createElement('div');
            card.className = 'product-admin-card glass-panel';
            
            const status = p.availability || 'Disponible';
            let statusClass = 'disponible';
            let statusText = 'Disponible';
            if (status === 'Agotado') {
                statusClass = 'agotado';
                statusText = 'Agotado';
            } else if (status === 'Oculto') {
                statusClass = 'oculto';
                statusText = 'Oculto';
            }

            const isHidden = status === 'Oculto';
            const isAvailable = status === 'Disponible';

            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${coverImg}" alt="${p.title}" onerror="this.src='thumbnail.png'">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="card-body">
                    <span class="card-category">${p.category || 'Otros'}</span>
                    <h3 class="card-title">${p.title}</h3>
                    <div class="card-prices">
                        <span class="current-price">$${Number(p.price).toFixed(2)}</span>
                        ${p.originalPrice ? `<span class="old-price">$${Number(p.originalPrice).toFixed(2)}</span>` : ''}
                    </div>
                    <div class="card-actions">
                        <button class="btn-icon btn-edit" data-folder="${folderName}" title="Editar información del producto">
                            ✏️
                        </button>
                        <button class="btn-icon btn-toggle-status" data-folder="${folderName}" title="Cambiar Disponibilidad">
                            ${isAvailable ? '🚫 Agotar' : '✅ Habilitar'}
                        </button>
                        <button class="btn-icon btn-toggle-visibility" data-folder="${folderName}" title="${isHidden ? 'Mostrar en tienda' : 'Ocultar de la tienda'}">
                            ${isHidden ? '👁️ Mostrar' : '👁️‍🗨️ Ocultar'}
                        </button>
                        <button class="btn-icon btn-delete" data-folder="${folderName}" title="Eliminar producto">
                            🗑️
                        </button>
                    </div>
                </div>
            `;

            adminProductsGrid.appendChild(card);
        });

        if (filteredCount === 0) {
            adminProductsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <p style="font-size: 1.1rem; margin-bottom: 8px;">No se encontraron productos.</p>
                    <p style="font-size: 0.85rem;">Intenta cambiar los filtros o agrega un nuevo producto.</p>
                </div>
            `;
        }

        // Asignar listeners a botones de tarjetas
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => editProduct(btn.getAttribute('data-folder')));
        });
        document.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', () => toggleProductStatus(btn.getAttribute('data-folder')));
        });
        document.querySelectorAll('.btn-toggle-visibility').forEach(btn => {
            btn.addEventListener('click', () => toggleProductVisibility(btn.getAttribute('data-folder')));
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-folder')));
        });
    }

    adminSearchInput.addEventListener('input', renderProductsList);
    adminCategoryFilter.addEventListener('change', renderProductsList);
    adminStatusFilter.addEventListener('change', renderProductsList);

    // --- TAB 2: AGREGAR / EDITAR PRODUCTO ---
    prodTitle.addEventListener('input', () => {
        if (!editingProductKey) {
            // Auto-generar carpeta limpia a partir del título
            const cleanFolder = prodTitle.value.trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                .replace(/[^a-zA-Z0-9\s-]/g, ""); // Quitar símbolos raros
            prodFolder.value = cleanFolder;
        }
    });

    // Subida de imágenes y Drag & Drop
    imageDropzone.addEventListener('click', () => prodImagesInput.click());
    
    imageDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageDropzone.classList.add('dragover');
    });

    imageDropzone.addEventListener('dragleave', () => imageDropzone.classList.remove('dragover'));
    
    imageDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        imageDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleSelectedFiles(e.dataTransfer.files);
        }
    });

    prodImagesInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleSelectedFiles(e.target.files);
        }
    });

    function handleSelectedFiles(files) {
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                currentImageFiles.push({
                    name: file.name,
                    dataUrl: event.target.result,
                    rawFile: file,
                    isExisting: false
                });
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderImagePreviews() {
        imagePreviews.innerHTML = '';
        currentImageFiles.forEach((imgObj, idx) => {
            const item = document.createElement('div');
            item.className = 'img-preview-item';
            item.innerHTML = `
                <img src="${imgObj.dataUrl}" alt="${imgObj.name}">
                <button type="button" class="remove-img-btn" data-idx="${idx}">✕</button>
            `;
            imagePreviews.appendChild(item);
        });

        document.querySelectorAll('.remove-img-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-idx'));
                currentImageFiles.splice(idx, 1);
                renderImagePreviews();
            });
        });
    }

    function editProduct(folderName) {
        const prod = catalogConfig.products[folderName];
        if (!prod) return;

        editingProductKey = folderName;
        editorHeading.textContent = `Editar Producto: "${prod.title}"`;
        document.getElementById('editing-original-key').value = folderName;

        prodTitle.value = prod.title || '';
        prodFolder.value = folderName;
        prodCategory.value = prod.category || 'Otros';
        prodPrice.value = prod.price ?? 0;
        prodOriginalPrice.value = prod.originalPrice ?? '';
        prodCondition.value = prod.condition || 'Usado - Buen estado';
        prodAvailability.value = prod.availability || 'Disponible';
        prodDescription.value = prod.description || '';

        // Cargar imágenes existentes
        currentImageFiles = [];
        if (prod.images && Array.isArray(prod.images)) {
            prod.images.forEach(imgPath => {
                const fileName = imgPath.split('/').pop();
                currentImageFiles.push({
                    name: fileName,
                    dataUrl: imgPath,
                    isExisting: true,
                    path: imgPath
                });
            });
        }
        renderImagePreviews();

        // Cambiar a la pestaña del editor
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-editor-btn').classList.add('active');
        document.getElementById('tab-editor').classList.add('active');
    }

    cancelEditBtn.addEventListener('click', resetEditorForm);

    function resetEditorForm() {
        editingProductKey = null;
        editorHeading.textContent = 'Agregar Nuevo Producto';
        document.getElementById('editing-original-key').value = '';
        productForm.reset();
        currentImageFiles = [];
        renderImagePreviews();

        // Regresar a productos
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="products"]').classList.add('active');
        document.getElementById('tab-products').classList.add('active');
    }

    async function toggleProductStatus(folderName) {
        const prod = catalogConfig.products[folderName];
        if (!prod) return;

        const newStatus = prod.availability === 'Agotado' ? 'Disponible' : 'Agotado';
        prod.availability = newStatus;
        
        await saveAndPublishCatalog(`Cambiar estado de '${prod.title}' a ${newStatus}`);
    }

    async function toggleProductVisibility(folderName) {
        const prod = catalogConfig.products[folderName];
        if (!prod) return;

        const isHidden = prod.availability === 'Oculto';
        const newStatus = isHidden ? 'Disponible' : 'Oculto';
        prod.availability = newStatus;
        
        await saveAndPublishCatalog(
            isHidden ? `Mostrar producto '${prod.title}' en la tienda` : `Ocultar producto '${prod.title}' de la tienda`
        );
    }

    async function deleteProduct(folderName) {
        const prod = catalogConfig.products[folderName];
        if (!prod) return;

        if (confirm(`¿Estás seguro de eliminar el producto "${prod.title}"?`)) {
            delete catalogConfig.products[folderName];
            await saveAndPublishCatalog(`Eliminar producto '${prod.title}'`);
        }
    }

    // Submit del formulario del producto
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const folderName = prodFolder.value.trim();
        if (!folderName) {
            alert('Por favor ingresa un nombre de carpeta válido.');
            return;
        }

        if (currentImageFiles.length === 0) {
            alert('Por favor sube al menos 1 fotografía para el producto.');
            return;
        }

        const productData = {
            title: prodTitle.value.trim(),
            price: parseFloat(prodPrice.value) || 0,
            originalPrice: prodOriginalPrice.value ? parseFloat(prodOriginalPrice.value) : null,
            category: prodCategory.value.trim() || 'Otros',
            condition: prodCondition.value,
            availability: prodAvailability.value,
            description: prodDescription.value.trim(),
            date: new Date().toISOString().split('T')[0]
        };

        // Si se renombró la carpeta al editar
        const originalKey = document.getElementById('editing-original-key').value;
        if (originalKey && originalKey !== folderName) {
            delete catalogConfig.products[originalKey];
        }

        catalogConfig.products[folderName] = productData;

        await saveAndPublishCatalog(
            originalKey ? `Actualizar producto '${productData.title}'` : `Agregar nuevo producto '${productData.title}'`,
            folderName
        );

        resetEditorForm();
    });

    // --- MOTOR DE PUBLICACIÓN EN GITHUB ---
    async function saveAndPublishCatalog(commitMessage, currentFolder = null) {
        if (!adminSettings.token || !adminSettings.repo) {
            alert('⚠️ Para publicar en GitHub Pages de forma automática, debes ingresar tu Token de GitHub en la pestaña "Configuración".\n\nLos cambios se han guardado temporalmente en la vista local.');
            renderProductsList();
            return;
        }

        showProgressOverlay('Iniciando publicación...', 'Conectando con GitHub API...');
        setStepStatus('step-images', 'active');

        try {
            // 1. Subir imágenes nuevas si las hay
            if (currentFolder && currentImageFiles.length > 0) {
                const uploadedPaths = [];
                for (let i = 0; i < currentImageFiles.length; i++) {
                    const img = currentImageFiles[i];

                    if (img.isExisting && img.path) {
                        uploadedPaths.push(img.path);
                    } else if (img.dataUrl) {
                        const base64Content = img.dataUrl.split(',')[1];
                        const cleanFileName = img.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                        const targetPath = `productos/${currentFolder}/${cleanFileName}`;

                        showProgressOverlay(
                            `Subiendo imagen ${i + 1} de ${currentImageFiles.length}`,
                            targetPath
                        );

                        await uploadFileToGitHub(
                            targetPath,
                            base64Content,
                            `Subir imagen para ${currentFolder}`
                        );

                        uploadedPaths.push(`productos/${encodeURIComponent(currentFolder)}/${encodeURIComponent(cleanFileName)}`);
                    }
                }

                if (catalogConfig.products[currentFolder]) {
                    catalogConfig.products[currentFolder].images = uploadedPaths;
                }
            }

            setStepStatus('step-images', 'done');
            setStepStatus('step-config', 'active');

            // 2. Subir products-config.json
            const jsonString = JSON.stringify(catalogConfig, null, 4);
            const jsonBase64 = btoa(unescape(encodeURIComponent(jsonString)));

            await uploadFileToGitHub(
                'products-config.json',
                jsonBase64,
                `${commitMessage} (Config JSON)`
            );

            setStepStatus('step-config', 'done');
            setStepStatus('step-compile', 'active');

            // 3. Compilar y subir products.js
            const compiledJs = compileProductsJs(catalogConfig);
            const jsBase64 = btoa(unescape(encodeURIComponent(compiledJs)));

            await uploadFileToGitHub(
                'products.js',
                jsBase64,
                `${commitMessage} (Compiled JS)`
            );

            setStepStatus('step-compile', 'done');
            setStepStatus('step-github', 'done');

            showProgressOverlay('🎉 ¡Publicado con Éxito!', 'GitHub Pages actualizará tu tienda en 1 a 2 minutos.');

            setTimeout(() => {
                hideProgressOverlay();
                renderProductsList();
            }, 2500);

        } catch (err) {
            console.error('Error al publicar en GitHub:', err);
            alert(`❌ Error al publicar en GitHub:\n${err.message}\n\nRevisa tu Token y Conexión a Internet.`);
            hideProgressOverlay();
        }
    }

    async function uploadFileToGitHub(path, base64Content, commitMsg) {
        const repo = adminSettings.repo;
        const token = adminSettings.token;
        const url = `https://api.github.com/repos/${repo}/contents/${path}`;

        // Obtener sha del archivo existente si existe
        let sha = null;
        try {
            const getRes = await fetch(url, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (getRes.ok) {
                const getData = await getRes.json();
                sha = getData.sha;
            }
        } catch (e) {
            // El archivo no existe aún, normal
        }

        const bodyData = {
            message: commitMsg,
            content: base64Content
        };
        if (sha) bodyData.sha = sha;

        const putRes = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });

        if (!putRes.ok) {
            const errData = await putRes.json();
            throw new Error(errData.message || 'Error al comunicarse con GitHub API');
        }

        return await putRes.json();
    }

    function compileProductsJs(config) {
        const storeInfo = {
            storeName: config.storeName || "Punto Clave",
            whatsappNumber: config.whatsappNumber || "50376172548"
        };

        const productsArray = [];

        Object.entries(config.products).forEach(([folderName, p]) => {
            const id = folderName.replace(/\s+/g, '-').toLowerCase();
            productsArray.push({
                id: id,
                folderName: folderName,
                title: p.title || folderName,
                price: p.price ?? 0,
                originalPrice: p.originalPrice ?? null,
                category: p.category || "Otros",
                condition: p.condition || "Usado - Buen estado",
                availability: p.availability || "Disponible",
                date: p.date || new Date().toISOString().split('T')[0],
                description: p.description || "",
                images: p.images || []
            });
        });

        return `// Archivo autogenerado por el Módulo Administrador.
// No editar manualmente.

window.STORE_INFO = ${JSON.stringify(storeInfo, null, 4)};

window.PRODUCTS = ${JSON.stringify(productsArray, null, 4)};
`;
    }

    // UI Progress Overlay Helpers
    function showProgressOverlay(title, subtitle) {
        progressTitle.textContent = title;
        progressSubtitle.textContent = subtitle;
        progressModal.classList.add('active');
    }

    function hideProgressOverlay() {
        progressModal.classList.remove('active');
        document.querySelectorAll('.step-item').forEach(st => st.className = 'step-item');
    }

    function setStepStatus(stepId, status) {
        const el = document.getElementById(stepId);
        if (el) el.className = `step-item ${status}`;
    }

    // --- TAB 3: CONFIGURACIÓN ---
    function populateSettingsForm() {
        settingRepo.value = adminSettings.repo || 'chavezvigil/punto-clave';
        settingToken.value = adminSettings.token || '';
        settingPin.value = adminSettings.pin || '1234';
        settingStoreName.value = catalogConfig.storeName || adminSettings.storeName || 'Punto Clave';
        settingWhatsapp.value = catalogConfig.whatsappNumber || adminSettings.whatsappNumber || '50376172548';
    }

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        adminSettings.repo = settingRepo.value.trim();
        adminSettings.token = settingToken.value.trim();
        adminSettings.pin = settingPin.value.trim() || '1234';
        adminSettings.storeName = settingStoreName.value.trim() || 'Punto Clave';
        adminSettings.whatsappNumber = settingWhatsapp.value.trim() || '50376172548';

        catalogConfig.storeName = adminSettings.storeName;
        catalogConfig.whatsappNumber = adminSettings.whatsappNumber;

        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(adminSettings));
        headerStoreName.textContent = adminSettings.storeName;

        alert('✅ Configuración guardada correctamente en este dispositivo.');
    });
});
