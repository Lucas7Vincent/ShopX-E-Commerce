class SellerProfileService {
    constructor() {
        this.baseUrl = window.API_BASE_URL || 'https://localhost:7088/api';
        this.currentSellerId = null;
        this.sellerData = null;
        this.products = [];
        this.categories = [];
        this.currentPage = 1;
        this.pageSize = 15; 
        this.filters = {
            search: '',
            categoryId: null,
            sortBy: 'newest',
            minPrice: null,
            maxPrice: null
        };
        
        this.elements = {};
        this.isLoading = false;
    }

    // ============================================
    // 🔧 INITIALIZATION
    // ============================================

    async init(sellerId) {
        try {
            console.log('🚀 Initializing seller profile service for seller:', sellerId);
            
            this.currentSellerId = sellerId;
            this.cacheElements();
            this.setupEventHandlers();
            
            await this.loadSellerData();
            
            console.log('✅ Seller profile service initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing seller profile:', error);
            this.showError('Không thể tải thông tin cửa hàng. Vui lòng thử lại sau.');
        }
    }

    cacheElements() {
        this.elements = {
            // Seller info elements
            shopName: document.querySelector('.shop-name'),
            shopOwner: document.querySelector('.shop-owner'),
            shopAddress: document.querySelector('.shop-address'),
            shopPhone: document.querySelector('.shop-phone'),
            shopEmail: document.querySelector('.shop-email'),
            shopJoinDate: document.querySelector('.shop-join-date'),
            shopDescription: document.querySelector('.shop-description'),
            shopAvatar: document.querySelector('.shop-avatar'),
            shopRatingText: document.querySelector('.shop-rating-text'),
            
            // Statistics elements
            statProducts: document.querySelector('.stat-number.products'),
            statResponseRate: document.querySelector('.stat-number.response-rate'),
            
            // Categories & Products
            categoriesContainer: document.querySelector('.categories-container'),
            productsGrid: document.getElementById('products-grid'),
            productsCount: document.querySelector('.products-count'),
            paginationContainer: document.querySelector('.pagination-container'),
            
            // Filter elements
            searchInput: document.getElementById('search-input'),
            searchBtn: document.getElementById('search-btn'),
            sortSelect: document.getElementById('sort-select'),
            minPriceInput: document.getElementById('min-price'),
            maxPriceInput: document.getElementById('max-price'),
            filterPriceBtn: document.getElementById('filter-price-btn'),
            clearFiltersBtn: document.getElementById('clear-filters-btn'),
            
            // UI elements
            loadingOverlay: document.getElementById('loading-overlay'),
            errorModal: document.getElementById('error-modal'),
            errorMessage: document.getElementById('error-message'),
            closeErrorModal: document.getElementById('close-error-modal'),
            retryBtn: document.getElementById('retry-btn')
        };
    }
    

    setupEventHandlers() {
        // Search functionality
        this.elements.searchBtn?.addEventListener('click', () => this.handleSearch());
        this.elements.searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // Sort functionality
        this.elements.sortSelect?.addEventListener('change', (e) => {
            this.filters.sortBy = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
        });

        // Price filter
        this.elements.filterPriceBtn?.addEventListener('click', () => this.handlePriceFilter());

        // Clear filters
        this.elements.clearFiltersBtn?.addEventListener('click', () => this.clearFilters());

        // Error modal
        this.elements.closeErrorModal?.addEventListener('click', () => this.hideError());
        this.elements.retryBtn?.addEventListener('click', () => {
            this.hideError();
            this.loadSellerData();
        });
    }

    // ============================================
    // 🌐 API METHODS
    // ============================================

    async apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Error for ${endpoint}:`, error);
            throw error;
        }
    }

    async getSellerProfile(sellerId) {
        console.log(`🔍 Loading seller profile: ${sellerId}`);
        return await this.apiRequest(`/SellerPublic/${sellerId}/profile`);
    }

    async getSellerProducts(sellerId, options = {}) {
        const params = new URLSearchParams();
        
        params.append('page', options.page || this.currentPage);
        params.append('pageSize', options.pageSize || this.pageSize);
        
        // Only add non-null, non-empty values
        if (this.filters.search && this.filters.search.trim()) {
            params.append('search', this.filters.search.trim());
        }
        
        if (this.filters.categoryId && this.filters.categoryId > 0) {
            params.append('categoryId', this.filters.categoryId);
        }
        
        if (this.filters.sortBy && this.filters.sortBy !== 'newest') {
            params.append('sortBy', this.filters.sortBy);
        }
        
        if (this.filters.minPrice && this.filters.minPrice > 0) {
            params.append('minPrice', this.filters.minPrice);
        }
        
        if (this.filters.maxPrice && this.filters.maxPrice > 0) {
            params.append('maxPrice', this.filters.maxPrice);
        }

        console.log(`🔍 Loading seller products: ${sellerId}`, params.toString());
        return await this.apiRequest(`/SellerPublic/${sellerId}/products?${params}`);
    }

    async getSellerCategories(sellerId) {
        console.log(`📂 Loading seller categories: ${sellerId}`);
        return await this.apiRequest(`/SellerPublic/${sellerId}/categories`);
    }

    // ============================================
    // 📊 DATA LOADING METHODS
    // ============================================

    async loadSellerData() {
        try {
            this.showLoading();

            const [sellerProfile, categoriesData] = await Promise.all([
                this.getSellerProfile(this.currentSellerId),
                this.getSellerCategories(this.currentSellerId)
            ]);

            this.sellerData = sellerProfile;
            this.categories = categoriesData.categories || [];

            this.renderSellerProfile(sellerProfile);
            this.renderCategories(categoriesData);
            await this.loadProducts();

            this.hideLoading();
        } catch (error) {
            this.hideLoading();
            throw error;
        }
    }

    async loadProducts() {
        try {
            this.showProductsLoading();

            const productsData = await this.getSellerProducts(this.currentSellerId, {
                page: this.currentPage,
                pageSize: this.pageSize
            });

            this.products = productsData.products || [];
            this.renderProducts(productsData);
            this.renderPagination(productsData.pagination);

        } catch (error) {
            console.error('❌ Error loading products:', error);
            this.showProductsError();
        }
    }

    // ============================================
    // 🎨 RENDERING METHODS
    // ============================================

    renderSellerProfile(seller) {
        try {
            console.log('🎨 Rendering enhanced seller profile');
    
            this.updateElement(this.elements.shopName, seller.shopName || 'Cửa hàng chưa đặt tên');
            this.updateElement(this.elements.shopOwner, seller.userFullName || 'Chưa cập nhật');
            this.updateElement(this.elements.shopAddress, seller.userAddress || 'Chưa cập nhật địa chỉ');
            this.updateElement(this.elements.shopPhone, seller.phone || 'Chưa cập nhật');
            this.updateElement(this.elements.shopEmail, seller.email || 'Chưa cập nhật');
            this.updateElement(this.elements.shopJoinDate, this.formatDate(seller.joinDate));
            
            this.updateElement(this.elements.shopDescription, 
                'Chào mừng bạn đến với cửa hàng! Chúng tôi cam kết cung cấp sản phẩm chất lượng cao với dịch vụ khách hàng tận tâm. Mọi sản phẩm đều được kiểm tra kỹ lưỡng và đảm bảo chính hãng 100%.');
    
            if (this.elements.shopAvatar && seller.avatar) {
                this.elements.shopAvatar.src = seller.avatar;
                this.elements.shopAvatar.alt = seller.shopName;
            }
    
            this.updateElement(this.elements.shopRatingText, `⭐ ${seller.totalProducts || 0} sản phẩm • Cửa hàng uy tín VIP`);
            
            // ✨ ENHANCED ANIMATED STATS - Only 2 stats
            this.animateStatsNumber(this.elements.statProducts, seller.totalProducts || 0);
            
            // Fixed response rate element
            const responseRateElement = document.querySelector('.stat-number.response-rate');
            if (responseRateElement) {
                this.animateStatsNumber(responseRateElement, '98');
            }
    
            console.log('✅ Enhanced seller profile rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering seller profile:', error);
        }
    }

    // 🌟 COMPACT SIDEBAR CATEGORIES
    renderCategories(categoriesData) {
        try {
            console.log('🎨 Rendering beautiful categories');
    
            if (!this.elements.categoriesContainer) return;
    
            const categories = categoriesData.categories || [];
    
            if (categories.length === 0) {
                this.elements.categoriesContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-folder-open"></i>
                        </div>
                        <div class="empty-title">Chưa có danh mục</div>
                        <div class="empty-description">Cửa hàng đang cập nhật danh mục sản phẩm</div>
                    </div>
                `;
                return;
            }
    
            const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);
            
            let categoriesHtml = `
                <button class="category-item ${!this.filters.categoryId ? 'active' : ''}" 
                        data-category-id="">
                    <div class="category-content">
                        <div class="category-name">
                            <i class="fas fa-th-large category-icon text-blue-600"></i>
                            <span class="category-text">Tất cả sản phẩm</span>
                        </div>
                        <span class="category-count">${totalProducts}</span>
                    </div>
                </button>
            `;
    
            categoriesHtml += categories.map(category => `
                <button class="category-item ${this.filters.categoryId === category.sellerCategoryID ? 'active' : ''}" 
                        data-category-id="${category.sellerCategoryID}">
                    <div class="category-content">
                        <div class="category-name">
                            <i class="${this.getCategoryIcon(category.categoryName)} category-icon"></i>
                            <span class="category-text">${category.categoryName}</span>
                        </div>
                        <span class="category-count">${category.productCount}</span>
                    </div>
                </button>
            `).join('');
    
            this.elements.categoriesContainer.innerHTML = categoriesHtml;
    
            // Add click handlers with stagger animation
            this.elements.categoriesContainer.querySelectorAll('.category-item').forEach((button, index) => {
                button.style.animationDelay = `${index * 0.08}s`;
                button.classList.add('fade-in-up');
                
                button.addEventListener('click', (e) => {
                    const categoryId = e.currentTarget.dataset.categoryId;
                    this.filterByCategory(categoryId ? parseInt(categoryId) : null);
                });
            });
    
            console.log('✅ Beautiful categories rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering categories:', error);
        }
    }
    
    

    // ✅ ENHANCED PRODUCT CARDS
    renderProducts(productsData) {
        try {
            console.log('🎨 Rendering compact grid products');
    
            if (!this.elements.productsGrid) return;
    
            const products = productsData.products || [];
            
            this.updateElement(this.elements.productsCount, 
                `${productsData.pagination?.totalCount || 0} sản phẩm${this.hasActiveFilters() ? ' được tìm thấy' : ''}`);
    
            if (products.length === 0) {
                this.elements.productsGrid.innerHTML = `
                    <div class="col-span-full empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-box-open"></i>
                        </div>
                        <div class="empty-title">
                            ${this.hasActiveFilters() ? 'Không tìm thấy sản phẩm phù hợp' : 'Chưa có sản phẩm'}
                        </div>
                        <div class="empty-description">
                            ${this.hasActiveFilters() ? 
                                'Không có sản phẩm nào phù hợp với bộ lọc hiện tại. Hãy thử điều chỉnh tiêu chí tìm kiếm.' : 
                                'Cửa hàng đang cập nhật sản phẩm mới. Hãy quay lại sau để khám phá những sản phẩm tuyệt vời!'}
                        </div>
                        ${this.hasActiveFilters() ? 
                            `<button class="filter-btn primary" 
                                    onclick="window.sellerProfileService.clearFilters()">
                                <i class="fas fa-times mr-2"></i>Xóa tất cả bộ lọc
                            </button>` : ''}
                    </div>
                `;
                return;
            }
    
            const productsHtml = products.map((product, index) => `
                <div class="product-card fade-in-up" 
                     data-product-id="${product.productID}"
                     style="animation-delay: ${index * 0.03}s">
                    
                    <div class="product-image-container">
                        <img src="${this.getFirstImage(product.imageURL) || '/Customer/assets/images/no-image.png'}" 
                             alt="${product.productName}" 
                             class="product-image"
                             loading="lazy">
                        
                        <div class="product-badge ${product.stockQuantity > 0 ? 'bg-green-500' : 'bg-red-500'}">
                            ${product.stockQuantity > 0 ? `Còn ${product.stockQuantity}` : 'Hết hàng'}
                        </div>
                        
                        <div class="product-overlay">
                            <button class="product-quick-view">
                                <i class="fas fa-eye mr-1"></i>Xem chi tiết
                            </button>
                        </div>
                    </div>
                    
                    <div class="product-content">
                        <h3 class="product-title">${product.productName}</h3>
                        <div class="product-price">${this.formatPrice(product.price)}</div>
                        <div class="product-meta">
                            <span class="product-category">
                                <i class="${this.getCategoryIcon(product.categoryName)} mr-1"></i>
                                ${this.truncateText(product.categoryName, 6)}
                            </span>
                            <span class="product-stock ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${product.stockQuantity > 0 ? '✅' : '❌'}
                            </span>
                        </div>
                    </div>
                </div>
            `).join('');
    
            this.elements.productsGrid.innerHTML = productsHtml;
    
            // Add click handlers
            this.elements.productsGrid.querySelectorAll('.product-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    const productId = e.currentTarget.dataset.productId;
                    this.goToProduct(productId);
                });
            });
    
            // Show/hide clear filters button
            if (this.elements.clearFiltersBtn) {
                const hasFilters = this.hasActiveFilters();
                this.elements.clearFiltersBtn.classList.toggle('hidden', !hasFilters);
            }
    
            console.log('✅ Compact grid products rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering products:', error);
        }
    }
    
    // Cập nhật renderPagination với design đẹp hơn
    renderPagination(pagination) {
        try {
            if (!this.elements.paginationContainer || !pagination) return;
    
            const { currentPage, totalPages, hasNextPage, hasPreviousPage } = pagination;
    
            if (totalPages <= 1) {
                this.elements.paginationContainer.innerHTML = '';
                return;
            }
    
            let paginationHtml = `
                <div class="pagination-info">
                    Đang xem trang <strong>${currentPage}</strong> / <strong>${totalPages}</strong> 
                    • Tổng cộng <strong>${pagination.totalCount || 0}</strong> sản phẩm
                </div>
                
                <div class="pagination-controls">
                    <button class="pagination-btn ${!hasPreviousPage ? 'disabled' : ''}" 
                            data-page="${currentPage - 1}" 
                            ${!hasPreviousPage ? 'disabled' : ''}
                            title="Trang trước">
                        <i class="fas fa-chevron-left"></i>
                    </button>
            `;
    
            // Smart page numbers with better logic
            const startPage = Math.max(1, currentPage - 2);
            const endPage = Math.min(totalPages, currentPage + 2);
    
            if (startPage > 1) {
                paginationHtml += `<button class="pagination-btn" data-page="1" title="Trang đầu">1</button>`;
                if (startPage > 2) {
                    paginationHtml += `<span class="pagination-ellipsis">⋯</span>`;
                }
            }
    
            for (let page = startPage; page <= endPage; page++) {
                paginationHtml += `
                    <button class="pagination-btn ${page === currentPage ? 'active' : ''}" 
                            data-page="${page}" title="Trang ${page}">
                        ${page}
                    </button>
                `;
            }
    
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                    paginationHtml += `<span class="pagination-ellipsis">⋯</span>`;
                }
                paginationHtml += `<button class="pagination-btn" data-page="${totalPages}" title="Trang cuối">${totalPages}</button>`;
            }
    
            paginationHtml += `
                    <button class="pagination-btn ${!hasNextPage ? 'disabled' : ''}" 
                            data-page="${currentPage + 1}" 
                            ${!hasNextPage ? 'disabled' : ''}
                            title="Trang sau">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;
    
            this.elements.paginationContainer.innerHTML = paginationHtml;
    
            // Add click handlers with loading state
            this.elements.paginationContainer.querySelectorAll('.pagination-btn:not(.disabled)').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.currentTarget.dataset.page);
                    if (page && page !== currentPage && page >= 1 && page <= totalPages) {
                        const originalContent = btn.innerHTML;
                        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        btn.disabled = true;
                        
                        this.loadPage(page).finally(() => {
                            btn.innerHTML = originalContent;
                            btn.disabled = false;
                        });
                    }
                });
            });
    
        } catch (error) {
            console.error('❌ Error rendering pagination:', error);
        }
    }
    
    // ============================================
    // 🔍 FILTER METHODS
    // ============================================

    async handleSearch() {
        const searchValue = this.elements.searchInput?.value.trim() || '';
        this.filters.search = searchValue;
        this.currentPage = 1;
        await this.applyFilters();
    }

    async handlePriceFilter() {
        const minPrice = parseFloat(this.elements.minPriceInput?.value) || null;
        const maxPrice = parseFloat(this.elements.maxPriceInput?.value) || null;
        
        // Validate price range
        if (minPrice && maxPrice && minPrice > maxPrice) {
            alert('Giá từ phải nhỏ hơn giá đến');
            return;
        }
        
        this.filters.minPrice = minPrice;
        this.filters.maxPrice = maxPrice;
        this.currentPage = 1;
        await this.applyFilters();
    }

    async filterByCategory(categoryId) {
        try {
            console.log('🔍 Filtering by category:', categoryId);
            
            this.filters.categoryId = categoryId;
            this.currentPage = 1;
            await this.applyFilters();
            
            // Update sidebar active state
            document.querySelectorAll('.category-item').forEach(item => {
                const itemCategoryId = item.dataset.categoryId;
                if ((categoryId === null && itemCategoryId === '') || 
                    (categoryId !== null && parseInt(itemCategoryId) === categoryId)) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
        } catch (error) {
            console.error('❌ Error filtering by category:', error);
        }
    }

    async applyFilters() {
        try {
            await this.loadProducts();
        } catch (error) {
            console.error('❌ Error applying filters:', error);
        }
    }

    async clearFilters() {
        try {
            this.filters = {
                search: '',
                categoryId: null,
                sortBy: 'newest',
                minPrice: null,
                maxPrice: null
            };
            this.currentPage = 1;

            // Reset UI
            if (this.elements.searchInput) this.elements.searchInput.value = '';
            if (this.elements.sortSelect) this.elements.sortSelect.value = 'newest';
            if (this.elements.minPriceInput) this.elements.minPriceInput.value = '';
            if (this.elements.maxPriceInput) this.elements.maxPriceInput.value = '';

            // Reset category sidebar
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.categoryId === '') {
                    item.classList.add('active');
                }
            });

            await this.applyFilters();
        } catch (error) {
            console.error('❌ Error clearing filters:', error);
        }
    }

    async loadPage(page) {
        try {
            console.log('📄 Loading page:', page);
            this.currentPage = page;
            await this.loadProducts();
            
            // Scroll to products section
            document.querySelector('.products-section')?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        } catch (error) {
            console.error('❌ Error loading page:', error);
        }
    }

    // ============================================
    // 🛠️ UTILITY METHODS
    // ============================================
// ✨ ENHANCED UTILITY METHODS
animateStatsNumber(element, targetValue) {
    if (!element) return;
    
    const isFloat = String(targetValue).includes('.');
    const numericValue = parseFloat(String(targetValue).replace(/[^\d.]/g, ''));
    
    let currentValue = 0;
    const increment = isFloat ? numericValue / 20 : Math.ceil(numericValue / 20);
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= numericValue) {
            currentValue = numericValue;
            clearInterval(timer);
        }
        
        element.textContent = isFloat ? currentValue.toFixed(1) : Math.floor(currentValue);
    }, 80);
}

truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

getCategoryIcon(categoryName) {
    const iconMap = {
        'điện thoại': 'fas fa-mobile-alt',
        'laptop': 'fas fa-laptop',
        'máy tính': 'fas fa-desktop',
        'tai nghe': 'fas fa-headphones',
        'camera': 'fas fa-camera',
        'thời trang': 'fas fa-tshirt',
        'giày dép': 'fas fa-shoe-prints',
        'túi xách': 'fas fa-shopping-bag',
        'nhà cửa': 'fas fa-home',
        'sách': 'fas fa-book',
        'thể thao': 'fas fa-running',
        'điện tử': 'fas fa-microchip',
        'gia dụng': 'fas fa-blender',
        'mỹ phẩm': 'fas fa-palette',
        'đồ chơi': 'fas fa-gamepad',
        'default': 'fas fa-tag'
    };

    const categoryLower = categoryName.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
        if (categoryLower.includes(key)) {
            return icon;
        }
    }
    return iconMap.default;
}
    hasActiveFilters() {
        return !!(this.filters.search || 
                 this.filters.categoryId || 
                 this.filters.minPrice || 
                 this.filters.maxPrice || 
                 this.filters.sortBy !== 'newest');
    }


    getFirstImage(imageUrl) {
        if (!imageUrl) return null;
        const images = imageUrl.split(',');
        return images[0]?.trim();
    }

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN');
    }

    updateElement(element, content) {
        if (element) {
            element.textContent = content;
        }
    }

    goToProduct(productId) {
        window.location.href = `/Customer/templates/product-detail.html?productId=${productId}`;
    }
    hasActiveFilters() {
        return !!(this.filters.search || 
                 this.filters.categoryId || 
                 this.filters.minPrice || 
                 this.filters.maxPrice || 
                 this.filters.sortBy !== 'newest');
    }

    // ============================================
    // 🎭 UI STATE METHODS
    // ============================================

    showLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('hidden');
        }
        this.isLoading = true;
    }

    hideLoading() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
        this.isLoading = false;
    }

    showProductsLoading() {
        if (this.elements.productsGrid) {
            // Tạo 12 ô loading compact
            const loadingHtml = Array(12).fill().map((_, index) => `
                <div class="product-loading" style="animation-delay: ${index * 0.05}s">
                    <div class="product-loading-image loading-skeleton"></div>
                    <div class="product-loading-content">
                        <div class="product-loading-title loading-skeleton"></div>
                        <div class="product-loading-price loading-skeleton"></div>
                        <div class="product-loading-meta loading-skeleton"></div>
                    </div>
                </div>
            `).join('');
            
            this.elements.productsGrid.innerHTML = loadingHtml;
        }
    }

    showProductsError() {
        if (this.elements.productsGrid) {
            this.elements.productsGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                    <p class="text-red-500 text-lg mb-4">Không thể tải sản phẩm</p>
                    <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" 
                            onclick="window.sellerProfileService.loadProducts()">
                        Thử lại
                    </button>
                </div>
            `;
        }
    }

    showError(message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        if (this.elements.errorModal) {
            this.elements.errorModal.classList.remove('hidden');
        }
        console.error('❌ Error:', message);
    }

    hideError() {
        if (this.elements.errorModal) {
            this.elements.errorModal.classList.add('hidden');
        }
    }
}

// ============================================
// 🌟 AUTO-INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Smooth page entrance
    document.body.style.opacity = '0';
    document.body.style.transform = 'translateY(15px)';
    
    setTimeout(() => {
        document.body.style.transition = 'all 0.5s ease-out';
        document.body.style.opacity = '1';
        document.body.style.transform = 'translateY(0)';
    }, 100);

    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('id') || urlParams.get('sellerId');

    if (!sellerId) {
        console.error('❌ No seller ID provided');
        alert('Không tìm thấy thông tin cửa hàng');
        window.location.href = '/Customer/templates/index.html';
        return;
    }

    const sellerIdInt = parseInt(sellerId);
    if (isNaN(sellerIdInt) || sellerIdInt <= 0) {
        console.error('❌ Invalid seller ID:', sellerId);
        alert('ID cửa hàng không hợp lệ');
        window.location.href = '/Customer/templates/index.html';
        return;
    }

    window.sellerProfileService = new SellerProfileService();
    window.sellerProfileService.init(sellerIdInt);
});