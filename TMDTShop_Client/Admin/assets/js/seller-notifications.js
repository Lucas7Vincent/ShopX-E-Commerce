const SELLER_TARGET_OPTIONS = {
    // Basic targeting cho seller
    'all': 'Tất cả khách hàng',
    'recent': 'Khách hàng gần đây (30 ngày)', 
    'frequent': 'Khách hàng thường xuyên (≥3 đơn)',
    'vip': 'Khách hàng VIP (≥1M)',
    'specific': 'Chọn khách hàng cụ thể'
};
const API_ENDPOINTS = {
    seller: {
        base: '/notifications/seller',
        create: '/notifications/seller',
        list: '/notifications/seller',
        update: (id) => `/notifications/seller/${id}`,
        delete: (id) => `/notifications/seller/${id}`,
        send: (id) => `/notifications/seller/${id}/send`,
        stats: (id) => `/notifications/seller/${id}/stats`,
        recipients: (id) => `/notifications/seller/${id}/recipients`,
        customers: '/notifications/seller/customers',
        templates: '/notifications/seller/notification-templates'
    }
};
/**
 * 
 * API Request Helper with Authentication
 */
async function apiRequest(url, options = {}) {
    try {
        // Get authentication token
        const token = getAuthToken();
        
        // Base URL for API
        const baseUrl = 'https://localhost:7088/api';
        const fullUrl = url.startsWith('https') ? url : `${baseUrl}${url}`;
        
        // Default headers
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Add authentication if token exists
        if (token) {
            defaultHeaders['Authorization'] = `Bearer ${token}`;
        }
        
        // Merge headers
        const headers = {
            ...defaultHeaders,
            ...options.headers
        };
        
        // Make request
        const response = await fetch(fullUrl, {
            ...options,
            headers
        });
        
        // Handle response
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        
        // Return JSON data
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

/**
 * Get authentication token from storage
 */
function getAuthToken() {
    // Try different possible token keys
    const possibleKeys = ['token', 'authToken', 'accessToken', 'bearerToken', 'jwt'];
    
    for (const key of possibleKeys) {
        // Check localStorage first
        let token = localStorage.getItem(key);
        if (token) return token;
        
        // Check sessionStorage
        token = sessionStorage.getItem(key);
        if (token) return token;
    }
    
    return null;
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info', duration = 5000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-lg border-l-4 p-4 transition-all duration-300 transform translate-x-full`;
    
    // Set border color based on type
    const borderColors = {
        success: 'border-green-500',
        error: 'border-red-500',
        warning: 'border-yellow-500',
        info: 'border-blue-500'
    };
    
    // Set icon based on type
    const icons = {
        success: 'fas fa-check-circle text-green-500',
        error: 'fas fa-exclamation-circle text-red-500',
        warning: 'fas fa-exclamation-triangle text-yellow-500',
        info: 'fas fa-info-circle text-blue-500'
    };
    
    toast.classList.add(borderColors[type] || borderColors.info);
    
    toast.innerHTML = `
        <div class="flex items-start">
            <div class="flex-shrink-0">
                <i class="${icons[type] || icons.info}"></i>
            </div>
            <div class="ml-3 flex-1">
                <p class="text-sm font-medium text-gray-900">${message}</p>
            </div>
            <div class="ml-4 flex-shrink-0">
                <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                        class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    // Add to DOM
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    // Auto remove
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

/**
 * Format time to Vietnamese format
 */
function formatTime(isoString) {
    if (!isoString || isoString === 'null' || isoString === 'undefined') {
        return 'Không xác định';
    }
    
    try {
        // ✅ PROPER TIMEZONE HANDLING
        let date;
        
        // Check if string already includes timezone info
        if (isoString.includes('Z') || isoString.includes('+') || isoString.includes('-')) {
            date = new Date(isoString);
        } else {
            // Assume UTC if no timezone info
            date = new Date(isoString + 'Z');
        }
        
        // Validate date
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', isoString);
            return 'Ngày không hợp lệ';
        }
        
        // ✅ RELATIVE TIME CALCULATION (in Vietnam timezone)
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        // Return relative time for recent dates
        if (diffMinutes < 1) return 'Vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 7) return `${diffDays} ngày trước`;
        
        // ✅ VIETNAM TIMEZONE FORMATTING
        const options = {
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        
        const formatted = date.toLocaleString('vi-VN', options);
        
        // ✅ FALLBACK FORMATTING if Intl not supported
        if (!formatted || formatted === 'Invalid Date') {
            const vietnamOffset = 7 * 60; // UTC+7
            const localOffset = date.getTimezoneOffset();
            const vietnamTime = new Date(date.getTime() + (vietnamOffset + localOffset) * 60000);
            
            const day = vietnamTime.getDate().toString().padStart(2, '0');
            const month = (vietnamTime.getMonth() + 1).toString().padStart(2, '0');
            const year = vietnamTime.getFullYear();
            const hours = vietnamTime.getHours().toString().padStart(2, '0');
            const minutes = vietnamTime.getMinutes().toString().padStart(2, '0');
            
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
        
        return formatted;
        
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Lỗi định dạng ngày';
    }
}
/**
 * Format money to Vietnamese currency
 */
function formatMoney(amount) {
    if (typeof amount !== 'number') return '0đ';
    
    try {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (error) {
        // Fallback formatting
        return amount.toLocaleString('vi-VN') + 'đ';
    }
}

/**
 * Format number with thousand separators
 */
function formatNumber(number) {
    if (typeof number !== 'number') return '0';
    return number.toLocaleString('vi-VN');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Loading state management
 */
function setLoadingState(element, isLoading) {
    if (!element) {
        console.warn('setLoadingState: element is null');
        return;
    }
    
    if (isLoading) {
        // ✅ STORE ORIGINAL STATE
        if (!element.hasAttribute('data-original-disabled')) {
            element.setAttribute('data-original-disabled', element.disabled);
        }
        if (!element.hasAttribute('data-original-text')) {
            element.setAttribute('data-original-text', element.innerHTML);
        }
        
        // ✅ SET LOADING STATE
        element.disabled = true;
        element.classList.add('opacity-50', 'cursor-not-allowed');
        
        // Add loading spinner for buttons
        if (element.tagName === 'BUTTON') {
            const originalText = element.innerHTML;
            const buttonText = originalText.includes('Lưu nháp') ? 'Đang lưu...' : 
                              originalText.includes('Gửi') ? 'Đang gửi...' : 'Đang xử lý...';
            
            element.innerHTML = `
                <div class="flex items-center justify-center">
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ${buttonText}
                </div>
            `;
        }
    } else {
        // ✅ RESTORE ORIGINAL STATE
        const originalDisabled = element.getAttribute('data-original-disabled');
        const originalText = element.getAttribute('data-original-text');
        
        element.disabled = originalDisabled === 'true';
        element.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Restore original text
        if (originalText && element.tagName === 'BUTTON') {
            element.innerHTML = originalText;
        }
        
        // ✅ CLEAN UP ATTRIBUTES
        element.removeAttribute('data-original-disabled');
        element.removeAttribute('data-original-text');
    }
}
// ✅ THÊM FUNCTION MỚI - View Notification Detail

async function viewNotification(id) {
    try {
        // Method 1: Tìm trong cache trước (nhanh hơn)
        let notification = null;
        
        if (window.sellerNotificationManager) {
            notification = window.sellerNotificationManager.notifications.find(n => n.notificationID === id);
        }
        
        // Method 2: Nếu không có trong cache, gọi API
        if (!notification) {
            console.log('📥 Loading notification from API...');
            try {
                notification = await apiRequest(`/notifications/seller/${id}`);
            } catch (error) {
                // Fallback: nếu lỗi API, dùng data từ table
                console.warn('⚠️ API failed, using cached data');
                notification = window.sellerNotificationManager?.notifications.find(n => n.notificationID === id);
            }
        }
        
        if (!notification) {
            showToast('Không tìm thấy thông báo', 'error');
            return;
        }
        
        // Show view modal
        window.sellerNotificationManager.showViewModal(notification);
        
    } catch (error) {
        console.error('❌ Error viewing notification:', error);
        showToast('Không thể xem chi tiết thông báo', 'error');
    }
}

// ============================================
// SELLER NOTIFICATION MANAGER CLASS
// ============================================

class SellerNotificationManager {
    constructor() {
        this.notifications = [];
        this.customers = [];
        this.templates = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.editingNotificationId = null;
        this.init();
    }

    async init() {
        // ✅ PREVENT DUPLICATE INITIALIZATION
        if (this.isInitialized) {
            console.log('⚠️ Already initialized, skipping');
            return;
        }
        
        this.isInitialized = true;
        this.isSaving = false; // Initialize saving flag
        
        try {
            console.log('🔔 Initializing Seller Notification Manager...');
            
            // ✅ LOAD DEPENDENCIES SEQUENTIALLY
            await this.loadTemplates();
            await this.loadCustomers();
            await this.loadNotifications();
            
            // ✅ SETUP UI COMPONENTS
            this.setupEventListeners();
            this.setupPreview();
            
            console.log('✅ Seller Notification Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Error initializing notification manager:', error);
            showToast('Không thể tải dữ liệu thông báo', 'error');
            this.isInitialized = false; // Allow retry
        }
    }
    
    // ✅ ADD CLEANUP METHOD
    cleanup() {
        console.log('🧹 Cleaning up Seller Notification Manager...');
        
        this.removeEventListeners();
        this.isInitialized = false;
        this.isSaving = false;
        this.editingNotificationId = null;
        
        // Clear data
        this.notifications = [];
        this.customers = [];
        this.templates = [];
    }
    async loadNotifications() {
        try {
            console.log(`🔄 [LOAD] Loading notifications - Page: ${this.currentPage}, Size: ${this.pageSize}`);
            
            // Build query parameters
            const params = new URLSearchParams({
                pageNumber: this.currentPage.toString(),
                pageSize: this.pageSize.toString()
            });
    
            // Add search parameter
            const searchTerm = document.getElementById('notification-search')?.value?.trim();
            if (searchTerm) {
                params.append('search', searchTerm);
            }
    
            // Add type filter
            const typeFilter = document.getElementById('notification-type-filter')?.value;
            if (typeFilter) {
                params.append('type', typeFilter);
            }
    
            console.log(`🔍 [LOAD] Request params:`, Object.fromEntries(params));
    
            // ✅ ENHANCED API CALL với PROPER ERROR HANDLING
            const response = await apiRequest(`${API_ENDPOINTS.seller.list}?${params.toString()}`);
            
            console.log(`✅ [LOAD] API Response:`, {
                hasResponse: !!response,
                type: typeof response,
                keys: response ? Object.keys(response) : 'null',
                notificationsCount: response?.notifications?.length || 0,
                currentPage: response?.currentPage,
                totalPages: response?.totalPages,
                totalCount: response?.totalCount
            });
    
            // ✅ VALIDATE RESPONSE STRUCTURE
            if (!response) {
                throw new Error('Empty response from server');
            }
    
            // ✅ HANDLE RESPONSE FORMAT
            let notifications = [];
            let totalPages = 1;
            let totalCount = 0;
            let currentPage = this.currentPage;
    
            if (response.notifications && Array.isArray(response.notifications)) {
                // ✅ STANDARD FORMAT từ Controller
                notifications = response.notifications;
                totalCount = response.totalCount || 0;
                currentPage = response.currentPage || this.currentPage;
                totalPages = response.totalPages || Math.max(1, Math.ceil(totalCount / this.pageSize));
            } else if (Array.isArray(response)) {
                // ✅ FALLBACK: Direct array
                notifications = response;
                totalCount = response.length;
                totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));
            } else {
                console.warn('⚠️ [LOAD] Unexpected response format:', response);
                notifications = [];
                totalCount = 0;
                totalPages = 1;
            }
    
            console.log(`📊 [LOAD] Processed data:`, {
                notificationsLoaded: notifications.length,
                currentPage: currentPage,
                totalPages: totalPages,
                totalCount: totalCount
            });
    
            // ✅ UPDATE INSTANCE PROPERTIES với VALIDATION
            this.notifications = notifications || [];
            this.currentPage = Math.max(1, currentPage);
            this.totalPages = Math.max(1, totalPages);
            this.totalCount = Math.max(0, totalCount);
    
            // ✅ VALIDATE CURRENT PAGE
            if (this.currentPage > this.totalPages && this.totalPages > 0) {
                console.warn(`⚠️ [LOAD] Current page ${this.currentPage} > total pages ${this.totalPages}, adjusting...`);
                this.currentPage = this.totalPages;
                return this.loadNotifications(); // Recursive call with correct page
            }
    
            // ✅ RENDER COMPONENTS in correct order
            this.renderNotifications();
            this.renderPagination();
            this.updateUIIndicators(this.totalCount);
    
            console.log(`✅ [LOAD] Successfully loaded and rendered notifications`);
    
        } catch (error) {
            console.error('❌ [LOAD] Error loading notifications:', error);
            
            // ✅ ENHANCED ERROR HANDLING
            this.notifications = [];
            this.currentPage = 1;
            this.totalPages = 1;
            this.totalCount = 0;
            
            // Show safe error state
            this.renderNotifications();
            this.renderPagination();
            
            // Show error toast
            let errorMessage = 'Không thể tải danh sách thông báo';
            if (error.message.includes('401')) {
                errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Bạn không có quyền truy cập chức năng này.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau.';
            }
            
            showToast(errorMessage, 'error');
        }
    }
// ✅ THÊM METHOD MỚI: updateUIIndicators
updateUIIndicators(totalCount) {
    // Update any additional UI indicators
    const countElements = document.querySelectorAll('[data-notification-count]');
    countElements.forEach(el => {
        el.textContent = totalCount;
    });
    
    // Update page title if needed
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && pageTitle.textContent.includes('Thông báo')) {
        const baseTitle = 'Quản lý thông báo';
        pageTitle.textContent = totalCount > 0 ? `${baseTitle} (${totalCount})` : baseTitle;
    }
    
    console.log(`📊 [UI] Updated indicators with count: ${totalCount}`);
}


renderPagination() {
    const paginationContainer = document.getElementById('notifications-pagination-buttons');
    const paginationInfo = {
        start: document.getElementById('notifications-start'),
        end: document.getElementById('notifications-end'),
        total: document.getElementById('notifications-total')
    };
    
    if (!paginationContainer) {
        console.error('❌ [PAGINATION] Container not found');
        return;
    }

    // ✅ HANDLE EMPTY STATE
    if (this.totalPages <= 0 || this.totalCount === 0) {
        paginationContainer.innerHTML = `
            <span class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-md">
                <i class="fas fa-info-circle mr-2"></i>Không có dữ liệu
            </span>
        `;
        
        if (paginationInfo.start) paginationInfo.start.textContent = '0';
        if (paginationInfo.end) paginationInfo.end.textContent = '0';
        if (paginationInfo.total) paginationInfo.total.textContent = '0';
        return;
    }

    // ✅ BUILD PAGINATION HTML (giữ nguyên logic hiện tại)
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += this.currentPage > 1 ? 
        `<button onclick="window.sellerNotificationManager.goToPage(${this.currentPage - 1})" 
                class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 hover:text-gray-700 transition-all duration-150">
            <i class="fas fa-chevron-left"></i>
        </button>` :
        `<button disabled class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-300 rounded-l-md cursor-not-allowed">
            <i class="fas fa-chevron-left"></i>
        </button>`;

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        const isCurrentPage = i === this.currentPage;
        paginationHTML += `
            <button onclick="window.sellerNotificationManager.goToPage(${i})" 
                    class="relative inline-flex items-center px-4 py-2 text-sm font-medium transition-all duration-150 ${
                        isCurrentPage 
                            ? 'z-10 bg-blue-600 border-blue-600 text-white' 
                            : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                    }">
                ${i}
            </button>`;
    }

    // Next button
    paginationHTML += this.currentPage < this.totalPages ? 
        `<button onclick="window.sellerNotificationManager.goToPage(${this.currentPage + 1})" 
                class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 hover:text-gray-700 transition-all duration-150">
            <i class="fas fa-chevron-right"></i>
        </button>` :
        `<button disabled class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 bg-gray-100 border border-gray-300 rounded-r-md cursor-not-allowed">
            <i class="fas fa-chevron-right"></i>
        </button>`;

    paginationContainer.innerHTML = paginationHTML;

    // ✅ TÍNH TOÁN ĐÚNG PAGINATION INFO
    const start = this.totalCount > 0 ? (this.currentPage - 1) * this.pageSize + 1 : 0;
    const end = this.totalCount > 0 ? 
        Math.min(start + this.notifications.length - 1, this.totalCount) : 0;

    // ✅ HIỂN THỊ ĐÚNG: start-end của TỔNG SỐ thông báo
    if (paginationInfo.start) paginationInfo.start.textContent = start.toString();
    if (paginationInfo.end) paginationInfo.end.textContent = end.toString();
    if (paginationInfo.total) paginationInfo.total.textContent = this.totalCount.toString();

    console.log(`📊 [PAGINATION] Updated: ${start}-${end}/${this.totalCount} (showing ${this.notifications.length} notifications on page ${this.currentPage})`);

    this.updateMobileButtons();
}

renderTargetDisplay(notification) {
    const targetText = this.getTargetText(notification.targetAudience);
    const hasRecipients = notification.status === 'sent' && notification.totalSent > 0;
    
    if (hasRecipients) {
        return `
            <div class="flex flex-col space-y-1">
                <span class="text-sm text-gray-900">${targetText}</span>
                <button onclick="showRecipientList(${notification.notificationID})" 
                        class="text-xs text-blue-600 hover:text-blue-800 hover:underline text-left transition-colors">
                    <i class="fas fa-users mr-1"></i>
                    Xem ${notification.totalSent} người nhận với thống kê chi tiết
                </button>
            </div>
        `;
    } else {
        return `
            <div class="text-sm text-gray-600">
                <i class="fas fa-target mr-1"></i>
                ${targetText}
            </div>
        `;
    }
}   
// ✅ ENHANCED updateMobileButtons
updateMobileButtons() {
    const prevBtn = document.getElementById('mobile-prev-btn');
    const nextBtn = document.getElementById('mobile-next-btn');
    
    console.log('📱 [MOBILE] Updating buttons:', {
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn,
        currentPage: this.currentPage,
        totalPages: this.totalPages
    });
    
    if (prevBtn) {
        prevBtn.disabled = this.currentPage <= 1;
        prevBtn.onclick = () => {
            if (this.currentPage > 1) {
                console.log('📱 [MOBILE] Previous button clicked');
                this.goToPage(this.currentPage - 1);
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.disabled = this.currentPage >= this.totalPages;
        nextBtn.onclick = () => {
            if (this.currentPage < this.totalPages) {
                console.log('📱 [MOBILE] Next button clicked');
                this.goToPage(this.currentPage + 1);
            }
        };
    }
}

// ✅ ENHANCED goToPage with COMPREHENSIVE DEBUGGING
async goToPage(page) {
    console.log(`📄 [GO_TO_PAGE] Request: ${page}, Current: ${this.currentPage}, Total: ${this.totalPages}`);
    
    // ✅ ENHANCED VALIDATION
    if (typeof page !== 'number' || isNaN(page) || page < 1 || page > this.totalPages) {
        console.warn(`⚠️ [GO_TO_PAGE] Invalid page: ${page} (type: ${typeof page}), valid range: 1-${this.totalPages}`);
        return;
    }
    
    if (page === this.currentPage) {
        console.log(`ℹ️ [GO_TO_PAGE] Already on page ${page}, no action needed`);
        return;
    }
    
    // ✅ SHOW LOADING STATE
    const paginationContainer = document.getElementById('notifications-pagination-buttons');
    const originalHTML = paginationContainer?.innerHTML;
    
    console.log('🔄 [GO_TO_PAGE] Starting navigation...', {
        hasContainer: !!paginationContainer,
        originalHTMLLength: originalHTML?.length || 0
    });
    
    if (paginationContainer) {
        paginationContainer.innerHTML = `
            <div class="flex items-center justify-center py-3 space-x-2">
                <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span class="text-sm text-gray-600">Đang tải trang ${page}...</span>
            </div>
        `;
    }
    
    try {
        console.log(`🔄 [GO_TO_PAGE] Navigating from page ${this.currentPage} to ${page}...`);
        
        // ✅ UPDATE STATE AND LOAD
        const previousPage = this.currentPage;
        this.currentPage = page;
        
        await this.loadNotifications();
        
        // ✅ SCROLL TO NOTIFICATIONS SECTION
        const notificationsSection = document.getElementById('notifications-section');
        if (notificationsSection) {
            notificationsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            console.log('📍 [GO_TO_PAGE] Scrolled to notifications section');
        }
        
        console.log(`✅ [GO_TO_PAGE] Navigation completed successfully to page ${page}`);
        
    } catch (error) {
        console.error(`❌ [GO_TO_PAGE] Navigation failed to page ${page}:`, error);
        
        // ✅ REVERT STATE
        this.currentPage = previousPage;
        
        // ✅ RESTORE PAGINATION
        if (paginationContainer && originalHTML) {
            paginationContainer.innerHTML = originalHTML;
            console.log('🔄 [GO_TO_PAGE] Restored original pagination HTML');
        } else {
            this.renderPagination();
            console.log('🔄 [GO_TO_PAGE] Re-rendered pagination');
        }
        
        showToast(`Không thể tải trang ${page}. Vui lòng thử lại.`, 'error');
    }
}
    async loadCustomers() {
        try {
            const response = await apiRequest(API_ENDPOINTS.seller.customers);
            this.customers = response || [];
            
            this.renderCustomerList();
            console.log(`✅ Loaded ${this.customers.length} customers`);
        } catch (error) {
            console.error('❌ Error loading customers:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await apiRequest(API_ENDPOINTS.seller.templates);
            this.templates = response || [];
            
            this.renderTemplateOptions();
            console.log(`✅ Loaded ${this.templates.length} templates`);
        } catch (error) {
            console.error('❌ Error loading templates:', error);
        }
    }
    renderNotifications() {
    const tbody = document.getElementById('notifications-table-body');
    if (!tbody) {
        console.error('❌ [RENDER] Table body not found');
        return;
    }

    if (this.notifications.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-bell-slash text-4xl text-gray-300 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Chưa có thông báo nào</h3>
                        <p class="text-gray-500">Tạo thông báo đầu tiên để gửi đến khách hàng của bạn</p>
                        <button onclick="window.sellerNotificationManager.openNotificationModal()" 
                                class="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-plus mr-2"></i>Tạo thông báo
                        </button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = this.notifications.map(notification => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
                <div class="flex items-start space-x-3">
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <i class="fas ${notification.icon || 'fa-bell'} text-blue-600"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(notification.title)}</p>
                        <p class="text-xs text-gray-500 truncate">${this.stripHtml(notification.content).substring(0, 60)}...</p>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getTypeBadgeClass(notification.type)}">
                    ${this.getTypeText(notification.type)}
                </span>
            </td>
            <td class="px-6 py-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getStatusBadgeClass(notification.status)}">
                    ${this.getStatusText(notification.status)}
                </span>
            </td>
            <td class="px-6 py-4">
                <!-- ✅ SỬ DỤNG renderTargetDisplay METHOD -->
                ${this.renderTargetDisplay(notification)}
            </td>
            <td class="px-6 py-4">
                ${notification.status === 'sent' ? `
                    <div class="text-sm">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-gray-600">Gửi:</span>
                            <span class="font-medium text-blue-600">${notification.totalSent || 0}</span>
                        </div>
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-gray-600">Đọc:</span>
                            <span class="font-medium text-green-600">${notification.totalRead || 0}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-gray-600">Tỷ lệ:</span>
                            <span class="font-medium text-purple-600">${notification.totalSent > 0 ? Math.round((notification.totalRead || 0) / notification.totalSent * 100) : 0}%</span>
                        </div>
                    </div>
                ` : `
                    <span class="text-gray-400 text-sm">Chưa gửi</span>
                `}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
                <div class="flex flex-col">
                    <span class="text-gray-900">${formatTime(notification.createdAt)}</span>
                    ${notification.sentAt ? `<span class="text-green-600 text-xs">Gửi: ${formatTime(notification.sentAt)}</span>` : ''}
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                    <!-- ⭐ VIEW ACTION CHO TẤT CẢ -->
                    <button onclick="viewNotification(${notification.notificationID})" 
                            class="text-blue-600 hover:text-blue-900 text-sm p-1 hover:bg-blue-50 rounded transition" 
                            title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    
                    ${notification.status === 'draft' ? `
                        <button onclick="editNotification(${notification.notificationID})" 
                                class="text-green-600 hover:text-green-900 text-sm p-1 hover:bg-green-50 rounded transition" 
                                title="Chỉnh sửa">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="sendNotification(${notification.notificationID})" 
                                class="text-purple-600 hover:text-purple-900 text-sm p-1 hover:bg-purple-50 rounded transition" 
                                title="Gửi ngay">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button onclick="deleteNotification(${notification.notificationID})" 
                                class="text-red-600 hover:text-red-900 text-sm p-1 hover:bg-red-50 rounded transition" 
                                title="Xóa">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : `
                        <button onclick="viewNotificationStats(${notification.notificationID})" 
                                class="text-orange-600 hover:text-orange-900 text-sm p-1 hover:bg-orange-50 rounded transition" 
                                title="Xem thống kê">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');

    console.log(`✅ [RENDER] Rendered ${this.notifications.length} notifications`);
}
    renderTemplateOptions() {
        const select = document.getElementById('notification-template');
        if (!select) return;

        const templateHTML = this.templates.map(template => `
            <option value="${template.type}" data-title="${template.titleTemplate}" data-content="${template.contentTemplate}" data-icon="${template.icon}">
                ${template.name}
            </option>
        `).join('');

        select.innerHTML = `<option value="">Tạo từ đầu</option>${templateHTML}`;
    }

    renderCustomerList() {
        const container = document.getElementById('customer-list');
        if (!container) return;

        container.innerHTML = this.customers.map(customer => `
            <label class="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded">
                <input type="checkbox" value="${customer.userID}" class="customer-checkbox">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-gray-900 truncate">${customer.userName}</span>
                        <span class="text-xs px-2 py-1 rounded-full ${this.getCustomerTypeBadgeClass(customer.customerType)}">
                            ${customer.customerType}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${customer.totalOrders} đơn • ${formatMoney(customer.totalSpent)}
                    </div>
                </div>
            </label>
        `).join('');
    }
    
    setupEventListeners() {
        this.removeEventListeners();
        
        // Modal controls
        const createBtn = document.getElementById('create-notification-btn');
        const closeBtn = document.getElementById('close-notification-modal');
        const cancelBtn = document.getElementById('cancel-notification');
        
        // ✅ STORE BOUND FUNCTIONS để có thể remove later
        this.boundEventHandlers = {
            openModal: () => this.openNotificationModal(),
            closeModal: () => this.closeNotificationModal(),
            cancelModal: () => this.closeNotificationModal(),
            saveDraft: (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveNotification('draft');
            },
            sendNotification: (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.saveNotification('send');
            },
            searchClick: () => {
                this.currentPage = 1; // Reset to first page
                this.loadNotifications();
            },
            searchEnter: (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.currentPage = 1;
                    this.loadNotifications();
                }
            },
            filterChange: () => {
                this.currentPage = 1;
                this.loadNotifications();
            },
            templateChange: (e) => this.applyTemplate(e.target.value),
            targetChange: (e) => this.handleTargetChange(e.target.value),
            scheduleChange: (e) => {
                const scheduleSection = document.getElementById('schedule-section');
                if (scheduleSection) {
                    if (e.target.checked) {
                        scheduleSection.classList.remove('hidden');
                    } else {
                        scheduleSection.classList.add('hidden');
                    }
                }
            }
        };
        
        // ✅ ADD EVENT LISTENERS WITH BOUND FUNCTIONS
        createBtn?.addEventListener('click', this.boundEventHandlers.openModal);
        closeBtn?.addEventListener('click', this.boundEventHandlers.closeModal);
        cancelBtn?.addEventListener('click', this.boundEventHandlers.cancelModal);
        
        // Form controls - ✅ PREVENT DUPLICATE CALLS
        const saveDraftBtn = document.getElementById('save-draft-notification');
        const sendBtn = document.getElementById('send-notification');
        
        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', this.boundEventHandlers.saveDraft);
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', this.boundEventHandlers.sendNotification);
        }
        
        // Search and filter
        const searchBtn = document.getElementById('search-notifications-btn');
        const searchInput = document.getElementById('notification-search');
        const typeFilter = document.getElementById('notification-type-filter');
        
        searchBtn?.addEventListener('click', this.boundEventHandlers.searchClick);
        searchInput?.addEventListener('keypress', this.boundEventHandlers.searchEnter);
        typeFilter?.addEventListener('change', this.boundEventHandlers.filterChange);
        
        // Template and target
        const templateSelect = document.getElementById('notification-template');
        const targetSelect = document.getElementById('target-customers');
        const scheduleCheckbox = document.getElementById('schedule-notification');
        
        templateSelect?.addEventListener('change', this.boundEventHandlers.templateChange);
        targetSelect?.addEventListener('change', this.boundEventHandlers.targetChange);
        scheduleCheckbox?.addEventListener('change', this.boundEventHandlers.scheduleChange);
        
        // Character counting
        this.setupCharacterCounting();
        
        console.log('✅ Event listeners setup completed (with duplicate prevention)');
    }
    removeEventListeners() {
        if (!this.boundEventHandlers) return;
        
        // Remove existing event listeners
        const elements = [
            { id: 'create-notification-btn', handler: 'openModal' },
            { id: 'close-notification-modal', handler: 'closeModal' },
            { id: 'cancel-notification', handler: 'cancelModal' },
            { id: 'save-draft-notification', handler: 'saveDraft' },
            { id: 'send-notification', handler: 'sendNotification' },
            { id: 'search-notifications-btn', handler: 'searchClick' },
            { id: 'notification-search', handler: 'searchEnter' },
            { id: 'notification-type-filter', handler: 'filterChange' },
            { id: 'notification-template', handler: 'templateChange' },
            { id: 'target-customers', handler: 'targetChange' },
            { id: 'schedule-notification', handler: 'scheduleChange' }
        ];
        
        elements.forEach(({ id, handler }) => {
            const element = document.getElementById(id);
            const boundHandler = this.boundEventHandlers[handler];
            
            if (element && boundHandler) {
                element.removeEventListener('click', boundHandler);
                element.removeEventListener('keypress', boundHandler);
                element.removeEventListener('change', boundHandler);
            }
        });
    }
    setupCharacterCounting() {
        const titleInput = document.getElementById('notification-title');
        const contentTextarea = document.getElementById('notification-content');
        const titleCount = document.getElementById('title-count');
        const contentCount = document.getElementById('content-count');

        titleInput?.addEventListener('input', (e) => {
            if (titleCount) titleCount.textContent = e.target.value.length;
            this.updatePreview();
        });

        contentTextarea?.addEventListener('input', (e) => {
            if (contentCount) contentCount.textContent = e.target.value.length;
            this.updatePreview();
        });
    }

    setupPreview() {
        // Update preview when form fields change
        ['notification-title', 'notification-content', 'notification-type', 'action-text'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this.updatePreview());
        });
    }

    updatePreview() {
        const title = document.getElementById('notification-title')?.value || 'Tiêu đề thông báo';
        const content = document.getElementById('notification-content')?.value || 'Nội dung thông báo sẽ hiển thị ở đây...';
        const type = document.getElementById('notification-type')?.value;
        const actionText = document.getElementById('action-text')?.value;

        // Update preview elements
        document.getElementById('preview-title').textContent = title;
        document.getElementById('preview-content').textContent = content;
        
        // Update icon based on type
        const iconMap = {
            promotion: 'fa-percentage',
            new_product: 'fa-star',
            restock: 'fa-box',
            thank_you: 'fa-heart',
            seasonal: 'fa-gift',
            announcement: 'fa-bullhorn'
        };
        
        const previewIcon = document.getElementById('preview-icon');
        if (previewIcon) {
            previewIcon.className = `fas ${iconMap[type] || 'fa-store'} text-blue-600`;
        }

        // Show/hide action button
        const previewAction = document.getElementById('preview-action');
        if (previewAction) {
            if (actionText) {
                previewAction.classList.remove('hidden');
                previewAction.querySelector('button').textContent = actionText + ' →';
            } else {
                previewAction.classList.add('hidden');
            }
        }
    }

    applyTemplate(templateType) {
        if (!templateType) return;

        const template = this.templates.find(t => t.type === templateType);
        if (!template) return;

        // Apply template values
        document.getElementById('notification-title').value = template.titleTemplate;
        document.getElementById('notification-content').value = template.contentTemplate;
        document.getElementById('notification-type').value = template.type;

        // Update character counts
        document.getElementById('title-count').textContent = template.titleTemplate.length;
        document.getElementById('content-count').textContent = template.contentTemplate.length;

        this.updatePreview();
    }

    handleTargetChange(target) {
        console.log(`🎯 [TARGET] Target changed to: ${target}`);
        
        const specificSection = document.getElementById('specific-customers-section');
        
        if (target === 'specific') {
            specificSection?.classList.remove('hidden');
            console.log('✅ [TARGET] Specific customers section shown');
            
            // ✅ ENSURE CUSTOMER LIST IS LOADED
            if (this.customers.length === 0) {
                console.log('🔄 [TARGET] Loading customers for specific selection...');
                this.loadCustomers();
            }
        } else {
            specificSection?.classList.add('hidden');
            console.log('✅ [TARGET] Specific customers section hidden');
            
            // ✅ CLEAR SPECIFIC SELECTIONS when changing to non-specific
            const checkboxes = document.querySelectorAll('.customer-checkbox:checked');
            checkboxes.forEach(cb => cb.checked = false);
            console.log(`🧹 [TARGET] Cleared ${checkboxes.length} specific customer selections`);
        }
    
        // ✅ UPDATE: Seller target count calculation
        this.updateTargetCount(target);
    }

    updateTargetCount(target) {
        let count = 0;
    
        // ✅ UPDATE: Seller-specific target counting
        switch (target) {
            case 'all':
                count = this.customers.length;
                break;
            case 'recent':
                count = this.customers.filter(c => {
                    if (!c.lastOrderDate) return false;
                    const lastOrderDays = Math.floor((new Date() - new Date(c.lastOrderDate)) / (1000 * 60 * 60 * 24));
                    return lastOrderDays <= 30;
                }).length;
                break;
            case 'frequent':
                count = this.customers.filter(c => (c.totalOrders || 0) >= 3).length;
                break;
            case 'vip':
                count = this.customers.filter(c => (c.totalSpent || 0) >= 1000000).length;
                break;
            case 'specific':
                count = document.querySelectorAll('.customer-checkbox:checked').length;
                break;
            default:
                count = 0;
        }
    
        const targetCountElement = document.getElementById('target-count');
        if (targetCountElement) {
            targetCountElement.textContent = count;
        }
    }

    async saveNotification(action) {
        if (this.isSaving) {
            console.log('⚠️ Save already in progress, ignoring duplicate call');
            return;
        }
        
        this.isSaving = true;
        
        const saveButton = document.getElementById(action === 'send' ? 'send-notification' : 'save-draft-notification');
        const allButtons = document.querySelectorAll('#notification-modal button');
        
        try {
            console.log(`💾 [SAVE] Starting save process: ${action}`);
            
            // ✅ DISABLE ALL BUTTONS
            allButtons.forEach(btn => setLoadingState(btn, true));
            
            // ✅ VALIDATE FORM
            const formData = this.getFormData();
            console.log('📋 [SAVE] Form data:', formData);
            
            if (!this.validateForm(formData)) {
                return; // Validation error already shown
            }
            
            // ✅ ENHANCED VALIDATION for specific customers
            if (formData.targetCustomers === 'specific') {
                if (!formData.specificCustomerIds || formData.specificCustomerIds.length === 0) {
                    showToast('Vui lòng chọn ít nhất một khách hàng để gửi thông báo', 'error');
                    return;
                }
                console.log(`🎯 [SAVE] Specific targeting: ${formData.specificCustomerIds.length} customers selected`);
                console.log(`🎯 [SAVE] Customer IDs: [${formData.specificCustomerIds.join(', ')}]`);
            }
            
            // ✅ PREPARE REQUEST DATA with PROPER LOGIC
            const requestData = {
                title: formData.title,
                content: formData.content,
                type: formData.type,
                actionText: formData.actionText,
                actionUrl: formData.actionUrl,
                // ✅ FIX: Send the correct field name based on backend expectation
                targetCustomers: formData.targetCustomers, // Backend expects this field name
                specificCustomerIds: formData.specificCustomerIds, // Backend will use this when targetCustomers === 'specific'
                scheduledAt: formData.scheduledAt
            };
            
            console.log('📤 [SAVE] Request data being sent:', {
                ...requestData,
                specificCustomerIds: requestData.specificCustomerIds?.length || 0,
                targetCustomers: requestData.targetCustomers
            });
            
            let response;
            
            // ✅ CREATE OR UPDATE
            if (this.editingNotificationId) {
                console.log(`📝 [SAVE] Updating notification ${this.editingNotificationId}`);
                response = await apiRequest(`${API_ENDPOINTS.seller.update(this.editingNotificationId)}`, {
                    method: 'PUT',
                    body: JSON.stringify(requestData)
                });
            } else {
                console.log('📝 [SAVE] Creating new notification');
                response = await apiRequest(API_ENDPOINTS.seller.create, {
                    method: 'POST',
                    body: JSON.stringify(requestData)
                });
            }
            
            console.log('✅ [SAVE] Response:', response);
            
            // ✅ SEND IF REQUESTED
            if (action === 'send' && response.notificationID) {
                console.log(`📤 [SEND] Sending notification ${response.notificationID}`);
                
                await apiRequest(`${API_ENDPOINTS.seller.send(response.notificationID)}`, {
                    method: 'POST'
                });
                
                showToast('Thông báo đã được tạo và gửi thành công!', 'success');
            } else {
                const message = this.editingNotificationId ? 
                    'Thông báo đã được cập nhật thành công!' : 
                    'Thông báo đã được lưu thành công!';
                showToast(message, 'success');
            }
            
            // ✅ CLOSE MODAL AND REFRESH
            this.closeNotificationModal();
            
            // ✅ RELOAD NOTIFICATIONS (with delay to ensure server updated)
            setTimeout(() => {
                this.loadNotifications();
            }, 500);
            
        } catch (error) {
            console.error('❌ [SAVE] Error:', error);
            
            let errorMessage = 'Có lỗi xảy ra khi lưu thông báo';
            
            if (error.message.includes('400')) {
                errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
            } else if (error.message.includes('401')) {
                errorMessage = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
            } else if (error.message.includes('403')) {
                errorMessage = 'Bạn không có quyền thực hiện hành động này.';
            } else if (error.message.includes('network')) {
                errorMessage = 'Lỗi kết nối mạng. Vui lòng thử lại.';
            }
            
            showToast(errorMessage, 'error');
            
        } finally {
            // ✅ ALWAYS RESTORE BUTTONS
            allButtons.forEach(btn => setLoadingState(btn, false));
            this.isSaving = false;
            
            console.log('🔄 [SAVE] Process completed, buttons restored');
        }
    }
// Show view notification modal (read-only)
showViewModal(notification) {
    // Create view modal if not exists
    let viewModal = document.getElementById('view-notification-modal');
    if (!viewModal) {
        viewModal = this.createViewModal();
        document.body.appendChild(viewModal);
    }

    // Populate notification data
    this.populateViewModal(notification);
    
    // Show modal
    viewModal.classList.remove('hidden');
}

// Create view notification modal
createViewModal() {
    const modal = document.createElement('div');
    modal.id = 'view-notification-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 hidden';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">
                    <i class="fas fa-eye text-blue-600 mr-2"></i>
                    Chi tiết thông báo
                </h3>
                <button onclick="document.getElementById('view-notification-modal').classList.add('hidden')" 
                        class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="px-6 py-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Left Column: Notification Details -->
                    <div class="space-y-6">
                        <!-- Basic Info -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">Thông tin cơ bản</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Tiêu đề:</label>
                                    <p id="view-title" class="text-sm text-gray-900 mt-1 font-medium"></p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Nội dung:</label>
                                    <p id="view-content" class="text-sm text-gray-900 mt-1 whitespace-pre-wrap"></p>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Loại:</label>
                                        <span id="view-type-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1">
                                            <span id="view-type-text"></span>
                                        </span>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Trạng thái:</label>
                                        <span id="view-status-badge" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1">
                                            <span id="view-status-text"></span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action & Schedule Info -->
                        <div class="bg-blue-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">Hành động & Lịch trình</h4>
                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">Văn bản hành động:</label>
                                    <p id="view-action-text" class="text-sm text-gray-900 mt-1"></p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700">URL hành động:</label>
                                    <p id="view-action-url" class="text-sm text-blue-600 mt-1 break-all"></p>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Ngày tạo:</label>
                                        <p id="view-created-date" class="text-sm text-gray-900 mt-1"></p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700">Ngày gửi:</label>
                                        <p id="view-sent-date" class="text-sm text-gray-900 mt-1"></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Target Audience -->
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h4 class="font-medium text-gray-900 mb-3">Đối tượng nhận</h4>
                            <div>
                                <label class="block text-sm font-medium text-gray-700">Nhóm khách hàng:</label>
                                <p id="view-target-audience" class="text-sm text-gray-900 mt-1"></p>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Preview & Stats -->
                    <div class="space-y-6">
                        <!-- Preview -->
                        <div class="bg-white border border-gray-200 rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-3">Xem trước thông báo</h4>
                            <div class="bg-gray-50 rounded-lg p-4">
                                <div class="flex items-start space-x-3">
                                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <i id="view-preview-icon" class="fas fa-store text-blue-600"></i>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <p id="view-preview-title" class="text-sm font-medium text-gray-900"></p>
                                        <p id="view-preview-content" class="text-xs text-gray-600 mt-1 line-clamp-3"></p>
                                        <div id="view-preview-action" class="mt-2 hidden">
                                            <button class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition">
                                                <span id="view-preview-action-text">Xem ngay →</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Stats (if sent) -->
                        <div id="view-stats-section" class="bg-purple-50 p-4 rounded-lg hidden">
                            <h4 class="font-medium text-gray-900 mb-3">Thống kê (nếu đã gửi)</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="text-center">
                                    <div id="view-total-sent" class="text-lg font-bold text-blue-600">0</div>
                                    <div class="text-xs text-gray-600">Tổng gửi</div>
                                </div>
                                <div class="text-center">
                                    <div id="view-total-read" class="text-lg font-bold text-green-600">0</div>
                                    <div class="text-xs text-gray-600">Đã đọc</div>
                                </div>
                            </div>
                            <div class="mt-3 text-center">
                                <div id="view-open-rate" class="text-lg font-bold text-purple-600">0%</div>
                                <div class="text-xs text-gray-600">Tỷ lệ mở</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-between">
                <div id="view-modal-actions" class="flex space-x-2">
                    <!-- Dynamic action buttons will be added here -->
                </div>
                <button onclick="document.getElementById('view-notification-modal').classList.add('hidden')" 
                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                    Đóng
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Populate view modal with notification data
populateViewModal(notification) {
    // Basic info
    document.getElementById('view-title').textContent = notification.title || '';
    document.getElementById('view-content').textContent = notification.content || '';
    
    // Type badge
    const typeBadge = document.getElementById('view-type-badge');
    const typeText = document.getElementById('view-type-text');
    typeBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${this.getTypeBadgeClass(notification.type)}`;
    typeText.textContent = this.getTypeText(notification.type);
    
    // Status badge
    const statusBadge = document.getElementById('view-status-badge');
    const statusText = document.getElementById('view-status-text');
    statusBadge.className = `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${this.getStatusBadgeClass(notification.status)}`;
    statusText.textContent = this.getStatusText(notification.status);
    
    // Action & dates
    document.getElementById('view-action-text').textContent = notification.actionText || 'Không có';
    document.getElementById('view-action-url').textContent = notification.actionUrl || 'Không có';
    document.getElementById('view-created-date').textContent = formatTime(notification.createdAt);
    document.getElementById('view-sent-date').textContent = notification.sentAt ? formatTime(notification.sentAt) : 'Chưa gửi';
    
    // Target audience
    document.getElementById('view-target-audience').textContent = this.getTargetText(notification.targetAudience);
    
    // Preview
    const iconMap = {
        promotion: 'fa-percentage',
        new_product: 'fa-star',
        restock: 'fa-box',
        thank_you: 'fa-heart',
        seasonal: 'fa-gift',
        announcement: 'fa-bullhorn'
    };
    
    document.getElementById('view-preview-icon').className = `fas ${iconMap[notification.type] || 'fa-store'} text-blue-600`;
    document.getElementById('view-preview-title').textContent = notification.title;
    document.getElementById('view-preview-content').textContent = notification.content;
    
    // Preview action
    const previewAction = document.getElementById('view-preview-action');
    const previewActionText = document.getElementById('view-preview-action-text');
    if (notification.actionText) {
        previewAction.classList.remove('hidden');
        previewActionText.textContent = notification.actionText + ' →';
    } else {
        previewAction.classList.add('hidden');
    }
    
    // Stats (if sent)
    const statsSection = document.getElementById('view-stats-section');
    if (notification.status === 'sent') {
        statsSection.classList.remove('hidden');
        document.getElementById('view-total-sent').textContent = notification.totalSent || 0;
        document.getElementById('view-total-read').textContent = notification.totalRead || 0;
        const openRate = notification.totalSent > 0 ? Math.round((notification.totalRead || 0) / notification.totalSent * 100) : 0;
        document.getElementById('view-open-rate').textContent = `${openRate}%`;
    } else {
        statsSection.classList.add('hidden');
    }
    
    // Dynamic action buttons
    const actionsContainer = document.getElementById('view-modal-actions');
    let actionButtons = '';
    
    if (notification.status === 'draft') {
        actionButtons += `
            <button onclick="document.getElementById('view-notification-modal').classList.add('hidden'); editNotification(${notification.notificationID});" 
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                <i class="fas fa-edit mr-1"></i> Chỉnh sửa
            </button>
            <button onclick="document.getElementById('view-notification-modal').classList.add('hidden'); sendNotification(${notification.notificationID});" 
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <i class="fas fa-paper-plane mr-1"></i> Gửi ngay
            </button>
        `;
    } else if (notification.status === 'sent') {
        actionButtons += `
            <button onclick="document.getElementById('view-notification-modal').classList.add('hidden'); viewNotificationStats(${notification.notificationID});" 
                    class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                <i class="fas fa-chart-bar mr-1"></i> Xem thống kê chi tiết
            </button>
        `;
    }
    
    actionsContainer.innerHTML = actionButtons;
}
getFormData() {
    const target = document.getElementById('target-customers').value;
    const specificCustomers = target === 'specific' ? 
        Array.from(document.querySelectorAll('.customer-checkbox:checked')).map(cb => parseInt(cb.value)) : 
        null;

    // ✅ FIX: Validate specific customers selection
    if (target === 'specific' && (!specificCustomers || specificCustomers.length === 0)) {
        console.warn('⚠️ [FORM] Specific target selected but no customers chosen');
    }

    return {
        title: document.getElementById('notification-title').value,
        content: document.getElementById('notification-content').value,
        type: document.getElementById('notification-type').value,
        actionText: document.getElementById('action-text').value || null,
        actionUrl: document.getElementById('action-url').value || null,
        targetCustomers: target,
        specificCustomerIds: specificCustomers,
        scheduledAt: document.getElementById('schedule-notification').checked ? 
            document.getElementById('scheduled-time').value || null : null,
        // ✅ ADD: Debug info
        _debug: {
            targetType: target,
            hasSpecificCustomers: specificCustomers?.length > 0,
            customerCount: specificCustomers?.length || 0
        }
    };
}

validateForm(data) {
    console.log('🔍 [VALIDATE] Validating form data:', data);
    
    if (!data.title?.trim()) {
        showToast('Vui lòng nhập tiêu đề thông báo', 'error');
        return false;
    }

    if (!data.content?.trim()) {
        showToast('Vui lòng nhập nội dung thông báo', 'error');
        return false;
    }

    if (!data.type) {
        showToast('Vui lòng chọn loại thông báo', 'error');
        return false;
    }

    if (!data.targetCustomers) {
        showToast('Vui lòng chọn đối tượng gửi', 'error');
        return false;
    }

    // ✅ ENHANCED VALIDATION for specific customers
    if (data.targetCustomers === 'specific') {
        if (!data.specificCustomerIds || data.specificCustomerIds.length === 0) {
            showToast('Vui lòng chọn ít nhất một khách hàng cụ thể để gửi thông báo', 'error');
            
            // ✅ SHOW SPECIFIC CUSTOMERS SECTION if hidden
            const specificSection = document.getElementById('specific-customers-section');
            if (specificSection && specificSection.classList.contains('hidden')) {
                specificSection.classList.remove('hidden');
                showToast('Phần chọn khách hàng đã được hiển thị. Hãy chọn khách hàng.', 'warning');
            }
            
            return false;
        }
        
        // ✅ VALIDATE CUSTOMER IDs are valid numbers
        const invalidIds = data.specificCustomerIds.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidIds.length > 0) {
            console.error('❌ [VALIDATE] Invalid customer IDs:', invalidIds);
            showToast('Có ID khách hàng không hợp lệ. Vui lòng chọn lại.', 'error');
            return false;
        }
        
        console.log(`✅ [VALIDATE] Specific customers validation passed: ${data.specificCustomerIds.length} customers`);
    }

    console.log('✅ [VALIDATE] All validations passed');
    return true;
}
// ============================================
// THÊM VÀO CLASS SellerNotificationManager
// ============================================

