// ============================================
// API CONFIGURATION
// ============================================

const ENDPOINTS = {
    USER_NOTIFICATIONS: '/notifications/user',
    MARK_AS_READ: '/notifications/user/{id}/read',
    DELETE_NOTIFICATION: '/notifications/user/{id}',
    UNREAD_COUNT: '/notifications/user/unread-count'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
// ============================================
// UTILITY FUNCTIONS
// ============================================
function getAuthToken() {
    // ✅ SỬ DỤNG CÙNG LOGIC VỚI COMPONENTS.JS
    const possibleKeys = ['token', 'authToken', 'accessToken', 'jwt', 'bearerToken'];
    
    for (const key of possibleKeys) {
        const token = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (token) {
            console.log('🔑 [TOKEN] Found token with key:', key);
            return token;
        }
    }
    
    console.warn('❌ [TOKEN] No token found in storage');
    return null;
}

async function apiRequest(url, options = {}) {
    const token = getAuthToken();
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    const fullUrl = `${API_BASE_URL}${url}`;
    console.log('🌐 [API] Making request to:', fullUrl);
    console.log('🔧 [API] Config:', config);

    try {
        const response = await fetch(fullUrl, config);
        
        console.log('📡 [API] Response status:', response.status);
        
        if (!response.ok) {
            if (response.status === 401) {
                console.error('❌ [AUTH] Token expired or invalid');
                // Clear all possible token keys
                const possibleKeys = ['token', 'authToken', 'accessToken', 'jwt', 'bearerToken'];
                possibleKeys.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });
                
                showToast('Phiên đăng nhập đã hết hạn. Đang chuyển hướng...', 'warning');
                setTimeout(() => {
                    window.location.href = '/Customer/templates/login.html';
                }, 2000);
                return;
            }
            
            // Try to get error details
            const errorText = await response.text();
            console.error('❌ [API] Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetails: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('✅ [API] Response data:', data);
            return data;
        }
        
        const text = await response.text();
        console.log('✅ [API] Response text:', text);
        return text;
        
    } catch (error) {
        console.error('❌ [API] Request failed:', error);
        throw error;
    }
}
function formatTime(dateString) {
    if (!dateString) return 'Không xác định';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;
    
    const bgColor = {
        'success': 'bg-green-500 text-white',
        'error': 'bg-red-500 text-white',
        'warning': 'bg-yellow-500 text-black',
        'info': 'bg-blue-500 text-white'
    }[type] || 'bg-gray-500 text-white';
    
    const icon = {
        'success': 'fas fa-check-circle',
        'error': 'fas fa-exclamation-circle',
        'warning': 'fas fa-exclamation-triangle',
        'info': 'fas fa-info-circle'
    }[type] || 'fas fa-info-circle';

    toast.className += ` ${bgColor}`;
    toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="${icon}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-2 hover:opacity-75">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ============================================
// ALPINE.JS NOTIFICATION SYSTEM
// ============================================
function notificationSystem() {
    return {
        // ✅ STATE MANAGEMENT
        notifications: [],
        isLoading: false,
        error: null,
        unreadCount: 0,
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalCount: 0,

        // ✅ FILTERS
        currentFilter: {
            type: 'all',
            status: 'all'
        },

        // ✅ INITIALIZATION
        async init() {
            console.log('🚀 [INIT] Initializing notification system...');
            
            // Check authentication
            const token = getAuthToken();
            if (!token) {
                console.error('❌ [AUTH] No token found, redirecting to login');
                window.location.href = '/Customer/templates/login.html';
                return;
            }

            try {
                // Load initial data
                await Promise.all([
                    this.fetchNotifications(1),
                    this.fetchUnreadCount()
                ]);

                console.log('✅ [INIT] Notification system initialized successfully');
            } catch (error) {
                console.error('❌ [INIT] Failed to initialize:', error);
                this.error = 'Không thể khởi tạo hệ thống thông báo';
            }
        },

        // ✅ FETCH NOTIFICATIONS
        async fetchNotifications(page = 1) {
            this.isLoading = true;
            this.error = null;
            
            try {
                console.log(`📥 [FETCH] Loading notifications - Page: ${page}, Filters:`, this.currentFilter);

                // Build query parameters
                const params = new URLSearchParams({
                    pageNumber: page.toString(),
                    pageSize: this.pageSize.toString()
                });

                // Add unread filter
                if (this.currentFilter.status === 'unread') {
                    params.append('unreadOnly', 'true');
                }

                const url = `${ENDPOINTS.USER_NOTIFICATIONS}?${params.toString()}`;
                console.log(`🔗 [FETCH] Request URL: ${url}`);

                const response = await apiRequest(url);
                console.log('📨 [FETCH] API Response:', response);

                // ✅ HANDLE DIFFERENT RESPONSE FORMATS
                let notifications = [];
                let totalPages = 1;
                let totalCount = 0;

                if (response.notifications && Array.isArray(response.notifications)) {
                    // Paginated response
                    notifications = response.notifications;
                    totalPages = response.totalPages || 1;
                    totalCount = response.totalCount || 0;
                    this.currentPage = response.currentPage || page;
                } else if (Array.isArray(response)) {
                    // Direct array response
                    notifications = response;
                    totalCount = response.length;
                    totalPages = Math.ceil(totalCount / this.pageSize);
                    this.currentPage = page;
                } else {
                    console.warn('⚠️ [FETCH] Unexpected response format:', response);
                    notifications = [];
                }

                // ✅ PROCESS NOTIFICATIONS
                this.notifications = notifications.map(notification => ({
                    id: notification.userNotificationID || notification.id,
                    notificationId: notification.notificationID,
                    title: notification.title || 'Thông báo',
                    message: notification.content || notification.message || 'Không có nội dung',
                    type: notification.type || 'info',
                    icon: notification.icon || this.getTypeIcon(notification.type),
                    status: notification.isRead ? 'read' : 'unread',
                    created_at: notification.receivedAt || notification.createdAt,
                    action_text: notification.actionText,
                    action_url: notification.actionUrl,
                    isRead: notification.isRead || false
                }));

                // ✅ APPLY CLIENT-SIDE FILTERS
                this.notifications = this.applyClientFilters(this.notifications);

                // ✅ UPDATE PAGINATION INFO
                this.totalPages = totalPages;
                this.totalCount = totalCount;

                console.log(`✅ [FETCH] Successfully loaded ${this.notifications.length} notifications`);
                console.log(`📊 [FETCH] Pagination: Page ${this.currentPage}/${this.totalPages}, Total: ${this.totalCount}`);

            } catch (error) {
                console.error('❌ [FETCH] Error loading notifications:', error);
                this.error = this.getErrorMessage(error);
                this.notifications = [];
            } finally {
                this.isLoading = false;
            }
        },

        // ✅ APPLY CLIENT-SIDE FILTERS
        applyClientFilters(notifications) {
            let filtered = [...notifications];

            // Filter by type
            if (this.currentFilter.type !== 'all') {
                filtered = filtered.filter(n => n.type === this.currentFilter.type);
            }

            // Filter by status (additional client-side filtering)
            if (this.currentFilter.status === 'unread') {
                filtered = filtered.filter(n => n.status === 'unread');
            }

            return filtered;
        },

        // ✅ FETCH UNREAD COUNT
        async fetchUnreadCount() {
            try {
                console.log('📊 [COUNT] Fetching unread count...');
                const response = await apiRequest(ENDPOINTS.UNREAD_COUNT);
                
                this.unreadCount = response.unreadCount || 0;
                console.log(`✅ [COUNT] Unread count: ${this.unreadCount}`);

                // Update page title
                if (this.unreadCount > 0) {
                    document.title = `(${this.unreadCount}) Thông báo - ShopX`;
                } else {
                    document.title = 'Thông báo - ShopX';
                }

            } catch (error) {
                console.error('❌ [COUNT] Error fetching unread count:', error);
                this.unreadCount = 0;
            }
        },

        // ✅ MARK SINGLE NOTIFICATION AS READ
        async markAsRead(notificationId) {
            try {
                console.log(`📖 [READ] Marking notification ${notificationId} as read...`);

                const url = ENDPOINTS.MARK_AS_READ.replace('{id}', notificationId);
                await apiRequest(url, { method: 'POST' });

                // ✅ UPDATE LOCAL STATE
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification && notification.status === 'unread') {
                    notification.status = 'read';
                    notification.isRead = true;
                    this.unreadCount = Math.max(0, this.unreadCount - 1);

                    // Update page title
                    if (this.unreadCount > 0) {
                        document.title = `(${this.unreadCount}) Thông báo - ShopX`;
                    } else {
                        document.title = 'Thông báo - ShopX';
                    }

                    console.log(`✅ [READ] Notification ${notificationId} marked as read`);
                    showToast('Đã đánh dấu thông báo là đã đọc', 'success');
                }

            } catch (error) {
                console.error('❌ [READ] Error marking as read:', error);
                showToast('Không thể đánh dấu thông báo là đã đọc', 'error');
            }
        },

        // ✅ MARK ALL NOTIFICATIONS AS READ
        async markAllAsRead() {
            const unreadNotifications = this.notifications.filter(n => n.status === 'unread');
            
            if (unreadNotifications.length === 0) {
                showToast('Không có thông báo chưa đọc nào', 'info');
                return;
            }

            if (!confirm(`Bạn có chắc chắn muốn đánh dấu tất cả ${unreadNotifications.length} thông báo là đã đọc?`)) {
                return;
            }

            try {
                console.log(`📖 [READ-ALL] Marking ${unreadNotifications.length} notifications as read...`);

                // Mark all unread notifications as read
                const promises = unreadNotifications.map(notification => 
                    this.markAsRead(notification.id)
                );

                await Promise.all(promises);

                console.log('✅ [READ-ALL] All notifications marked as read');
                showToast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');

                // Refresh the list
                await this.fetchNotifications(this.currentPage);

            } catch (error) {
                console.error('❌ [READ-ALL] Error marking all as read:', error);
                showToast('Không thể đánh dấu tất cả thông báo là đã đọc', 'error');
            }
        },

        // ✅ DELETE NOTIFICATION
        async deleteNotification(notificationId) {
            if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
                return;
            }

            try {
                console.log(`🗑️ [DELETE] Deleting notification ${notificationId}...`);

                const url = ENDPOINTS.DELETE_NOTIFICATION.replace('{id}', notificationId);
                await apiRequest(url, { method: 'DELETE' });

                // ✅ UPDATE LOCAL STATE
                const notificationIndex = this.notifications.findIndex(n => n.id == notificationId);
                if (notificationIndex !== -1) {
                    const notification = this.notifications[notificationIndex];
                    if (notification.status === 'unread') {
                        this.unreadCount = Math.max(0, this.unreadCount - 1);
                    }
                    
                    this.notifications.splice(notificationIndex, 1);
                    this.totalCount = Math.max(0, this.totalCount - 1);

                    console.log(`✅ [DELETE] Notification ${notificationId} deleted`);
                    showToast('Đã xóa thông báo', 'success');

                    // Refresh if current page is empty
                    if (this.notifications.length === 0 && this.currentPage > 1) {
                        await this.fetchNotifications(this.currentPage - 1);
                    }
                }

            } catch (error) {
                console.error('❌ [DELETE] Error deleting notification:', error);
                showToast('Không thể xóa thông báo', 'error');
            }
        },

        // ✅ UTILITY METHODS
        getTypeIcon(type) {
            const icons = {
                'order': 'fa-shopping-cart',
                'promotion': 'fa-tags',
                'shipping': 'fa-truck',
                'payment': 'fa-credit-card',
                'account': 'fa-user',
                'system': 'fa-cog',
                'news': 'fa-newspaper',
                'warning': 'fa-exclamation-triangle',
                'info': 'fa-info-circle'
            };
            return icons[type] || 'fa-bell';
        },

        getErrorMessage(error) {
            if (error.message.includes('401')) {
                return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
            } else if (error.message.includes('403')) {
                return 'Bạn không có quyền truy cập chức năng này.';
            } else if (error.message.includes('500')) {
                return 'Lỗi máy chủ. Vui lòng thử lại sau.';
            } else if (error.message.includes('Failed to fetch')) {
                return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
            }
            return 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';
        },

        // ✅ FORMAT TIME METHOD (exposed to template)
        formatTime(dateString) {
            return formatTime(dateString);
        }
    };
}

// ============================================
// GLOBAL FUNCTIONS (accessible from HTML)
// ============================================
window.notificationSystem = notificationSystem;
window.formatTime = formatTime;
window.showToast = showToast;

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌟 [DOM] DOM loaded, notifications.js ready');
});