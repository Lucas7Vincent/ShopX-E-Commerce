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
        
        // Bind methods
        this.init = this.init.bind(this);
        this.loadNotifications = this.loadNotifications.bind(this);
        this.loadUnreadCount = this.loadUnreadCount.bind(this);
        this.markAsRead = this.markAsRead.bind(this);
        this.deleteNotification = this.deleteNotification.bind(this);
    }

    // ============================================
    // INITIALIZATION
    // ============================================
    async init() {
        try {
            console.log('🔔 Initializing Header Notification Manager...');
            
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
            
            const params = new URLSearchParams({
                pageNumber: '1',
                pageSize: pageSize.toString(),
                unreadOnly: 'false' // Load both read and unread for header
            });

            const response = await this.apiRequest(
                `${HEADER_API_CONFIG.endpoints.userNotifications}?${params.toString()}`
            );
            
            // Handle different response formats
            if (response.items && Array.isArray(response.items)) {
                this.notifications = response.items;
            } else if (Array.isArray(response)) {
                this.notifications = response;
            } else {
                this.notifications = [];
            }

            this.renderNotifications();
            
            console.log(`✅ Loaded ${this.notifications.length} notifications`);
        } catch (error) {
            console.error('❌ Error loading notifications:', error);
            this.notifications = [];
            this.renderNotifications();
            this.showError('Không thể tải thông báo');
        } finally {
            this.isLoading = false;
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
            console.warn('⚠️ Notification container not found');
            return;
        }

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

        container.innerHTML = this.notifications.map(notification => this.renderNotificationItem(notification)).join('');
    }

    renderNotificationItem(notification) {
        const isUnread = !notification.isRead;
        const timeAgo = this.getTimeAgo(notification.receivedAt);
        const truncatedContent = this.truncateText(this.stripHtml(notification.content), 60);

        return `
            <div class="notification-item p-3 rounded-lg border-l-4 ${isUnread ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300'} hover:bg-gray-100 transition-colors">
                <!-- Header with icon and actions -->
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center">
                        <i class="fas ${notification.icon || 'fa-bell'} ${isUnread ? 'text-blue-600' : 'text-gray-500'} mr-2"></i>
                        <h4 class="font-medium text-sm ${isUnread ? 'text-gray-900' : 'text-gray-700'}">
                            ${this.truncateText(notification.title, 30)}
                        </h4>
                        ${isUnread ? '<span class="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>' : ''}
                    </div>
                    
                    <!-- Actions dropdown -->
                    <div class="relative" x-data="{ open: false }">
                        <button @click="open = !open" class="text-gray-400 hover:text-gray-600 p-1">
                            <i class="fas fa-ellipsis-v text-xs"></i>
                        </button>
                        <div x-show="open" @click.outside="open = false" 
                             class="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border z-10">
                            ${isUnread ? `
                                <button onclick="headerNotificationManager.markAsRead(${notification.userNotificationID})" 
                                        class="block w-full text-left px-3 py-2 text-xs text-blue-600 hover:bg-blue-50">
                                    <i class="fas fa-check mr-1"></i> Đánh dấu đã đọc
                                </button>
                            ` : ''}
                            <button onclick="headerNotificationManager.deleteNotification(${notification.userNotificationID})" 
                                    class="block w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                                <i class="fas fa-trash mr-1"></i> Xóa
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <p class="text-xs text-gray-600 mb-2 leading-relaxed">${truncatedContent}</p>
                
                <!-- Footer with time and action -->
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
        // Refresh when notification dropdown opens
        const notificationButton = document.querySelector('[x-data*="isNotificationOpen"] button');
        if (notificationButton) {
            notificationButton.addEventListener('click', () => {
                // Small delay to ensure dropdown is open
                setTimeout(() => {
                    this.loadNotifications();
                }, 100);
            });
        }

        // Listen for visibility change to refresh notifications
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.loadUnreadCount();
            }
        });

        // Listen for focus events
        window.addEventListener('focus', () => {
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    headerNotificationManager = new HeaderNotificationManager();
    headerNotificationManager.init();
});

// Export for global access
window.headerNotificationManager = headerNotificationManager;

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