// Edit notification method

// ✅ CẬP NHẬT editNotification method để load đầy đủ data

editNotification(notification) {
    try {
        console.log('🔧 Starting edit notification:', notification);
        
        // Validate notification data
        if (!notification) {
            console.error('❌ No notification data provided');
            showToast('Không tìm thấy dữ liệu thông báo', 'error');
            return;
        }

        // Check if notification can be edited
        if (notification.status !== 'draft') {
            console.warn('⚠️ Cannot edit non-draft notification:', notification.status);
            showToast('Chỉ có thể chỉnh sửa thông báo ở trạng thái nháp', 'warning');
            return;
        }

        // ⭐ POPULATE FORM WITH COMPLETE DATA
        const titleInput = document.getElementById('notification-title');
        const contentInput = document.getElementById('notification-content');
        const typeSelect = document.getElementById('notification-type');
        const actionTextInput = document.getElementById('action-text');
        const actionUrlInput = document.getElementById('action-url');
        
        // Check if form elements exist
        if (!titleInput || !contentInput || !typeSelect) {
            console.error('❌ Form elements not found');
            showToast('Không tìm thấy form. Vui lòng tải lại trang.', 'error');
            return;
        }

        // Fill basic fields
        titleInput.value = notification.title || '';
        contentInput.value = notification.content || '';
        typeSelect.value = notification.type || '';
        
        if (actionTextInput) actionTextInput.value = notification.actionText || '';
        if (actionUrlInput) actionUrlInput.value = notification.actionUrl || '';
        
        console.log('✅ Form fields populated:', {
            title: notification.title,
            content: notification.content,
            type: notification.type,
            actionText: notification.actionText,
            actionUrl: notification.actionUrl
        });
        
        // ⭐ HANDLE TARGET AUDIENCE PROPERLY
        const targetSelect = document.getElementById('target-customers');
        if (targetSelect) {
            const targetAudience = notification.targetAudience || '';
            console.log('🎯 Processing target audience:', targetAudience);
            
            if (targetAudience.includes('_all')) {
                targetSelect.value = 'all';
            } else if (targetAudience.includes('_recent')) {
                targetSelect.value = 'recent';
            } else if (targetAudience.includes('_frequent')) {
                targetSelect.value = 'frequent';
            } else if (targetAudience.includes('_vip')) {
                targetSelect.value = 'vip';
            } else if (targetAudience.includes('_specific')) {
                targetSelect.value = 'specific';
                // Show specific customers section
                const specificSection = document.getElementById('specific-customers-section');
                if (specificSection) {
                    specificSection.classList.remove('hidden');
                }
            } else {
                // Default to 'all' if target audience is unclear
                targetSelect.value = 'all';
            }
            
            console.log('✅ Target audience set:', targetSelect.value);
        }
        
        // ⭐ UPDATE CHARACTER COUNTS
        const titleCount = document.getElementById('title-count');
        const contentCount = document.getElementById('content-count');
        
        if (titleCount) titleCount.textContent = (notification.title || '').length;
        if (contentCount) contentCount.textContent = (notification.content || '').length;
        
        // ⭐ HANDLE SCHEDULED NOTIFICATION
        const scheduleCheckbox = document.getElementById('schedule-notification');
        const scheduleSection = document.getElementById('schedule-section');
        const scheduledTimeInput = document.getElementById('scheduled-time');
        
        if (scheduleCheckbox && scheduleSection && scheduledTimeInput) {
            if (notification.scheduledAt) {
                scheduleCheckbox.checked = true;
                scheduleSection.classList.remove('hidden');
                
                // Convert UTC time to local time for input
                try {
                    const scheduledDate = new Date(notification.scheduledAt);
                    const localDateTime = new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000);
                    scheduledTimeInput.value = localDateTime.toISOString().slice(0, 16);
                    console.log('✅ Scheduled time set:', scheduledTimeInput.value);
                } catch (dateError) {
                    console.error('❌ Error parsing scheduled date:', dateError);
                }
            } else {
                scheduleCheckbox.checked = false;
                scheduleSection.classList.add('hidden');
                scheduledTimeInput.value = '';
            }
        }
        
        // ⭐ UPDATE TARGET COUNT
        if (targetSelect) {
            this.handleTargetChange(targetSelect.value);
        }
        
        // ⭐ SET EDIT MODE
        this.editingNotificationId = notification.notificationID;
        const modalTitle = document.getElementById('notification-modal-title');
        if (modalTitle) {
            modalTitle.textContent = 'Chỉnh sửa thông báo';
        }
        
        // ⭐ SHOW MODAL AND UPDATE PREVIEW
        this.openNotificationModalForEdit();
        this.updatePreview();
        
        console.log('✅ Notification loaded for editing successfully:', notification.notificationID);
        showToast('Đã tải thông tin thông báo để chỉnh sửa', 'success');
        
    } catch (error) {
        console.error('❌ Error in editNotification method:', error);
        showToast('Có lỗi xảy ra khi tải form chỉnh sửa', 'error');
    }
}

