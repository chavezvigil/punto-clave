// --- CONTROLADOR DE LA TIENDA ONLINE ---

document.addEventListener('DOMContentLoaded', () => {
    // Verificar que los datos esten cargados
    if (!window.PRODUCTS || !window.STORE_INFO) {
        console.error('Error: Base de datos de productos (products.js) no encontrada.');
        return;
    }

    // --- ESTADO DE LA APLICACIÓN ---
    let state = {
        products: window.PRODUCTS,
        filteredProducts: [...window.PRODUCTS],
        activeCategory: 'todos',
        searchQuery: '',
        onlyAvailable: false,
        sortBy: 'default',
        cart: JSON.parse(localStorage.getItem('whatsapp_store_cart')) || [],
        currentProductModal: null,
        currentSliderIndex: 0
    };

    // --- ELEMENTOS DEL DOM ---
    const storeTitleEl = document.getElementById('store-title');
    const footerStoreNameEl = document.getElementById('footer-store-name');
    const footerYearEl = document.getElementById('footer-year');
    
    const categoriesContainer = document.getElementById('categories-container');
    const productsGrid = document.getElementById('products-grid');
    const resultsCountEl = document.getElementById('results-count');
    
    // Filtros
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const stockFilter = document.getElementById('stock-filter');
    const sortSelect = document.getElementById('sort-select');
    
    // Modal
    const productModal = document.getElementById('product-modal');
    const modalCloseBtn = document.getElementById('modal-close');
    const modalSlider = document.getElementById('modal-slider');
    const prevImgBtn = document.getElementById('prev-img');
    const nextImgBtn = document.getElementById('next-img');
    const sliderDots = document.getElementById('slider-dots');
    
    const modalCategory = document.getElementById('modal-category');
    const modalCondition = document.getElementById('modal-condition');
    const modalAvailability = document.getElementById('modal-availability');
    const modalTitle = document.getElementById('modal-title');
    const modalPrice = document.getElementById('modal-price');
    const modalOriginalPrice = document.getElementById('modal-original-price');
    const modalDescription = document.getElementById('modal-description');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart');
    const modalWhatsappDirect = document.getElementById('modal-whatsapp-direct');
    
    // Carrito Drawer
    const cartToggle = document.getElementById('cart-toggle');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartCloseBtn = document.getElementById('cart-close');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartBadge = document.getElementById('cart-badge');
    const cartTotalHeader = document.querySelector('.cart-total-header');
    const cartSubtotalEl = document.getElementById('cart-subtotal');
    const cartTotalFooterEl = document.getElementById('cart-total-footer');
    const cartCheckoutBtn = document.getElementById('cart-checkout');
    const startShoppingBtn = document.getElementById('start-shopping');
    
    // Tema & Toast
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = themeToggle.querySelector('.sun-icon');
    const moonIcon = themeToggle.querySelector('.moon-icon');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- INICIALIZACIÓN ---
    function init() {
        // Cargar Información de la Tienda
        storeTitleEl.textContent = state.products.length > 0 ? window.STORE_INFO.storeName : "Mi Tienda";
        footerStoreNameEl.textContent = window.STORE_INFO.storeName;
        footerYearEl.textContent = new Date().getFullYear();

        // Configuración de Tema Guardado
        const savedTheme = localStorage.getItem('store_theme') || 'light';
        if (savedTheme === 'dark') {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }

        // Renderizar elementos iniciales
        buildCategories();
        applyFilters();
        updateCartUI();
        setupEventListeners();

        // Soporte para abrir detalles por enlace (?prod=id-producto)
        const urlParams = new URLSearchParams(window.location.search);
        const prodId = urlParams.get('prod');
        if (prodId) {
            setTimeout(() => {
                window.openProductDetails(prodId);
            }, 150);
        }
    }

    // --- CATEGORÍAS ---
    function buildCategories() {
        // Obtener categorías únicas
        const categories = new Set();
        state.products.forEach(p => {
            if (p.category) categories.add(p.category);
        });

        // Crear contenedor para Todos
        let html = `<button class="category-tab active" data-category="todos">Todos</button>`;
        
        // Agregar pestañas de categorías
        categories.forEach(cat => {
            html += `<button class="category-tab" data-category="${cat}">${cat}</button>`;
        });
        
        categoriesContainer.innerHTML = html;

        // Añadir eventos a los botones de categoría
        const tabs = categoriesContainer.querySelectorAll('.category-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                state.activeCategory = e.target.dataset.category;
                applyFilters();
            });
        });
    }

    // --- FILTRADO Y ORDENAMIENTO ---
    function applyFilters() {
        let result = [...state.products];

        // 1. Filtrar por Categoría
        if (state.activeCategory !== 'todos') {
            result = result.filter(p => p.category === state.activeCategory);
        }

        // 2. Filtrar por Búsqueda
        if (state.searchQuery.trim() !== '') {
            const query = state.searchQuery.toLowerCase().trim();
            result = result.filter(p => 
                p.title.toLowerCase().includes(query) || 
                p.description.toLowerCase().includes(query) ||
                (p.folderName && p.folderName.toLowerCase().includes(query))
            );
        }

        // 3. Filtrar por Disponibilidad
        if (state.onlyAvailable) {
            result = result.filter(p => p.availability.toLowerCase() === 'disponible');
        }
        // 4. Ordenar (Priorizando "Disponible" sobre "Agotado", luego por la opción seleccionada)
        result.sort((a, b) => {
            const aAvailable = a.availability.toLowerCase() === 'disponible';
            const bAvailable = b.availability.toLowerCase() === 'disponible';

            // Criterio Primario: Disponibilidad (Disponible primero, Agotado después)
            if (aAvailable && !bAvailable) return -1;
            if (!aAvailable && bAvailable) return 1;

            // Criterio Secundario: Ordenamiento seleccionado
            if (state.sortBy === 'price-asc') {
                return a.price - b.price;
            } else if (state.sortBy === 'price-desc') {
                return b.price - a.price;
            } else if (state.sortBy === 'name-asc') {
                return a.title.localeCompare(b.title);
            } else {
                // Orden por defecto: Fecha de publicación (más reciente primero)
                const dateA = a.date || '';
                const dateB = b.date || '';
                if (dateA !== dateB) {
                    return dateB.localeCompare(dateA); // Más nuevo primero (descendente)
                }
                return a.title.localeCompare(b.title); // Fallback alfabético
            }
        });        state.filteredProducts = result;
        renderProductsGrid();
    }

    // --- RENDERIZACIÓN DE PRODUCTOS ---
    function renderProductsGrid() {
        if (state.filteredProducts.length === 0) {
            resultsCountEl.textContent = "0 productos encontrados";
            productsGrid.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <h3>No se encontraron productos</h3>
                    <p>Prueba ajustando los filtros o la barra de búsqueda.</p>
                </div>
            `;
            return;
        }

        // Mostrar contador de resultados
        const count = state.filteredProducts.length;
        resultsCountEl.textContent = `${count} ${count === 1 ? 'producto' : 'productos'}`;

        productsGrid.innerHTML = state.filteredProducts.map(product => {
            const isOutOfStock = product.availability.toLowerCase() === 'agotado';
            const firstImage = product.images.length > 0 ? product.images[0] : 'https://placehold.co/400x400?text=Sin+Foto';
            const inCart = state.cart.some(item => item.id === product.id);

            // Formato de precio tachado si hay descuento
            const priceHtml = product.originalPrice 
                ? `<span class="current-price">$${product.price.toFixed(2)}</span><span class="original-price">$${product.originalPrice.toFixed(2)}</span>` 
                : `<span class="current-price">$${product.price.toFixed(2)}</span>`;

            return `
                <article class="product-card glass-effect" data-id="${product.id}">
                    <div class="badge-container">
                        <span class="badge badge-availability ${isOutOfStock ? 'out-of-stock' : ''}">${product.availability}</span>
                        <span class="badge badge-condition">${product.condition}</span>
                    </div>
                    
                    <div class="product-card-link" onclick="window.openProductDetails('${product.id}')">
                        <div class="card-img-wrapper">
                            <img class="card-img" src="${firstImage}" alt="${product.title}" loading="lazy">
                        </div>
                        <div class="card-info">
                            <h3 class="product-title">${product.title}</h3>
                            <div class="price-container">
                                ${priceHtml}
                            </div>
                        </div>
                    </div>
                    
                    <div class="card-info" style="padding-top: 0; margin-top: -1rem;">
                        <div class="card-actions">
                            <button class="btn btn-secondary btn-sm btn-grow" onclick="window.openProductDetails('${product.id}')">
                                Ver Detalles
                            </button>
                            <button class="cart-icon-btn ${inCart ? 'in-cart' : ''}" 
                                    onclick="window.toggleCartItem('${product.id}', event)" 
                                    aria-label="Agregar al carrito" 
                                    ${isOutOfStock ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    // --- MODAL DETALLE DE PRODUCTO ---
    window.openProductDetails = function(productId) {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        state.currentProductModal = product;
        state.currentSliderIndex = 0;

        // Cargar datos
        modalTitle.textContent = product.title;
        modalDescription.textContent = product.description;
        modalCategory.textContent = product.category;
        modalCondition.textContent = product.condition;
        modalAvailability.textContent = product.availability;

        // Clases de disponibilidad
        const isOutOfStock = product.availability.toLowerCase() === 'agotado';
        modalAvailability.className = `badge badge-availability ${isOutOfStock ? 'out-of-stock' : ''}`;

        // Precios
        if (product.originalPrice) {
            modalPrice.textContent = `$${product.price.toFixed(2)}`;
            modalOriginalPrice.textContent = `$${product.originalPrice.toFixed(2)}`;
            modalOriginalPrice.style.display = 'inline';
        } else {
            modalPrice.textContent = `$${product.price.toFixed(2)}`;
            modalOriginalPrice.style.display = 'none';
        }

        // Galería de Imágenes
        if (product.images.length > 0) {
            modalSlider.innerHTML = product.images.map(img => `
                <img src="${img}" alt="${product.title}">
            `).join('');

            // Flechas de navegación
            if (product.images.length > 1) {
                prevImgBtn.style.display = 'flex';
                nextImgBtn.style.display = 'flex';
                
                // Generar puntos indicadores
                sliderDots.innerHTML = product.images.map((_, idx) => `
                    <span class="dot ${idx === 0 ? 'active' : ''}" onclick="window.setSliderIndex(${idx})"></span>
                `).join('');
                sliderDots.style.display = 'flex';
            } else {
                prevImgBtn.style.display = 'none';
                nextImgBtn.style.display = 'none';
                sliderDots.style.display = 'none';
            }
        } else {
            modalSlider.innerHTML = `<img src="https://placehold.co/600x600?text=Sin+Foto" alt="Sin foto">`;
            prevImgBtn.style.display = 'none';
            nextImgBtn.style.display = 'none';
            sliderDots.style.display = 'none';
        }

        // Resetear posición de slider
        updateSliderPosition();

        // Botón agregar carrito en modal
        const inCart = state.cart.some(item => item.id === product.id);
        modalAddToCartBtn.innerHTML = inCart 
            ? `<span>Quitar del carrito</span>`
            : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg><span>Añadir al carrito</span>`;
        
        modalAddToCartBtn.className = inCart ? 'btn btn-secondary btn-grow' : 'btn btn-primary btn-grow';
        modalAddToCartBtn.disabled = isOutOfStock;
        modalAddToCartBtn.style.opacity = isOutOfStock ? '0.5' : '1';
        modalAddToCartBtn.style.cursor = isOutOfStock ? 'not-allowed' : 'pointer';

        // Botón de WhatsApp Directo
        modalWhatsappDirect.onclick = () => {
            const baseUrl = window.location.protocol === 'file:' ? 'https://chavezvigil.github.io/punto-clave/' : window.location.href;
            const prodLink = new URL(`?prod=${product.id}`, baseUrl).href;
            const imgUrl = product.images.length > 0 ? new URL(product.images[0], baseUrl).href : '';
            
            let message = `Hola! Me interesa obtener más información sobre el producto:\n\n`;
            message += `*${product.title}*\n`;
            message += `Precio: *$${product.price.toFixed(2)}*\n\n`;
            message += `Ver en catálogo: ${prodLink}\n`;
            if (imgUrl) {
                message += `Foto del producto: ${imgUrl}\n`;
            }
            
            const encodedText = encodeURIComponent(message);
            window.open(`https://wa.me/${window.STORE_INFO.whatsappNumber}?text=${encodedText}`, '_blank');
        };

        // Mostrar Modal
        productModal.style.display = 'flex';
        productModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Evitar scroll de fondo
    }

    function closeModal() {
        productModal.style.display = 'none';
        productModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        state.currentProductModal = null;
    }

    // --- CAROUSEL MODAL ---
    window.setSliderIndex = function(index) {
        if (!state.currentProductModal) return;
        const totalImages = state.currentProductModal.images.length;
        if (index < 0) {
            state.currentSliderIndex = totalImages - 1;
        } else if (index >= totalImages) {
            state.currentSliderIndex = 0;
        } else {
            state.currentSliderIndex = index;
        }
        updateSliderPosition();
    };

    function updateSliderPosition() {
        const percent = -state.currentSliderIndex * 100;
        modalSlider.style.transform = `translateX(${percent}%)`;
        
        // Actualizar puntos activos
        const dots = sliderDots.querySelectorAll('.dot');
        dots.forEach((dot, idx) => {
            if (idx === state.currentSliderIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // --- GESTIÓN DEL CARRITO (LÓGICA) ---
    window.toggleCartItem = function(productId, event) {
        if (event) event.stopPropagation(); // Evitar que el clic en la tarjeta abra el modal

        const product = state.products.find(p => p.id === productId);
        if (!product || product.availability.toLowerCase() === 'agotado') return;

        const cartIndex = state.cart.findIndex(item => item.id === productId);

        if (cartIndex > -1) {
            // Eliminar del carrito
            state.cart.splice(cartIndex, 1);
            showToast('Producto eliminado del carrito');
        } else {
            // Agregar al carrito
            const firstImage = product.images.length > 0 ? product.images[0] : 'https://placehold.co/100x100?text=Sin+Foto';
            state.cart.push({
                id: product.id,
                title: product.title,
                price: product.price,
                image: firstImage,
                qty: 1
            });
            showToast('Producto añadido al carrito');
        }

        // Persistencia y actualización
        localStorage.setItem('whatsapp_store_cart', JSON.stringify(state.cart));
        updateCartUI();
        applyFilters(); // Re-renderizar la grilla para actualizar los íconos de carrito

        // Actualizar modal si está abierto
        if (state.currentProductModal && state.currentProductModal.id === productId) {
            window.openProductDetails(productId);
        }
    };

    window.updateQty = function(productId, delta) {
        const item = state.cart.find(item => item.id === productId);
        if (!item) return;

        item.qty += delta;

        if (item.qty <= 0) {
            // Eliminar si la cantidad llega a cero
            state.cart = state.cart.filter(i => i.id !== productId);
            showToast('Producto eliminado del carrito');
        }

        localStorage.setItem('whatsapp_store_cart', JSON.stringify(state.cart));
        updateCartUI();
        applyFilters(); // Re-renderizar por si acaso

        if (state.currentProductModal && state.currentProductModal.id === productId) {
            window.openProductDetails(productId);
        }
    };

    function updateCartUI() {
        // Contador de Items
        const totalItems = state.cart.reduce((acc, curr) => acc + curr.qty, 0);
        cartBadge.textContent = totalItems;
        cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';

        // Calcular Totales
        const totalCost = state.cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
        const formattedTotal = `$${totalCost.toFixed(2)}`;
        
        cartTotalHeader.textContent = formattedTotal;
        cartSubtotalEl.textContent = formattedTotal;
        cartTotalFooterEl.textContent = formattedTotal;

        // Renderizar items del Drawer
        if (state.cart.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="empty-cart-state">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    <p>Tu carrito está vacío</p>
                    <button id="start-shopping" class="btn btn-secondary btn-sm" onclick="window.closeCart()">Explorar catálogo</button>
                </div>
            `;
            cartCheckoutBtn.disabled = true;
            cartCheckoutBtn.style.opacity = '0.5';
            cartCheckoutBtn.style.cursor = 'not-allowed';
        } else {
            cartCheckoutBtn.disabled = false;
            cartCheckoutBtn.style.opacity = '1';
            cartCheckoutBtn.style.cursor = 'pointer';

            cartItemsContainer.innerHTML = state.cart.map(item => `
                <div class="cart-item">
                    <img class="cart-item-img" src="${item.image}" alt="${item.title}">
                    <div class="cart-item-info">
                        <span class="cart-item-title">${item.title}</span>
                        <span class="cart-item-price">$${item.price.toFixed(2)}</span>
                    </div>
                    <div class="cart-item-controls">
                        <button class="qty-btn" onclick="window.updateQty('${item.id}', -1)">-</button>
                        <span class="qty-val">${item.qty}</span>
                        <button class="qty-btn" onclick="window.updateQty('${item.id}', 1)">+</button>
                    </div>
                    <button class="remove-item-btn" onclick="window.toggleCartItem('${item.id}')" aria-label="Eliminar del carrito">✕</button>
                </div>
            `).join('');
        }
    }

    // --- APERTURA Y CIERRE DEL CARRITO ---
    window.openCart = function() {
        cartDrawer.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    window.closeCart = function() {
        cartDrawer.style.display = 'none';
        document.body.style.overflow = '';
    };

    // --- CHECKOUT A WHATSAPP ---
    function sendOrderToWhatsapp() {
        if (state.cart.length === 0) return;

        let message = `Hola *${window.STORE_INFO.storeName}*, me gustaría realizar el siguiente pedido:\n\n`;
        const baseUrl = window.location.protocol === 'file:' ? 'https://chavezvigil.github.io/punto-clave/' : window.location.href;
        
        state.cart.forEach((item, index) => {
            const subtotal = item.price * item.qty;
            
            // Generar ruta absoluta del producto y la foto
            const prodLink = new URL(`?prod=${item.id}`, baseUrl).href;
            const imgUrl = new URL(item.image, baseUrl).href;
            
            message += `${index + 1}. *${item.title}* (Cant: ${item.qty}) - $${item.price.toFixed(2)} c/u | Subtotal: *$${subtotal.toFixed(2)}*\n`;
            message += `Producto: ${prodLink}\n`;
            message += `Foto: ${imgUrl}\n\n`;
        });

        const totalCost = state.cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
        message += `*Total del Pedido: $${totalCost.toFixed(2)}*\n\n`;
        message += `Por favor, confírmame la disponibilidad para coordinar la entrega y el pago. Gracias!`;

        const encodedText = encodeURIComponent(message);
        window.open(`https://wa.me/${window.STORE_INFO.whatsappNumber}?text=${encodedText}`, '_blank');
        
        // Limpiar el carrito después de enviar la solicitud (Opcional - da mejor UX para evitar compras duplicadas)
        state.cart = [];
        localStorage.setItem('whatsapp_store_cart', JSON.stringify(state.cart));
        updateCartUI();
        applyFilters();
        window.closeCart();
    }

    // --- TOAST NOTIFICATIONS ---
    function showToast(message) {
        toastMessage.textContent = message;
        toast.style.display = 'block';
        
        // Forzar reflow para animación
        toast.offsetHeight;

        // Ocultar tras 3 segundos
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Búsqueda
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            clearSearchBtn.style.display = e.target.value.length > 0 ? 'block' : 'none';
            applyFilters();
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            state.searchQuery = '';
            clearSearchBtn.style.display = 'none';
            applyFilters();
            searchInput.focus();
        });

        // Filtro disponibilidad
        stockFilter.addEventListener('change', (e) => {
            state.onlyAvailable = e.target.checked;
            applyFilters();
        });

        // Ordenamiento
        sortSelect.addEventListener('change', (e) => {
            state.sortBy = e.target.value;
            applyFilters();
        });

        // Cierre de modal
        modalCloseBtn.addEventListener('click', closeModal);
        productModal.addEventListener('click', (e) => {
            if (e.target === productModal) closeModal();
        });

        // Teclado para modal (Esc y flechas)
        document.addEventListener('keydown', (e) => {
            if (productModal.style.display === 'flex') {
                if (e.key === 'Escape') closeModal();
                if (e.key === 'ArrowLeft') window.setSliderIndex(state.currentSliderIndex - 1);
                if (e.key === 'ArrowRight') window.setSliderIndex(state.currentSliderIndex + 1);
            }
        });

        // Controles de Slider en Modal
        prevImgBtn.addEventListener('click', () => {
            window.setSliderIndex(state.currentSliderIndex - 1);
        });

        nextImgBtn.addEventListener('click', () => {
            window.setSliderIndex(state.currentSliderIndex + 1);
        });

        // Agregar al carrito desde modal
        modalAddToCartBtn.addEventListener('click', () => {
            if (state.currentProductModal) {
                window.toggleCartItem(state.currentProductModal.id);
            }
        });

        // Carrito drawer toggle
        cartToggle.addEventListener('click', window.openCart);
        cartCloseBtn.addEventListener('click', window.closeCart);
        cartDrawer.addEventListener('click', (e) => {
            if (e.target === cartDrawer) window.closeCart();
        });

        // Checkout button
        cartCheckoutBtn.addEventListener('click', sendOrderToWhatsapp);

        // Cambiar tema
        themeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-theme')) {
                document.body.classList.remove('dark-theme');
                document.body.classList.add('light-theme');
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
                localStorage.setItem('store_theme', 'light');
                showToast('Tema claro activado');
            } else {
                document.body.classList.remove('light-theme');
                document.body.classList.add('dark-theme');
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
                localStorage.setItem('store_theme', 'dark');
                showToast('Tema oscuro activado');
            }
        });

        // --- LÓGICA DE BOTONES FLOTANTES: SUBIR Y WHATSAPP ---
        const scrollTopBtn = document.getElementById('scroll-to-top');
        const waTooltip = document.querySelector('.whatsapp-tooltip');
        const waFloat = document.getElementById('whatsapp-float');

        // Mostrar/Ocultar botón de subir y quitar tooltip al hacer scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
            if (waTooltip) {
                waTooltip.classList.remove('show-initially');
            }
        }, { passive: true });

        // Clic para subir suavemente
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Mostrar el tooltip de ayuda a los 3 segundos de carga
        if (waTooltip && waFloat) {
            setTimeout(() => {
                if (!localStorage.getItem('wa_interacted')) {
                    waTooltip.classList.add('show-initially');
                }
            }, 3000);

            // Guardar interacción para no molestar más adelante
            waFloat.addEventListener('mouseenter', () => {
                waTooltip.classList.remove('show-initially');
                localStorage.setItem('wa_interacted', 'true');
            });
        }

        // Configurar redirección dinámica del formulario de contacto
        const redirectInput = document.getElementById('form-redirect');
        if (redirectInput) {
            redirectInput.value = window.location.href.split('#')[0].split('?')[0];
        }
    }

    // Inicializar todo
    init();
});
