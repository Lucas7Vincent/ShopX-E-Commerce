// START OF FILE components.js

// Component Loader
class ComponentLoader {
    constructor() {
        this.components = {
            header: '/Customer/components/header/header.html',
            footer: '/Customer/components/footer/footer.html'
        };
    }

    async loadComponent(componentName, targetId) {
        try {
            const response = await fetch(this.components[componentName]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${componentName}`);
            const html = await response.text();
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                targetElement.innerHTML = html;

                // ✅ WAIT FOR ALPINE TO PROCESS
                await this.waitForAlpine(targetElement);

                // ✅ INITIALIZE NOTIFICATION MANAGER AFTER ALPINE IS READY
                if (componentName === 'header') {
                    console.log('🔔 Header loaded, initializing notification manager...');
                    this.initHeaderNotifications();
                }
            }
        } catch (error) {
            console.error(`Error loading ${componentName}:`, error);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.innerHTML = `<p class="text-red-500 p-4">Lỗi tải component ${componentName}. Xem console.</p>`;
            }
        }
    }

    async waitForAlpine(targetElement) {
        return new Promise((resolve) => {
            if (window.Alpine) {
                // Try Alpine.initTree if available
                if (typeof Alpine.initTree === 'function') {
                    try {
                        Alpine.initTree(targetElement);
                        console.log('✅ Alpine.initTree called successfully');
                    } catch (error) {
                        console.warn('⚠️ Alpine.initTree failed:', error);
                    }
                }
                
                // Wait for Alpine to process
                setTimeout(() => {
                    const headerElement = targetElement.querySelector('header[x-data]');
                    if (headerElement && headerElement._x_dataStack) {
                        console.log('✅ Alpine has processed the header element');
                    } else {
                        console.warn('⚠️ Alpine may not have fully processed the header');
                    }
                    resolve();
                }, 200);
            } else {
                console.warn('⚠️ Alpine not available');
                resolve();
            }
        });
    }
    async initHeaderNotifications() {
        // ✅ PROGRESSIVE DELAY WITH RETRY
        let attempts = 0;
        const maxAttempts = 10;
        
        const tryInit = async () => {
            try {
                attempts++;
                console.log(`🔔 Attempting to initialize notifications (${attempts}/${maxAttempts})`);
                
                // Check DOM elements
                const requiredElements = [
                    'notificationListHeader',
                    'notificationCountHeader', 
                    'notification-badge'
                ];

                const missingElements = requiredElements.filter(id => !document.getElementById(id));
                
                if (missingElements.length > 0) {
                    console.log(`⏳ Missing elements: ${missingElements.join(', ')}`);
                    if (attempts < maxAttempts) {
                        setTimeout(tryInit, 300 * attempts);
                        return;
                    }
                    console.error('❌ Max attempts reached, DOM elements not found');
                    return;
                }

                // Check Alpine readiness
                const headerElement = document.querySelector('header[x-data]');
                if (!headerElement || !headerElement._x_dataStack) {
                    console.log('⏳ Alpine not ready on header');
                    if (attempts < maxAttempts) {
                        setTimeout(tryInit, 300 * attempts);
                        return;
                    }
                }

                // Initialize notification manager
                if (!window.headerNotificationManager) {
                    window.headerNotificationManager = new HeaderNotificationManager();
                }
                
                await window.headerNotificationManager.init();
                console.log('✅ Header notification manager initialized successfully');
                
            } catch (error) {
                console.error('❌ Error initializing header notifications:', error);
                if (attempts < maxAttempts) {
                    setTimeout(tryInit, 1000 * attempts);
                }
            }
        };
        
        setTimeout(tryInit, 500); // Initial delay
    }

    async loadAll() {
        const path = window.location.pathname;
        const isLoginPage = path.endsWith('/login.html') || path.includes('/Admin/templates/auth/login.html');

        if (!isLoginPage) {
            await this.loadComponent('header', 'header-container');
            await this.loadComponent('footer', 'footer-container');
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem Alpine đã được load chưa
    if (window.Alpine) {
        console.log("Alpine is loaded globally before ComponentLoader runs in DOMContentLoaded.");
    } else {
        console.error("Alpine is NOT loaded before ComponentLoader runs in DOMContentLoaded.");
    }
    const loader = new ComponentLoader();
    loader.loadAll();
});
// END OF FILE components.js
// ============================================
// HEADER NOTIFICATION CONFIGURATION
// ============================================
const HEADER_API_CONFIG = {
    baseUrl: 'https://localhost:7088/api',
    endpoints: {
        userNotifications: '/notifications/user',
        unreadCount: '/notifications/user/unread-count',
        markAsRead: '/notifications/user',
        deleteNotification: '/notifications/user'
    }
};

class HeaderNotificationManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.isLoading = false;
        this.refreshInterval = null;
        this.baseUrl="https://localhost:7088/api";
        this.initRetryCount = 0;
    this.maxRetries = 10;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadNotifications = this.loadNotifications.bind(this);
        this.loadUnreadCount = this.loadUnreadCount.bind(this);
        this.markAsRead = this.markAsRead.bind(this);
        this.deleteNotification = this.deleteNotification.bind(this);
        this.renderNotifications = this.renderNotifications.bind(this);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    async init() {
        try {
            
            // ⭐ KIỂM TRA DOM ELEMENTS TRƯỚC
            if (!this.waitForDOM()) {
                console.log('⏳ DOM not ready, retrying...');
                if (this.initRetryCount < this.maxRetries) {
                    this.initRetryCount++;
                    setTimeout(() => this.init(), 500);
                    return;
                }
                console.error('❌ Max retries reached, DOM elements not found');
                return;
            }
            // Check if user is logged in
            if (!this.getAuthToken()) {
                console.log('⚠️ No auth token found, skipping notification load');
                this.hideNotificationBell();
                return;
            }

            // Load initial data
            await Promise.all([
                this.loadUnreadCount(),
                this.loadNotifications()
            ]);

            // Setup auto-refresh
            this.startAutoRefresh();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ Header Notification Manager initialized successfully');
        } catch (error) {
            console.error('❌ Error initializing header notifications:', error);
            this.showError('Không thể tải thông báo');
        }
    }
    waitForDOM() {
        const requiredElements = [
            'notificationListHeader',
            'notificationCountHeader',
            'notification-badge'
        ];

        for (const elementId of requiredElements) {
            if (!document.getElementById(elementId)) {
                console.log(`⚠️ Element #${elementId} not found`);
                return false;
            }
        }

        console.log('✅ All required DOM elements found');
        return true;
    }
    // ============================================
    // API METHODS
    // ============================================
    getAuthToken() {
        // Thử tất cả các key có thể
        const possibleKeys = ['token', 'authToken', 'accessToken', 'jwt', 'bearerToken'];
        
        for (const key of possibleKeys) {
            const token = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (token) {
                return token;
            }
        }
        return null;
    }