// ⭐ THÊM METHOD MỚI: openNotificationModalForEdit
openNotificationModalForEdit() {
    // Don't reset form when editing
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    // Don't call resetForm() here because we want to keep the data
    this.updateTargetCount('all'); // This will be updated by handleTargetChange
    this.updatePreview();
}

// ⭐ CẬP NHẬT openNotificationModal để reset edit mode
openNotificationModal() {
    // Reset edit mode only for new notifications
    this.editingNotificationId = null;
    const modalTitle = document.getElementById('notification-modal-title');
    if (modalTitle) {
        modalTitle.textContent = 'Tạo thông báo mới';
    }
    
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
    
    this.resetForm();
    this.updateTargetCount('all');
    this.updatePreview();
}
// Complete renderPagination implementation



// Show statistics modal
async showStatsModal(notificationId) {
    try {
        // ✅ API: GET /api/notifications/seller/{id}/stats
        const stats = await apiRequest(`/notifications/seller/${notificationId}/stats`);
        
        // Create stats modal if not exists
        let statsModal = document.getElementById('stats-modal');
        if (!statsModal) {
            statsModal = this.createStatsModal();
            document.body.appendChild(statsModal);
        }

        // Populate stats data
        this.populateStats(stats);
        
        // Show modal
        statsModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('❌ Error loading stats:', error);
        showToast('Không thể tải thống kê thông báo', 'error');
    }
}

