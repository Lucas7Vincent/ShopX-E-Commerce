    /**
 * Seller Statistics Management - Optimized Version
 * Quản lý thống kê cho người bán - Phiên bản tối ưu
 */

class SellerStatistics {
    constructor() {
        this.apiBaseUrl = 'https://localhost:7088/api';
        this.currentPage = 1;
        this.pageSize = 10;
        this.charts = {};
        this.initialized = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        // Khởi tạo ngay khi DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    

    /**
     * Khởi tạo module thống kê
     */
    init() {
        if (this.initialized) return;

        this.loadStatisticsSection();
        this.bindNavigationEvents();
        this.initialized = true;
    }

    /**
     * Bind navigation events
     */
    bindNavigationEvents() {
        const statisticsNav = document.querySelector('[data-section="statistics"]');
        if (statisticsNav && !statisticsNav.hasAttribute('data-stats-bound')) {
            statisticsNav.addEventListener('click', (e) => {
                e.preventDefault();
                this.showStatisticsSection();
            });
            statisticsNav.setAttribute('data-stats-bound', 'true');
        }
    }

    /**
     * Hiển thị section thống kê
     */
    showStatisticsSection() {
        try {
            // Ẩn tất cả sections khác
            document.querySelectorAll('.section').forEach(section => {
                section.classList.remove('active');
            });

            // Hiển thị statistics section
            const statisticsSection = document.getElementById('statistics-section');
            if (statisticsSection) {
                statisticsSection.classList.add('active');
                
                // Update page title
                const pageTitle = document.getElementById('pageTitle');
                if (pageTitle) {
                    pageTitle.textContent = 'Thống kê';
                }
                
                // Load dữ liệu nếu chưa có
                if (!statisticsSection.hasAttribute('data-loaded')) {
                    this.loadAllStatistics();
                    statisticsSection.setAttribute('data-loaded', 'true');
                }
            } else {
                this.createStatisticsSection();
            }
        } catch (error) {
            this.showErrorMessage(`Lỗi hiển thị trang thống kê: ${error.message}`, 'error');
        }
    }

    /**
     * Tạo statistics section nếu chưa có
     */
    createStatisticsSection() {
        const mainContent = document.querySelector('.main-content') || document.querySelector('main') || document.body;
        if (mainContent) {
            const statisticsSection = document.createElement('div');
            statisticsSection.id = 'statistics-section';
            statisticsSection.className = 'section active';
            mainContent.appendChild(statisticsSection);
            
            this.loadStatisticsSection();
        }
    }

    /**
     * Lấy token xác thực từ storage
     */
    getToken() {
        // Method 1: Sử dụng function từ seller.js nếu có
        if (typeof window.getTokenFromSession === 'function') {
            const token = window.getTokenFromSession();
            if (token) return token;
        }
        
        // Method 2: Tìm kiếm token trong session/local storage
        const sessionKeys = ['authToken', 'token', 'accessToken', 'jwt'];
        for (const key of sessionKeys) {
            const token = sessionStorage.getItem(key);
            if (token && this.isValidJWTFormat(token)) return token;
        }
        
        for (const key of sessionKeys) {
            const token = localStorage.getItem(key);
            if (token && this.isValidJWTFormat(token)) return token;
        }
        
        // Fallback: tìm bất kỳ JWT nào trong storage
        for (let i = 0; i < sessionStorage.length; i++) {
            const value = sessionStorage.getItem(sessionStorage.key(i));
            if (value && this.isValidJWTFormat(value)) return value;
        }
        
        for (let i = 0; i < localStorage.length; i++) {
            const value = localStorage.getItem(localStorage.key(i));
            if (value && this.isValidJWTFormat(value)) return value;
        }
        
        return null;
    }

    /**
     * Kiểm tra format JWT hợp lệ
     */
    isValidJWTFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            // Thử decode phần header và payload
            JSON.parse(atob(parts[0]));
            JSON.parse(atob(parts[1]));
            return true;
        } catch (e) {
            return false;
        }
    }


    /**
     * Tạo HTML structure cho section thống kê - UPDATED WITH NEW SECTIONS
     */
    loadStatisticsSection() {
        const statisticsSection = document.getElementById('statistics-section');
        if (!statisticsSection) return;

        statisticsSection.innerHTML = `
            <div class="space-y-6">
                <!-- Debug Info Panel -->
                <div id="debug-info" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4" style="display: none;">
                    <h4 class="font-semibold text-yellow-800 mb-2">🔧 Debug Information</h4>
                    <div id="debug-content" class="text-sm text-yellow-700 whitespace-pre-line"></div>
                </div>

                <!-- Header -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-bold text-gray-900">Thống kê tổng quan</h2>
                            <p class="text-gray-600 mt-1">Theo dõi hiệu suất kinh doanh của cửa hàng</p>
                        </div>
                        <div class="flex space-x-3">
                            
                            <button id="refresh-stats-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                <i class="fas fa-sync-alt mr-2"></i>Làm mới
                            </button>
                            <button id="export-stats-btn" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                                <i class="fas fa-download mr-2"></i>Xuất báo cáo
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Dashboard Overview Cards -->
                <div id="dashboard-overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div class="bg-gray-100 rounded-lg p-6 text-center">
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
                            <div class="h-8 bg-gray-300 rounded w-1/2 mx-auto"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">Đang tải...</p>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-6 text-center">
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
                            <div class="h-8 bg-gray-300 rounded w-1/2 mx-auto"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">Đang tải...</p>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-6 text-center">
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
                            <div class="h-8 bg-gray-300 rounded w-1/2 mx-auto"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">Đang tải...</p>
                    </div>
                    <div class="bg-gray-100 rounded-lg p-6 text-center">
                        <div class="animate-pulse">
                            <div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-2"></div>
                            <div class="h-8 bg-gray-300 rounded w-1/2 mx-auto"></div>
                        </div>
                        <p class="text-sm text-gray-500 mt-2">Đang tải...</p>
                    </div>
                </div>

                <!-- Order Status Stats -->
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-lg font-semibold">Thống kê đơn hàng theo trạng thái</h3>
                        <div class="flex space-x-2">
                            <button class="text-sm text-blue-600 hover:text-blue-800" onclick="window.statisticsManager?.refreshOrderStatus()">
                                <i class="fas fa-refresh mr-1"></i>Làm mới
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" id="order-status-stats">
                        <div class="bg-gray-100 rounded-lg p-4 text-center">
                            <div class="animate-pulse">
                                <div class="h-6 w-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
                                <div class="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
                                <div class="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                            </div>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4 text-center">
                            <div class="animate-pulse">
                                <div class="h-6 w-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
                                <div class="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
                                <div class="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                            </div>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4 text-center">
                            <div class="animate-pulse">
                                <div class="h-6 w-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
                                <div class="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
                                <div class="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                            </div>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4 text-center">
                            <div class="animate-pulse">
                                <div class="h-6 w-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
                                <div class="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
                                <div class="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                            </div>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4 text-center">
                            <div class="animate-pulse">
                                <div class="h-6 w-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
                                <div class="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
                                <div class="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                            </div>
                        </div>
                        <div class="bg-gray-100 rounded-lg p-4 text-center">
                            <div class="animate-pulse">
                                <div class="h-6 w-6 bg-gray-300 rounded-full mx-auto mb-2"></div>
                                <div class="h-6 bg-gray-300 rounded w-8 mx-auto mb-1"></div>
                                <div class="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Revenue Chart and Top Products -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <!-- Revenue Chart - 7 Days -->
                    <div class="lg:col-span-2 bg-white rounded-lg shadow p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold">Doanh thu gần đây</h3>
                            <select id="revenue-period" class="border border-gray-300 rounded px-3 py-1 text-sm">
                                <option value="7">7 ngày</option>
                                <option value="30">30 ngày</option>
                                <option value="90">3 tháng</option>
                            </select>
                        </div>
                        <div class="h-80 flex items-center justify-center bg-gray-100 rounded" id="revenue-chart-container">
                            <canvas id="revenue-chart" width="400" height="250"></canvas>
                        </div>
                    </div>

                    <!-- Top Products -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <h3 class="text-lg font-semibold mb-4">Sản phẩm bán chạy</h3>
                        <div id="top-products-list" class="space-y-4">
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>Đang tải...</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- NEW: Top Customers and Profit Analysis Section -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Top Customers -->
                    <div class="bg-white rounded-lg shadow p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold flex items-center">
                                <i class="fas fa-users text-blue-600 mr-2"></i>
                                Khách hàng VIP
                            </h3>
                            <button class="text-sm text-blue-600 hover:text-blue-800" onclick="window.statisticsManager?.loadTopCustomers()">
                                <i class="fas fa-refresh mr-1"></i>Làm mới
                            </button>
                        </div>
                        <div id="top-customers-list" class="space-y-3">
                            <div class="text-center text-gray-500 py-8">
                                <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
                                <p>Đang tải...</p>
                            </div>
                        </div>
                    </div>

                    <!-- Profit Analysis -->
<div class="bg-white rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold flex items-center">
            <i class="fas fa-chart-pie text-green-600 mr-2"></i>
            Phân tích lợi nhuận
        </h3>
        <div class="flex items-center space-x-2">
            <div class="flex items-center space-x-2 text-sm">
                <label for="profit-start-date" class="text-gray-600">Từ:</label>
                <input type="date" id="profit-start-date" class="border border-gray-300 rounded px-2 py-1 text-sm">
                <label for="profit-end-date" class="text-gray-600">Đến:</label>
                <input type="date" id="profit-end-date" class="border border-gray-300 rounded px-2 py-1 text-sm">
            </div>
            <button id="profit-filter-btn" class="text-sm text-green-600 hover:text-green-800 bg-green-50 px-3 py-1 rounded">
                <i class="fas fa-filter mr-1"></i>Lọc
            </button>
            <button class="text-sm text-green-600 hover:text-green-800" onclick="window.statisticsManager?.loadProfitAnalysis()">
                <i class="fas fa-refresh mr-1"></i>Làm mới
            </button>
        </div>
    </div>
    <div id="profit-analysis-container">
        <div class="text-center text-gray-500 py-8">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Đang tải...</p>
        </div>
    </div>
</div>

                <!-- Loading Overlay -->
                <div id="stats-loading" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                    <div class="bg-white rounded-lg p-6 flex items-center space-x-3">
                        <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span class="text-gray-700">Đang tải dữ liệu thống kê...</span>
                    </div>
                </div>

                <!-- Modal Chi tiết đơn hàng theo trạng thái -->
                <!-- Modal Chi tiết đơn hàng theo trạng thái -->
            <div id="order-details-modal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] hidden">
                <!-- ✅ FIXED: Proper centering with flex -->
                <div class="flex items-center justify-center min-h-screen p-4">
                    <!-- ✅ FIXED: Proper width constraints and centering -->
                    <div class="bg-white rounded-lg shadow-xl w-full max-w-7xl mx-auto max-h-[95vh] overflow-hidden">
                        <!-- Modal Header -->
                        <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                            <h3 class="text-xl font-semibold text-white" id="modal-title">Chi tiết đơn hàng</h3>
                            <button onclick="window.statisticsManager?.closeOrderDetailsModal()" 
                                    class="text-white hover:text-gray-200 transition-colors">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        
                        <!-- Modal Body - FIXED Scrolling -->
                        <div class="overflow-y-auto max-h-[calc(95vh-140px)]">
                            <div id="order-details-content" class="p-6">
                                <!-- Content sẽ được load động -->
                                <div class="text-center py-12">
                                    <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
                                    <p class="text-gray-600">Đang tải dữ liệu...</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Modal Footer -->
                        <div class="bg-gray-50 px-6 py-4 flex justify-center md:justify-end space-x-3 border-t">
                            
                            <button onclick="window.statisticsManager?.closeOrderDetailsModal()" 
                                    class="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>

                <style>
                    /* ===== MODAL STYLES - ENHANCED FIX ===== */
                    body.modal-open {
                        overflow: hidden !important;
                    }

                    /* ✅ FIXED: Modal positioning override - HIGHEST PRIORITY */
                    #order-details-modal {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100vw !important;
                        height: 100vh !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        transform: none !important;
                        z-index: 999999 !important;
                        background-color: rgba(0, 0, 0, 0.5) !important;
                    }

                    #order-details-modal.hidden {
                        display: none !important;
                    }

                    #order-details-modal:not(.hidden) {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }

                    /* ✅ CRITICAL: Override .content margin-left effect */
                    #order-details-modal,
                    #order-details-modal * {
                        margin-left: 0 !important;
                        left: 0 !important;
                        right: 0 !important;
                        transform: none !important;
                    }

                    /* ✅ ENSURE MODAL CONTAINER KHÔNG BỊ SIDEBAR AFFECT */
                    #order-details-modal > div {
                        position: relative !important;
                        margin: 0 auto !important;
                        width: 100% !important;
                        max-width: none !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        min-height: 100vh !important;
                        padding: 20px !important;
                        box-sizing: border-box !important;
                    }

                    #order-details-modal > div > div {
                        margin: 0 auto !important;
                        max-width: 1200px !important;
                        width: 100% !important;
                    }

                    /* ===== PRODUCT ITEM TABLE FIXES - COMPLETE OVERHAUL ===== */
                    .product-item-card {
                        border: 1px solid #e5e7eb !important;
                        border-radius: 0.5rem !important;
                        padding: 1rem !important;
                        margin-bottom: 0.75rem !important;
                        background: white !important;
                        transition: all 0.2s ease !important;
                        overflow: hidden !important;
                    }

                    .product-item-card:hover {
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                        border-color: #d1d5db !important;
                    }

                    /* ✅ FIXED: Product layout container */
                    .product-item-card .flex {
                        display: flex !important;
                        align-items: center !important;
                        gap: 1rem !important;
                        width: 100% !important;
                    }

                    /* ✅ FIXED: Product image container */
                    .product-item-card .flex-shrink-0 {
                        flex-shrink: 0 !important;
                        width: 64px !important;
                        height: 64px !important;
                    }

                    /* ✅ FIXED: Product info section */
                    .product-item-card .flex-1 {
                        flex: 1 !important;
                        min-width: 0 !important;
                        padding-right: 1rem !important;
                    }

                    /* ✅ CRITICAL FIX: Pricing table container */
                    .product-item-card .flex-shrink-0:last-child {
                        flex-shrink: 0 !important;
                        width: auto !important;
                        min-width: 280px !important;
                        max-width: 320px !important;
                    }

                    /* ✅ FIXED: Table structure */
                    .product-item-card table {
                        width: 100% !important;
                        table-layout: fixed !important;
                        border-collapse: separate !important;
                        border-spacing: 0 !important;
                        border: 1px solid #e5e7eb !important;
                        border-radius: 0.5rem !important;
                        overflow: hidden !important;
                        background: white !important;
                        min-width: 280px !important;
                    }

                    /* ✅ FIXED: Table headers */
                    .product-item-card table thead {
                        background-color: #f9fafb !important;
                    }

                    .product-item-card table th {
                        padding: 0.75rem 1rem !important;
                        text-align: center !important;
                        font-size: 0.75rem !important;
                        font-weight: 600 !important;
                        color: #374151 !important;
                        text-transform: uppercase !important;
                        letter-spacing: 0.05em !important;
                        border-bottom: 2px solid #e5e7eb !important;
                        border-right: 1px solid #e5e7eb !important;
                        white-space: nowrap !important;
                        vertical-align: middle !important;
                        width: 33.333% !important;
                    }

                    .product-item-card table th:last-child {
                        border-right: none !important;
                    }

                    /* ✅ FIXED: Table cells */
                    .product-item-card table td {
                        padding: 0.75rem 1rem !important;
                        text-align: center !important;
                        font-size: 0.875rem !important;
                        font-weight: 500 !important;
                        color: #111827 !important;
                        border-right: 1px solid #f3f4f6 !important;
                        white-space: nowrap !important;
                        vertical-align: middle !important;
                        width: 33.333% !important;
                        background: white !important;
                    }

                    .product-item-card table td:last-child {
                        border-right: none !important;
                        color: #2563eb !important;
                        font-weight: 700 !important;
                    }

                    /* ✅ SPECIFIC COLUMN WIDTHS */
                    .product-item-card table th:nth-child(1),
                    .product-item-card table td:nth-child(1) {
                        width: 25% !important;
                        min-width: 60px !important;
                    }

                    .product-item-card table th:nth-child(2),
                    .product-item-card table td:nth-child(2) {
                        width: 40% !important;
                        min-width: 100px !important;
                    }

                    .product-item-card table th:nth-child(3),
                    .product-item-card table td:nth-child(3) {
                        width: 35% !important;
                        min-width: 120px !important;
                    }

                    /* ===== RESPONSIVE MOBILE FIXES ===== */
                    @media (max-width: 768px) {
                        #order-details-modal > div {
                            padding: 10px !important;
                        }

                        #order-details-modal > div > div {
                            max-width: 100vw !important;
                            max-height: 95vh !important;
                        }

                        .product-item-card {
                            padding: 0.75rem !important;
                            margin-bottom: 0.5rem !important;
                        }

                        .product-item-card .flex {
                            flex-direction: column !important;
                            align-items: stretch !important;
                            gap: 0.75rem !important;
                        }

                        .product-item-card .flex-1 {
                            padding-right: 0 !important;
                            text-align: center !important;
                        }

                        .product-item-card .flex-shrink-0:last-child {
                            width: 100% !important;
                            min-width: auto !important;
                            max-width: none !important;
                        }

                        .product-item-card table {
                            min-width: 100% !important;
                            font-size: 0.8125rem !important;
                        }

                        .product-item-card table th,
                        .product-item-card table td {
                            padding: 0.5rem 0.25rem !important;
                            font-size: 0.75rem !important;
                        }
                    }

                    /* ===== ORDER CARD FIXES ===== */
                    .order-card {
                        border: 1px solid #e5e7eb !important;
                        border-radius: 0.5rem !important;
                        transition: all 0.2s ease !important;
                        margin-bottom: 1rem !important;
                        background: white !important;
                        overflow: hidden !important;
                    }

                    .order-card:hover {
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                        border-color: #d1d5db !important;
                    }

                    /* ===== GENERAL LAYOUT FIXES ===== */
                    #order-details-content {
                        max-width: none !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 1.5rem !important;
                    }

                    /* ===== PREVENT TEXT OVERFLOW ===== */
                    .product-item-card .truncate {
                        overflow: hidden !important;
                        text-overflow: ellipsis !important;
                        white-space: nowrap !important;
                    }

                    /* ===== ENSURE PROPER FLEXBOX BEHAVIOR ===== */
                    .product-item-card .space-x-4 > * + * {
                        margin-left: 1rem !important;
                    }
                </style>
            </div>
        </div>
    
        `;

        // Bind events cho các buttons sau khi HTML được tạo
        setTimeout(() => this.bindStatisticsEvents(), 100);
    }
    /**
     * Bind events cho statistics section
     */
    bindStatisticsEvents() {
        // Debug toggle button
        // const debugBtn = document.getElementById('debug-toggle-btn');
        // if (debugBtn && !debugBtn.hasAttribute('data-bound')) {
        //     debugBtn.addEventListener('click', () => this.toggleDebugInfo());
        //     debugBtn.setAttribute('data-bound', 'true');
        // }
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-stats-btn');
        if (refreshBtn && !refreshBtn.hasAttribute('data-bound')) {
            refreshBtn.addEventListener('click', () => {
                this.retryCount = 0;
                this.loadAllStatistics();
            });
            refreshBtn.setAttribute('data-bound', 'true');
        }

        // Export button
        const exportBtn = document.getElementById('export-stats-btn');
        if (exportBtn && !exportBtn.hasAttribute('data-bound')) {
            exportBtn.addEventListener('click', () => {
                this.exportStatistics();
            });
            exportBtn.setAttribute('data-bound', 'true');
        }

        // Revenue period change
        const revenuePeriod = document.getElementById('revenue-period');
        if (revenuePeriod && !revenuePeriod.hasAttribute('data-bound')) {
            revenuePeriod.addEventListener('change', () => {
                this.loadRevenueStats();
            });
            revenuePeriod.setAttribute('data-bound', 'true');
        }
    //const profitFilterBtn = document.getElementById('profit-filter-btn');
    const profitFilterBtn = document.getElementById('profit-filter-btn');
    if (profitFilterBtn && !profitFilterBtn.hasAttribute('data-bound')) {
        profitFilterBtn.addEventListener('click', () => {
            const startDate = document.getElementById('profit-start-date')?.value;
            const endDate = document.getElementById('profit-end-date')?.value;
            this.loadProfitAnalysisWithDates(startDate, endDate);
        });
        profitFilterBtn.setAttribute('data-bound', 'true');
    }

    // Set default dates
    this.setDefaultProfitDates();
    }
    setDefaultProfitDates() {
        const startDateInput = document.getElementById('profit-start-date');
        const endDateInput = document.getElementById('profit-end-date');
        
        if (startDateInput && endDateInput) {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            startDateInput.value = firstDayOfMonth.toISOString().split('T')[0];
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }
    /**
     * Toggle debug information panel
     */
    toggleDebugInfo() {
        const debugPanel = document.getElementById('debug-info');
        const debugContent = document.getElementById('debug-content');
        
        if (debugPanel && debugContent) {
            if (debugPanel.style.display === 'none') {
                debugPanel.style.display = 'block';
                this.updateDebugInfo();
            } else {
                debugPanel.style.display = 'none';
            }
        }
    }

    /**
     * Update debug information
     */
    updateDebugInfo() {
        const debugContent = document.getElementById('debug-content');
        if (!debugContent) return;

        const token = this.getToken();
        let tokenInfo = 'No token found';
        
        // Show all storage keys for debugging
        const sessionKeys = [];
        const localKeys = [];
        
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            sessionKeys.push(`${key}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null'}`);
        }
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            localKeys.push(`${key}: ${value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'null'}`);
        }
        
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const expiry = new Date(payload.exp * 1000);
                const now = new Date();
                
                tokenInfo = `Token exists: Yes
Expires: ${expiry.toLocaleString()}
Is expired: ${expiry < now ? 'YES' : 'NO'}
Claims: ${Object.keys(payload).join(', ')}
Token preview: ${token.substring(0, 30)}...
User ID: ${payload.sub || payload.userId || payload.nameid || 'Not found'}
Seller ID: ${payload.SellerId || payload.sellerId || 'Not found'}
Role: ${payload.role || payload.Role || 'Not found'}`;
            } catch (e) {
                tokenInfo = `Invalid token format: ${e.message}`;
            }
        }

        debugContent.textContent = `🌐 API Base URL: ${this.apiBaseUrl}

🔑 Token Info:
${tokenInfo}

📦 SessionStorage (${sessionStorage.length} items):
${sessionKeys.join('\n')}

📦 LocalStorage (${localStorage.length} items):
${localKeys.join('\n')}

🔄 Retry Count: ${this.retryCount}/${this.maxRetries}
⏰ Last Request: ${new Date().toLocaleTimeString()}`;
    }
    /**
     * Load tất cả dữ liệu thống kê - UPDATED WITH NEW ENDPOINTS
     */
    async loadAllStatistics() {
        this.showLoading();
        
        try {
            // Update debug info
            this.updateDebugInfo();
            
            const promises = [
                this.loadDashboardStats().catch(err => ({ error: 'dashboard', message: err.message })),
                this.loadOrderStatusStats().catch(err => ({ error: 'orderStatus', message: err.message })),
                this.loadRevenueStats().catch(err => ({ error: 'revenue', message: err.message })),
                this.loadTopProducts().catch(err => ({ error: 'topProducts', message: err.message })),
                this.loadTopCustomers().catch(err => ({ error: 'topCustomers', message: err.message })), // NEW
                this.loadProfitAnalysis().catch(err => ({ error: 'profitAnalysis', message: err.message })) // NEW
            ];

            const results = await Promise.allSettled(promises);
            
            // Check for errors
            const errors = results.filter(result => 
                result.status === 'rejected' || 
                (result.status === 'fulfilled' && result.value?.error)
            );

            if (errors.length > 0) {
                this.showPartialLoadMessage(errors.length, results.length);
            } else {
                this.retryCount = 0;
            }
        } catch (error) {
            this.handleLoadError(error);
        } finally {
            this.hideLoading();
        }
    }


    /**
     * Show partial load message
     */
    showPartialLoadMessage(errorCount, totalCount) {
        const successCount = totalCount - errorCount;
        this.showErrorMessage(
            `Đã tải được ${successCount}/${totalCount} mục thống kê. Một số dữ liệu có thể chưa hiển thị.`,
            'warning'
        );
    }

    /**
     * Handle load errors with retry logic
     */
    handleLoadError(error) {
        if (this.retryCount < this.maxRetries && !error.message.includes('xác thực')) {
            this.retryCount++;
            setTimeout(() => this.loadAllStatistics(), 2000 * this.retryCount);
        } else {
            this.showErrorMessage(`Lỗi tải dữ liệu: ${error.message}`, 'error');
        }
    }

    /**
     * Make API request
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        const token = this.getToken();
        
        if (!token) {
            this.handleAuthError();
            throw new Error('Không tìm thấy token xác thực');
        }

        // Validate token format
        if (!this.isValidJWTFormat(token)) {
            this.handleAuthError();
            throw new Error('Token không hợp lệ');
        }

        // Check if token is expired
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = new Date(payload.exp * 1000);
            const now = new Date();
            
            if (expiry < now) {
                this.handleAuthError();
                throw new Error('Token đã hết hạn');
            }
        } catch (e) {
            this.handleAuthError();
            throw new Error('Token không thể phân tích được');
        }

        const config = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const fullUrl = `${this.apiBaseUrl}${endpoint}`;

        try {
            const response = await fetch(fullUrl, config);
            
            if (!response.ok) {
                const errorText = await response.text();
                
                if (response.status === 401) {
                    this.showLoginOption();
                    throw new Error(`Không có quyền truy cập (401): ${errorText}`);
                } else if (response.status === 403) {
                    throw new Error(`Không có quyền (403): ${errorText}`);
                } else if (response.status === 404) {
                    throw new Error(`Không tìm thấy API (404): ${endpoint}`);
                } else if (response.status === 500) {
                    throw new Error(`Lỗi server (500): ${errorText}`);
                } else {
                    throw new Error(`Lỗi HTTP ${response.status}: ${errorText}`);
                }
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = `Không thể kết nối tới server: ${this.apiBaseUrl}`;
                throw new Error(networkError);
            } else {
                throw error;
            }
        }
    }

    /**
     * Handle authentication errors
     */
    handleAuthError() {
        this.showErrorMessage('Token xác thực không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.', 'warning');
        this.showLoginOption();
    }

    /**
     * Show login option
     */
    showLoginOption() {
        const container = document.getElementById('order-status-stats');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <i class="fas fa-exclamation-triangle text-yellow-500 text-2xl mb-2"></i>
                    <h4 class="text-yellow-700 font-semibold mb-1">Cần đăng nhập lại</h4>
                    <p class="text-yellow-600 text-sm mb-3">Token xác thực không hợp lệ hoặc đã hết hạn</p>
                    <div class="space-x-2">
                        <button onclick="window.statisticsManager?.debugTokenStorage()" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
                            <i class="fas fa-search mr-1"></i>Kiểm tra Token
                        </button>
                        <button onclick="window.statisticsManager?.refreshOrderStatus()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
                            <i class="fas fa-retry mr-1"></i>Thử lại
                        </button>
                        <button onclick="window.location.href='/Customer/templates/login.html'" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                            <i class="fas fa-sign-in-alt mr-1"></i>Đăng nhập lại
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Debug token storage
     */
    debugTokenStorage() {
        // Update debug panel
        const debugPanel = document.getElementById('debug-info');
        if (debugPanel) {
            debugPanel.style.display = 'block';
            this.updateDebugInfo();
        }
    }

    // ============= API METHODS =============

    /**
     * Load dashboard statistics
     */
    async loadDashboardStats() {
        try {
            const response = await this.makeRequest('/Statistics/dashboard', 'GET');
            if (response) {
                this.renderDashboardOverview(response);
            } else {
                throw new Error('No response from dashboard API');
            }
        } catch (error) {
            this.renderDashboardError(error.message);
            throw error;
        }
    }

    /**
     * Load order status statistics
     */
    async loadOrderStatusStats() {
        try {
            const response = await this.makeRequest('/Statistics/order-status', 'GET');
            if (response) {
                this.renderOrderStatusStats(response);
            } else {
                throw new Error('No response from order-status API');
            }
        } catch (error) {
            this.renderOrderStatusError(error.message);
            throw error;
        }
    }

  /**
 * Load revenue stats - SỬA DỤNG API MỚI revenue-chart với dữ liệu debug
 */
async loadRevenueStats() {
    try {
        // Lấy giá trị từ selector
        const periodSelect = document.getElementById('revenue-period');
        const days = periodSelect ? parseInt(periodSelect.value) : 7;
        
        console.log(`Đang gọi API biểu đồ doanh thu với ${days} ngày`);
        
        // Hiển thị loading trong container
        const container = document.getElementById('revenue-chart-container');
        if (container) {
            container.innerHTML = `
                <div class="flex items-center justify-center h-full">
                    <div class="text-center">
                        <svg class="animate-spin h-10 w-10 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p class="text-gray-600">Đang tải dữ liệu doanh thu...</p>
                    </div>
                </div>
            `;
        }
        await ensureChartJsLoaded();
        
        // Gọi API
        let response;
        try {
            // First try: revenue-chart endpoint (new)
            response = await this.makeRequest(`/Statistics/revenue-chart?days=${days}`, 'GET');
            console.log('Phản hồi từ revenue-chart endpoint:', response);
        } catch (err) {
            console.warn('Không thể gọi revenue-chart, thử fallback:', err);
            
            try {
                // Second try: revenue endpoint (fallback)
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                
                const start = startDate.toISOString().split('T')[0];
                const end = endDate.toISOString().split('T')[0];
                
                response = await this.makeRequest(
                    `/Statistics/revenue?startDate=${start}&endDate=${end}&groupBy=day`, 
                    'GET'
                );
                console.log('Phản hồi từ revenue endpoint:', response);
            } catch (secondErr) {
                console.error('Cả hai endpoint đều không khả dụng:', secondErr);
                
                // Tạo dữ liệu mẫu để tránh lỗi giao diện
                response = this.generateDummyRevenueData(days);
                console.log('Đã tạo dữ liệu mẫu:', response);
            }
        }
        
        // Kiểm tra phản hồi
        if (response) {
            // Tái tạo canvas để tránh lỗi
            container.innerHTML = `<canvas id="revenue-chart" width="400" height="250"></canvas>`;
            
            // Render chart
            this.renderRevenueChart(response);
        } else {
            throw new Error('Không nhận được phản hồi từ API biểu đồ doanh thu');
        }
    } catch (error) {
        console.error('Error loading revenue stats:', error);
        this.renderRevenueChartError(error.message);
    }
}

/**
 * Generate dummy revenue data for fallback
 */
generateDummyRevenueData(days) {
    const endDate = new Date();
    const items = [];
    
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(endDate);
        date.setDate(date.getDate() - i);
        
        items.push({
            date: date.toISOString().split('T')[0],
            revenue: Math.floor(Math.random() * 5000000) + 1000000, // 1-6 triệu
            ordersCount: Math.floor(Math.random() * 5) + 1 // 1-5 đơn
        });
    }
    
    return {
        items: items,
        totalRevenue: items.reduce((sum, item) => sum + item.revenue, 0),
        totalOrders: items.reduce((sum, item) => sum + item.ordersCount, 0)
    };
}   /**
     * Load top selling products - FIX: Sử dụng đúng endpoint và params
     */
    async loadTopProducts() {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const endDate = new Date();

            const params = new URLSearchParams({
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                limit: '5'
            });

            const response = await this.makeRequest(`/Statistics/top-products?${params}`, 'GET');
            if (response) {
                this.renderTopProducts(response);
            } else {
                throw new Error('No response from top-products API');
            }
        } catch (error) {
            this.renderTopProductsError(error.message);
            throw error;
        }
    }

    // ============= RENDER METHODS =============

    /**
     * Render dashboard overview cards
     */
    renderDashboardOverview(response) {
        const container = document.getElementById('dashboard-overview');
        if (!container) return;
    
        // ✅ Extract data và insights từ response
        const data = response.data || response;
        const insights = response.insights || {};
        
        console.log('📊 Dashboard response with insights:', { data, insights });
    
        const cards = [
            {
                title: 'Tổng doanh thu',
                value: this.formatCurrency(data.totalRevenue || 0),
                icon: 'fas fa-wallet',
                color: 'blue',
                change: data.revenueTrendPercentage ? `${data.revenueTrendPercentage.toFixed(1)}%` : null,
                subtitle: 'Từ đơn hàng hoàn thành', // ✅ CLARIFICATION từ backend
                // ✅ THÊM: Insight từ backend
                insight: insights.trendExplanation || null
            },
            {
                title: 'Tổng đơn hàng',
                value: (data.totalOrderCount || 0).toLocaleString(),
                icon: 'fas fa-shopping-bag',
                color: 'green',
                change: data.orderTrendPercentage ? `${data.orderTrendPercentage.toFixed(1)}%` : null,
                subtitle: `${data.ordersNeedingAttention || 0} cần xử lý`,
                // ✅ THÊM: Action insight
                actionNeeded: data.ordersNeedingAttention > 0
            },
            {
                title: 'Tổng sản phẩm',
                value: (data.totalProductCount || 0).toLocaleString(),
                icon: 'fas fa-box-open',
                color: 'purple',
                subtitle: `${data.availableProductCount || 0} có sẵn`,
                // ✅ THÊM: Stock warning
                stockWarning: data.outOfStockProductCount > 0 ? 
                    `${data.outOfStockProductCount} hết hàng` : null
            },
            {
                title: 'Doanh thu tháng này',
                value: this.formatCurrency(data.revenueThisMonth || 0),
                icon: 'fas fa-chart-line',
                color: 'indigo',
                change: data.monthlyTrendPercentage ? `${data.monthlyTrendPercentage.toFixed(1)}%` : null,
                subtitle: `Tỷ lệ hoàn thành: ${data.orderCompletionRate?.toFixed(1) || 0}%`,
                // ✅ THÊM: Revenue status từ backend
                revenueStatus: insights.revenueStatus || null
            }
        ];
    
        container.innerHTML = cards.map(card => `
            <div class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${card.actionNeeded ? 'border-l-4 border-orange-500' : ''}">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <p class="text-gray-500 text-sm font-medium">${card.title}</p>
                        <h3 class="text-2xl font-bold mt-2 text-gray-900">${card.value}</h3>
                        ${card.subtitle ? `<p class="text-sm text-gray-600 mt-1">${card.subtitle}</p>` : ''}
                        
                        <!-- ✅ THÊM: Hiển thị insights từ backend -->
                        ${card.insight ? `
                            <div class="mt-2 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                                <i class="fas fa-info-circle mr-1"></i>${card.insight}
                            </div>
                        ` : ''}
                        
                        ${card.stockWarning ? `
                            <div class="mt-2 text-xs text-red-700 bg-red-50 px-2 py-1 rounded-lg">
                                <i class="fas fa-exclamation-triangle mr-1"></i>${card.stockWarning}
                            </div>
                        ` : ''}
                        
                        ${card.revenueStatus ? `
                            <div class="mt-2 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">
                                <i class="fas fa-chart-line mr-1"></i>Xu hướng: ${card.revenueStatus}
                            </div>
                        ` : ''}
                        
                        ${card.change ? `
                            <p class="text-sm mt-2 ${parseFloat(card.change) >= 0 ? 'text-green-600' : 'text-red-600'}">
                                <i class="fas fa-arrow-${parseFloat(card.change) >= 0 ? 'up' : 'down'} mr-1"></i>
                                ${card.change}
                            </p>
                        ` : ''}
                    </div>
                    <div class="bg-${card.color}-100 p-3 rounded-full">
                        <i class="${card.icon} text-${card.color}-600 text-xl"></i>
                    </div>
                </div>
            </div>
        `).join('');
    
        // ✅ THÊM: Hiển thị action items từ backend
        this.renderActionItems(insights.actionItems || []);
    }
    
    renderActionItems(actionItems) {
        if (!actionItems || actionItems.length === 0) return;
        
        const container = document.getElementById('dashboard-overview');
        if (!container) return;
        
        // Thêm action items dưới cards
        const actionItemsHtml = `
            <div class="col-span-full bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0">
                        <i class="fas fa-tasks text-yellow-600 text-lg mt-1"></i>
                    </div>
                    <div class="flex-1">
                        <h4 class="text-yellow-800 font-semibold mb-2">Cần xử lý</h4>
                        <ul class="space-y-1">
                            ${actionItems.map(item => `
                                <li class="text-yellow-700 text-sm">
                                    <i class="fas fa-chevron-right mr-2 text-xs"></i>${item}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', actionItemsHtml);
    }
    /**
     * Render dashboard error
     */
    renderDashboardError(errorMessage) {
        const container = document.getElementById('dashboard-overview');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                <h4 class="text-red-700 font-semibold mb-1">Lỗi tải dashboard</h4>
                <p class="text-red-600 text-sm mb-3">${errorMessage}</p>
                <button onclick="window.statisticsManager?.loadDashboardStats()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                    <i class="fas fa-retry mr-1"></i>Thử lại
                </button>
            </div>
        `;
    }

    /**
     * Render order status statistics
     */
    renderOrderStatusStats(data) {
        const container = document.getElementById('order-status-stats');
        if (!container) return;
    
        // ✅ FIXED: statusConfig CHÍNH XÁC với backend bao gồm trạng thái mới
        const statusConfig = [
            { 
                key: 'pending', 
                label: 'Chờ xác nhận', 
                icon: 'fas fa-clock', 
                color: 'yellow',
                backendField: 'pending',
                dbStatuses: ['Chờ xác nhận']
            },
            { 
                key: 'processing', 
                label: 'Đang xử lý', 
                icon: 'fas fa-cog', 
                color: 'blue',
                backendField: 'processing',
                dbStatuses: ['Đang xử lý']
            },
            { 
                key: 'shipping', 
                label: 'Đang giao', 
                icon: 'fas fa-truck', 
                color: 'indigo',
                backendField: 'shipping',
                dbStatuses: ['Đang giao']
            },
            { 
                key: 'delivered', 
                label: 'Đã giao', 
                icon: 'fas fa-check-circle', 
                color: 'green',
                backendField: 'delivered',
                dbStatuses: ['Đã giao']
            },
            { 
                key: 'refundRequested', 
                label: 'Yêu cầu hoàn tiền', 
                icon: 'fas fa-exclamation-triangle', 
                color: 'orange',
                backendField: 'refundRequested',
                dbStatuses: ['Yêu cầu trả hàng/ hoàn tiền']
            },
            { 
                key: 'refundRejected', 
                label: 'Từ chối hoàn tiền', 
                icon: 'fas fa-ban', 
                color: 'gray',
                backendField: 'refundRejected',  // ✅ THÊM MỚI
                dbStatuses: ['Từ chối hoàn tiền']
            },
            { 
                key: 'refunded', 
                label: 'Đã hoàn tiền', 
                icon: 'fas fa-undo', 
                color: 'purple',
                backendField: 'refunded',
                dbStatuses: ['Đã hoàn tiền']
            },
            { 
                key: 'cancelled', 
                label: 'Đã hủy', 
                icon: 'fas fa-times-circle', 
                color: 'red',
                backendField: 'cancelled',
                dbStatuses: ['Đã hủy']
            }
        ];
    
        try {
            console.log('📊 Rendering order status stats with data:', data);
    
            // ✅ FIXED: Truy cập field chính xác từ response
            const actualData = data.data || data;
            console.log('📊 Actual data structure:', actualData);
    
            container.innerHTML = statusConfig.map(status => {
                // ✅ FIXED: Lấy value với fallback an toàn
                const count = actualData[status.backendField] || 0;
                const isClickable = count > 0;
                
                console.log(`📊 Status ${status.key}: ${status.backendField} = ${count}`);
    
                return `
                    <div class="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow ${isClickable ? 'cursor-pointer' : ''}" 
                         ${isClickable ? `onclick="window.statisticsManager?.showOrderDetailsByStatus('${status.key}', '${status.label}', ${JSON.stringify(status.dbStatuses).replace(/"/g, '&quot;')})"` : ''}>
                        <div class="flex items-center justify-between mb-2">
                            <div class="bg-${status.color}-100 p-2 rounded-full">
                                <i class="${status.icon} text-${status.color}-600"></i>
                            </div>
                            ${isClickable ? '<i class="fas fa-external-link-alt text-gray-400 text-sm"></i>' : ''}
                        </div>
                        <div class="text-center">
                            <h3 class="text-2xl font-bold text-gray-900 mb-1">${count.toLocaleString()}</h3>
                            <p class="text-sm text-gray-600">${status.label}</p>
                            ${isClickable ? '<p class="text-xs text-blue-600 mt-1">Click để xem chi tiết</p>' : ''}
                        </div>
                    </div>
                `;
            }).join('');
    
            console.log('✅ Order status stats rendered successfully');
        } catch (error) {
            console.error('❌ Error rendering order status stats:', error);
            this.renderOrderStatusError(`Lỗi hiển thị: ${error.message}`);
        }
    }
    
    /**
     * Render order status error
     */
    renderOrderStatusError(errorMessage = 'Unknown error') {
        const container = document.getElementById('order-status-stats');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                <h4 class="text-red-700 font-semibold mb-1">Lỗi tải trạng thái đơn hàng</h4>
                <p class="text-red-600 text-sm mb-3">${errorMessage}</p>
                <div class="space-x-2">
                    <button onclick="window.statisticsManager?.refreshOrderStatus()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                        <i class="fas fa-retry mr-1"></i>Thử lại
                    </button>
                    <button onclick="window.statisticsManager?.debugTokenStorage()" class="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition text-sm">
                        <i class="fas fa-bug mr-1"></i>Debug
                    </button>
                </div>
            </div>
        `;
    }

  
    
    /**
 * Render revenue chart - Xử lý tất cả các cấu trúc dữ liệu có thể có
 */
    renderRevenueChart(data) {
        console.log('🎨 renderRevenueChart() called with data:', data);
        
        const container = document.getElementById('revenue-chart-container');
        if (!container) {
            console.error('❌ Container revenue-chart-container not found');
            return;
        }
    
        // Kiểm tra Chart.js
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js chưa được tải');
            container.innerHTML = `
                <div class="text-center text-yellow-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                    <p class="mb-2">Thư viện Chart.js chưa được tải</p>
                    <p class="text-sm text-gray-600 mb-4">Vui lòng thêm thư viện Chart.js vào trang</p>
                    <button onclick="window.location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition text-sm">
                        <i class="fas fa-refresh mr-1"></i>Tải lại trang
                    </button>
                </div>
            `;
            return;
        }
        
        // Chuẩn hóa dữ liệu
        let dataItems = [];
        
        if (Array.isArray(data)) {
            dataItems = data;
        } else if (data && data.dailyData && Array.isArray(data.dailyData)) {
            dataItems = data.dailyData;
        } else if (data && data.items && Array.isArray(data.items)) {
            dataItems = data.items;
        } else {
            console.warn('⚠️ Không thể nhận diện cấu trúc dữ liệu:', data);
            dataItems = [];
        }
        
        if (!dataItems || !dataItems.length) {
            console.warn('⚠️ Không có dữ liệu để hiển thị');
            container.innerHTML = `
                <div class="text-center text-gray-500">
                    <i class="fas fa-chart-line text-4xl mb-4"></i>
                    <p>Không có dữ liệu doanh thu</p>
                    <p class="text-sm mt-2">Có thể do không có đơn hàng "Đã giao" hoặc "Từ chối hoàn tiền" trong kỳ này</p>
                </div>
            `;
            return;
        }
    
        // Xóa canvas cũ và tạo mới
        container.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.id = 'revenue-chart';
        canvas.width = 400;
        canvas.height = 250;
        container.appendChild(canvas);
        
        try {
            const ctx = canvas.getContext('2d');
            
            // ✅ FIXED: Chuẩn bị dữ liệu với date format chính xác
            const labels = dataItems.map(item => {
                if (item.date) {
                    // ✅ Handle different date formats
                    const date = new Date(item.date);
                    if (isNaN(date.getTime())) {
                        console.warn('Invalid date:', item.date);
                        return 'N/A';
                    }
                    return date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
                }
                return item.period || item.dayLabel || 'N/A';
            });
    
            const revenues = dataItems.map(item => item.revenue || 0);
            const orders = dataItems.map(item => item.ordersCount || item.orderCount || 0);
    
            console.log('📊 Chart data prepared:', { labels, revenues, orders });
    
            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Doanh thu (VNĐ)',
                        data: revenues,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y',
                        fill: true
                    }, {
                        label: 'Số đơn hàng',
                        data: orders,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        yAxisID: 'y1',
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Doanh thu từ đơn hàng hoàn thành (Đã giao + Từ chối hoàn tiền)',
                            font: {
                                size: 14
                            }
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Ngày'
                            }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Doanh thu (VNĐ)'
                            },
                            ticks: {
                                callback: function(value) {
                                    return new Intl.NumberFormat('vi-VN', {
                                        style: 'currency',
                                        currency: 'VND',
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 0
                                    }).format(value);
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Số đơn hàng'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            };
    
            console.log('📊 Creating chart with config:', chartConfig);
            
            const chart = new Chart(ctx, chartConfig);
            console.log('✅ Chart created successfully:', chart);
            
        } catch (error) {
            console.error('❌ Lỗi render biểu đồ:', error);
            container.innerHTML = `
                <div class="text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p class="mb-2">Lỗi tạo biểu đồ</p>
                    <p class="text-sm text-gray-600 mb-4">${error.message}</p>
                    <button onclick="window.statisticsManager?.loadRevenueStats()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                        <i class="fas fa-retry mr-1"></i>Thử lại
                    </button>
                </div>
            `;
        }
    }


    /**
     * Render revenue chart error
     */
    renderRevenueChartError(errorMessage) {
        const container = document.getElementById('revenue-chart-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p class="mb-2">Lỗi tải biểu đồ doanh thu</p>
                <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
                <button onclick="window.statisticsManager?.loadRevenueStats()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                    <i class="fas fa-retry mr-1"></i>Thử lại
                </button>
            </div>
        `;
    }

    /**
     * Render top products - FIX: Hiển thị đúng số lượng bán và doanh thu
     */
    renderTopProducts(data) {
        const container = document.getElementById('top-products-list');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-box-open text-4xl mb-4"></i>
                    <p>Chưa có dữ liệu sản phẩm bán chạy</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map((product, index) => {
            const rankColors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-orange-100 text-orange-800'];
            const rankColor = rankColors[index] || 'bg-blue-100 text-blue-800';
            
            // Đảm bảo các trường dữ liệu đều có giá trị
            const productName = product.productName || product.name || 'Sản phẩm';
            const totalQuantitySold = product.totalQuantitySold || product.quantitySold || 0;
            const totalRevenue = product.totalRevenue || product.revenue || 0;
            const productImage = product.imageUrl || product.imageURL || product.thumbnail || 'https://via.placeholder.com/150';
            
            return `
                <div class="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div class="flex-shrink-0 w-8 h-8 ${rankColor} rounded-full flex items-center justify-center">
                        <span class="font-semibold text-sm">${index + 1}</span>
                    </div>
                    <div class="flex-shrink-0 w-10 h-10 mr-1">
                        <img src="${productImage}" alt="${productName}" class="w-full h-full object-cover rounded" onerror="this.src='https://via.placeholder.com/150'">
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-gray-900 truncate" title="${productName}">${productName}</h4>
                        <div class="flex justify-between text-sm text-gray-500">
                            <span>${totalQuantitySold} đã bán</span>
                            <span class="font-semibold text-blue-600">${this.formatCurrency(totalRevenue)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render top products error
     */
    renderTopProductsError(errorMessage) {
        const container = document.getElementById('top-products-list');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p class="font-semibold mb-1">Lỗi tải sản phẩm bán chạy</p>
                <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
                <button onclick="window.statisticsManager?.loadTopProducts()" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm">
                    <i class="fas fa-retry mr-1"></i>Thử lại
                </button>
            </div>
        `;
    }

    // ============= UTILITY METHODS =============

    /**
     * Refresh order status stats
     */
    async refreshOrderStatus() {
        const container = document.getElementById('order-status-stats');
        if (container) {
            container.innerHTML = `
                <div class="col-span-full flex justify-center items-center py-8">
                    <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span class="ml-2 text-gray-600">Đang làm mới...</span>
                </div>
            `;
        }
        
        this.retryCount = 0;
        await this.loadOrderStatusStats();
    }
//  loadProfitAnalysis() 
async loadProfitAnalysis() {
    try {
        const response = await this.makeRequest('/Statistics/profit-analysis', 'GET');
        if (response) {
            this.renderProfitAnalysis(response);
        } else {
            throw new Error('No response from profit-analysis API');
        }
    } catch (error) {
        this.renderProfitAnalysisError(error.message);
        throw error;
    }
}

    /**
     * Show error message
     */
    showErrorMessage(message, type = 'error') {
        // Remove existing notification
        const existingNotification = document.getElementById('stats-error-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const errorDiv = document.createElement('div');
        errorDiv.id = 'stats-error-notification';
        
        const bgColorMap = {
            'error': 'bg-red-500',
            'warning': 'bg-yellow-500', 
            'info': 'bg-blue-500',
            'success': 'bg-green-500'
        };
        
        const iconMap = {
            'error': 'fas fa-exclamation-circle',
            'warning': 'fas fa-exclamation-triangle',
            'info': 'fas fa-info-circle',
            'success': 'fas fa-check-circle'
        };
        
        const bgColor = bgColorMap[type] || bgColorMap['error'];
        const icon = iconMap[type] || iconMap['error'];
        
        errorDiv.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md`;
        
        errorDiv.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="${icon}"></i>
                <span class="flex-1">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200 flex-shrink-0">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            if (errorDiv && errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 8000);
    }

    /**
     * Show loading overlay
     */
    showLoading() {
        const loading = document.getElementById('stats-loading');
        if (loading) {
            loading.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const loading = document.getElementById('stats-loading');
        if (loading) {
            loading.classList.add('hidden');
        }
    }

    /**
     * Format currency for Vietnamese
     */
    formatCurrency(amount) {
        if (typeof amount !== 'number') {
            amount = parseFloat(amount) || 0;
        }
        
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(amount);
    }

    /**
     * Format number with thousand separators
     */
    formatNumber(number) {
        if (typeof number !== 'number') {
            number = parseFloat(number) || 0;
        }
        
        return new Intl.NumberFormat('vi-VN').format(number);
    }
    
    /**
     * Format short number (K, M, B)
     */
    formatShortNumber(number) {
        if (number >= 1000000000) {
            return (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
        }
        if (number >= 1000000) {
            return (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (number >= 1000) {
            return (number / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return number;
    }

    /**
     * Load top customers - NEW METHOD
     */
    async loadTopCustomers() {
        try {
            const response = await this.makeRequest('/Statistics/top-customers?count=10', 'GET');
            if (response) {
                this.renderTopCustomers(response);
            } else {
                throw new Error('No response from top-customers API');
            }
        } catch (error) {
            this.renderTopCustomersError(error.message);
            throw error;
        }
    }

    /**
     * Load profit analysis - NEW METHOD
     */
    async loadProfitAnalysisWithDates(startDate, endDate) {
        try {
            let endpoint = '/Statistics/profit-analysis';
            const params = new URLSearchParams();
            
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            
            if (params.toString()) {
                endpoint += '?' + params.toString();
            }
            
            console.log('Calling profit analysis with dates:', endpoint);
            
            const response = await this.makeRequest(endpoint, 'GET');
            if (response) {
                this.renderProfitAnalysis(response);
            } else {
                throw new Error('No response from profit-analysis API');
            }
        } catch (error) {
            this.renderProfitAnalysisError(error.message);
            throw error;
        }
    }




    
    // ============= NEW RENDER METHODS =============

    /**
     * Render top customers - NEW METHOD
     */
    renderTopCustomers(data) {
        const container = document.getElementById('top-customers-list');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-users text-4xl mb-4"></i>
                    <p>Chưa có dữ liệu khách hàng</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map((customer, index) => {
            const rankColors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-orange-100 text-orange-800'];
            const rankColor = rankColors[index] || 'bg-blue-100 text-blue-800';
            
            const customerName = customer.customerName || 'Khách hàng';
            const totalSpent = customer.totalSpent || 0;
            const totalOrders = customer.totalOrders || 0;
            const averageOrderValue = customer.averageOrderValue || 0;
            const isVIP = customer.isVIP || false;
            
            return `
                <div class="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <div class="flex-shrink-0 w-8 h-8 ${rankColor} rounded-full flex items-center justify-center">
                        <span class="font-semibold text-sm">${index + 1}</span>
                    </div>
                    <div class="flex-shrink-0 w-10 h-10 mr-1">
                        <div class="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                            ${customerName.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center space-x-2">
                            <h4 class="font-medium text-gray-900 truncate" title="${customerName}">${customerName}</h4>
                            ${isVIP ? '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">VIP</span>' : ''}
                        </div>
                        <div class="flex justify-between text-sm text-gray-500">
                            <span>${totalOrders} đơn hàng</span>
                            <span class="font-semibold text-blue-600">${this.formatCurrency(totalSpent)}</span>
                        </div>
                        <div class="text-xs text-gray-400">
                            TB: ${this.formatCurrency(averageOrderValue)}/đơn
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render top customers error - NEW METHOD
     */
    renderTopCustomersError(errorMessage) {
        const container = document.getElementById('top-customers-list');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p class="font-semibold mb-1">Lỗi tải khách hàng VIP</p>
                <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
                <button onclick="window.statisticsManager?.loadTopCustomers()" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm">
                    <i class="fas fa-retry mr-1"></i>Thử lại
                </button>
            </div>
        `;
    }

    /**
     * Render profit analysis - NEW METHOD
     */
    renderProfitAnalysis(data) {
        const container = document.getElementById('profit-analysis-container');
        if (!container) return;

        if (!data) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-chart-pie text-4xl mb-4"></i>
                    <p>Chưa có dữ liệu phân tích lợi nhuận</p>
                </div>
            `;
            return;
        }

        // Main profit metrics
        const profitMetricsHtml = `
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-green-50 rounded-lg p-4 text-center">
                    <p class="text-green-600 text-sm font-medium">Tổng doanh thu</p>
                    <h4 class="text-green-800 text-xl font-bold">${this.formatCurrency(data.totalRevenue || 0)}</h4>
                </div>
                <div class="bg-red-50 rounded-lg p-4 text-center">
                    <p class="text-red-600 text-sm font-medium">Chi phí hàng bán</p>
                    <h4 class="text-red-800 text-xl font-bold">${this.formatCurrency(data.estimatedCOGS || 0)}</h4>
                </div>
                <div class="bg-blue-50 rounded-lg p-4 text-center">
                    <p class="text-blue-600 text-sm font-medium">Lợi nhuận gộp</p>
                    <h4 class="text-blue-800 text-xl font-bold">${this.formatCurrency(data.grossProfit || 0)}</h4>
                    <p class="text-blue-600 text-xs">${(data.grossProfitMargin || 0).toFixed(1)}%</p>
                </div>
                <div class="bg-purple-50 rounded-lg p-4 text-center">
                    <p class="text-purple-600 text-sm font-medium">Lợi nhuận ròng</p>
                    <h4 class="text-purple-800 text-xl font-bold">${this.formatCurrency(data.netProfit || 0)}</h4>
                    <p class="text-purple-600 text-xs">${(data.netProfitMargin || 0).toFixed(1)}%</p>
                </div>
            </div>
        `;

        // Top profitable products
        const topProductsHtml = `
            <div class="bg-white rounded-lg border p-6">
                <h4 class="text-lg font-semibold mb-4 flex items-center">
                    <i class="fas fa-star text-yellow-500 mr-2"></i>
                    Sản phẩm có lời nhất
                </h4>
                <div class="space-y-3">
                    ${(data.topProfitableProducts || []).slice(0, 5).map((product, index) => `
                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                                <span class="w-6 h-6 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center text-sm font-bold">
                                    ${index + 1}
                                </span>
                                <div>
                                    <h5 class="font-medium text-gray-900">${product.productName || 'Sản phẩm'}</h5>
                                    <p class="text-sm text-gray-500">${product.quantitySold || 0} đã bán</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-semibold text-green-600">${this.formatCurrency(product.grossProfit || 0)}</p>
                                <p class="text-sm text-gray-500">${(product.profitMargin || 0).toFixed(1)}%</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // Notes section
        const notesHtml = data.notes ? `
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <div class="flex items-start space-x-2">
                    <i class="fas fa-info-circle text-yellow-600 mt-1"></i>
                    <div>
                        <h5 class="font-medium text-yellow-800 mb-1">Ghi chú</h5>
                        <p class="text-yellow-700 text-sm">${data.notes}</p>
                    </div>
                </div>
            </div>
        ` : '';

        container.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-semibold">Phân tích lợi nhuận</h3>
                    <span class="text-sm text-gray-500">${data.analysisPeriod || 'Tháng này'}</span>
                </div>
                ${profitMetricsHtml}
                ${topProductsHtml}
                ${notesHtml}
            </div>
        `;
    }

    /**
     * Render profit analysis error - NEW METHOD
     */
    renderProfitAnalysisError(errorMessage) {
        const container = document.getElementById('profit-analysis-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p class="font-semibold mb-1">Lỗi tải phân tích lợi nhuận</p>
                <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
                <button onclick="window.statisticsManager?.loadProfitAnalysis()" class="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition text-sm">
                    <i class="fas fa-retry mr-1"></i>Thử lại
                </button>
            </div>
        `;
    }

    // THÊM VÀO CLASS SellerStatistics (sau các method hiện tại)

/**
 * Hiển thị chi tiết đơn hàng theo trạng thái - NEW METHOD
 */


async showOrderDetailsByStatus(statusKey, statusLabel, dbStatuses) {
    try {
        console.log(`🔍 Loading orders for status: ${statusKey} (${statusLabel})`);
        console.log(`📋 DB Statuses: ${JSON.stringify(dbStatuses)}`);
        
        // ✅ Show modal immediately với loading state
        const modal = document.getElementById('order-details-modal');
        if (modal) {
            // ✅ FIXED: Add body scroll lock
            document.body.classList.add('modal-open');
            
            // ✅ Remove hidden class
            modal.classList.remove('hidden');
            
            // ✅ Update title
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
                modalTitle.textContent = `Chi tiết đơn hàng: ${statusLabel}`;
            }
            
            // ✅ Show loading trong modal
            const content = document.getElementById('order-details-content');
            if (content) {
                content.innerHTML = `
                    <div class="text-center py-12">
                        <i class="fas fa-spinner fa-spin text-4xl text-blue-500 mb-4"></i>
                        <p class="text-gray-600">Đang tải dữ liệu cho "${statusLabel}"...</p>
                    </div>
                `;
            }
        }
        
        // ✅ CHUẨN HÓA: Prepare status parameter
        let apiStatuses;
        if (dbStatuses && dbStatuses.length > 0) {
            apiStatuses = dbStatuses.join(',');
        } else {
            // Fallback mapping
            const statusMapping = {
                'pending': 'Chờ xác nhận',
                'processing': 'Đang xử lý',
                'shipping': 'Đang giao',
                'delivered': 'Đã giao',
                'refundRequested': 'Yêu cầu trả hàng/ hoàn tiền',
                'refunded': 'Đã hoàn tiền',
                'cancelled': 'Đã hủy'
            };
            apiStatuses = statusMapping[statusKey] || statusKey;
        }
        
        console.log(`🌐 API call with statuses: "${apiStatuses}"`);
        
        // ✅ FIXED: Call API với proper error handling
        const response = await this.makeRequest(`/statistics/orders-by-status?statuses=${encodeURIComponent(apiStatuses)}`);
        
        if (response && response.success && response.data) {
            console.log(`✅ Loaded ${response.data.length} orders for ${statusLabel}`);
            
            // ✅ Store data for export
            this.currentOrdersData = {
                orders: response.data,
                statuses: apiStatuses,
                statusLabel: statusLabel
            };
            
            this.renderOrderDetailsContent(response, statusLabel, statusKey);
        } else {
            throw new Error(response?.message || 'Không có dữ liệu đơn hàng');
        }
        
    } catch (error) {
        console.error(`❌ Error loading orders for ${statusLabel}:`, error);
        this.renderOrderDetailsError(error.message, statusLabel);
    }
}

async loadStatistics() {
    return await this.loadAllStatistics();
}
/**
 * Render nội dung chi tiết đơn hàng 
 */

renderOrderDetailsContent(response, statusLabel, statusKey) {
    const content = document.getElementById('order-details-content');
    if (!content) {
        console.error('❌ order-details-content element not found');
        return;
    }
    
    // ✅ Extract orders từ response
    let orders = [];
    if (response && response.success && response.data) {
        orders = Array.isArray(response.data) ? response.data : [];
    } else if (Array.isArray(response)) {
        orders = response;
    } else {
        console.warn('⚠️ Unexpected response format:', response);
        orders = [];
    }
    
    console.log(`📦 Processed ${orders.length} orders for status: ${statusLabel}`);
    
    if (!orders || orders.length === 0) {
        content.innerHTML = `
            <div class="text-center py-16">
                <div class="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-inbox text-gray-400 text-4xl"></i>
                </div>
                <h3 class="text-xl font-semibold text-gray-700 mb-2">Không có đơn hàng</h3>
                <p class="text-gray-500 mb-6">Không tìm thấy đơn hàng nào với trạng thái "${statusLabel}"</p>
            </div>
        `;
        return;
    }
    
    // ✅ Tính toán thống kê
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    const todayOrders = orders.filter(o => o.createdToday || 
        (o.orderDate && new Date(o.orderDate).toDateString() === new Date().toDateString()));
    
    content.innerHTML = `
        <!-- ✅ Thống kê tổng quan -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="text-center">
                    <h4 class="text-2xl font-bold text-blue-600">${orders.length}</h4>
                    <p class="text-gray-600 text-sm">Tổng đơn hàng</p>
                </div>
                <div class="text-center">
                    <h4 class="text-2xl font-bold text-green-600">${this.formatCurrency(totalRevenue)}</h4>
                    <p class="text-gray-600 text-sm">Tổng giá trị</p>
                </div>
                <div class="text-center">
                    <h4 class="text-2xl font-bold text-purple-600">${this.formatCurrency(averageOrderValue)}</h4>
                    <p class="text-gray-600 text-sm">Giá trị TB/đơn</p>
                </div>
                <div class="text-center">
                    <h4 class="text-2xl font-bold text-orange-600">${todayOrders.length}</h4>
                    <p class="text-gray-600 text-sm">Đơn hôm nay</p>
                </div>
            </div>
        </div>
        
        <!-- ✅ Search và Sort controls -->
        <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
            <div class="flex flex-col md:flex-row gap-4 items-end">
                <div class="flex-1">
                    <label for="order-search" class="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                    <input type="text" id="order-search" placeholder="Tìm theo mã đơn hàng, tên khách hàng..."
                           class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </div>
                <div class="w-full md:w-48">
                    <label for="order-sort" class="block text-sm font-medium text-gray-700 mb-1">Sắp xếp</label>
                    <select id="order-sort" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="date_desc">Ngày mới nhất</option>
                        <option value="date_asc">Ngày cũ nhất</option>
                        <option value="amount_desc">Giá trị cao nhất</option>
                        <option value="amount_asc">Giá trị thấp nhất</option>
                        <option value="customer_asc">Tên khách hàng A-Z</option>
                        <option value="customer_desc">Tên khách hàng Z-A</option>
                    </select>
                </div>
            </div>
        </div>
        
        <!-- ✅ Danh sách đơn hàng -->
        <div class="space-y-4" id="orders-list">
            ${orders.map(order => this.renderOrderCard(order)).join('')}
        </div>
    `;
    
    // ✅ Bind events cho search/sort
    this.bindOrderDetailsEvents();
}
/**
 * Render từng card đơn hàng - NEW METHOD
 */
renderOrderCard(order) {
    const orderDate = new Date(order.orderDate);
    const formattedDate = orderDate.toLocaleString('vi-VN');
    const timeAgo = this.getTimeAgo(orderDate);
    
    return `
        <div class="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <!-- Thông tin đơn hàng -->
                <div class="flex-1">
                    <div class="flex items-center space-x-4 mb-3">
                        <h4 class="text-lg font-semibold text-gray-900">
                            #${order.orderID || 'N/A'}
                        </h4>
                        <span class="px-3 py-1 text-xs font-medium rounded-full ${this.getStatusBadgeClass(order.status)}">
                            ${order.status || 'Chưa xác định'}
                        </span>
                        <span class="text-sm text-gray-500">${timeAgo}</span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-user mr-2"></i>
                                <span class="font-medium">Khách hàng:</span> ${order.customerName || 'N/A'}
                            </p>
                            <p class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-envelope mr-2"></i>
                                ${order.customerEmail || 'N/A'}
                            </p>
                            <p class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-phone mr-2"></i>
                                ${order.customerPhone || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-calendar mr-2"></i>
                                <span class="font-medium">Ngày đặt:</span> ${formattedDate}
                            </p>
                            <p class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-box mr-2"></i>
                                <span class="font-medium">Sản phẩm:</span> ${order.totalItems || 0} món
                            </p>
                            <p class="text-sm text-gray-600 mt-1">
                                <i class="fas fa-map-marker-alt mr-2"></i>
                                ${order.shippingAddress ? order.shippingAddress.substring(0, 50) + '...' : 'Chưa có địa chỉ'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Giá trị và hành động -->
                <div class="flex-shrink-0 text-right lg:ml-6">
                    <div class="text-2xl font-bold text-blue-600 mb-2">
                        ${this.formatCurrency(order.totalAmount || 0)}
                    </div>
                    <div class="space-y-2">
                        <button onclick="window.statisticsManager?.viewOrderDetails(${order.orderID})" 
                                class="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                            <i class="fas fa-eye mr-2"></i>Xem chi tiết
                        </button>
                        ${this.getOrderActionButton(order)}
                    </div>
                </div>
            </div>
        </div>
    `;
}
renderOrderProducts(products) {
    if (!products || products.length === 0) {
        return `
            <div class="bg-gray-50 rounded-lg p-3 text-center text-gray-500 mt-4">
                <i class="fas fa-box-open mr-2"></i>Không có thông tin sản phẩm
            </div>
        `;
    }
    
    return `
        <div class="bg-gray-50 rounded-lg p-4 mt-4">
            <h5 class="font-medium text-gray-700 mb-3 flex items-center">
                <i class="fas fa-shopping-bag mr-2 text-blue-600"></i>
                Sản phẩm trong đơn hàng (${products.length})
            </h5>
            <div class="space-y-3 max-h-40 overflow-y-auto">
                ${products.map(product => this.renderProductItem(product)).join('')}
            </div>
        </div>
    `;
}

/**
 * Render từng product item với layout FIXED - NO MORE OVERLAPPING
 */
renderProductItem(product) {
    // ✅ Validate và format dữ liệu
    const productName = product.productName || 'Sản phẩm không xác định';
    const categoryName = product.categoryName || 'N/A';
    const quantity = product.quantity || 0;
    const price = product.price || 0;
    const totalPrice = product.totalPrice || (price * quantity);
    
    // ✅ Format currency với fallback
    const formattedPrice = product.formattedPrice || this.formatCurrency(price);
    const formattedTotalPrice = product.formattedTotalPrice || this.formatCurrency(totalPrice);
    
    // ✅ Image handling với proper fallback
    const imageUrl = product.imageUrl || product.fullImageUrl || '';
    const hasImage = imageUrl && imageUrl.trim() !== '';
    
    return `
        <div class="product-item-card">
            <!-- ✅ FIXED: Container layout với proper structure -->
            <div class="flex items-center space-x-4">
                <!-- ✅ Product Image Container - FIXED SIZE -->
                <div class="flex-shrink-0">
                    ${hasImage ? 
                        `<img src="${imageUrl}" 
                              alt="${productName}" 
                              class="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center" style="display: none;">
                             <i class="fas fa-image text-gray-400 text-sm"></i>
                         </div>` :
                        `<div class="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                             <i class="fas fa-image text-gray-400 text-sm"></i>
                         </div>`
                    }
                </div>
                
                <!-- ✅ Product Info - FLEXIBLE WIDTH -->
                <div class="flex-1 min-w-0">
                    <p class="font-semibold text-gray-900 truncate text-sm" title="${productName}">
                        ${productName}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${categoryName}
                    </p>
                </div>
                
                <!-- ✅ FIXED: Pricing Table với container riêng -->
                <div class="flex-shrink-0">
                    <div class="pricing-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>SL</th>
                                    <th>Đơn giá</th>
                                    <th>Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${quantity}</td>
                                    <td>${formattedPrice}</td>
                                    <td>${formattedTotalPrice}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
}
/**
 * Lấy class CSS cho badge trạng thái - NEW METHOD
 */
getStatusBadgeClass(status) {
    const statusMap = {
        'Chờ xác nhận': 'bg-yellow-100 text-yellow-800',
        'Đang xử lý': 'bg-blue-100 text-blue-800',
        'Đang giao': 'bg-indigo-100 text-indigo-800',
        'Đang giao hàng': 'bg-indigo-100 text-indigo-800',
        'Đã giao': 'bg-green-100 text-green-800',
        'Đã giao hàng': 'bg-green-100 text-green-800',
        'Đã hủy': 'bg-red-100 text-red-800',
        'Đã hoàn tiền': 'bg-red-100 text-red-800'
    };
    
    return statusMap[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Lấy button hành động cho đơn hàng - NEW METHOD
 */
getOrderActionButton(order) {
    switch (order.status) {
        case 'Chờ xác nhận':
            return `
                
            `;
        case 'Đang xử lý':
            return `
                
            `;
        case 'Đang giao':
        case 'Đang giao hàng':
            return `
            `;
        default:
            return '';
    }
}

/**
 * Tính thời gian đã trôi qua - NEW METHOD
 */
getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
}

/**
 * Bind events cho modal chi tiết đơn hàng - NEW METHOD
 */
bindOrderDetailsEvents() {
    // Search functionality
    const searchInput = document.getElementById('order-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            this.filterOrders(e.target.value);
        });
    }
    
    // Sort functionality
    const sortSelect = document.getElementById('order-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            this.sortOrders(e.target.value);
        });
    }
}

/**
 * Lọc đơn hàng theo từ khóa - NEW METHOD
 */
filterOrders(keyword) {
    const orderCards = document.querySelectorAll('#orders-list > div');
    orderCards.forEach(card => {
        const orderText = card.textContent.toLowerCase();
        if (orderText.includes(keyword.toLowerCase())) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Sắp xếp đơn hàng - NEW METHOD
 */
sortOrders(sortType) {
    // Implementation for sorting orders
    console.log('Sorting orders by:', sortType);
    // Có thể implement sau khi có dữ liệu đầy đủ
}

/**
 * Đóng modal chi tiết đơn hàng - NEW METHOD
 */
closeOrderDetailsModal() {
    console.log('🔒 Closing order details modal');
    
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        // ✅ Ẩn modal
        modal.classList.add('hidden');
        
        // ✅ CRITICAL: Remove modal-open class from body
        document.body.classList.remove('modal-open');
        
        // ✅ CRITICAL: Restore body overflow
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.paddingRight = '';
    }
    
    
}

/**
 * Render lỗi cho modal chi tiết đơn hàng - NEW METHOD
 */
renderOrderDetailsError(errorMessage, statusLabel) {
    const content = document.getElementById('order-details-content');
    if (!content) return;
    
    content.innerHTML = `
        <div class="text-center py-12">
            <div class="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-700 mb-2">Lỗi tải dữ liệu</h3>
            <p class="text-gray-500 mb-6">${errorMessage}</p>
            <button onclick="window.statisticsManager?.closeOrderDetailsModal()" 
                    class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition">
                Đóng
            </button>
        </div>
    `;
}

/**
 * Xem chi tiết đơn hàng cụ thể - PLACEHOLDER
 */
async viewOrderDetails(orderId) {
    console.log(`🎯 viewOrderDetails called with orderId: ${orderId}`);
    
    try {
        // Đảm bảo modal title được set
        const title = document.getElementById('modal-title');
        if (title) {
            title.textContent = `Chi tiết đơn hàng #${orderId}`;
        }
        
        // Gọi method load chi tiết
        await this.loadSingleOrderDetails(orderId);
        
    } catch (error) {
        console.error('❌ Error in viewOrderDetails:', error);
        this.showErrorMessage(`Lỗi xem chi tiết đơn hàng: ${error.message}`, 'error');
    }
}
async loadSingleOrderDetails(orderId) {
    try {
        console.log(`🔄 Loading single order details for orderId: ${orderId}`);
        
        // Hiển thị loading trong modal
        const modal = document.getElementById('order-details-modal');
        const content = document.getElementById('order-details-content');
        
        if (modal && content) {
            modal.classList.remove('hidden');
            content.innerHTML = `
                <div class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p class="text-gray-600">Đang tải chi tiết đơn hàng #${orderId}...</p>
                </div>
            `;
        }
        
        // ✅ SỬA: Gọi API Orders endpoint có sẵn
        const response = await this.makeRequest(`/Orders/${orderId}`, 'GET');
        
        console.log('📦 Order details API response:', response);
        
        if (response) {
            // ✅ SỬA: Gọi method hiển thị modal với data
            this.showSingleOrderModal(response);
        } else {
            throw new Error('Không nhận được dữ liệu đơn hàng từ API');
        }
        
    } catch (error) {
        console.error('❌ Error loading single order details:', error);
        
        // Hiển thị lỗi trong modal
        const content = document.getElementById('order-details-content');
        if (content) {
            content.innerHTML = `
                <div class="text-center py-12">
                    <div class="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-exclamation-triangle text-red-500 text-4xl"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-700 mb-2">Không thể tải chi tiết đơn hàng</h3>
                    <p class="text-gray-500 mb-6">${error.message}</p>
                    <div class="space-x-3">
                        <button onclick="window.statisticsManager?.loadSingleOrderDetails(${orderId})" 
                                class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-redo mr-2"></i>Thử lại
                        </button>
                        <button onclick="window.statisticsManager?.closeOrderDetailsModal()" 
                                class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition">
                            Đóng
                        </button>
                    </div>
                </div>
            `;
        }
    }
}

showLoadingSpinner() {
    // Hiển thị loading trong modal
    const modal = document.getElementById('order-details-modal');
    if (modal) {
        const content = document.getElementById('order-details-content');
        if (content) {
            content.innerHTML = `
                <div class="text-center py-12" id="modal-loading-spinner">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p class="text-gray-600">Đang tải chi tiết đơn hàng...</p>
                </div>
            `;
        }
        modal.classList.remove('hidden');
    }
}

hideLoadingSpinner() {
    // Ẩn loading spinner trong modal
    const loadingSpinner = document.getElementById('modal-loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.remove();
    }
    
    // Ẩn loading overlay chính nếu có
    const loading = document.getElementById('stats-loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

showSingleOrderModal(orderDetails) {
    console.log('🎨 showSingleOrderModal called with:', orderDetails);
    
    const content = document.getElementById('order-details-content');
    if (!content) {
        console.error('❌ order-details-content element not found');
        return;
    }
    
    // ✅ CHUẨN HÓA: Xử lý cả OrderDto format từ API Orders/{orderId}
    let orderData = orderDetails;
    
    // Nếu response có wrapper (success, data)
    if (orderDetails.success && orderDetails.data) {
        orderData = orderDetails.data;
    } else if (orderDetails.data && !orderDetails.orderID) {
        orderData = orderDetails.data;
    }
    
    console.log('📊 Processed order data:', orderData);
    console.log('📸 Order details items:', orderData.orderDetails);
    
    // Validate dữ liệu cần thiết
    if (!orderData || !orderData.orderID) {
        console.error('❌ Invalid order data structure:', orderData);
        content.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16 px-6">
                <div class="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center shadow-lg">
                    <i class="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-800 mb-3">Oops! Có lỗi xảy ra</h3>
                <p class="text-gray-600 text-center mb-8 max-w-md">Dữ liệu đơn hàng không hợp lệ hoặc không đúng định dạng mong đợi</p>
                <button onclick="window.statisticsManager?.closeOrderDetailsModal()" 
                        class="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <i class="fas fa-times mr-2"></i>Đóng
                </button>
            </div>
        `;
        return;
    }
    
    // ✅ FIXED: Sử dụng đúng field names từ OrderDto API
    const orderDate = new Date(orderData.orderDate);
    
    // ✅ FIXED: orderDetails field từ API Orders/{orderId}
    const orderDetails_items = orderData.orderDetails || orderData.items || [];
    console.log(`📦 Found ${orderDetails_items.length} order detail items`);
    
    // Log chi tiết để debug
    orderDetails_items.forEach((item, index) => {
        console.log(`📸 Item ${index + 1}:`, {
            productName: item.productName,
            productImageURL: item.productImageURL,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            allFields: Object.keys(item)
        });
    });
    
    const totalItems = orderDetails_items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalAmount = orderDetails_items.reduce((sum, item) => sum + ((item.unitPrice || 0) * (item.quantity || 0)), 0);
    
    // ✅ FIXED: Customer info từ OrderDto
    const customer = orderData.customerInfo || {};
    const customerName = customer.fullName || customer.customerName || orderData.customerName || 'N/A';
    const customerEmail = customer.email || customer.customerEmail || orderData.customerEmail || 'N/A';
    const customerPhone = customer.phone || customer.customerPhone || orderData.customerPhone || 'N/A';
    
    console.log('📊 Calculated values:', { totalItems, totalAmount, customerName });
    
    content.innerHTML = `
        <!-- ✨ Custom CSS cho animations -->
        <style>
            @keyframes fade-in {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
            .animate-fade-in {
                animation: fade-in 0.5s ease-out;
            }
            
            /* Custom scrollbar cho mobile */
            .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
                height: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 2px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 2px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
        </style>
        
        <div class="space-y-8 custom-scrollbar">
            <!-- ✨ Header đơn hàng với gradient đẹp -->
            <div class="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl p-8 text-white shadow-2xl">
                <!-- Background pattern -->
                <div class="absolute inset-0 opacity-10">
                    <div class="absolute inset-0" style="background-image: radial-gradient(circle at 25% 25%, white 2px, transparent 2px); background-size: 24px 24px;"></div>
                </div>
                
                <div class="relative flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <i class="fas fa-receipt text-white text-lg"></i>
                            </div>
                            <h3 class="text-3xl font-bold">Đơn hàng #${orderData.orderID}</h3>
                        </div>
                        
                        <div class="flex flex-wrap items-center gap-4">
                            <span class="px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30 ${this.getStatusBadgeClass(orderData.status)}">
                                <i class="fas fa-circle text-xs mr-2"></i>
                                ${orderData.status || 'Chưa xác định'}
                            </span>
                            <div class="flex items-center space-x-2 text-white/90">
                                <i class="fas fa-calendar-alt"></i>
                                <span class="font-medium">${orderDate.toLocaleString('vi-VN')}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="text-right lg:text-left">
                        <p class="text-white/80 text-sm mb-1">Tổng giá trị đơn hàng</p>
                        <div class="flex items-center space-x-2">
                            <i class="fas fa-money-bill-wave text-2xl"></i>
                            <p class="text-4xl font-bold">${this.formatCurrency(totalAmount)}</p>
                        </div>
                        <p class="text-white/70 text-sm mt-1">${totalItems} sản phẩm</p>
                    </div>
                </div>
            </div>

            <!-- 👤 Thông tin khách hàng với card đẹp -->
            <div class="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div class="flex items-center space-x-3 mb-6">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <i class="fas fa-user text-white text-lg"></i>
                    </div>
                    <h4 class="text-2xl font-bold text-gray-800">Thông tin khách hàng</h4>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <div class="flex items-center space-x-2 text-gray-600 mb-1">
                            <i class="fas fa-user-circle text-blue-500"></i>
                            <p class="text-sm font-medium">Tên khách hàng</p>
                        </div>
                        <p class="text-lg font-semibold text-gray-800 pl-6">${customerName}</p>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex items-center space-x-2 text-gray-600 mb-1">
                            <i class="fas fa-envelope text-green-500"></i>
                            <p class="text-sm font-medium">Email</p>
                        </div>
                        <p class="text-lg font-semibold text-gray-800 pl-6">${customerEmail}</p>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex items-center space-x-2 text-gray-600 mb-1">
                            <i class="fas fa-phone text-purple-500"></i>
                            <p class="text-sm font-medium">Số điện thoại</p>
                        </div>
                        <p class="text-lg font-semibold text-gray-800 pl-6">${customerPhone}</p>
                    </div>
                    
                    <div class="space-y-2">
                        <div class="flex items-center space-x-2 text-gray-600 mb-1">
                            <i class="fas fa-map-marker-alt text-red-500"></i>
                            <p class="text-sm font-medium">Địa chỉ giao hàng</p>
                        </div>
                        <p class="text-lg font-semibold text-gray-800 pl-6">${orderData.shippingAddress || 'Chưa có thông tin'}</p>
                    </div>
                </div>
            </div>

            <!-- 📦 Chi tiết sản phẩm với design hiện đại -->
            <div class="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                            <i class="fas fa-shopping-cart text-white text-lg"></i>
                        </div>
                        <div>
                            <h4 class="text-2xl font-bold text-gray-800">Sản phẩm đã đặt</h4>
                            <p class="text-gray-600">${totalItems} món trong đơn hàng</p>
                        </div>
                    </div>
                    
                    <div class="hidden lg:block">
                        <div class="bg-gradient-to-r from-green-100 to-teal-100 px-6 py-3 rounded-xl">
                            <p class="text-green-700 font-semibold">Tổng: ${this.formatCurrency(totalAmount)}</p>
                        </div>
                    </div>
                </div>
                
                <div class="space-y-6">
                    ${orderDetails_items.map((item, index) => {
                        const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
                        
                        // ✅ FIXED: Sử dụng đúng field productImageURL từ API
                        const productImageURL = item.productImageURL || '';
                        const hasValidImage = productImageURL && productImageURL.trim() !== '';
                        
                        // ✅ ENHANCED: Xử lý đường dẫn ảnh với lazy loading
                        let finalImageUrl = '';
                        if (hasValidImage) {
                            // Xử lý URL base
                            if (productImageURL.startsWith('http')) {
                                finalImageUrl = productImageURL;
                            } else if (productImageURL.startsWith('/')) {
                                finalImageUrl = `https://localhost:7088${productImageURL}`;
                            } else {
                                finalImageUrl = `https://localhost:7088/${productImageURL}`;
                            }
                        } else {
                            // Sử dụng placeholder đẹp hơn
                            finalImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.productName || 'Product')}&size=200&background=f97316&color=ffffff&format=png&rounded=true&font-size=0.4`;
                        }
                        
                        console.log(`📸 Item ${index + 1} image processing:`, {
                            original: productImageURL,
                            hasValidImage,
                            final: finalImageUrl
                        });
                        
                        return `
                            <div class="group relative bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300">
                                <div class="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-6">
                                    <!-- ✨ Product Image với avatar-style như design mới -->
                                    <div class="flex-shrink-0 mx-auto lg:mx-0">
                                        <div class="relative w-20 h-20 lg:w-24 lg:h-24">
                                            <!-- Background với gradient nhẹ -->
                                            <div class="absolute inset-0 bg-gradient-to-br from-orange-100 via-yellow-50 to-amber-100 rounded-2xl shadow-inner"></div>
                                            
                                            <!-- Main product image -->
                                            <img src="${finalImageUrl}" 
                                                 alt="${item.productName || 'Sản phẩm'}" 
                                                 class="relative w-full h-full object-contain rounded-2xl p-2 group-hover:scale-110 transition-all duration-500 filter drop-shadow-sm"
                                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                                 onload="console.log('✅ Image loaded successfully:', this.src); this.classList.add('animate-fade-in');"
                                                 data-original-url="${productImageURL}"
                                                 data-final-url="${finalImageUrl}">
                                            
                                            <!-- Fallback với cute avatar style -->
                                            <div class="relative w-full h-full bg-gradient-to-br from-orange-100 via-yellow-50 to-amber-100 rounded-2xl flex items-center justify-center" style="display: none;">
                                                <div class="text-center p-2">
                                                    <!-- Cute product icon như trong design -->
                                                    <div class="w-8 h-8 mx-auto mb-1 bg-orange-200 rounded-full flex items-center justify-center">
                                                        <i class="fas fa-box text-orange-600 text-sm"></i>
                                                    </div>
                                                    <p class="text-xs text-orange-600 font-medium">Sản phẩm</p>
                                                </div>
                                            </div>
                                            
                                            <!-- Loading spinner overlay -->
                                            <div class="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center" id="loading-${index}" style="display: none;">
                                                <div class="animate-spin rounded-full h-6 w-6 border-2 border-orange-300 border-t-orange-600"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <!-- ✨ Product Details với layout đẹp -->
                                    <div class="flex-1 space-y-4">
                                        <div class="text-center lg:text-left">
                                            <h5 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                ${item.productName || 'Tên sản phẩm không xác định'}
                                            </h5>
                                            <div class="flex items-center justify-center lg:justify-start space-x-2">
                                                <i class="fas fa-tag text-purple-500"></i>
                                                <p class="text-sm font-medium text-gray-600">${item.categoryName || 'Danh mục: N/A'}</p>
                                            </div>
                                        </div>
                                        
                                        <!-- ✨ Pricing table với gradient -->
                                        <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                            <div class="grid grid-cols-3 gap-4 text-center">
                                                <div class="space-y-1">
                                                    <div class="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                                                        <i class="fas fa-cubes text-blue-500"></i>
                                                        <p class="text-xs font-medium">Số lượng</p>
                                                    </div>
                                                    <p class="text-lg font-bold text-blue-600">${item.quantity || 0}</p>
                                                </div>
                                                
                                                <div class="space-y-1 border-x border-gray-200">
                                                    <div class="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                                                        <i class="fas fa-money-bill text-green-500"></i>
                                                        <p class="text-xs font-medium">Đơn giá</p>
                                                    </div>
                                                    <p class="text-lg font-bold text-green-600">${this.formatCurrency(item.unitPrice || 0)}</p>
                                                </div>
                                                
                                                <div class="space-y-1">
                                                    <div class="flex items-center justify-center space-x-1 text-gray-600 mb-1">
                                                        <i class="fas fa-calculator text-purple-500"></i>
                                                        <p class="text-xs font-medium">Thành tiền</p>
                                                    </div>
                                                    <p class="text-lg font-bold text-purple-600">${this.formatCurrency(itemTotal)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <!-- ✨ Status badge với icon tương ứng -->
                                        ${hasValidImage ? 
                                            `` : 
                                            `<div class="flex items-center justify-center lg:justify-start space-x-2 text-xs bg-orange-50 border border-orange-200 px-3 py-2 rounded-xl">
                                                <div class="w-2 h-2 bg-orange-500 rounded-full"></div>
                                                <span class="text-orange-700 font-medium">Sử dụng ảnh mặc định</span>
                                             </div>`
                                        }
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- 💰 Tổng kết với gradient đẹp -->
            <div class="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-8 text-white shadow-2xl">
                <div class="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
                    <div class="text-center lg:text-left">
                        <h4 class="text-2xl font-bold mb-2">Tổng thanh toán</h4>
                        <p class="text-indigo-200">Bao gồm ${totalItems} sản phẩm</p>
                    </div>
                    
                    <div class="flex items-center space-x-4">
                        <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <i class="fas fa-money-check-alt text-white text-2xl"></i>
                        </div>
                        <div class="text-right">
                            <p class="text-4xl font-bold">${this.formatCurrency(totalAmount)}</p>
                            <p class="text-indigo-200 text-sm">VNĐ</p>
                        </div>
                    </div>
                </div>
            </div>
            
            
                
               
            </div>
        </div>
    `;
    
    console.log('✅ Order modal content updated successfully with beautiful modern design');
}




}
// ============= EXCEL EXPORT FUNCTIONS =============

/**
 * API Configuration for Statistics Excel
 */
const STATISTICS_EXCEL_ENDPOINTS = {
    dashboard: '/api/Statistics/dashboard/excel',
    revenue: '/api/Statistics/revenue/excel',
    topProducts: '/api/Statistics/top-products/excel',
    comprehensive: '/api/Statistics/comprehensive-report/excel'
};

/**
 * Trigger Excel download with proper error handling
 */
async function triggerStatisticsExcelDownload(endpoint, params = {}) {
    try {
        console.log(`📊 [EXCEL] Starting download from: ${endpoint}`);
        console.log(`📊 [EXCEL] With params:`, params);
        
        showExcelLoadingState(true);
        
        // ✅ GET TOKEN WITH MULTIPLE FALLBACKS
        const token = window.statisticsManager?.getToken() || 
                     sessionStorage.getItem('authToken') || 
                     sessionStorage.getItem('token') ||
                     localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
        }
        
        // ✅ BUILD URL WITH PARAMS
        const baseUrl = 'https://localhost:7088';
        const fullUrl = new URL(endpoint, baseUrl);
        
        // Add parameters to URL
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                fullUrl.searchParams.append(key, params[key]);
            }
        });
        
        console.log(`📊 [EXCEL] Full URL: ${fullUrl.toString()}`);
        
        // ✅ MAKE REQUEST
        const response = await fetch(fullUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });
        
        console.log(`📊 [EXCEL] Response status: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `Lỗi ${response.status}`;
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            
            throw new Error(`${errorMessage}`);
        }
        
        // ✅ HANDLE FILE DOWNLOAD
        const blob = await response.blob();
        console.log(`📊 [EXCEL] Blob size: ${blob.size} bytes`);
        
        if (blob.size === 0) {
            throw new Error('File Excel trống. Vui lòng thử lại.');
        }
        
        // ✅ EXTRACT FILENAME FROM HEADERS
        const disposition = response.headers.get('content-disposition');
        let filename = 'statistics_report.xlsx';
        
        if (disposition) {
            const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        // ✅ TRIGGER DOWNLOAD
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        
        console.log(`✅ [EXCEL] Download completed: ${filename}`);
        
        // ✅ SHOW SUCCESS MESSAGE
        if (typeof showToast === 'function') {
            showToast(`Đã tải xuống ${filename} thành công!`, 'success');
        }
        
    } catch (error) {
        console.error('❌ [EXCEL] Download error:', error);
        
        let userMessage = 'Có lỗi xảy ra khi tải file Excel';
        if (error.message.includes('404')) {
            userMessage = 'Chức năng xuất Excel đang được phát triển. Vui lòng thử lại sau.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            userMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (error.message.includes('token')) {
            userMessage = 'Lỗi xác thực. Vui lòng đăng nhập lại.';
        } else if (error.message) {
            userMessage = error.message;
        }
        
        if (typeof showToast === 'function') {
            showToast(userMessage, 'error');
        } else {
            alert(userMessage);
        }
        
        throw error;
    } finally {
        showExcelLoadingState(false);
    }
}

/**
 * Show/hide loading state for Excel download
 */
function showExcelLoadingState(isLoading) {
    const buttons = document.querySelectorAll('[data-excel-export]');
    buttons.forEach(button => {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xuất...';
        } else {
            button.disabled = false;
            // Restore original text based on button type
            const exportType = button.getAttribute('data-excel-export');
            const buttonTexts = {
                'dashboard': '<i class="fas fa-file-excel mr-2"></i>Xuất Dashboard',
                'revenue': '<i class="fas fa-file-excel mr-2"></i>Xuất Doanh Thu',
                'products': '<i class="fas fa-file-excel mr-2"></i>Xuất Sản Phẩm',
                'comprehensive': '<i class="fas fa-download mr-2"></i>Xuất Báo Cáo Tổng Hợp'
            };
            button.innerHTML = buttonTexts[exportType] || '<i class="fas fa-file-excel mr-2"></i>Xuất Excel';
        }
    });
}

/**
 * Export dashboard to Excel
 */
function exportDashboardExcel() {
    console.log('📊 Exporting dashboard to Excel...');
    triggerStatisticsExcelDownload(STATISTICS_EXCEL_ENDPOINTS.dashboard);
}

/**
 * Export revenue stats to Excel
 */
function exportRevenueExcel() {
    console.log('💰 Exporting revenue stats to Excel...');
    
    // Get current filter values from UI if they exist
    const startDate = document.getElementById('revenue-start-date')?.value;
    const endDate = document.getElementById('revenue-end-date')?.value;
    const groupBy = document.getElementById('revenue-group-by')?.value || 'day';

    const params = { groupBy };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    triggerStatisticsExcelDownload(STATISTICS_EXCEL_ENDPOINTS.revenue, params);
}

/**
 * Export top products to Excel
 */
function exportTopProductsExcel() {
    console.log('🏆 Exporting top products to Excel...');
    
    // Get current filter values
    const startDate = document.getElementById('products-start-date')?.value;
    const endDate = document.getElementById('products-end-date')?.value;
    const limit = document.getElementById('products-limit')?.value || 50;
    const categoryId = document.getElementById('products-category')?.value;

    const params = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (categoryId && categoryId !== '') params.categoryId = categoryId;

    triggerStatisticsExcelDownload(STATISTICS_EXCEL_ENDPOINTS.topProducts, params);
}

/**
 * Export comprehensive report to Excel
 */
function exportComprehensiveReport() {
    console.log('📋 Exporting comprehensive report to Excel...');
    
    // Use date range or default to last month
    const startDate = document.getElementById('report-start-date')?.value;
    const endDate = document.getElementById('report-end-date')?.value;

    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    triggerStatisticsExcelDownload(STATISTICS_EXCEL_ENDPOINTS.comprehensive, params);
}

// ============= UPDATE EXISTING EXPORT FUNCTION =============

/**
 * Update the existing exportStatistics method
 */
if (window.SellerStatistics) {
    window.SellerStatistics.prototype.exportStatistics = function() {
        // Show export options modal or use comprehensive report as default
        exportComprehensiveReport();
    };
}

// ============= ADD EVENT LISTENERS =============

/**
 * Initialize export button event listeners
 */
function initializeExportButtons() {
    // Dashboard export
    const dashboardExportBtn = document.getElementById('export-dashboard-btn');
    if (dashboardExportBtn) {
        dashboardExportBtn.setAttribute('data-excel-export', 'dashboard');
        dashboardExportBtn.addEventListener('click', exportDashboardExcel);
    }

    // Revenue export
    const revenueExportBtn = document.getElementById('export-revenue-btn');
    if (revenueExportBtn) {
        revenueExportBtn.setAttribute('data-excel-export', 'revenue');
        revenueExportBtn.addEventListener('click', exportRevenueExcel);
    }

    // Products export
    const productsExportBtn = document.getElementById('export-products-btn');
    if (productsExportBtn) {
        productsExportBtn.setAttribute('data-excel-export', 'products');
        productsExportBtn.addEventListener('click', exportTopProductsExcel);
    }

    // Comprehensive export
    const comprehensiveExportBtn = document.getElementById('export-comprehensive-btn');
    if (comprehensiveExportBtn) {
        comprehensiveExportBtn.setAttribute('data-excel-export', 'comprehensive');
        comprehensiveExportBtn.addEventListener('click', exportComprehensiveReport);
    }

    // Update main export button
    const mainExportBtn = document.getElementById('export-stats-btn');
    if (mainExportBtn) {
        mainExportBtn.removeEventListener('click', window.statisticsManager?.exportStatistics);
        mainExportBtn.addEventListener('click', exportComprehensiveReport);
    }
}

// ============= AUTO-INITIALIZE =============

// Initialize export buttons when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExportButtons);
} else {
    initializeExportButtons();
}

// Also initialize after a delay to catch dynamically added buttons
setTimeout(initializeExportButtons, 1000);
// ============= GLOBAL FUNCTIONS =============

/**
 * Add global debug function
 */
window.debugTokenStorage = function() {
    if (window.statisticsManager) {
        window.statisticsManager.debugTokenStorage();
    }
};

/**
 * Add global refresh function
 */
window.refreshStatistics = function() {
    if (window.statisticsManager) {
        window.statisticsManager.loadAllStatistics();
    }
};
/**
 * Add global refresh functions for individual sections - NEW
 */
window.refreshTopCustomers = function() {
    if (window.statisticsManager) {
        window.statisticsManager.loadTopCustomers();
    }
};

window.refreshProfitAnalysis = function() {
    if (window.statisticsManager) {
        window.statisticsManager.loadProfitAnalysis();
    }
};
/**
 * Ensure Chart.js library is loaded globally 
 */
window.ensureChartJsLoaded = function() {
    if (typeof Chart !== 'undefined') return Promise.resolve();
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Không thể tải Chart.js'));
        document.head.appendChild(script);
    });
};


// ============= INITIALIZATION =============

let statisticsManager = null;

// initializeStatistics() 

function initializeStatistics() {
    if (!statisticsManager) {
        try {
            statisticsManager = new SellerStatistics();
            window.statisticsManager = statisticsManager;
            
            // Expose common methods globally - EXPANDED
            window.refreshOrderStatus = () => statisticsManager.refreshOrderStatus();
            window.loadAllStatistics = () => statisticsManager.loadAllStatistics();
            window.refreshTopCustomers = () => statisticsManager.loadTopCustomers();
            window.refreshProfitAnalysis = () => statisticsManager.loadProfitAnalysis();
            
            console.log('✅ Statistics manager initialized successfully');
        } catch (error) {
            console.error('❌ Không thể khởi tạo statistics manager:', error);
        }
    }
}
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeStatistics);
} else {
    // DOM already loaded
    initializeStatistics();
}

// Also initialize after a short delay to ensure seller.js is loaded
setTimeout(initializeStatistics, 500);