    getAuthHeaders() {
        const token = this.getAuthToken();
        if (!token) {
            return { 'Content-Type': 'application/json' };
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async apiRequest(url, options = {}) {
        try {
            const response = await fetch(`${HEADER_API_CONFIG.baseUrl}${url}`, {
                ...options,
                headers: {
                    ...this.getAuthHeaders(),
                    ...options.headers
                }
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { message: `HTTP ${response.status}` };
                }
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // ============================================
    // DATA LOADING METHODS
    // ============================================
    async loadUnreadCount() {
        try {
            console.log('📊 Loading unread count...');
            
            const response = await this.apiRequest(HEADER_API_CONFIG.endpoints.unreadCount);
            this.unreadCount = response.unreadCount || 0;
            
            this.updateUnreadBadge();
            
            console.log(`✅ Unread count loaded: ${this.unreadCount}`);
            return this.unreadCount;
        } catch (error) {
            console.error('❌ Error loading unread count:', error);
            this.unreadCount = 0;
            this.updateUnreadBadge();
        }
    }

    async loadNotifications(pageSize = 5) {
        try {
            console.log('📥 Loading notifications for header...');
            this.isLoading = true;
            // Update UI ngay để show loading
            this.renderNotifications();
            
            const params = new URLSearchParams({
                pageNumber: '1',
                pageSize: pageSize.toString(),
                unreadOnly: 'false' // Load both read and unread for header
            });
    
            const response = await this.apiRequest(
                `${HEADER_API_CONFIG.endpoints.userNotifications}?${params.toString()}`
            );
            
            // ✅ ENHANCED RESPONSE HANDLING
            console.log('📊 Raw API Response:', response);
            console.log('📊 Response type:', typeof response);
            console.log('📊 Response keys:', Object.keys(response || {}));
            
            // Handle different response formats
            if (response && response.items && Array.isArray(response.items)) {
                this.notifications = response.items;
                console.log('✅ Used response.items format');
            } else if (response && response.data && Array.isArray(response.data)) {
                this.notifications = response.data;
                console.log('✅ Used response.data format');
            } else if (response && response.notifications && Array.isArray(response.notifications)) {
                this.notifications = response.notifications;
                console.log('✅ Used response.notifications format');
            } else if (Array.isArray(response)) {
                this.notifications = response;
                console.log('✅ Used direct array format');
            } else if (response && typeof response === 'object') {
                // ✅ FALLBACK - TÌM ARRAY TRONG RESPONSE
                const possibleArrays = Object.values(response).filter(val => Array.isArray(val));
                if (possibleArrays.length > 0) {
                    this.notifications = possibleArrays[0];
                    console.log('✅ Found array in response object:', Object.keys(response).find(key => Array.isArray(response[key])));
                } else {
                    console.warn('⚠️ No array found in response object');
                    this.notifications = [];
                }
            } else {
                console.warn('⚠️ Unknown response format:', response);
                this.notifications = [];
            }
    
            console.log(`✅ Final notifications count: ${this.notifications.length}`);
            console.log('📊 Notifications sample:', this.notifications.slice(0, 2));
            
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            this.notifications = [];
            this.showError('Không thể tải thông báo');
        } finally {
            this.isLoading = false;
            this.renderNotifications();
            this.updateUnreadBadge();
        }
    }

    async markAsRead(userNotificationId) {
        try {
            console.log('✅ Marking notification as read:', userNotificationId);
            
            await this.apiRequest(
                `${HEADER_API_CONFIG.endpoints.markAsRead}/${userNotificationId}/read`,
                { method: 'POST' }
            );

            // Update local state
            const notification = this.notifications.find(n => n.userNotificationID === userNotificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                notification.readAt = new Date().toISOString();
                this.unreadCount = Math.max(0, this.unreadCount - 1);
            }

            // Update UI
            this.updateUnreadBadge();
            this.renderNotifications();
            
            console.log('✅ Notification marked as read successfully');
        } catch (error) {
            console.error('❌ Error marking notification as read:', error);
            this.showError('Không thể đánh dấu thông báo');
        }
    }

    async deleteNotification(userNotificationId) {
        try {
            console.log('🗑️ Deleting notification:', userNotificationId);
            
            await this.apiRequest(
                `${HEADER_API_CONFIG.endpoints.deleteNotification}/${userNotificationId}`,
                { method: 'DELETE' }
            );

            // Update local state
            const notificationIndex = this.notifications.findIndex(n => n.userNotificationID === userNotificationId);
            if (notificationIndex !== -1) {
                const notification = this.notifications[notificationIndex];
                if (!notification.isRead) {
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                }
                this.notifications.splice(notificationIndex, 1);
            }

            // Update UI
            this.updateUnreadBadge();
            this.renderNotifications();
            
            console.log('✅ Notification deleted successfully');
        } catch (error) {
            console.error('❌ Error deleting notification:', error);
            this.showError('Không thể xóa thông báo');
        }
    }

    // ============================================
    // UI RENDERING METHODS
    // ============================================
    updateUnreadBadge() {
        // Update notification count badge
        const badgeElements = [
            document.querySelector('.bg-red-500'), // Original badge
            document.getElementById('notificationBadge'),
            document.getElementById('notification-badge')
        ];

        badgeElements.forEach(badge => {
            if (badge) {
                badge.textContent = this.unreadCount;
                badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
            }
        });

        // Update header count
        const headerCount = document.getElementById('notificationCountHeader');
        if (headerCount) {
            headerCount.textContent = this.unreadCount;
        }

        // Update page title
        if (this.unreadCount > 0) {
            document.title = `(${this.unreadCount}) ${document.title.replace(/^\(\d+\)\s*/, '')}`;
        } else {
            document.title = document.title.replace(/^\(\d+\)\s*/, '');
        }
    }

    renderNotifications() {
        const container = document.getElementById('notificationListHeader');
        if (!container) {
            console.warn('⚠️ Notification container not found, will retry...');
            // Retry tìm container
            setTimeout(() => {
                if (document.getElementById('notificationListHeader')) {
                    this.renderNotifications();
                }
            }, 1000);
            return;
        }

        console.log('✅ Found notification container, rendering...');

        if (this.isLoading) {
            container.innerHTML = `
                <div class="flex items-center justify-center py-4">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span class="ml-2 text-gray-500">Đang tải...</span>
                </div>
            `;
            return;
        }

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-bell-slash text-gray-300 text-2xl mb-2"></i>
                    <p class="text-gray-500 text-sm">Không có thông báo mới</p>
                </div>
            `;
            return;
        }

        try {
            container.innerHTML = this.notifications.map(notification => this.renderNotificationItem(notification)).join('');
            console.log(`✅ Rendered ${this.notifications.length} notifications`);
        } catch (error) {
            console.error('❌ Error rendering notifications:', error);
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-exclamation-triangle text-red-500 text-xl mb-2"></i>
                    <p class="text-red-600 text-sm">Lỗi hiển thị thông báo</p>
                    <button onclick="headerNotificationManager.loadNotifications()" 
                            class="mt-2 text-xs text-blue-600 hover:text-blue-800">
                        Thử lại
                    </button>
                </div>
            `;
        }
    }
// ============================================
// UI RENDERING METHODS (thêm vào sau renderNotifications)
// ============================================
renderNotificationItem(notification) {
    const isUnread = !notification.isRead;
    const timeAgo = this.getTimeAgo(notification.receivedAt || notification.createdAt);
    const truncatedContent = this.truncateText(this.stripHtml(notification.content), 60);
    
    // ✅ HANDLE MULTIPLE ID FIELD FORMATS
    const notificationId = notification.userNotificationID || notification.id || notification.notificationId;
    
    return `
        <div class="notification-item p-3 rounded-lg border-l-4 ${isUnread ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300'} hover:bg-gray-100 transition-colors mb-2">
            <!-- Header with icon and actions -->
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center">
                    <i class="fas ${notification.icon || 'fa-bell'} ${isUnread ? 'text-blue-600' : 'text-gray-500'} mr-2"></i>
                    <h4 class="font-medium text-sm ${isUnread ? 'text-gray-900' : 'text-gray-700'}">
                        ${this.truncateText(notification.title, 30)}
                    </h4>
                    ${isUnread ? '<span class="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>' : ''}
                </div>
                
                <!-- Simple buttons instead of Alpine dropdown -->
                <div class="flex space-x-2">
                    ${isUnread ? `
                        <button onclick="window.headerNotificationManager.markAsRead(${notificationId})" 
                                class="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded">
                            <i class="fas fa-check mr-1"></i>Đọc
                        </button>
                    ` : ''}
                    <button onclick="window.headerNotificationManager.deleteNotification(${notificationId})" 
                            class="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded">
                        <i class="fas fa-trash mr-1"></i>Xóa
                    </button>
                </div>
            </div>

            <!-- Content -->
            <p class="text-xs text-gray-600 mb-2 leading-relaxed">${truncatedContent}</p>
            
            <!-- Footer with time -->
            <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400">
                    <i class="fas fa-clock mr-1"></i>${timeAgo}
                </span>
                
                ${notification.actionText && notification.actionUrl ? `
                    <a href="${notification.actionUrl}" target="_blank" 
                       class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        ${notification.actionText} <i class="fas fa-external-link-alt ml-1"></i>
                    </a>
                ` : ''}
            </div>

            <!-- Type badge -->
            <div class="mt-2">
                <span class="inline-block px-2 py-1 text-xs rounded-full ${this.getTypeBadgeClass(notification.type)}">
                    ${this.getTypeText(notification.type)}
                </span>
            </div>
        </div>
    `;
}

    // ============================================
    // UTILITY METHODS
    // ============================================
    getTimeAgo(isoString) {
        if (!isoString) return 'Vừa xong';
        
        try {
            const now = new Date();
            const time = new Date(isoString);
            const diffMs = now - time;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Vừa xong';
            if (diffMins < 60) return `${diffMins} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays < 7) return `${diffDays} ngày trước`;
            
            return time.toLocaleDateString('vi-VN');
        } catch {
            return 'Vừa xong';
        }
    }

    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substring(0, maxLength) + '...';
    }

    stripHtml(html) {
        if (!html) return '';
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return doc.body.textContent || "";
        } catch {
            return html;
        }
    }

    getTypeBadgeClass(type) {
        const classes = {
            'promotion': 'bg-green-100 text-green-800',
            'system': 'bg-yellow-100 text-yellow-800',
            'general': 'bg-blue-100 text-blue-800',
            'urgent': 'bg-red-100 text-red-800'
        };
        return classes[type] || 'bg-gray-100 text-gray-800';
    }

    getTypeText(type) {
        const texts = {
            'promotion': '🎉 Khuyến mãi',
            'system': '⚙️ Hệ thống',
            'general': '📢 Thông báo',
            'urgent': '🚨 Khẩn cấp'
        };
        return texts[type] || '📢 Thông báo';
    }

    hideNotificationBell() {
        const bellContainer = document.querySelector('.relative[x-data*="isNotificationOpen"]');
        if (bellContainer) {
            bellContainer.style.display = 'none';
        }
    }

    showError(message) {
        console.error('Notification Error:', message);
        
        // Show toast notification (if you have a toast system)
        if (window.showToast) {
            window.showToast(message, 'error');
        } else {
            // Fallback: show in notification container
            const container = document.getElementById('notificationListHeader');
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <i class="fas fa-exclamation-triangle text-red-500 text-xl mb-2"></i>
                        <p class="text-red-600 text-sm">${message}</p>
                        <button onclick="headerNotificationManager.loadNotifications()" 
                                class="mt-2 text-xs text-blue-600 hover:text-blue-800">
                            Thử lại
                        </button>
                    </div>
                `;
            }
        }
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================
    setupEventListeners() {
        // ✅ SỬA SELECTOR CHO ĐÚNG VỚI HEADER.HTML
        const possibleSelectors = [
            'button[\\@click*="toggleNotifications"]',  // Alpine syntax
            'button[onclick*="toggleNotifications"]',   // Direct onclick
            '.fa-bell',                                // Icon element
            '#notification-bell',                      // Direct ID
            '[x-data="headerData"] .fa-bell'          // Scoped selector
        ];
        
        let notificationButton = null;
        for (const selector of possibleSelectors) {
            notificationButton = document.querySelector(selector);
            if (notificationButton) {
                console.log('✅ Found notification button with selector:', selector);
                break;
            }
        }
        
        if (notificationButton) {
            notificationButton.addEventListener('click', () => {
                console.log('🔔 Notification button clicked, loading notifications...');
                // Small delay to ensure dropdown is open
                setTimeout(() => {
                    this.loadNotifications();
                }, 100);
            });
        } else {
            console.warn('⚠️ Notification button not found with any selector');
            // ✅ FALLBACK - LISTEN FOR ANY BELL CLICK
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('fa-bell') || 
                    e.target.closest('button')?.querySelector('.fa-bell')) {
                    console.log('🔔 Bell icon clicked (fallback), loading notifications...');
                    setTimeout(() => this.loadNotifications(), 100);
                }
            });
        }
    
        // ✅ ENHANCED VISIBILITY LISTENERS
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                console.log('👀 Page became visible, refreshing notifications...');
                this.loadUnreadCount();
            }
        });
    
        window.addEventListener('focus', () => {
            console.log('🎯 Window focused, refreshing notifications...');
            this.loadUnreadCount();
        });
    }

    // ============================================
    // AUTO REFRESH
    // ============================================
    startAutoRefresh() {
        // Refresh unread count every 30 seconds
        this.refreshInterval = setInterval(async () => {
            try {
                await this.loadUnreadCount();
            } catch (error) {
                console.error('❌ Auto refresh error:', error);
            }
        }, 30000);

        console.log('🔄 Auto-refresh started (30s interval)');
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
            console.log('⏹️ Auto-refresh stopped');
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================
    async refresh() {
        await Promise.all([
            this.loadUnreadCount(),
            this.loadNotifications()
        ]);
    }

    getUnreadCount() {
        return this.unreadCount;
    }

    getNotifications() {
        return [...this.notifications];
    }
}

// ============================================
// GLOBAL INSTANCE AND INITIALIZATION
// ============================================
let headerNotificationManager;

// Export for global access
window.headerNotificationManager = new HeaderNotificationManager();

// ============================================
// ALPINE.JS INTEGRATION (if needed)
// ============================================
if (typeof Alpine !== 'undefined') {
    document.addEventListener('alpine:init', () => {
        Alpine.data('headerNotifications', () => ({
            unreadCount: 0,
            notifications: [],
            
            init() {
                // Sync with notification manager
                if (headerNotificationManager) {
                    this.unreadCount = headerNotificationManager.getUnreadCount();
                    this.notifications = headerNotificationManager.getNotifications();
                }
            },
            
            async markAsRead(id) {
                if (headerNotificationManager) {
                    await headerNotificationManager.markAsRead(id);
                    this.unreadCount = headerNotificationManager.getUnreadCount();
                    this.notifications = headerNotificationManager.getNotifications();
                }
            },
            
            async deleteNotification(id) {
                if (headerNotificationManager) {
                    await headerNotificationManager.deleteNotification(id);
                    this.unreadCount = headerNotificationManager.getUnreadCount();
                    this.notifications = headerNotificationManager.getNotifications();
                }
            }
        }));
    });
}