// Create statistics modal
createStatsModal() {
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 hidden';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <!-- Modal Header -->
            <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-900">Thống kê thông báo</h3>
                <button onclick="document.getElementById('stats-modal').classList.add('hidden')" 
                        class="text-gray-400 hover:text-gray-500">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>

            <!-- Modal Body -->
            <div class="px-6 py-4">
                <!-- Stats Overview -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-blue-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600" id="stats-total-sent">0</div>
                        <div class="text-sm text-gray-600">Tổng gửi</div>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600" id="stats-total-read">0</div>
                        <div class="text-sm text-gray-600">Đã đọc</div>
                    </div>
                    <div class="bg-yellow-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-yellow-600" id="stats-open-rate">0%</div>
                        <div class="text-sm text-gray-600">Tỷ lệ mở</div>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600" id="stats-click-rate">0%</div>
                        <div class="text-sm text-gray-600">Tỷ lệ click</div>
                    </div>
                </div>

                <!-- Notification Details -->
                <div class="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 class="font-medium text-gray-900 mb-3">Chi tiết thông báo</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Tiêu đề:</label>
                            <p id="stats-title" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Loại:</label>
                            <p id="stats-type" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Ngày gửi:</label>
                            <p id="stats-sent-date" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700">Đối tượng:</label>
                            <p id="stats-target" class="text-sm text-gray-900 mt-1"></p>
                        </div>
                    </div>
                </div>

                <!-- Customer Interactions Table -->
                <div class="mb-6">
                    <h4 class="font-medium text-gray-900 mb-3">Tương tác khách hàng</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian đọc</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
                                </tr>
                            </thead>
                            <tbody id="stats-customer-interactions" class="bg-white divide-y divide-gray-200">
                                <!-- Customer interaction data will be populated here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Modal Footer -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button onclick="document.getElementById('stats-modal').classList.add('hidden')" 
                        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                    Đóng
                </button>
            </div>
        </div>
    `;

    return modal;
}

// Populate statistics data
populateStats(stats) {
    // Overview stats
    document.getElementById('stats-total-sent').textContent = stats.totalSent || 0;
    document.getElementById('stats-total-read').textContent = stats.totalRead || 0;
    
    const openRate = stats.totalSent > 0 ? Math.round((stats.totalRead / stats.totalSent) * 100) : 0;
    document.getElementById('stats-open-rate').textContent = `${openRate}%`;
    
    const clickRate = stats.totalClicks ? Math.round((stats.totalClicks / stats.totalSent) * 100) : 0;
    document.getElementById('stats-click-rate').textContent = `${clickRate}%`;

    // Notification details
    document.getElementById('stats-title').textContent = stats.title || '';
    document.getElementById('stats-type').textContent = this.getTypeText(stats.type) || '';
    document.getElementById('stats-sent-date').textContent = stats.sentAt ? formatTime(stats.sentAt) : '';
    document.getElementById('stats-target').textContent = this.getTargetText(stats.targetAudience) || '';

    // Customer interactions
    const interactionsTable = document.getElementById('stats-customer-interactions');
    if (stats.customerInteractions && stats.customerInteractions.length > 0) {
        interactionsTable.innerHTML = stats.customerInteractions.map(interaction => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${interaction.customerName}</div>
                    <div class="text-sm text-gray-500">${interaction.customerEmail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${interaction.isRead ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${interaction.isRead ? '✅ Đã đọc' : '📬 Chưa đọc'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${interaction.readAt ? formatTime(interaction.readAt) : 'Chưa đọc'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${interaction.actionClicked ? '🔗 Đã click' : '⏳ Chưa có hành động'}
                </td>
            </tr>
        `).join('');
    } else {
        interactionsTable.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu tương tác
                </td>
            </tr>
        `;
    }
}



// Update openNotificationModal để reset edit mode
openNotificationModal() {
    // Reset edit mode
    this.editingNotificationId = null;
    document.getElementById('notification-modal-title').textContent = 'Tạo thông báo mới';
    
    document.getElementById('notification-modal')?.classList.remove('hidden');
    this.resetForm();
    this.updateTargetCount('all');
    this.updatePreview();
}
    openNotificationModal() {
        document.getElementById('notification-modal')?.classList.remove('hidden');
        this.resetForm();
        this.updateTargetCount('all');
        this.updatePreview();
    }

    closeNotificationModal() {
        document.getElementById('notification-modal')?.classList.add('hidden');
    }

    resetForm() {
        document.getElementById('notification-form')?.reset();
        document.getElementById('specific-customers-section')?.classList.add('hidden');
        document.getElementById('schedule-section')?.classList.add('hidden');
        document.getElementById('title-count').textContent = '0';
        document.getElementById('content-count').textContent = '0';
        document.querySelectorAll('.customer-checkbox').forEach(cb => cb.checked = false);
    }

    // Utility methods
    getTypeBadgeClass(type) {
        const classes = {
            promotion: 'bg-green-100 text-green-800',
            new_product: 'bg-blue-100 text-blue-800',
            restock: 'bg-yellow-100 text-yellow-800',
            thank_you: 'bg-pink-100 text-pink-800',
            seasonal: 'bg-purple-100 text-purple-800',
            announcement: 'bg-gray-100 text-gray-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    getTypeText(type) {
        const texts = {
            promotion: '🎉 Khuyến mãi',
            new_product: '🆕 Sản phẩm mới',
            restock: '📦 Hàng có sẵn',
            thank_you: '💝 Cảm ơn',
            seasonal: '🌟 Theo mùa',
            announcement: '📢 Thông báo'
        };
        return texts[type] || '📢 Thông báo';
    }

    getStatusBadgeClass(status) {
        const classes = {
            draft: 'bg-gray-100 text-gray-800',
            sent: 'bg-green-100 text-green-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    getStatusText(status) {
        const texts = {
            draft: 'Nháp',
            sent: 'Đã gửi'
        };
        return texts[status] || 'Không xác định';
    }

    getTargetText(audience) {
        // ✅ UPDATE: Seller chỉ có customer targeting, không có seller/admin targeting
        const sellerTargetMap = {
            'all': 'Tất cả khách hàng',
            'recent': 'KH gần đây (30 ngày)',
            'frequent': 'KH thường xuyên (≥3 đơn)', 
            'vip': 'KH VIP (≥1M)',
            'specific': 'KH được chọn'
        };
        
        // Try exact match first
        if (sellerTargetMap[audience]) {
            return sellerTargetMap[audience];
        }
        
        // Fallback for legacy audience strings
        if (audience.includes('all') || audience.includes('customer')) return 'Tất cả KH';
        if (audience.includes('recent')) return 'KH gần đây';
        if (audience.includes('frequent')) return 'KH thường xuyên';
        if (audience.includes('vip')) return 'KH VIP';
        if (audience.includes('specific')) return 'KH được chọn';
        
        return audience || 'Không xác định';
    }

    getCustomerTypeBadgeClass(type) {
        const classes = {
            Regular: 'bg-gray-100 text-gray-800',
            Frequent: 'bg-blue-100 text-blue-800',
            VIP: 'bg-purple-100 text-purple-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    stripHtml(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }


}

// ============================================
// GLOBAL FUNCTIONS WITH ENHANCED ERROR HANDLING
// ============================================
// ✅ CẬP NHẬT showRecipientList để lưu notificationId cho resend
async function showRecipientList(notificationId) {
    try {
        console.log(`📋 Showing enhanced recipient list for notification ${notificationId}`);
        
        const loadingModal = createLoadingModal('Đang tải danh sách người nhận...');
        document.body.appendChild(loadingModal);
        loadingModal.classList.remove('hidden');
        
        const response = await apiRequest(`${API_ENDPOINTS.seller.recipients(notificationId)}`);
        
        loadingModal.remove();
        
        if (!response || !response.recipients) {
            showToast('Không thể tải danh sách người nhận', 'error');
            return;
        }

        let modal = document.getElementById('recipient-list-modal');
        if (!modal) {
            modal = createEnhancedRecipientListModal();
            document.body.appendChild(modal);
        }

        // ✅ LƯU NOTIFICATION ID để dùng cho resend
        modal.setAttribute('data-notification-id', notificationId.toString());

        populateEnhancedRecipientList(response);
        
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.querySelector('.modal-content').classList.add('scale-100');
        }, 50);
        
    } catch (error) {
        console.error('❌ Error showing recipient list:', error);
        
        document.querySelectorAll('.loading-modal').forEach(modal => modal.remove());
        
        let errorMessage = 'Không thể tải danh sách người nhận';
        if (error.message.includes('403')) {
            errorMessage = 'Bạn không có quyền xem danh sách này';
        } else if (error.message.includes('404')) {
            errorMessage = 'Thông báo không tồn tại hoặc chưa được gửi';
        }
        
        showToast(errorMessage, 'error');
    }
}
// ✅ ENHANCED createRecipientListModal với CUSTOMER STATS
function createEnhancedRecipientListModal() {
    const modal = document.createElement('div');
    modal.id = 'recipient-list-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 hidden';
    
    modal.innerHTML = `
        <div class="modal-content bg-white rounded-lg shadow-2xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden transform scale-95 transition-transform duration-300">
            <!-- Enhanced Header với Stats Summary -->
            <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-xl font-semibold flex items-center">
                            <i class="fas fa-users mr-3"></i>
                            Danh sách người nhận
                        </h3>
                        <p id="recipient-notification-title" class="text-blue-100 mt-1 text-sm"></p>
                    </div>
                    <button onclick="closeRecipientModal()" 
                            class="text-white hover:text-gray-200 transition-colors">
                        <i class="fas fa-times text-2xl"></i>
                    </button>
                </div>
                
                <!-- Quick Stats Bar -->
                <div id="recipient-quick-stats" class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <!-- Stats sẽ được populate ở đây -->
                </div>
            </div>

            <!-- Enhanced Body với Filters -->
            <div class="flex flex-col h-full max-h-[70vh]">
                <!-- Filter Controls -->
                <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="flex-1 min-w-48">
                            <input type="text" 
                                   id="recipient-search" 
                                   placeholder="🔍 Tìm theo tên, email..." 
                                   class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <select id="recipient-status-filter" 
                                    class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">📊 Tất cả trạng thái</option>
                                <option value="read">✅ Đã đọc</option>
                                <option value="unread">📬 Chưa đọc</option>
                            </select>
                        </div>
                        <div>
                            <select id="recipient-type-filter" 
                                    class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">👥 Tất cả loại KH</option>
                                <option value="VIP">🌟 VIP</option>
                                <option value="Frequent">🔥 Thân thiết</option>
                                <option value="Regular">👤 Thường</option>
                            </select>
                        </div>
                        <div>
                            <button id="export-recipients-btn" 
                                    class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm">
                                <i class="fas fa-download mr-2"></i>Xuất Excel
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Enhanced Recipient Table -->
                <div class="flex-1 overflow-y-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50 sticky top-0">
                            <tr>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <input type="checkbox" id="select-all-recipients" class="mr-2">
                                    Khách hàng
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Loại KH
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thống kê mua hàng
                                </th>
                                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thời gian
                                </th>
                                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Hành động
                                </th>
                            </tr>
                        </thead>
                        <tbody id="recipient-list-body" class="bg-white divide-y divide-gray-200">
                            <!-- Enhanced recipients sẽ được render ở đây -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ✅ ENHANCED FOOTER - BỎ NÚT PHÂN TÍCH CHI TIẾT -->
            <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <span id="selected-count" class="text-sm text-gray-600">0 người được chọn</span>
                    <div id="bulk-actions" class="hidden flex space-x-2">
                        <button class="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 transition">
                            <i class="fas fa-redo mr-1"></i>Gửi lại hàng loạt
                        </button>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button onclick="closeRecipientModal()" 
                            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    `;

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeRecipientModal();
        }
    });

    return modal;
}
// ✅ ENHANCED populateRecipientList với CUSTOMER STATS và FILTERS
function populateEnhancedRecipientList(data) {
    const { notificationTitle, recipients, totalRecipients, totalRead, totalUnread, readRate } = data;
    
    console.log('📊 Populating enhanced recipient list:', {
        title: notificationTitle,
        total: totalRecipients,
        read: totalRead,
        unread: totalUnread,
        rate: readRate
    });

    // ✅ SET NOTIFICATION TITLE
    document.getElementById('recipient-notification-title').textContent = 
        notificationTitle || 'Thông báo không xác định';

    // ✅ POPULATE QUICK STATS với ENHANCED METRICS
    const quickStats = document.getElementById('recipient-quick-stats');
    quickStats.innerHTML = `
        <div class="text-center">
            <div class="text-2xl font-bold text-white">${totalRecipients}</div>
            <div class="text-xs text-blue-100">Tổng gửi</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-green-300">${totalRead}</div>
            <div class="text-xs text-blue-100">Đã đọc</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-yellow-300">${totalUnread}</div>
            <div class="text-xs text-blue-100">Chưa đọc</div>
        </div>
        <div class="text-center">
            <div class="text-2xl font-bold text-purple-300">${readRate}%</div>
            <div class="text-xs text-blue-100">Tỷ lệ đọc</div>
        </div>
    `;

    // ✅ STORE ORIGINAL DATA for filtering
    window.currentRecipients = recipients;
    
    // ✅ RENDER RECIPIENTS với ENHANCED DISPLAY
    renderFilteredRecipients(recipients);
    
    // ✅ SETUP FILTER EVENT LISTENERS
    setupRecipientFilters();
}

// ✅ ENHANCED renderFilteredRecipients với CUSTOMER STATS
function renderFilteredRecipients(recipients) {
    const tbody = document.getElementById('recipient-list-body');
    
    if (!recipients || recipients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center">
                        <i class="fas fa-users-slash text-4xl text-gray-300 mb-4"></i>
                        <h3 class="text-lg font-medium text-gray-900 mb-2">Không có người nhận</h3>
                        <p class="text-gray-500">Không tìm thấy người nhận phù hợp với bộ lọc</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = recipients.map(recipient => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-4">
                <div class="flex items-center space-x-3">
                    <input type="checkbox" class="recipient-checkbox" value="${recipient.userID}">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            ${getInitials(recipient.customerName)}
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${recipient.customerName}</p>
                            <p class="text-xs text-gray-500">${recipient.email || 'Không có email'}</p>
                            ${recipient.phone ? `<p class="text-xs text-gray-400">${recipient.phone}</p>` : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex flex-col space-y-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCustomerTypeBadgeClass(recipient.customerType)}">
                        ${getCustomerTypeIcon(recipient.customerType)} ${recipient.customerTypeText || recipient.customerType}
                    </span>
                    <span class="text-xs text-gray-500">
                        Tham gia: ${formatTime(recipient.joinedDate)}
                    </span>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex flex-col space-y-1">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        recipient.isRead 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                    }">
                        <span class="w-2 h-2 bg-current rounded-full mr-1.5"></span>
                        ${recipient.isRead ? '✅ Đã đọc' : '📬 Chưa đọc'}
                    </span>
                    ${recipient.isActive ? '' : `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                            ⚠️ Không hoạt động
                        </span>
                    `}
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="text-sm space-y-1">
                    <div class="flex items-center justify-between">
                        <span class="text-gray-600">Đơn hàng:</span>
                        <span class="font-medium text-blue-600">${recipient.totalOrders}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-gray-600">Tổng chi:</span>
                        <span class="font-medium text-green-600">${formatMoney(recipient.totalSpent)}</span>
                    </div>
                    ${recipient.lastOrderDate ? `
                        <div class="text-xs text-gray-500">
                            Mua cuối: ${formatTime(recipient.lastOrderDate)}
                        </div>
                    ` : `
                        <div class="text-xs text-red-500">Chưa có đơn hàng</div>
                    `}
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="text-sm space-y-1">
                    <div>
                        <span class="text-gray-600">Gửi:</span>
                        <span class="text-blue-600 ml-1">${formatTime(recipient.sentAt)}</span>
                    </div>
                    ${recipient.isRead && recipient.readAt ? `
                        <div>
                            <span class="text-gray-600">Đọc:</span>
                            <span class="text-green-600 ml-1">${formatTime(recipient.readAt)}</span>
                        </div>
                        <div class="text-xs text-purple-600">
                            📊 ${getReadTimeStats(recipient.sentAt, recipient.readAt)}
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex items-center justify-center">
                    <!-- ✅ CHỈ GIỮ NÚT GỬI LẠI -->
                    ${!recipient.isRead ? `
                        <button onclick="resendToCustomer(${recipient.userNotificationID})" 
                                class="inline-flex items-center px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 hover:text-orange-800 transition-all duration-150 font-medium"
                                title="Gửi lại thông báo">
                            <i class="fas fa-redo mr-1"></i>Gửi lại
                        </button>
                    ` : `
                        <span class="text-xs text-gray-400 italic">Đã đọc</span>
                    `}
                </div>
            </td>
        </tr>
    `).join('');

    updateSelectionCounter();
}
// ✅ ENHANCED setupRecipientFilters với REAL-TIME FILTERING
function setupRecipientFilters() {
    const searchInput = document.getElementById('recipient-search');
    const statusFilter = document.getElementById('recipient-status-filter');
    const typeFilter = document.getElementById('recipient-type-filter');
    const selectAllCheckbox = document.getElementById('select-all-recipients');
    const exportBtn = document.getElementById('export-recipients-btn');

    // ✅ SEARCH FILTER với DEBOUNCE
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyRecipientFilters();
        }, 300); // 300ms debounce
    });

    // ✅ STATUS và TYPE FILTERS
    statusFilter?.addEventListener('change', applyRecipientFilters);
    typeFilter?.addEventListener('change', applyRecipientFilters);

    // ✅ SELECT ALL FUNCTIONALITY
    selectAllCheckbox?.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.recipient-checkbox');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateSelectionCounter();
    });

    // ✅ INDIVIDUAL CHECKBOX LISTENERS
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('recipient-checkbox')) {
            updateSelectionCounter();
            
            // Update select all checkbox
            const allCheckboxes = document.querySelectorAll('.recipient-checkbox');
            const checkedBoxes = document.querySelectorAll('.recipient-checkbox:checked');
            selectAllCheckbox.indeterminate = checkedBoxes.length > 0 && checkedBoxes.length < allCheckboxes.length;
            selectAllCheckbox.checked = checkedBoxes.length === allCheckboxes.length && allCheckboxes.length > 0;
        }
    });

    // ✅ EXPORT FUNCTIONALITY
    exportBtn?.addEventListener('click', exportRecipientsToExcel);
}

// ✅ ENHANCED applyRecipientFilters với MULTIPLE CRITERIA
function applyRecipientFilters() {
    if (!window.currentRecipients) return;

    const searchTerm = document.getElementById('recipient-search')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('recipient-status-filter')?.value || '';
    const typeFilter = document.getElementById('recipient-type-filter')?.value || '';

    const filteredRecipients = window.currentRecipients.filter(recipient => {
        // ✅ SEARCH FILTER (name, email, phone)
        const matchesSearch = !searchTerm || 
            recipient.customerName.toLowerCase().includes(searchTerm) ||
            (recipient.email && recipient.email.toLowerCase().includes(searchTerm)) ||
            (recipient.phone && recipient.phone.includes(searchTerm));

        // ✅ STATUS FILTER
        const matchesStatus = !statusFilter || 
            (statusFilter === 'read' && recipient.isRead) ||
            (statusFilter === 'unread' && !recipient.isRead);

        // ✅ CUSTOMER TYPE FILTER
        const matchesType = !typeFilter || recipient.customerType === typeFilter;

        return matchesSearch && matchesStatus && matchesType;
    });

    console.log(`🔍 Filtered ${filteredRecipients.length}/${window.currentRecipients.length} recipients`);
    
    renderFilteredRecipients(filteredRecipients);
}
// ✅ ENHANCED UTILITY FUNCTIONS với CUSTOMER STATS

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function getCustomerTypeBadgeClass(type) {
    const classes = {
        'VIP': 'bg-purple-100 text-purple-800',
        'Frequent': 'bg-blue-100 text-blue-800',
        'Regular': 'bg-gray-100 text-gray-800'
    };
    return classes[type] || 'bg-gray-100 text-gray-800';
}

function getCustomerTypeIcon(type) {
    const icons = {
        'VIP': '🌟',
        'Frequent': '🔥',
        'Regular': '👤'
    };
    return icons[type] || '👤';
}

function getReadTimeStats(sentAt, readAt) {
    if (!sentAt || !readAt) return '';
    
    const sent = new Date(sentAt);
    const read = new Date(readAt);
    const diffMs = read - sent;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMinutes < 60) return `Đọc sau ${diffMinutes} phút`;
    if (diffHours < 24) return `Đọc sau ${diffHours} giờ`;
    return `Đọc sau ${diffDays} ngày`;
}

function updateSelectionCounter() {
    const checkedBoxes = document.querySelectorAll('.recipient-checkbox:checked');
    const counter = document.getElementById('selected-count');
    const bulkActions = document.getElementById('bulk-actions');
    
    if (counter) {
        counter.textContent = `${checkedBoxes.length} người được chọn`;
    }
    
    if (bulkActions) {
        if (checkedBoxes.length > 0) {
            bulkActions.classList.remove('hidden');
        } else {
            bulkActions.classList.add('hidden');
        }
    }
}

function closeRecipientModal() {
    const modal = document.getElementById('recipient-list-modal');
    if (modal) {
        modal.querySelector('.modal-content').classList.remove('scale-100');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// ✅ EXPORT TO EXCEL FUNCTIONALITY
async function exportRecipientsToExcel() {
    try {
        const checkedBoxes = document.querySelectorAll('.recipient-checkbox:checked');
        const selectedIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        
        showToast('Đang chuẩn bị file Excel...', 'info');
        
        // Create Excel-like data
        const data = window.currentRecipients
            .filter(r => selectedIds.length === 0 || selectedIds.includes(r.userID))
            .map(recipient => ({
                'Tên khách hàng': recipient.customerName,
                'Email': recipient.email || '',
                'Điện thoại': recipient.phone || '',
                'Loại khách hàng': recipient.customerType,
                'Tổng đơn hàng': recipient.totalOrders,
                'Tổng chi tiêu': recipient.totalSpent,
                'Ngày mua cuối': recipient.lastOrderDate ? formatTime(recipient.lastOrderDate) : '',
                'Trạng thái đọc': recipient.isRead ? 'Đã đọc' : 'Chưa đọc',
                'Thời gian gửi': formatTime(recipient.sentAt),
                'Thời gian đọc': recipient.readAt ? formatTime(recipient.readAt) : '',
                'Ngày tham gia': formatTime(recipient.joinedDate)
            }));
        
        // Convert to CSV
        const csv = convertToCSV(data);
        downloadCSV(csv, `danh-sach-nguoi-nhan-${new Date().getTime()}.csv`);
        
        showToast(`Đã xuất ${data.length} bản ghi thành công!`, 'success');
        
    } catch (error) {
        console.error('❌ Export error:', error);
        showToast('Có lỗi xảy ra khi xuất file', 'error');
    }
}

function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    return '\uFEFF' + csvContent; // Add BOM for UTF-8
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// ✅ ENHANCED ACTION FUNCTIONS
async function viewCustomerProfile(customerId) {
    try {
        showToast('Đang tải hồ sơ khách hàng...', 'info');
        
        const response = await apiRequest(`/customers/${customerId}/profile`);
        // Show customer profile modal...
        
    } catch (error) {
        showToast('Không thể tải hồ sơ khách hàng', 'error');
    }
}

async function viewCustomerOrders(customerId) {
    try {
        showToast('Đang tải lịch sử đơn hàng...', 'info');
        
        const response = await apiRequest(`/customers/${customerId}/orders`);
        // Show customer orders modal...
        
    } catch (error) {
        showToast('Không thể tải lịch sử đơn hàng', 'error');
    }
}

async function sendPersonalMessage(customerId) {
    // Open personal message modal
    showToast('Tính năng tin nhắn cá nhân sẽ có trong phiên bản tới', 'info');
}

// ✅ SỬA resendToCustomer function
async function resendToCustomer(userNotificationId) {
    if (!confirm('Bạn có chắc chắn muốn gửi lại thông báo cho khách hàng này?')) return;
    
    // Get button element for loading state
    const button = event?.target?.closest('button');
    const originalHTML = button?.innerHTML;
    
    try {
        // Show loading state
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Đang gửi...';
        }
        
        console.log(`🔄 [RESEND] Sending request for userNotificationId: ${userNotificationId}`);
        
        // ✅ CALL API với đúng endpoint
        const response = await apiRequest(`/notifications/user/${userNotificationId}/resend`, {
            method: 'POST'
        });
        
        console.log('✅ [RESEND] Response:', response);
        
        showToast('Đã gửi lại thông báo thành công!', 'success');
        
        // ✅ REFRESH RECIPIENT LIST để cập nhật trạng thái
        const modal = document.getElementById('recipient-list-modal');
        const notificationId = modal?.getAttribute('data-notification-id');
        
        if (notificationId) {
            console.log(`🔄 [RESEND] Refreshing recipient list for notification ${notificationId}`);
            
            // Reload recipient list
            await showRecipientList(parseInt(notificationId));
        } else {
            // Alternative: just update the button state
            if (button) {
                button.innerHTML = '<i class="fas fa-check mr-1 text-green-600"></i>Đã gửi lại';
                button.classList.remove('bg-orange-100', 'text-orange-700', 'hover:bg-orange-200', 'hover:text-orange-800');
                button.classList.add('bg-green-100', 'text-green-700');
                button.disabled = true;
            }
        }
        
    } catch (error) {
        console.error('❌ [RESEND] Error:', error);
        
        let errorMessage = 'Không thể gửi lại thông báo';
        if (error.message.includes('404')) {
            errorMessage = 'Không tìm thấy thông báo hoặc bạn không có quyền';
        } else if (error.message.includes('500')) {
            errorMessage = 'Lỗi máy chủ. Vui lòng thử lại sau';
        }
        
        showToast(errorMessage, 'error');
        
    } finally {
        // Restore button state if error occurred
        if (button && button.disabled) {
            setTimeout(() => {
                button.disabled = false;
                if (originalHTML) {
                    button.innerHTML = originalHTML;
                }
            }, 2000);
        }
    }
}

// ✅ LOADING MODAL HELPER
function createLoadingModal(message) {
    const modal = document.createElement('div');
    modal.className = 'loading-modal fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 flex items-center space-x-4">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-gray-900">${message}</span>
        </div>
    `;
    
    return modal;
}

async function sendNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn gửi thông báo này?')) return;

    const button = event?.target?.closest('button');
    
    try {
        setLoadingState(button, true);
        
        await apiRequest(`${API_ENDPOINTS.seller.send(id)}`, { method: 'POST' });
        showToast('Thông báo đã được gửi thành công!', 'success');
        
        // Reload notifications after successful send
        if (window.sellerNotificationManager) {
            await window.sellerNotificationManager.loadNotifications();
        }
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        showToast(`Có lỗi xảy ra khi gửi thông báo: ${error.message}`, 'error');
    } finally {
        setLoadingState(button, false);
    }
}

async function deleteNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;

    const button = event?.target?.closest('button');
    
    try {
        setLoadingState(button, true);
        
        // ✅ API: DELETE /api/notifications/seller/{id}
        await apiRequest(`${API_ENDPOINTS.seller.delete(id)}`, { method: 'DELETE' });
        showToast('Thông báo đã được xóa thành công!', 'success');
        
        if (window.sellerNotificationManager) {
            await window.sellerNotificationManager.loadNotifications();
        }
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        showToast(`Có lỗi xảy ra khi xóa thông báo: ${error.message}`, 'error');
    } finally {
        setLoadingState(button, false);
    }
}
// ✅ SỬA LẠI editNotification function - HOÀN CHỈNH
async function editNotification(id) {
    try {
        let notification = null;
        
        // Method 1: Tìm trong cache trước (nhanh và tránh lỗi API)
        if (window.sellerNotificationManager && window.sellerNotificationManager.notifications) {
            notification = window.sellerNotificationManager.notifications.find(n => n.notificationID === id);
            console.log('🔍 Found in cache:', notification);
        }
        
        // Method 2: Nếu không có trong cache, gọi API
        if (!notification) {
            console.log('📥 Loading notification from API...');
            try {
                notification = await apiRequest(`${API_ENDPOINTS.seller.get(id)}`);
                console.log('✅ Loaded from API:', notification);
            } catch (apiError) {
                console.error('❌ API Error:', apiError);
                
                // Enhanced error messages
                if (apiError.message.includes('403')) {
                    showToast('Bạn chỉ có thể chỉnh sửa thông báo của chính mình.', 'error');
                } else if (apiError.message.includes('404')) {
                    showToast('Không tìm thấy thông báo. Có thể đã bị xóa.', 'error');
                } else {
                    showToast('Không thể tải thông báo. Vui lòng tải lại trang.', 'warning');
                }
                return;
            }
        }
        
        // Validate notification exists
        if (!notification) {
            showToast('Không tìm thấy thông báo để chỉnh sửa', 'error');
            return;
        }
        
        // Validate can edit (only draft status)
        if (notification.status !== 'draft') {
            showToast('Chỉ có thể chỉnh sửa thông báo ở trạng thái nháp', 'warning');
            return;
        }
        
        // Load for editing
        if (window.sellerNotificationManager) {
            console.log('📝 Loading notification for edit:', notification);
            window.sellerNotificationManager.editNotification(notification);
        } else {
            showToast('Hệ thống chưa sẵn sàng. Vui lòng thử lại.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error in editNotification:', error);
        showToast('Không thể chỉnh sửa thông báo', 'error');
    }
}

async function viewNotificationStats(id) {
    try {
        if (window.sellerNotificationManager) {
            await window.sellerNotificationManager.showStatsModal(id);
        }
    } catch (error) {
        console.error('❌ Error viewing notification stats:', error);
        showToast('Không thể xem thống kê thông báo', 'error');
    }
}

function openNotificationModal() {
    if (window.sellerNotificationManager) {
        window.sellerNotificationManager.openNotificationModal();
    }
}

// ============================================
// INITIALIZATION WITH DEPENDENCY CHECK
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 DOM Content Loaded, checking dependencies...');
    
    // Check if required elements exist
    if (!document.getElementById('notifications-section')) {
        console.log('⚠️ Notifications section not found, skipping initialization');
        return;
    }
    
    // Check if required CSS classes are available (Tailwind CSS)
    const testElement = document.createElement('div');
    testElement.className = 'bg-blue-500';
    document.body.appendChild(testElement);
    const hasCSS = getComputedStyle(testElement).backgroundColor !== '';
    document.body.removeChild(testElement);
    
    if (!hasCSS) {
        console.warn('⚠️ CSS framework (Tailwind) may not be loaded');
    }
    
    try {
        // Initialize Seller Notification Manager
        window.sellerNotificationManager = new SellerNotificationManager();
        console.log('✅ Seller Notification Manager initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Seller Notification Manager:', error);
        showToast('Không thể khởi tạo hệ thống thông báo. Vui lòng tải lại trang.', 'error');
    }
});

// ============================================
// ERROR HANDLING FOR UNHANDLED PROMISES
// ============================================

window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    showToast('Có lỗi không mong muốn xảy ra. Vui lòng thử lại.', 'error');
});
