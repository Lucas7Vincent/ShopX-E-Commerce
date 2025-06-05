// API Configuration
const API_BASE = 'https://localhost:7088/api';

const API_ENDPOINTS = {
    admin: {
        getNotifications: '/notifications/admin',
        getById: '/notifications/admin',
        create: '/notifications/admin',
        update: '/notifications/admin',
        delete: '/notifications/admin',
        send: '/notifications/admin/send',
        recipientCount: '/notifications/admin/recipient-count',
        getUsers: '/notifications/admin/users'
    },
    user: {
        getNotifications: '/notifications/user',
        markAsRead: '/notifications/user',
        delete: '/notifications/user',
        unreadCount: '/notifications/user/unread-count'
    }
};

// Global variables
let notifications = [];
let userNotifications = []; // Thêm biến cho user notifications
let selectedUsers = []; // Track selected users
let allUsers = []; // Cache for user list
let userSelectionModal = null;
let currentPage = 1;
let userCurrentPage = 1; // Thêm cho user pagination
let itemsPerPage = 10;
let totalPages = 1;
let userTotalPages = 1; // Thêm cho user pagination
let currentNotification = null;
let totalCount = 0;
let userTotalCount = 0; // Thêm cho user count
let currentView = 'admin'; // 'admin' hoặc 'user'

// JWT Token management
function getAuthToken() {
    // Thử tất cả các key có thể
    const possibleKeys = ['token', 'authToken', 'accessToken', 'jwt', 'bearerToken'];
    
    for (const key of possibleKeys) {
        const token = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (token) {
            console.log(`Found token with key: ${key}`);
            return token;
        }
    }
    
    console.error('No auth token found in storage');
    return null;
}

function setAuthHeaders() {
    const token = getAuthToken();
    if (!token) {
        console.error('No auth token found');
        return {
            'Content-Type': 'application/json'
        };
    }
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// API Helper functions
async function apiRequest(url, options = {}) {
    try {
        console.log('Making API request to:', `${API_BASE}${url}`);
        console.log('Options:', options);
        
        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers: {
                ...setAuthHeaders(),
                ...options.headers
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        return data;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}
// ============================================
// 2. ROBUST RESPONSE HANDLER
// ============================================
function parsePagedResponse(response, requestedPage) {
    console.log('🔍 Parsing response:', response);
    
    let result = {
        items: [],
        currentPage: 1,
        totalPages: 1,
        totalCount: 0
    };

    try {
        if (!response) {
            console.warn('⚠️ Empty response');
            return result;
        }

        // ✅ Case for UserNotifications API (different format)
        if (response.notifications && Array.isArray(response.notifications)) {
            result.items = response.notifications;
            result.currentPage = Math.max(1, parseInt(response.currentPage) || requestedPage);
            result.totalPages = Math.max(1, parseInt(response.totalPages) || 1);
            result.totalCount = Math.max(0, parseInt(response.totalCount) || 0);
            
            console.log('✅ Parsed as User Notifications:', result);
            return result;
        }

        // ✅ Case for Admin Notifications (PagedResult)
        if (response.items && Array.isArray(response.items)) {
            result.items = response.items;
            result.currentPage = Math.max(1, parseInt(response.pageNumber) || requestedPage);
            result.totalPages = Math.max(1, parseInt(response.totalPages) || 1);
            result.totalCount = Math.max(0, parseInt(response.totalCount) || 0);
            
            console.log('✅ Parsed as PagedResult:', result);
            return result;
        }

        // ✅ Direct array fallback
        if (Array.isArray(response)) {
            result.items = response;
            result.totalCount = response.length;
            result.totalPages = Math.max(1, Math.ceil(response.length / itemsPerPage));
            result.currentPage = Math.min(requestedPage, result.totalPages);
            
            console.log('✅ Parsed as Array:', result);
            return result;
        }

        console.warn('⚠️ Unknown response format, using defaults');
        return result;

    } catch (error) {
        console.error('❌ Error parsing response:', error);
        return result;
    }
}
// Initialize system
async function initializeSystem() {
    try {
        const token = getAuthToken();
        if (!token) {
            showError('Vui lòng đăng nhập để sử dụng chức năng này');
            return;
        }
        
        // Load unread count for user notifications
        await loadUnreadCount();
        
        // Load admin notifications by default
        if (currentView === 'admin') {
            await fetchAdminNotifications(1);
        } else {
            await fetchUserNotifications(1);
        }
    } catch (error) {
        console.error('Lỗi khởi tạo hệ thống:', error);
        showError('Không thể tải dữ liệu từ server: ' + error.message);
        loadLocalStorageData();
    }
}

// ============================================
// ADMIN FUNCTIONS ()
// ============================================
async function fetchAdminNotifications(page = 1) {
    console.log(`🚀 Fetching admin notifications - Page: ${page}, ItemsPerPage: ${itemsPerPage}`);
    
    // Validate input
    page = Math.max(1, parseInt(page) || 1);
    
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const table = document.getElementById('notification-table');

    try {
        // Show loading state
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
        if (table) table.style.display = 'none';

        // Build query parameters
        const params = new URLSearchParams({
            pageNumber: page.toString(),
            pageSize: itemsPerPage.toString()
        });

        // Add filters
        const filters = {
            search: document.getElementById('search')?.value?.trim(),
            type: document.getElementById('type-filter')?.value,
            dateFrom: document.getElementById('date-from')?.value,
            dateTo: document.getElementById('date-to')?.value
        };

        Object.entries(filters).forEach(([key, value]) => {
            if (value) {
                if (key.includes('date')) {
                    params.append(key, new Date(value).toISOString());
                } else {
                    params.append(key, value);
                }
            }
        });

        const apiUrl = `${API_ENDPOINTS.admin.getNotifications}?${params.toString()}`;

        // Make API call with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await apiRequest(apiUrl, {
            method: 'GET',
            headers: setAuthHeaders(),
            signal: controller.signal
            
        });
        

        clearTimeout(timeoutId);
        console.log('📥 Raw API Response:', response);

        // Parse response using robust handler
        const parsed = parsePagedResponse(response, page);
        
        // ⭐ CRITICAL: Validate parsed data
        if (parsed.currentPage > parsed.totalPages && parsed.totalPages > 0) {
            console.warn(`🔄 Requested page ${parsed.currentPage} > total pages ${parsed.totalPages}, redirecting to page 1`);
            await fetchAdminNotifications(1);
            return;
        }

        // Update global state
        notifications = parsed.items;
        currentPage = parsed.currentPage;
        totalPages = parsed.totalPages;
        totalCount = parsed.totalCount;

        console.log('🎯 Final State Update:', {
            notificationsCount: notifications.length,
            currentPage,
            totalPages,
            totalCount,
            requestedPage: page
        });

        // Update UI
        renderNotificationTable();
        updateAdminPagination();

        // Show table
        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'block';
        
        console.log('✅ Admin notifications loaded successfully');
        
    } catch (err) {
        console.error('❌ Error fetching admin notifications:', err);
        
        // Reset to safe state
        notifications = [];
        currentPage = 1;
        totalPages = 1;
        totalCount = 0;
        
        renderNotificationTable();
        updateAdminPagination();
        
        if (loading) loading.style.display = 'none';
        
        // Show user-friendly error
        if (err.name === 'AbortError') {
            showError('Yêu cầu đã bị hủy do quá thời gian chờ');
        } else {
            showError(`Không thể tải danh sách thông báo: ${err.message}`);
        }
    }
}
function findFirstElement(selectors) {
    for (const id of selectors) {
        const element = document.getElementById(id);
        if (element) {
            console.log(`Found element: ${id}`);
            return element;
        }
    }
    console.warn('No element found from selectors:', selectors);
    return null;
}
function toggleButtonState(button, disabled) {
    if (disabled) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function updateAdminPagination() {
    console.log('🔄 [ADMIN] Updating pagination:', { currentPage, totalPages, totalCount });
    
    if (currentView !== 'admin') {
        return;
    }
    
    // ⭐ FIX: SỬ DỤNG ĐÚNG ID TỪ HTML TEMPLATE
    const currentPageInfo = document.getElementById('currentPageInfo');
    const totalPagesInfo = document.getElementById('totalPagesInfo');
    const totalItemsInfo = document.getElementById('totalItemsInfo');
    
    if (currentPageInfo) {
        currentPageInfo.textContent = currentPage;
    }
    
    if (totalPagesInfo) {
        totalPagesInfo.textContent = totalPages;
    }
    
    if (totalItemsInfo) {
        totalItemsInfo.textContent = totalCount;
    }

    // Update Previous button
    const prevButton = document.getElementById('prev-page');
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
        prevButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                fetchAdminNotifications(currentPage - 1);
            }
        };
        toggleButtonState(prevButton, currentPage <= 1);
    }
    
    // Update Next button
    const nextButton = document.getElementById('next-page');
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
        nextButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                console.log('➡️ [ADMIN] Going to next page:', currentPage + 1);
                fetchAdminNotifications(currentPage + 1);
            }
        };
        toggleButtonState(nextButton, currentPage >= totalPages);
    }
    
    // Update page input
    const pageInput = document.getElementById('page-input');
    if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
        pageInput.min = 1;
        
        // Remove old listeners and add new one
        const newInput = pageInput.cloneNode(true);
        pageInput.parentNode.replaceChild(newInput, pageInput);
        newInput.addEventListener('keypress', handleAdminPageEnter);
    }

    // Update Go button
    const goButton = document.getElementById('go-page');
    if (goButton) {
        goButton.onclick = (e) => {
            e.preventDefault();
            goToAdminPage();
        };
    }
    
}

function updateAdminNavButton(direction, disabled, action) {
    const buttonId = direction === 'prev' ? 
        (document.getElementById('admin-prev-page') ? 'admin-prev-page' : 'prev-page') :
        (document.getElementById('admin-next-page') ? 'admin-next-page' : 'next-page');
    
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = disabled;
    button.onclick = (e) => {
        e.preventDefault();
        if (!disabled) action();
    };
    
    // Visual feedback
    if (disabled) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function handleAdminPageEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        goToAdminPage();
    }
}
function goToAdminPage() {
    const pageInput = document.getElementById('page-input'); // ⭐ SỬ DỤNG ĐÚNG ID TỪ HTML
    
    if (!pageInput) {
        console.error('❌ [ADMIN] Page input not found');
        return;
    }
    
    const newPage = parseInt(pageInput.value);
    
    console.log('🎯 [ADMIN] Go to page request:', { newPage, currentPage, totalPages });
    
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (≥ 1)');
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage > totalPages) {
        showError(`Số trang không được vượt quá ${totalPages}`);
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage !== currentPage) {
        console.log('🚀 [ADMIN] Navigating to page:', newPage);
        fetchAdminNotifications(newPage);
    } else {
        console.log('⏭️ [ADMIN] Same page, no action needed');
    }
}
function createUserSelectionModal() {
    const modal = document.createElement('div');
    modal.id = 'user-selection-modal';
    // ✅ TĂNG Z-INDEX từ z-50 lên z-[9999]
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[9999]';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="relative top-4 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-hidden">
            <div class="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 class="text-lg font-bold text-gray-900">
                    <i class="fas fa-users text-blue-600 mr-2"></i>
                    Chọn người dùng cụ thể
                </h3>
                <button onclick="closeUserSelectionModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            
            <!-- ✅ GIỮ NGUYÊN NỘI DUNG, CHỈ SỬA Z-INDEX -->
            <!-- Search and Filter Section -->
            <div class="mb-4 space-y-3">
                <div class="flex flex-wrap gap-3">
                    <div class="flex-1 min-w-64">
                        <input 
                            type="text" 
                            id="user-search" 
                            placeholder="Tìm kiếm theo tên, email, số điện thoại..." 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                    </div>
                    <select id="user-role-filter" class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="all">Tất cả vai trò</option>
                        <option value="customers">Khách hàng</option>
                        <option value="sellers">Người bán</option>
                        <option value="admins">Quản trị viên</option>
                    </select>
                    <button onclick="searchUsers()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        <i class="fas fa-search mr-1"></i> Tìm kiếm
                    </button>
                </div>
                
                <!-- Selection Summary -->
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                    <span id="selection-summary" class="text-sm text-gray-600">
                        Chưa chọn người dùng nào
                    </span>
                    <div class="space-x-2">
                        <button onclick="selectAllUsers()" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-check-square mr-1"></i> Chọn tất cả
                        </button>
                        <button onclick="clearAllUsers()" class="text-red-600 hover:text-red-800 text-sm">
                            <i class="fas fa-times-circle mr-1"></i> Bỏ chọn tất cả
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- User List -->
            <div class="max-h-96 overflow-y-auto mb-4 border rounded-md">
                <div id="user-list-loading" class="p-8 text-center text-gray-500">
                    <i class="fas fa-spinner fa-spin mr-2"></i> Đang tải danh sách người dùng...
                </div>
                <div id="user-list-content" class="hidden">
                    <!-- User list will be populated here -->
                </div>
            </div>
            
            <!-- Pagination -->
            <div id="user-pagination" class="flex justify-between items-center mb-4 hidden">
                <div class="text-sm text-gray-600">
                    <span id="user-pagination-info">Hiển thị 0 người dùng</span>
                </div>
                <div class="flex space-x-2">
                    <button id="user-prev-page" onclick="loadUsersPage(currentUserPage - 1)" 
                            class="px-3 py-1 border rounded-md hover:bg-gray-50" disabled>
                        <i class="fas fa-chevron-left"></i> Trước
                    </button>
                    <span id="user-current-page" class="px-3 py-1">1</span>
                    <button id="user-next-page" onclick="loadUsersPage(currentUserPage + 1)" 
                            class="px-3 py-1 border rounded-md hover:bg-gray-50" disabled>
                        Sau <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            
            <!-- Action Buttons -->
            <div class="flex justify-end space-x-3">
                <button onclick="closeUserSelectionModal()" 
                        class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors">
                    <i class="fas fa-times mr-1"></i> Hủy
                </button>
                <button onclick="confirmUserSelection()" 
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
                    <i class="fas fa-check mr-1"></i> Xác nhận (<span id="selected-count">0</span>)
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    return modal;
}
function openUserSelectionModal() {
    if (!userSelectionModal) {
        userSelectionModal = createUserSelectionModal();
    }
    
    // ✅ FORCE Z-INDEX VÀ DISPLAY
    userSelectionModal.style.display = 'block';
    userSelectionModal.style.zIndex = '9999';
    userSelectionModal.style.position = 'fixed';
    userSelectionModal.style.top = '0';
    userSelectionModal.style.left = '0';
    userSelectionModal.style.right = '0';
    userSelectionModal.style.bottom = '0';
    
    // ✅ ĐẢM BẢO NOTIFICATION MODAL Ở DƯỚI
    const notificationModal = document.getElementById('modal');
    if (notificationModal) {
        notificationModal.style.zIndex = '50';
    }
    
    loadUsersPage(1);
    
    // Add event listeners
    setTimeout(() => {
        const searchInput = document.getElementById('user-search');
        const roleFilter = document.getElementById('user-role-filter');
        
        if (searchInput) {
            searchInput.removeEventListener('input', debouncedSearchUsers);
            searchInput.addEventListener('input', debouncedSearchUsers);
        }
        
        if (roleFilter) {
            roleFilter.removeEventListener('change', searchUsers);
            roleFilter.addEventListener('change', searchUsers);
        }
    }, 100);
}

function closeUserSelectionModal() {
    if (userSelectionModal) {
        userSelectionModal.style.display = 'none';
    }
}
async function loadUsersPage(page = 1) {
    try {
        currentUserPage = page;
        
        const role = document.getElementById('user-role-filter')?.value || 'all';
        const search = document.getElementById('user-search')?.value?.trim() || '';
        
        document.getElementById('user-list-loading').classList.remove('hidden');
        document.getElementById('user-list-content').classList.add('hidden');
        
        const params = new URLSearchParams({
            pageNumber: page,
            pageSize: 20,
            role: role,
            search: search
        });
        
        // ✅ USE CORRECT ENDPOINT
        const response = await apiRequest(`${API_ENDPOINTS.admin.getUsers}?${params.toString()}`);
        
        allUsers = response.users || [];
        totalUserPages = response.totalPages || 1;
        
        renderUserList(allUsers);
        updateUserPaginationInModal(); // ✅ USE CORRECT FUNCTION NAME
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Không thể tải danh sách người dùng: ' + error.message);
    }
}
function renderUserList(users) {
    const listContent = document.getElementById('user-list-content');
    const loading = document.getElementById('user-list-loading');
    
    if (users.length === 0) {
        listContent.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="fas fa-users text-4xl mb-2"></i>
                <p>Không tìm thấy người dùng nào</p>
            </div>
        `;
    } else {
        listContent.innerHTML = users.map(user => `
            <div class="flex items-center p-3 border-b hover:bg-gray-50 transition-colors">
                <input 
                    type="checkbox" 
                    id="user-${user.userID}" 
                    value="${user.userID}"
                    ${selectedUsers.includes(user.userID) ? 'checked' : ''}
                    onchange="toggleUserSelection(${user.userID})"
                    class="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                >
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        ${user.avatar ? 
                            `<img src="${user.avatar}" alt="${user.fullName}" class="w-8 h-8 rounded-full">` :
                            `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                                ${user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>`
                        }
                        <div class="flex-1">
                            <div class="flex items-center space-x-2">
                                <span class="font-medium text-gray-900">${user.fullName || 'Không có tên'}</span>
                                <span class="px-2 py-1 text-xs rounded-full ${getRoleBadgeClass(user.role)}">
                                    ${getRoleText(user.role)}
                                </span>
                            </div>
                            <div class="text-sm text-gray-500">
                                <span class="mr-4">📧 ${user.email}</span>
                                ${user.phone ? `<span class="mr-4">📞 ${user.phone}</span>` : ''}
                                ${user.role === 'Customer' && user.totalOrders > 0 ? 
                                    `<span class="mr-4">🛒 ${user.totalOrders} đơn hàng</span>` : ''}
                                ${user.role === 'Seller' && user.totalProducts > 0 ? 
                                    `<span class="mr-4">📦 ${user.totalProducts} sản phẩm</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    loading.classList.add('hidden');
    listContent.classList.remove('hidden');
    
    updateSelectionSummary();
}
function getRoleBadgeClass(role) {
    switch (role) {
        case 'Admin': return 'bg-red-100 text-red-800';
        case 'Seller': return 'bg-blue-100 text-blue-800';
        case 'Customer': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getRoleText(role) {
    switch (role) {
        case 'Admin': return '👑 Admin';
        case 'Seller': return '🏪 Seller';
        case 'Customer': return '👥 Customer';
        default: return role;
    }
}

function toggleUserSelection(userId) {
    const index = selectedUsers.indexOf(userId);
    if (index > -1) {
        selectedUsers.splice(index, 1);
    } else {
        selectedUsers.push(userId);
    }
    updateSelectionSummary();
}

function selectAllUsers() {
    allUsers.forEach(user => {
        if (!selectedUsers.includes(user.userID)) {
            selectedUsers.push(user.userID);
        }
    });
    
    // Update checkboxes
    allUsers.forEach(user => {
        const checkbox = document.getElementById(`user-${user.userID}`);
        if (checkbox) checkbox.checked = true;
    });
    
    updateSelectionSummary();
}

function clearAllUsers() {
    // Clear current page selections
    allUsers.forEach(user => {
        const index = selectedUsers.indexOf(user.userID);
        if (index > -1) {
            selectedUsers.splice(index, 1);
        }
        
        const checkbox = document.getElementById(`user-${user.userID}`);
        if (checkbox) checkbox.checked = false;
    });
    
    updateSelectionSummary();
}

function updateSelectionSummary() {
    const summaryElement = document.getElementById('selection-summary');
    const countElement = document.getElementById('selected-count');
    
    if (selectedUsers.length === 0) {
        summaryElement.textContent = 'Chưa chọn người dùng nào';
    } else {
        summaryElement.textContent = `Đã chọn ${selectedUsers.length} người dùng`;
    }
    
    if (countElement) {
        countElement.textContent = selectedUsers.length;
    }
}

function updateUserPaginationInModal() {
    const pagination = document.getElementById('user-pagination');
    const info = document.getElementById('user-pagination-info');
    const currentPageElement = document.getElementById('user-current-page');
    const prevButton = document.getElementById('user-prev-page');
    const nextButton = document.getElementById('user-next-page');
    
    if (allUsers.length > 0) {
        pagination.classList.remove('hidden');
        info.textContent = `Hiển thị ${allUsers.length} người dùng`;
        currentPageElement.textContent = currentUserPage;
        
        prevButton.disabled = currentUserPage <= 1;
        nextButton.disabled = currentUserPage >= totalUserPages;
        
        // ✅ ADD PROPER EVENT HANDLERS
        prevButton.onclick = () => {
            if (currentUserPage > 1) {
                loadUsersPage(currentUserPage - 1);
            }
        };
        
        nextButton.onclick = () => {
            if (currentUserPage < totalUserPages) {
                loadUsersPage(currentUserPage + 1);
            }
        };
    } else {
        pagination.classList.add('hidden');
    }
}

async function searchUsers() {
    await loadUsersPage(1);
}

function confirmUserSelection() {
    console.log('🎯 [SELECTION] Current selectedUsers:', selectedUsers);
    
    if (!selectedUsers || !Array.isArray(selectedUsers) || selectedUsers.length === 0) {
        showError('Vui lòng chọn ít nhất một người dùng!');
        return;
    }
    
    const validUserIds = selectedUsers.filter(id => {
        const numId = parseInt(id);
        return Number.isInteger(numId) && numId > 0;
    });
    
    if (validUserIds.length === 0) {
        showError('Không có user ID hợp lệ được chọn!');
        return;
    }
    
    // ✅ UPDATE GLOBAL STATE FIRST
    selectedUsers = validUserIds;
    
    // ✅ FIND TARGET AUDIENCE SELECT
    const form = document.getElementById('notification-form');
    let targetSelect = form?.querySelector('select[name="target_audience"], #target_audience');
    
    if (!targetSelect) {
        console.error('❌ [SELECTION] Target select not found - creating fallback');
        
        // ✅ CREATE HIDDEN INPUT FALLBACK
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'target_audience';
        hiddenInput.value = 'specific';
        hiddenInput.id = 'hidden-target-audience';
        form?.appendChild(hiddenInput);
        
        console.log('✅ [SELECTION] Created hidden input fallback');
    } else {
        // ✅ ENSURE 'specific' OPTION EXISTS
        let specificOption = targetSelect.querySelector('option[value="specific"]');
        if (!specificOption) {
            console.log('🔧 [SELECTION] Creating missing specific option');
            specificOption = document.createElement('option');
            specificOption.value = 'specific';
            specificOption.textContent = '🎯 Chọn người dùng cụ thể';
            targetSelect.appendChild(specificOption);
        }
        
        // ✅ SET VALUE AND FORCE UPDATE
        targetSelect.value = 'specific';
        
        // ✅ FIRE MULTIPLE EVENTS TO ENSURE FORM RECOGNITION
        ['change', 'input', 'blur'].forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            targetSelect.dispatchEvent(event);
        });
        
        console.log('✅ [SELECTION] Set target select to "specific"');
        
        // ✅ VERIFY FORM VALUE
        const formData = new FormData(form);
        const verifyValue = formData.get('target_audience');
        console.log('🔍 [SELECTION] FormData verification:', verifyValue);
        
        if (!verifyValue) {
            console.warn('⚠️ [SELECTION] FormData still null - using hidden input backup');
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'target_audience';
            hiddenInput.value = 'specific';
            form?.appendChild(hiddenInput);
        }
    }
    
    // ✅ UPDATE UI DISPLAYS
    updateTargetAudienceDisplay();
    updateRecipientCount();
    updateTargetAudienceUI();
    
    // ✅ CLOSE MODAL
    closeUserSelectionModal();
    
    const successMessage = `✅ Đã chọn ${selectedUsers.length} người dùng để gửi thông báo`;
    console.log('✅ [SELECTION] Success:', successMessage);
    showSuccess(successMessage);
}
function updateSelectionDisplay() {
    console.log('🔄 [DISPLAY] Updating selection display for', selectedUsers.length, 'users');
    
    // ✅ UPDATE BUTTON TEXT nếu có nút chọn người dùng
    const selectUsersBtn = document.getElementById('select-users-btn');
    if (selectUsersBtn) {
        const btnText = selectUsersBtn.querySelector('.btn-text') || selectUsersBtn;
        
        if (selectedUsers.length > 0) {
            btnText.textContent = `Đã chọn ${selectedUsers.length} người dùng (Click để sửa)`;
            selectUsersBtn.classList.add('selected');
            selectUsersBtn.classList.remove('btn-outline');
            selectUsersBtn.classList.add('btn-primary');
        } else {
            btnText.textContent = 'Chọn người dùng cụ thể';
            selectUsersBtn.classList.remove('selected');
            selectUsersBtn.classList.add('btn-outline');
            selectUsersBtn.classList.remove('btn-primary');
        }
        
        // ✅ ENSURE BUTTON IS VISIBLE
        selectUsersBtn.style.display = 'block';
        selectUsersBtn.classList.remove('hidden');
    }
    
    // ✅ UPDATE TARGET AUDIENCE DISPLAY TEXT
    const targetSelect = findTargetAudienceElement();
    if (targetSelect && selectedUsers.length > 0) {
        // Create or update display text next to select
        let displayText = document.getElementById('target-audience-display');
        if (!displayText) {
            displayText = document.createElement('div');
            displayText.id = 'target-audience-display';
            displayText.style.display = 'block';
            
            // Insert after target select
            if (targetSelect.parentNode) {
                targetSelect.parentNode.insertBefore(displayText, targetSelect.nextSibling);
            }
        }
        
    
    }
    
    // ✅ UPDATE RECIPIENT COUNT DISPLAY
    const recipientCount = document.getElementById('recipient-count');
    if (recipientCount && selectedUsers.length > 0) {
        recipientCount.innerHTML = `
            <i class="fas fa-check-circle text-green-500 mr-1"></i>
            <span class="text-green-600 font-medium">
                Sẽ gửi đến ${selectedUsers.length} người dùng đã chọn
            </span>
        `;
        recipientCount.className = 'mt-1 text-sm';
    }
    
    console.log('✅ [DISPLAY] Selection display updated successfully');
}
// ============================================
// USER NOTIFICATION FUNCTIONS (MỚI THÊM)
// ============================================

// ✅ UPDATE fetchUserNotifications function
async function fetchUserNotifications(page = 1, unreadOnly = false) {
    console.log(`🚀 Fetching user notifications - Page: ${page}, UnreadOnly: ${unreadOnly}`);
    
    page = Math.max(1, parseInt(page) || 1);
    
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const table = document.getElementById('user-notification-table') || document.getElementById('notification-table');

    try {
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
        if (table) table.style.display = 'none';

        const params = new URLSearchParams({
            pageNumber: page.toString(),
            pageSize: itemsPerPage.toString(),
            unreadOnly: unreadOnly.toString()
        });

        const apiUrl = `${API_ENDPOINTS.user.getNotifications}?${params.toString()}`;
        const response = await apiRequest(apiUrl);
        
        console.log('📥 User notifications response:', response);

        // ✅ Parse response using updated parser
        const parsed = parsePagedResponse(response, page);
        
        // Update global state
        userNotifications = parsed.items;
        userCurrentPage = parsed.currentPage;
        userTotalPages = parsed.totalPages;
        userTotalCount = parsed.totalCount;

        console.log('🎯 User State Update:', {
            userNotificationsCount: userNotifications.length,
            userCurrentPage,
            userTotalPages,
            userTotalCount
        });

        // Update UI
        renderUserNotificationTable();
        updateUserPagination();

        if (loading) loading.style.display = 'none';
        if (table) table.style.display = 'block';
        
        console.log('✅ User notifications loaded successfully');
        
    } catch (err) {
        console.error('❌ Error fetching user notifications:', err);
        
        // Reset to safe state
        userNotifications = [];
        userCurrentPage = 1;
        userTotalPages = 1;
        userTotalCount = 0;
        
        renderUserNotificationTable();
        updateUserPagination();
        
        if (loading) loading.style.display = 'none';
        showError(`Không thể tải thông báo người dùng: ${err.message}`);
    }
}
async function loadUnreadCount() {
    try {
        const response = await apiRequest(API_ENDPOINTS.user.unreadCount);
        const unreadCount = response.unreadCount || 0;
        
        // Cập nhật UI hiển thị số thông báo chưa đọc
        updateUnreadCountDisplay(unreadCount);
        
        return unreadCount;
    } catch (error) {
        console.error('Lỗi tải số thông báo chưa đọc:', error);
        return 0;
    }
}

async function markNotificationAsRead(userNotificationId) {
    try {
        await apiRequest(`${API_ENDPOINTS.user.markAsRead}/${userNotificationId}/read`, {
            method: 'POST'
        });

        // Cập nhật UI
        const notificationElement = document.querySelector(`[data-notification-id="${userNotificationId}"]`);
        if (notificationElement) {
            notificationElement.classList.remove('unread');
            notificationElement.classList.add('read');
        }

        // Reload unread count
        await loadUnreadCount();
        
        showSuccess('Đã đánh dấu thông báo là đã đọc');
        
        // Refresh current view if needed
        if (currentView === 'user') {
            await fetchUserNotifications(userCurrentPage);
        }
    } catch (error) {
        showError('Không thể đánh dấu thông báo: ' + error.message);
        console.error('Error marking as read:', error);
    }
}

async function deleteUserNotification(userNotificationId) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;

    try {
        await apiRequest(`${API_ENDPOINTS.user.delete}/${userNotificationId}`, {
            method: 'DELETE'
        });

        showSuccess('Xóa thông báo thành công!');
        
        // Reload unread count
        await loadUnreadCount();
        
        // Refresh current view
        if (currentView === 'user') {
            await fetchUserNotifications(userCurrentPage);
        }
    } catch (error) {
        showError('Xóa thông báo thất bại: ' + error.message);
        console.error('Error deleting user notification:', error);
    }
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

function renderUserNotificationTable() {
    const tbody = document.getElementById('user-notification-list') || document.getElementById('notification-list');
    if (!tbody) {
        console.error('Element user-notification-list not found');
        return;
    }
    
    if (userNotifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Không có thông báo nào.</td></tr>';
        return;
    }

    tbody.innerHTML = userNotifications.map((notification, index) => `
        <tr data-notification-id="${notification.userNotificationID}" class="${notification.isRead ? 'read' : 'unread bg-blue-50'}">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${(userCurrentPage - 1) * itemsPerPage + index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    ${notification.icon ? `<i class="fas ${notification.icon} text-blue-600 mr-3"></i>` : ''}
                    <div>
                        <div class="text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-bold' : ''}">${notification.title || ''}</div>
                        <div class="text-xs text-gray-500 truncate max-w-xs">${stripHtml(notification.content || '')}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${notification.type || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatTime(notification.receivedAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${notification.isRead ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${notification.isRead ? 'Đã đọc' : 'Chưa đọc'}
                </span>
                ${notification.readAt ? `<div class="text-xs text-gray-400 mt-1">${formatTime(notification.readAt)}</div>` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                ${!notification.isRead ? `
                    <button onclick="markNotificationAsRead(${notification.userNotificationID})" class="text-blue-600 hover:text-blue-900">
                        <i class="fas fa-check"></i> Đánh dấu đã đọc
                    </button>
                ` : ''}
                <button onclick="viewUserNotification(${notification.userNotificationID})" class="text-green-600 hover:text-green-900">
                    <i class="fas fa-eye"></i> Xem
                </button>
                <button onclick="deleteUserNotification(${notification.userNotificationID})" class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> Xóa
                </button>
                ${notification.actionText && notification.actionUrl ? `
                    <a href="${notification.actionUrl}" target="_blank" class="text-purple-600 hover:text-purple-900">
                        <i class="fas fa-external-link-alt"></i> ${notification.actionText}
                    </a>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function renderNotificationTable() {
    const tbody = document.getElementById('notification-list');
    if (!tbody) {
        console.error('Element notification-list not found');
        return;
    }
    
    if (notifications.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">Không có thông báo nào.</td></tr>';
        return;
    }

    tbody.innerHTML = notifications.map((notification, index) => {
        // ⭐ TÍNH STT ĐÚNG
        const stt = (currentPage - 1) * itemsPerPage + index + 1;
        
        // ⭐ KIỂM TRA TRẠNG THÁI ĐỂ HIỂN THỊ ACTIONS
        const isSent = notification.status === 'sent';
        const isDraft = notification.status === 'draft';
        
        return `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${stt}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${notification.title || ''}</div>
                <div class="text-xs text-gray-500 truncate max-w-xs">${stripHtml(notification.content || '')}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${notification.type || ''}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatTime(notification.createdAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(notification)}">
                    ${getStatusText(notification)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <!-- ⭐ CHỈ HIỆN SỬA & XÓA KHI CHƯA GỬI (DRAFT) -->
                ${!isSent ? `
                    <button onclick="openModal(${notification.notificationID})" class="text-indigo-600 hover:text-indigo-900" title="Sửa thông báo">
                        <i class="fas fa-edit"></i> Sửa
                    </button>
                    <button onclick="deleteNotification(${notification.notificationID})" class="text-red-600 hover:text-red-900" title="Xóa thông báo">
                        <i class="fas fa-trash"></i> Xóa
                    </button>
                ` : `
                    <!-- THÔNG BÁO ĐÃ GỬI - KHÔNG THỂ SỬA/XÓA -->
                    <span class="text-gray-400 text-sm italic">
                        <i class="fas fa-lock"></i> Đã gửi
                    </span>
                `}
                
                <!-- NÚT XEM LUÔN HIỂN THỊ -->
                <button onclick="previewNotification(${notification.notificationID})" class="text-blue-600 hover:text-blue-900" title="Xem chi tiết">
                    <i class="fas fa-eye"></i> Xem
                </button>
                
                <!-- NÚT GỬI CHỈ HIỆN KHI LÀ DRAFT -->
                ${isDraft ? `
                    <button onclick="sendNotification(${notification.notificationID})" class="text-green-600 hover:text-green-900" title="Gửi thông báo">
                        <i class="fas fa-paper-plane"></i> Gửi
                    </button>
                ` : ''}
                
                <!-- ⭐ THÊM NÚT THỐNG KÊ CHO THÔNG BÁO ĐÃ GỬI -->
                ${isSent ? `
                    <button onclick="viewNotificationStats(${notification.notificationID})" class="text-purple-600 hover:text-purple-900" title="Xem thống kê">
                        <i class="fas fa-chart-bar"></i> Thống kê
                    </button>
                ` : ''}
            </td>
        </tr>`;
    }).join('');
    
    console.log('✅ Table rendered with conditional actions based on status');
}
// ⭐ THÊM FUNCTION XEM THỐNG KÊ CHO THÔNG BÁO ĐÃ GỬI
async function viewNotificationStats(notificationId) {
    try {
        console.log('📊 Viewing stats for notification:', notificationId);
        
        // Gọi API để lấy thống kê
        const response = await apiRequest(`${API_ENDPOINTS.admin.getById}/${notificationId}/stats`);
        console.log('📈 Stats response:', response);
        
        // Tạo modal hiển thị thống kê
        let statsModal = document.getElementById('stats-modal');
        if (!statsModal) {
            statsModal = createStatsModal();
        }
        
        const statsContent = document.getElementById('stats-content');
        if (statsContent) {
            const notification = notifications.find(n => n.notificationID === notificationId);
            const readRate = notification?.totalSent > 0 ? 
                ((notification?.totalRead || 0) / notification.totalSent * 100).toFixed(1) : 0;
            
            statsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <!-- Thông tin cơ bản -->
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <h4 class="font-semibold text-blue-900 mb-2">
                            <i class="fas fa-info-circle mr-2"></i>Thông tin cơ bản
                        </h4>
                        <div class="space-y-2 text-sm">
                            <p><strong>Tiêu đề:</strong> ${notification?.title || 'N/A'}</p>
                            <p><strong>Loại:</strong> ${notification?.type || 'N/A'}</p>
                            <p><strong>Đối tượng:</strong> ${getTargetAudienceText(notification?.targetAudience || '')}</p>
                            <p><strong>Thời gian gửi:</strong> ${formatTime(notification?.sentAt)}</p>
                        </div>
                    </div>
                    
                    <!-- Thống kê gửi -->
                    <div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                        <h4 class="font-semibold text-green-900 mb-2">
                            <i class="fas fa-paper-plane mr-2"></i>Thống kê gửi
                        </h4>
                        <div class="space-y-2 text-sm">
                            <p><strong>Tổng gửi:</strong> 
                                <span class="text-green-700 font-bold">${notification?.totalSent || 0}</span> người
                            </p>
                            <p><strong>Đã đọc:</strong> 
                                <span class="text-blue-700 font-bold">${notification?.totalRead || 0}</span> người
                            </p>
                            <p><strong>Tỷ lệ đọc:</strong> 
                                <span class="text-purple-700 font-bold">${readRate}%</span>
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Progress Bar -->
                <div class="mb-4">
                    <div class="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Tỷ lệ đọc</span>
                        <span>${readRate}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500" 
                             style="width: ${readRate}%"></div>
                    </div>
                </div>
                
                <!-- Chi tiết -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-2">
                        <i class="fas fa-list mr-2"></i>Chi tiết nội dung
                    </h4>
                    <div class="text-sm text-gray-700">
                        <p class="mb-2"><strong>Nội dung:</strong></p>
                        <div class="bg-white p-3 rounded border text-gray-800">
                            ${notification?.content || 'N/A'}
                        </div>
                        
                        ${notification?.actionText && notification?.actionUrl ? `
                            <p class="mt-3"><strong>Hành động:</strong> 
                                <a href="${notification.actionUrl}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                    ${notification.actionText} <i class="fas fa-external-link-alt ml-1"></i>
                                </a>
                            </p>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Hiển thị modal
        if (statsModal) {
            statsModal.style.display = 'block';
            setTimeout(() => {
                statsModal.style.opacity = '1';
            }, 10);
        }
        
    } catch (error) {
        showError('Không thể tải thống kê thông báo: ' + error.message);
        console.error('❌ Error viewing stats:', error);
    }
}

// ⭐ TẠO MODAL THỐNG KÊ
function createStatsModal() {
    const modal = document.createElement('div');
    modal.id = 'stats-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';
    
    modal.innerHTML = `
        <div class="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-md bg-white">
            <div class="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 class="text-lg font-bold text-gray-900">
                    <i class="fas fa-chart-bar text-purple-600 mr-2"></i>
                    Thống kê thông báo
                </h3>
                <button onclick="closeStatsModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <div id="stats-content" class="mt-4">
                <!-- Content will be inserted here -->
            </div>
            <div class="mt-6 flex justify-end">
                <button onclick="closeStatsModal()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors">
                    <i class="fas fa-times mr-1"></i> Đóng
                </button>
            </div>
        </div>
    `;
    
    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeStatsModal();
        }
    });
    
    document.body.appendChild(modal);
    return modal;
}

// ⭐ ĐÓNG MODAL THỐNG KÊ
function closeStatsModal() {
    const statsModal = document.getElementById('stats-modal');
    if (statsModal) {
        statsModal.style.opacity = '0';
        setTimeout(() => {
            statsModal.style.display = 'none';
        }, 300);
    }
}

// ============================================
// VIEW SWITCHING
// ============================================

async function switchToAdminView() {
    console.log('🔄 Switching to ADMIN view');
    
    if (currentView === 'admin') {
        console.log('⏭️ Already in admin view');
        return;
    }
    
    currentView = 'admin';
    
    // Hide user elements, show admin elements
    document.querySelectorAll('.user-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-view').forEach(el => el.style.display = 'block');
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('admin-tab')?.classList.add('active');
    
    // Reset pagination state and fetch fresh data
    currentPage = 1;
    totalPages = 1;
    totalCount = 0;
    notifications = [];
    
    console.log('🚀 Loading admin data...');
    await fetchAdminNotifications(1);
}

async function switchToUserView() {
    console.log('🔄 Switching to USER view');
    
    if (currentView === 'user') {
        console.log('⏭️ Already in user view');
        return;
    }
    
    currentView = 'user';
    
    // Hide admin elements, show user elements
    document.querySelectorAll('.admin-view').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.user-view').forEach(el => el.style.display = 'block');
    
    // Update active tab
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('user-tab')?.classList.add('active');
    
    // Reset user pagination state
    userCurrentPage = 1;
    userTotalPages = 1;
    userTotalCount = 0;
    userNotifications = [];
    
    console.log('🚀 Loading user data...');
    await fetchUserNotifications(1);
}

function toggleUnreadOnly() {
    const unreadOnlyCheckbox = document.getElementById('unread-only');
    const unreadOnly = unreadOnlyCheckbox?.checked || false;
    fetchUserNotifications(1, unreadOnly);
}

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateUnreadCountDisplay(count) {
    // Update badge trong navigation
    const badge = document.getElementById('unread-count-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
    }
    
    // Update counter trong user tab
    const userTabCounter = document.getElementById('user-tab-counter');
    if (userTabCounter) {
        userTabCounter.textContent = count > 0 ? `(${count})` : '';
    }
    
    // Update browser title
    if (count > 0) {
        document.title = `(${count}) Thông báo - ShopxEX1`;
    } else {
        document.title = 'Thông báo - ShopxEX1';
    }
}
function updateUserPagination() {
    console.log('🔄 Updating USER pagination:', { currentUserPage, userTotalPages, userTotalCount, currentView });
    
    if (currentView !== 'user') {
        console.log('⏭️ Skipping user pagination update - not in user view');
        return;
    }
    
    // ✅ UPDATE USER PAGINATION INFO
    const userPaginationInfo = document.getElementById('user-pagination-info') || document.getElementById('pagination-info');
    if (userPaginationInfo) {
        userPaginationInfo.textContent = `Hiển thị trang ${userCurrentPage} / ${userTotalPages} (Tổng số ${userTotalCount} thông báo)`;
    }

    // ✅ UPDATE USER NAVIGATION BUTTONS
    updateUserNavButton('prev', userCurrentPage <= 1, () => fetchUserNotifications(userCurrentPage - 1));
    updateUserNavButton('next', userCurrentPage >= userTotalPages, () => fetchUserNotifications(userCurrentPage + 1));
    
    // ✅ UPDATE USER PAGE INPUT
    const userPageInput = document.getElementById('user-page-input') || document.getElementById('page-input');
    if (userPageInput) {
        userPageInput.value = userCurrentPage;
        userPageInput.max = userTotalPages;
        userPageInput.min = 1;
    }
}
function updateUserNavButton(direction, disabled, action) {
    const buttonId = direction === 'prev' ? 
        (document.getElementById('user-prev-page') ? 'user-prev-page' : 'prev-page') :
        (document.getElementById('user-next-page') ? 'user-next-page' : 'next-page');
    
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.disabled = disabled;
    button.onclick = (e) => {
        e.preventDefault();
        if (!disabled) action();
    };
    
    if (disabled) {
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}
// Helper functions for pagination
function goToPage() {
    const pageInput = document.getElementById('page-input');
    if (!pageInput) return;
    
    const newPage = parseInt(pageInput.value);
    
    // Validation
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (tối thiểu là 1)');
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage > totalPages) {
        showError(`Số trang không được vượt quá ${totalPages}`);
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage !== currentPage) {
        fetchAdminNotifications(newPage);
    }
}

function goToUserPage() {
    const pageInput = document.getElementById('user-page-input') || document.getElementById('page-input');
    if (!pageInput) return;
    
    const newPage = parseInt(pageInput.value);
    
    // Validation
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (tối thiểu là 1)');
        pageInput.value = userCurrentPage;
        return;
    }
    
    if (newPage > userTotalPages) {
        showError(`Số trang không được vượt quá ${userTotalPages}`);
        pageInput.value = userCurrentPage;
        return;
    }
    
    if (newPage !== userCurrentPage) {
        const unreadOnlyCheckbox = document.getElementById('unread-only');
        const unreadOnly = unreadOnlyCheckbox?.checked || false;
        fetchUserNotifications(newPage, unreadOnly);
    }
}

// Advanced pagination with page selector
function updatePageSelector() {
    const pageSelector = document.getElementById('page-selector');
    if (!pageSelector) return;
    
    // Clear existing options
    pageSelector.innerHTML = '';
    
    // Generate page options
    const maxPagesToShow = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Trang ${i}`;
        if (i === currentPage) {
            option.selected = true;
        }
        pageSelector.appendChild(option);
    }
    
    // Add event listener
    pageSelector.onchange = function() {
        const selectedPage = parseInt(this.value);
        if (selectedPage !== currentPage) {
            fetchAdminNotifications(selectedPage);
        }
    };
}

// Items per page functionality
function changeItemsPerPage() {
    const displaySelect = document.getElementById('display');
    if (!displaySelect) return;
    
    const newItemsPerPage = parseInt(displaySelect.value);
    if (newItemsPerPage && newItemsPerPage !== itemsPerPage) {
        itemsPerPage = newItemsPerPage;
        
        // Recalculate current page to maintain position
        const currentFirstItem = (currentPage - 1) * itemsPerPage + 1;
        const newPage = Math.ceil(currentFirstItem / newItemsPerPage);
        
        if (currentView === 'admin') {
            fetchAdminNotifications(newPage);
        } else {
            const unreadOnlyCheckbox = document.getElementById('unread-only');
            const unreadOnly = unreadOnlyCheckbox?.checked || false;
            fetchUserNotifications(newPage, unreadOnly);
        }
    }
}

function updatePagination() {
    console.log('🔄 Updating ADMIN pagination:', { currentPage, totalPages, totalCount, currentView });
    
    // Chỉ update khi đang ở admin view
    if (currentView !== 'admin') {
        console.log('⏭️ Skipping admin pagination update - not in admin view');
        return;
    }
    
    // Update pagination info - CHỈ CHO ADMIN
    const paginationInfo = document.getElementById('admin-pagination-info') || document.getElementById('pagination-info');
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị trang ${currentPage} / ${totalPages} (Tổng số ${totalCount} thông báo)`;
        console.log('📊 Updated pagination info:', paginationInfo.textContent);
    }

    // Update Previous button - CHỈ CHO ADMIN
    const prevButton = document.getElementById('admin-prev-page') || document.getElementById('prev-page');
    if (prevButton) {
        prevButton.disabled = currentPage <= 1;
        prevButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                console.log('⬅️ Going to previous page:', currentPage - 1);
                fetchAdminNotifications(currentPage - 1);
            }
        };
        
        // Visual feedback
        if (currentPage <= 1) {
            prevButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            prevButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update Next button - CHỈ CHO ADMIN
    const nextButton = document.getElementById('admin-next-page') || document.getElementById('next-page');
    if (nextButton) {
        nextButton.disabled = currentPage >= totalPages;
        nextButton.onclick = (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                console.log('➡️ Going to next page:', currentPage + 1);
                fetchAdminNotifications(currentPage + 1);
            }
        };
        
        // Visual feedback
        if (currentPage >= totalPages) {
            nextButton.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            nextButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
    
    // Update page input - CHỈ CHO ADMIN
    const pageInput = document.getElementById('admin-page-input') || document.getElementById('page-input');
    if (pageInput) {
        pageInput.value = currentPage;
        pageInput.max = totalPages;
        pageInput.min = 1;
        
        // Remove old listeners
        pageInput.removeEventListener('keypress', handleAdminPageInputEnter);
        pageInput.addEventListener('keypress', handleAdminPageInputEnter);
    }

    // Update Go button - CHỈ CHO ADMIN
    const goButton = document.getElementById('admin-go-page') || document.getElementById('go-page');
    if (goButton) {
        goButton.onclick = (e) => {
            e.preventDefault();
            goToAdminPage();
        };
    }
    
    console.log('✅ Admin pagination updated successfully');
}

// ============================================
// MODAL AND PREVIEW FUNCTIONS
// ============================================

async function viewUserNotification(userNotificationId) {
    try {
        // Tìm notification trong danh sách hiện tại
        const userNotification = userNotifications.find(n => n.userNotificationID === userNotificationId);
        if (!userNotification) {
            showError('Không tìm thấy thông báo');
            return;
        }

        // Đánh dấu đã đọc nếu chưa đọc
        if (!userNotification.isRead) {
            await markNotificationAsRead(userNotificationId);
        }

        // Hiển thị modal preview
        const previewContent = document.getElementById('preview-content');
        const previewModal = document.getElementById('preview-modal');
        
        if (previewContent) {
            previewContent.innerHTML = `
                ${userNotification.icon ? `<div class="flex-shrink-0"><i class="fas ${userNotification.icon} text-blue-600 text-xl mt-1"></i></div>` : ''}
                <div class="flex-1 ${userNotification.icon ? 'ml-4' : ''}">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold text-gray-800">${userNotification.title || ''}</h3>
                        <span class="text-gray-500 text-sm">${formatTime(userNotification.receivedAt)}</span>
                    </div>
                    <p class="text-gray-600 mt-1">${userNotification.content || ''}</p>
                    ${userNotification.actionText && userNotification.actionUrl ? `
                        <div class="mt-2 flex items-center space-x-4">
                            <a href="${userNotification.actionUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">${userNotification.actionText}</a>
                        </div>` : ''}
                    <div class="mt-3 text-sm text-gray-500">
                        <p><strong>Loại:</strong> ${userNotification.type}</p>
                        <p><strong>Trạng thái:</strong> ${userNotification.isRead ? 'Đã đọc' : 'Chưa đọc'}</p>
                        <p><strong>Nhận lúc:</strong> ${formatTime(userNotification.receivedAt)}</p>
                        ${userNotification.readAt ? `<p><strong>Đọc lúc:</strong> ${formatTime(userNotification.readAt)}</p>` : ''}
                    </div>
                </div>
            `;
        }
        
        if (previewModal) {
            previewModal.classList.add('active');
        }
    } catch (error) {
        showError('Không thể xem thông báo: ' + error.message);
        console.error('Error viewing user notification:', error);
    }
}

// ============================================
// EXISTING ADMIN FUNCTIONS (giữ nguyên)
// ============================================

function applyFilters(page = 1) {
    const itemsPerPageSelect = document.getElementById('display');
    if (itemsPerPageSelect?.value) {
        itemsPerPage = parseInt(itemsPerPageSelect.value) || 10;
    }
    
    if (currentView === 'admin') {
        fetchAdminNotifications(page);
    } else {
        const unreadOnlyCheckbox = document.getElementById('unread-only');
        const unreadOnly = unreadOnlyCheckbox?.checked || false;
        fetchUserNotifications(page, unreadOnly);
    }
}

async function openModal(id = null) {
    try {
        const modal = document.getElementById('modal');
        if (!modal) {
            console.error('Modal not found');
            return;
        }

        // ✅ RESET STATE
        selectedUsers = [];

        if (id) {
            // Edit mode
            console.log('📝 [MODAL] Opening in edit mode for notification:', id);
            const response = await apiRequest(`${API_ENDPOINTS.admin.getById}/${id}`);
            currentNotification = response;
            
            // ✅ HANDLE EXISTING SPECIFIC TARGETING
            if (currentNotification.targetAudience?.startsWith('specific:')) {
                const idsString = currentNotification.targetAudience.substring('specific:'.length);
                selectedUsers = idsString.split(',')
                    .map(id => parseInt(id.trim()))
                    .filter(id => !isNaN(id));
                
                console.log('🎯 [MODAL] Loaded existing specific users:', selectedUsers);
            }
        } else {
            // Create mode
            console.log('➕ [MODAL] Opening in create mode');
            currentNotification = null;
        }

        // ✅ FILL FORM
        const form = document.getElementById('notification-form');
        if (form) {
            if (currentNotification) {
                // Fill with existing data
                form.querySelector('#title').value = currentNotification.title || '';
                form.querySelector('#message').value = currentNotification.content || '';
                form.querySelector('#type').value = currentNotification.type || 'info';
                form.querySelector('#icon').value = currentNotification.icon || 'fa-bell';
                form.querySelector('#action_text').value = currentNotification.actionText || '';
                form.querySelector('#action_url').value = currentNotification.actionUrl || '';
                
                // ✅ HANDLE TARGET AUDIENCE
                if (currentNotification.targetAudience?.startsWith('specific:')) {
                    // Add specific option if not exists
                    const targetSelect = form.querySelector('#target_audience');
                    let specificOption = targetSelect.querySelector('option[value="specific"]');
                    if (!specificOption) {
                        specificOption = document.createElement('option');
                        specificOption.value = 'specific';
                        specificOption.textContent = '🎯 Người dùng cụ thể';
                        targetSelect.appendChild(specificOption);
                    }
                    targetSelect.value = 'specific';
                } else {
                    form.querySelector('#target_audience').value = currentNotification.targetAudience || '';
                }
                
                if (currentNotification.scheduledAt) {
                    const scheduledDate = new Date(currentNotification.scheduledAt);
                    form.querySelector('#scheduled_at').value = scheduledDate.toISOString().slice(0, 16);
                }
            } else {
                // Reset form for new notification
                form.reset();
                form.querySelector('#type').value = 'info';
                form.querySelector('#icon').value = 'fa-bell';
            }
        }

        // ✅ UPDATE MODAL TITLE
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) {
            modalTitle.textContent = currentNotification ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới';
        }
        
        modal.classList.add('active');
        
        // ✅ UPDATE UI BASED ON SELECTION
        updateTargetAudienceUI();
        updateRecipientCount();
        
    } catch (error) {
        showError('Không thể tải thông báo: ' + error.message);
        console.error('Error opening modal:', error);
    }
    
    // Setup preview after form is filled
    setTimeout(() => {
        setupNotificationPreview();
        updatePreview();
    }, 100);
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
    }
    currentNotification = null;
}

async function saveNotification(event) {
    event.preventDefault();
    console.log('💾 [SAVE] Starting notification save...');
    
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
        // ✅ VALIDATE FORM FIRST
        if (!validateForm()) {
            return;
        }

        const form = document.getElementById('notification-form');
        const formData = new FormData(form);
        
        // ✅ DEBUG ALL FORM DATA
        console.log('🔍 [SAVE] All FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: "${value}"`);
        }
        
        // ✅ GET TARGET AUDIENCE WITH ENHANCED FALLBACKS
        let targetAudience = formData.get('target_audience');
        console.log('📋 [SAVE] Initial targetAudience from form:', targetAudience);
        console.log('📋 [SAVE] Current selectedUsers:', selectedUsers);
        
        // ✅ FALLBACK 1: CHECK HIDDEN INPUT
        if (!targetAudience) {
            const hiddenInput = form.querySelector('input[name="target_audience"]');
            targetAudience = hiddenInput?.value;
            console.log('🔍 [SAVE] Fallback from hidden input:', targetAudience);
        }
        
        // ✅ FALLBACK 2: CHECK SELECT ELEMENT DIRECTLY
        if (!targetAudience) {
            const selectElement = form.querySelector('#target_audience, select[name="target_audience"]');
            targetAudience = selectElement?.value;
            console.log('🔍 [SAVE] Fallback from select element:', targetAudience);
        }
        
        // ✅ FALLBACK 3: INFER FROM SELECTED USERS
        if (!targetAudience && selectedUsers.length > 0) {
            console.log('🔧 [SAVE] No targetAudience but selectedUsers exist - forcing "specific"');
            targetAudience = 'specific';
        }
        
        // ✅ EARLY VALIDATION BEFORE PROCESSING
        if (!targetAudience || targetAudience.trim() === '') {
            console.error('❌ [SAVE] CRITICAL: No target audience found anywhere!');
            console.error('❌ [SAVE] Form element:', form);
            console.error('❌ [SAVE] Select element:', form.querySelector('#target_audience'));
            console.error('❌ [SAVE] Hidden input:', form.querySelector('input[name="target_audience"]'));
            console.error('❌ [SAVE] Selected users count:', selectedUsers.length);
            
            showError('Lỗi: Không thể xác định đối tượng nhận thông báo. Vui lòng chọn lại!');
            return;
        }
        
        // ✅ HANDLE SPECIFIC USER SELECTION
        if (targetAudience === 'specific') {
            if (selectedUsers.length > 0) {
                targetAudience = `specific:${selectedUsers.join(',')}`;
                console.log('✅ [SAVE] Built specific format:', targetAudience);
            } else {
                console.error('❌ [SAVE] targetAudience is "specific" but no selectedUsers');
                showError('Vui lòng chọn người dùng cụ thể trước khi lưu!');
                return;
            }
        }
        
        // ✅ BUILD NOTIFICATION DATA
        const notificationData = {
            title: formData.get('title'),
            content: formData.get('message'),
            type: formData.get('type'),
            icon: formData.get('icon'),
            actionText: formData.get('action_text'),
            actionUrl: formData.get('action_url'),
            targetAudience: targetAudience,
            scheduledAt: formData.get('scheduled_at') || null
        };
        
        console.log('📤 [SAVE] Final notification data:', notificationData);
        
        // ✅ VALIDATE REQUIRED FIELDS
        if (!notificationData.title?.trim()) {
            showError('Vui lòng nhập tiêu đề thông báo!');
            return;
        }
        
        if (!notificationData.content?.trim()) {
            showError('Vui lòng nhập nội dung thông báo!');
            return;
        }
        
        // ✅ API CALL
        const method = currentNotification ? 'PUT' : 'POST';
        const apiUrl = currentNotification ? 
            `${API_ENDPOINTS.admin.update}/${currentNotification.notificationID}` : 
            API_ENDPOINTS.admin.create;
        
        console.log('🌐 [SAVE] API Request:', { method, apiUrl, data: notificationData });
        
        const response = await apiRequest(apiUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });

        console.log('✅ [SAVE] Success response:', response);

        showSuccess(currentNotification ? 
            'Cập nhật thông báo thành công!' : 
            'Tạo thông báo thành công!'
        );
        
        // ✅ CLOSE MODAL AND RELOAD
        closeModal();
        selectedUsers = [];
        currentNotification = null;
        await fetchAdminNotifications(currentPage);

    } catch (error) {
        console.error('❌ [SAVE] Error saving notification:', error);
        showError('Lỗi khi lưu thông báo: ' + error.message);
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}
function updateTargetAudienceDisplay() {
    console.log('🔄 [DISPLAY] Updating target audience display...');
    console.log('🔄 [DISPLAY] Selected users:', selectedUsers);
    
    // ✅ FIND TARGET AUDIENCE CONTAINER
    const form = document.getElementById('notification-form');
    if (!form) {
        console.error('❌ [DISPLAY] Notification form not found');
        return;
    }
    
    // ✅ FIND OR CREATE DISPLAY CONTAINER
    let displayContainer = form.querySelector('.target-audience-display');
    if (!displayContainer) {
        // Find target audience form group
        const targetSelect = form.querySelector('select[name="target_audience"], #target_audience, select:has(option[value="specific"])');
        const targetFormGroup = targetSelect?.closest('.form-group') || 
                               targetSelect?.closest('.mb-4') ||
                               targetSelect?.closest('div') ||
                               targetSelect?.parentElement;
        
        if (targetFormGroup) {
            displayContainer = document.createElement('div');
            displayContainer.className = 'target-audience-display mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md';
            targetFormGroup.appendChild(displayContainer);
            console.log('✅ [DISPLAY] Created display container');
        } else {
            console.error('❌ [DISPLAY] Cannot find target form group');
            return;
        }
    }
    
    // ✅ UPDATE DISPLAY CONTENT
    if (selectedUsers.length > 0) {
        displayContainer.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-users text-blue-600"></i>
                    <span class="text-blue-800 font-medium">
                        Đã chọn ${selectedUsers.length} người dùng cụ thể
                    </span>
                </div>
                <button 
                    type="button" 
                    onclick="openUserSelectionModal()" 
                    class="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                    Chỉnh sửa lựa chọn
                </button>
            </div>
            <div class="mt-1 text-sm text-blue-600">
                User IDs: ${selectedUsers.join(', ')}
            </div>
        `;
        displayContainer.style.display = 'block';
        
        // ✅ HIDE ORIGINAL SELECT (nếu cần)
        const targetSelect = form.querySelector('select[name="target_audience"], #target_audience');
        if (targetSelect && targetSelect.type === 'select-one') {
            // Option 1: Hide completely
            // targetSelect.style.display = 'none';
            
            // Option 2: Make read-only with custom display
            targetSelect.style.opacity = '0.5';
            targetSelect.disabled = true;
            
            // Add custom option for display
            const existingOption = Array.from(targetSelect.options).find(opt => opt.value.startsWith('specific:'));
            if (!existingOption) {
                const customOption = document.createElement('option');
                customOption.value = `specific:${selectedUsers.join(',')}`;
                customOption.textContent = `Đã chọn ${selectedUsers.length} người dùng cụ thể`;
                customOption.selected = true;
                targetSelect.appendChild(customOption);
            } else {
                existingOption.textContent = `Đã chọn ${selectedUsers.length} người dùng cụ thể`;
                existingOption.selected = true;
            }
        }
        
    } else {
        displayContainer.style.display = 'none';
        
        // ✅ RESTORE ORIGINAL SELECT
        const targetSelect = form.querySelector('select[name="target_audience"], #target_audience');
        if (targetSelect) {
            targetSelect.style.opacity = '1';
            targetSelect.disabled = false;
            
            // Remove custom options
            Array.from(targetSelect.options).forEach(option => {
                if (option.value.startsWith('specific:')) {
                    option.remove();
                }
            });
            
            // Reset to default
            targetSelect.value = '';
        }
    }
    
    console.log('✅ [DISPLAY] Target audience display updated');
}
function updateTargetAudienceUI() {
    console.log('🔄 [UI] Updating target audience UI...');
    
    // ✅ FIND TARGET ELEMENT WITH ROBUST METHOD
    const targetSelect = findTargetAudienceElement();
    
    if (!targetSelect) {
        console.warn('❌ [UI] Target audience element not found, but continuing...');
        // ✅ DON'T RETURN - CONTINUE TO UPDATE OTHER UI ELEMENTS
    }
    
    const currentValue = targetSelect?.value || '';
    const selectUsersBtn = document.getElementById('select-users-btn');
    
    console.log('🔄 [UI] Current target audience value:', currentValue);
    console.log('🔄 [UI] Current selectedUsers:', selectedUsers);
    
    // ✅ HANDLE SPECIFIC USER TARGETING
    const isSpecificTargeting = currentValue === 'specific' || 
                               currentValue.startsWith('specific:') || 
                               selectedUsers.length > 0;
    
    if (isSpecificTargeting) {
        console.log('🎯 [UI] Showing specific user selection controls');
        
        // ✅ SHOW SELECT USERS BUTTON
        if (selectUsersBtn) {
            selectUsersBtn.style.display = 'block';
            selectUsersBtn.classList.remove('hidden');
        }
        
        // ✅ UPDATE DISPLAY
        updateSelectionDisplay();
        
    } else {
        console.log('📊 [UI] Showing general targeting controls');
        
        // ✅ HIDE SELECT USERS BUTTON
        if (selectUsersBtn) {
            selectUsersBtn.style.display = 'none';
            selectUsersBtn.classList.add('hidden');
        }
        
        // ✅ HIDE SELECTION DISPLAY
        const displayText = document.getElementById('target-audience-display');
        if (displayText) {
            displayText.style.display = 'none';
        }
        
        // ✅ CLEAR SELECTED USERS if switching away from specific
        if (selectedUsers.length > 0 && !currentValue.startsWith('specific:')) {
            console.log('🔄 [UI] Clearing selected users due to target change');
            selectedUsers = [];
        }
    }
    
    // ✅ UPDATE RECIPIENT COUNT
    updateRecipientCount();
    
    console.log('✅ [UI] Target audience UI updated successfully');
}
function findTargetAudienceElement() {
    // ✅ METHOD 1: Try common IDs in form context
    const form = document.getElementById('notification-form');
    if (form) {
        const possibleSelectors = [
            '#target_audience',
            '#target-audience', 
            '#targetAudience',
            '#audience-select',
            '#target_audience_select',
            '[name="target_audience"]',
            '[name="target-audience"]',
            '[name="targetAudience"]'
        ];
        
        for (const selector of possibleSelectors) {
            const element = form.querySelector(selector);
            if (element) {
                console.log('✅ Found target element in form:', selector);
                return element;
            }
        }
    }
    
    // ✅ METHOD 2: Try document-wide
    const documentSelectors = [
        'target_audience',
        'target-audience', 
        'targetAudience',
        'audience-select',
        'hidden-target-audience'
    ];
    
    for (const id of documentSelectors) {
        const element = document.getElementById(id);
        if (element) {
            console.log('✅ Found target element in document:', id);
            return element;
        }
    }
    
    // ✅ METHOD 3: Search by pattern
    const allElements = document.querySelectorAll('select, input[type="hidden"]');
    for (const element of allElements) {
        const id = element.id?.toLowerCase() || '';
        const name = element.name?.toLowerCase() || '';
        
        if ((id.includes('target') && id.includes('audience')) ||
            (name.includes('target') && name.includes('audience'))) {
            console.log('✅ Found target element by pattern:', element.id || element.name);
            return element;
        }
    }
    
    console.warn('❌ Target audience element not found with any method');
    return null;
}

// THÊM HELPER FUNCTIONS
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

async function getRecipientCount(targetAudience) {
    try {
        console.log('🔢 [COUNT] Getting count for audience:', targetAudience);
        
        // ✅ HANDLE LEGACY "specific" (selectedUsers in memory)
        if (targetAudience === 'specific' && selectedUsers.length > 0) {
            console.log('🎯 [COUNT] Legacy specific format with selectedUsers:', selectedUsers.length);
            return selectedUsers.length;
        }
        
        // ✅ HANDLE PROPER "specific:1,2,3" format
        if (targetAudience && targetAudience.startsWith('specific:')) {
            const idsString = targetAudience.substring('specific:'.length);
            const userIds = idsString.split(',').filter(id => id.trim()).length;
            console.log('🎯 [COUNT] Specific format count:', userIds);
            return userIds;
        }
        
        // ✅ CALL BACKEND API FOR OTHER TARGETING
        const response = await apiRequest(`${API_ENDPOINTS.admin.recipientCount}?audience=${encodeURIComponent(targetAudience)}`);
        const count = response.count || 0;
        console.log('📊 [COUNT] API count:', count);
        return count;
        
    } catch (error) {
        console.error('❌ [COUNT] Error getting recipient count:', error);
        
        // ✅ FALLBACK FOR SPECIFIC TARGETING
        if (targetAudience === 'specific') {
            return selectedUsers.length;
        }
        
        return 0;
    }
}
// Thêm function để hiển thị số người nhận
async function updateRecipientCount() {
    const targetSelect = document.getElementById('target_audience');
    const targetAudience = targetSelect?.value;
    
    console.log('🔄 [COUNT] Updating recipient count for:', { targetAudience, selectedUsers });
    
    let countElement = document.getElementById('recipient-count');
    if (!countElement) {
        countElement = document.createElement('p');
        countElement.id = 'recipient-count';
        countElement.className = 'mt-1 text-sm font-medium';
        targetSelect?.parentNode.appendChild(countElement);
    }

    if (!targetAudience) {
        countElement.textContent = '';
        countElement.className = 'mt-1 text-sm font-medium';
        return;
    }

    try {
        // ✅ LOADING STATE
        countElement.textContent = '⏳ Đang tính toán...';
        countElement.className = 'mt-1 text-sm text-gray-500';
        
        let count = 0;
        
        // ✅ HANDLE SPECIFIC USER SELECTION
        if (targetAudience === 'specific') {
            count = selectedUsers.length;
            console.log('🎯 [COUNT] Specific targeting count:', count);
            
            if (count > 0) {
                countElement.textContent = `🎯 Sẽ gửi đến ${count} người dùng được chọn`;
                countElement.className = 'mt-1 text-sm text-blue-600 font-medium';
            } else {
                countElement.textContent = '🎯 Vui lòng chọn người dùng cụ thể';
                countElement.className = 'mt-1 text-sm text-yellow-600 font-medium';
            }
        } else {
            // ✅ CALL API FOR OTHER AUDIENCES
            count = await getRecipientCount(targetAudience);
            console.log('📊 [COUNT] API count result:', count);
            
            if (count > 0) {
                countElement.textContent = `📊 Sẽ gửi đến ${count} người dùng`;
                countElement.className = 'mt-1 text-sm text-blue-600 font-medium';
            } else {
                countElement.textContent = '⚠️ Không có người dùng nào trong nhóm này';
                countElement.className = 'mt-1 text-sm text-red-600 font-medium';
            }
        }
        
    } catch (error) {
        console.error('❌ [COUNT] Error updating recipient count:', error);
        countElement.textContent = '❌ Không thể tính số người nhận';
        countElement.className = 'mt-1 text-sm text-red-600';
    }
}

// Form validation with visual feedback
function validateForm() {
    const form = document.getElementById('notification-form');
    if (!form) return false;

    let isValid = true;
    const fields = [
        { id: 'title', name: 'Tiêu đề', minLength: 5 },
        { id: 'message', name: 'Nội dung', minLength: 10 }
        // ✅ DON'T validate target_audience here - let saveNotification handle it
    ];

    // Clear previous errors
    form.querySelectorAll('.form-error').forEach(el => {
        el.classList.remove('form-error');
    });
    form.querySelectorAll('.error-message').forEach(el => {
        el.remove();
    });

    fields.forEach(field => {
        const element = form.querySelector(`#${field.id}`);
        const value = element?.value?.trim();

        if (field.required && !value) {
            showFieldError(element, `${field.name} là bắt buộc`);
            isValid = false;
        } else if (field.minLength && value && value.length < field.minLength) {
            showFieldError(element, `${field.name} phải có ít nhất ${field.minLength} ký tự`);
            isValid = false;
        }
    });

    // ✅ SIMPLIFIED TARGET AUDIENCE VALIDATION
    const targetSelect = form.querySelector('#target_audience');
    const targetValue = targetSelect?.value;
    
    console.log('🔍 [VALIDATE] Target audience validation:', { targetValue, selectedUsers });
    
    // Basic validation - detailed validation in saveNotification
    if (!targetValue) {
        showFieldError(targetSelect, 'Vui lòng chọn đối tượng nhận thông báo');
        isValid = false;
    }

    // Validate action URL if action text is provided
    const actionText = form.querySelector('#action_text')?.value?.trim();
    const actionUrl = form.querySelector('#action_url')?.value?.trim();
    
    if (actionText && !actionUrl) {
        showFieldError(form.querySelector('#action_url'), 'URL hành động là bắt buộc khi có text nút');
        isValid = false;
    }

    console.log('📋 [VALIDATE] Form validation result:', isValid);
    return isValid;
}

function showFieldError(element, message) {
    if (!element) return;
    
    element.classList.add('form-error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    element.parentNode.appendChild(errorDiv);
}


async function deleteNotification(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này không?')) return;

    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
        await apiRequest(`${API_ENDPOINTS.admin.delete}/${id}`, {
            method: 'DELETE'
        });

        showSuccess('Xóa thông báo thành công!');
        fetchAdminNotifications(currentPage);
    } catch (error) {
        showError('Xóa thông báo thất bại: ' + error.message);
        console.error('Error deleting notification:', error);
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

async function sendNotification(id) {
    if (!id || isNaN(id)) {
        showError('ID thông báo không hợp lệ');
        return;
    }
    
    if (!confirm('Bạn có chắc chắn muốn gửi thông báo này không?')) return;

    console.log('🚀 [SEND] Starting send for notification:', id);
    
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';

    try {
        // ✅ VALIDATE NOTIFICATION EXISTS AND IS SENDABLE
        console.log('🔍 [SEND] Checking notification status...');
        const notification = await apiRequest(`${API_ENDPOINTS.admin.getById}/${id}`);
        
        if (!notification) {
            throw new Error('Thông báo không tồn tại');
        }
        
        if (notification.status === 'sent') {
            throw new Error('Thông báo đã được gửi trước đó');
        }
        
        console.log('✅ [SEND] Notification validated:', {
            id: notification.notificationID,
            title: notification.title,
            status: notification.status,
            targetAudience: notification.targetAudience
        });
        
        // ✅ PRE-CHECK RECIPIENT COUNT
        console.log('🔍 [SEND] Checking recipient count...');
        let recipientCount = 0;
        
        try {
            if (notification.targetAudience?.startsWith('specific:')) {
                const idsString = notification.targetAudience.substring('specific:'.length);
                recipientCount = idsString.split(',').filter(id => id.trim()).length;
                console.log('🎯 [SEND] Specific targeting: estimated recipients =', recipientCount);
            } else {
                const countResponse = await apiRequest(`${API_ENDPOINTS.admin.recipientCount}?audience=${encodeURIComponent(notification.targetAudience)}`);
                recipientCount = countResponse.count || 0;
                console.log('📊 [SEND] API recipient count =', recipientCount);
            }
        } catch (countError) {
            console.warn('⚠️ [SEND] Could not get recipient count:', countError.message);
            recipientCount = 0;
        }
        
        if (recipientCount === 0) {
            const confirmSend = confirm(
                `Cảnh báo: Không tìm thấy người nhận nào cho đối tượng "${notification.targetAudience}".\n\n` +
                `Có thể do:\n` +
                `- Không có người dùng hoạt động trong nhóm này\n` +
                `- User ID không hợp lệ (đối với chọn cụ thể)\n` +
                `- Lỗi kết nối database\n\n` +
                `Bạn có muốn tiếp tục gửi không?`
            );
            
            if (!confirmSend) {
                console.log('❌ [SEND] User cancelled send due to no recipients');
                return;
            }
        }
        
        // ✅ CORRECTED API CALL - REMOVE DOUBLE /send
        const sendUrl = `${API_ENDPOINTS.admin.send}/${id}`; // ✅ CORRECT: /notifications/admin/send/36
        console.log('📤 [SEND] Calling send API:', sendUrl);
        console.log('🌐 [SEND] Full URL:', `${API_BASE}${sendUrl}`);
        
        const sendResponse = await apiRequest(sendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ [SEND] Send successful:', sendResponse);

        // ✅ ENHANCED SUCCESS MESSAGE
        const successMsg = sendResponse.totalRecipients > 0 
            ? `Gửi thông báo thành công đến ${sendResponse.totalRecipients} người dùng!`
            : 'Thông báo đã được lưu nhưng không có người nhận nào.';
            
        showSuccess(successMsg);
        
        // Refresh notifications list
        await fetchAdminNotifications(currentPage);
        
        // Reload unread count
        await loadUnreadCount();
        
    } catch (error) {
        console.error('❌ [SEND] Error details:', {
            message: error.message,
            stack: error.stack,
            notificationId: id,
            timestamp: new Date().toISOString(),
            apiBase: API_BASE,
            endpoint: API_ENDPOINTS.admin.send,
            fullUrl: `${API_BASE}${API_ENDPOINTS.admin.send}/${id}`
        });
        
        // ✅ ENHANCED ERROR MESSAGES WITH DEBUGGING INFO
        let userMessage = 'Gửi thông báo thất bại: ';
        
        if (error.message.includes('Cannot send notification')) {
            userMessage += 'Không thể gửi thông báo.\n\n';
            userMessage += 'Nguyên nhân có thể:\n';
            userMessage += '• Không có người dùng nào trong nhóm đích\n';
            userMessage += '• User ID không hợp lệ (đối với chọn cụ thể)\n';
            userMessage += '• Thông báo đã được gửi trước đó\n';
            userMessage += '• Lỗi database hoặc kết nối\n\n';
            userMessage += 'Vui lòng:\n';
            userMessage += '1. Kiểm tra đối tượng nhận\n';
            userMessage += '2. Thử chọn lại người dùng\n';
            userMessage += '3. Liên hệ admin nếu vấn đề tiếp tục';
        } else if (error.message.includes('404')) {
            userMessage += 'Không tìm thấy endpoint API. Kiểm tra cấu hình URL.';
        } else if (error.message.includes('500')) {
            userMessage += 'Lỗi server nội bộ. Vui lòng thử lại sau hoặc liên hệ admin.';
        } else if (error.message.includes('no target users')) {
            userMessage += 'Không tìm thấy người dùng nào để gửi thông báo.\n';
            userMessage += 'Vui lòng kiểm tra lại đối tượng nhận.';
        } else {
            userMessage += error.message;
        }
        
        showError(userMessage);
        
    } finally {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
}

async function previewNotification(id) {
    try {
        console.log('🔍 [ADMIN] Previewing notification:', id);
        
        const notification = await apiRequest(`${API_ENDPOINTS.admin.getById}/${id}`);
        console.log('📄 [ADMIN] Notification data:', notification);
        
        let previewModal = document.getElementById('preview-modal');
        if (!previewModal) {
            console.log('🔧 [ADMIN] Creating preview modal...');
            previewModal = createPreviewModal();
        }
        
        const previewContent = document.getElementById('preview-content');
        
        if (previewContent) {
            previewContent.innerHTML = `
                <div class="flex">
                    ${notification.icon ? `<div class="flex-shrink-0"><i class="fas ${notification.icon} text-blue-600 text-xl mt-1"></i></div>` : ''}
                    <div class="flex-1 ${notification.icon ? 'ml-4' : ''}">
                        <div class="flex items-center justify-between">
                            <h3 class="text-lg font-semibold text-gray-800">${notification.title || ''}</h3>
                            <span class="text-gray-500 text-sm">${formatTime(notification.createdAt)}</span>
                        </div>
                        <p class="text-gray-600 mt-1">${notification.content || ''}</p>
                        ${notification.actionText ? `
                            <div class="mt-2 flex items-center space-x-4">
                                <a href="${notification.actionUrl || '#!'}" target="_blank" class="text-blue-600 hover:text-blue-800 font-medium">${notification.actionText}</a>
                            </div>` : ''}
                        <div class="mt-3 text-sm text-gray-500">
                            <p><strong>Đối tượng:</strong> ${getTargetAudienceText(notification.targetAudience)}</p>
                            <p><strong>Trạng thái:</strong> ${getStatusText(notification)}</p>
                            ${notification.scheduledAt ? `<p><strong>Lên lịch:</strong> ${formatTime(notification.scheduledAt)}</p>` : ''}
                            ${notification.sentAt ? `<p><strong>Đã gửi:</strong> ${formatTime(notification.sentAt)}</p>` : ''}
                            <p><strong>Tổng gửi:</strong> ${notification.totalSent || 0} | <strong>Đã đọc:</strong> ${notification.totalRead || 0}</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (previewModal) {
            showPreviewModal(previewModal);
            
        }
    } catch (error) {
        showError('Không thể xem trước thông báo: ' + error.message);
        console.error('❌ [ADMIN] Error previewing notification:', error);
    }
}
function createPreviewModal() {
    const modal = document.createElement('div');
    modal.id = 'preview-modal';
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.style.display = 'none';
    
    modal.innerHTML = `
        <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">Xem trước thông báo</h3>
                <button onclick="closePreview()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div id="preview-content" class="mt-4">
                <!-- Content will be inserted here -->
            </div>
        </div>
    `;
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closePreview();
        }
    });
    document.body.appendChild(modal);
    
    modal.classList.add = function(className) {
        if (className === 'active') {
            this.style.display = 'block';
        }
        this.className += ' ' + className;
    };
    
    return modal;
}

function showPreviewModal(modal) {
    if (modal) {
        modal.style.display = 'block';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        
        // ⭐ SMOOTH ANIMATION
        setTimeout(() => {
            modal.style.transition = 'all 0.3s ease';
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);
        
        console.log('✅ Modal shown with direct style');
    }
}

function hidePreviewModal(modal) {
    if (modal) {
        modal.style.transition = 'all 0.3s ease';
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Delay để animation chạy xong
        
        console.log('✅ Modal hidden with direct style');
    }
}

// ⭐ FIX closePreview - SỬ DỤNG HELPER FUNCTION
function closePreview() {
    const previewModal = document.getElementById('preview-modal');
    if (previewModal) {
        hidePreviewModal(previewModal); // ⭐ SỬ DỤNG HELPER FUNCTION
    }
}
// ============================================
// HELPER FUNCTIONS
// ============================================
function handleAdminPageInputEnter(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        goToAdminPage();
    }
}

function goToAdminPage() {
    const pageInput = document.getElementById('admin-page-input') || document.getElementById('page-input');
    if (!pageInput) {
        console.error('❌ Page input not found');
        return;
    }
    
    const newPage = parseInt(pageInput.value);
    
    console.log('🎯 Go to admin page:', { newPage, currentPage, totalPages });
    
    // Validation
    if (isNaN(newPage) || newPage < 1) {
        showError('Vui lòng nhập số trang hợp lệ (tối thiểu là 1)');
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage > totalPages) {
        showError(`Số trang không được vượt quá ${totalPages}`);
        pageInput.value = currentPage;
        return;
    }
    
    if (newPage !== currentPage) {
        console.log('🚀 Navigating to page:', newPage);
        fetchAdminNotifications(newPage);
    } else {
        console.log('⏭️ Same page, no action needed');
    }
}

function getStatusClass(notification) {
    if (notification.status === 'sent') return 'bg-green-100 text-green-800';
    if (notification.scheduledAt) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
}

function getStatusText(notification) {
    if (notification.status === 'sent') {
        return `Đã gửi: ${formatTime(notification.sentAt)}`;
    }
    if (notification.scheduledAt) {
        return `Lên lịch: ${formatTime(notification.scheduledAt)}`;
    }
    return 'Bản nháp';
}

function getTargetAudienceText(audience) {
    const audiences = {
        'customers': '👥 Tất cả khách hàng',
        'sellers': '🏪 Tất cả người bán', 
        'admins': '👑 Tất cả quản trị viên',
        'both': '👥🏪 Khách hàng & Người bán',
        'all': '🌐 Tất cả người dùng',
        
        // ✅ ADD SPECIFIC TARGETING
        'specific': '🎯 Người dùng được chọn',
        'vip_customers': '💎 Khách hàng VIP',
        'recent_customers': '🕒 Khách hàng gần đây',
        'inactive_customers': '😴 Khách hàng không hoạt động',
        'high_value_customers': '💰 Khách hàng có giá trị cao',
        'active_sellers': '🔥 Người bán hoạt động',
        'new_sellers': '🆕 Người bán mới',
        'top_sellers': '⭐ Người bán hàng đầu'
    };
    
    // ✅ HANDLE SPECIFIC USER IDs FORMAT
    if (audience && audience.startsWith('specific:')) {
        const ids = audience.substring('specific:'.length).split(',');
        return `🎯 ${ids.length} người dùng được chọn`;
    }
    
    return audiences[audience] || audience;
}

function formatTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        return new Date(isoString).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'N/A';
    }
}

function stripHtml(html) {
    if (!html) return '';
    try {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    } catch {
        return html;
    }
}

function showSuccess(message) {
    console.log('Success:', message);
    // Implement your notification system here
    alert(message);
}

function showError(message) {
    console.error('Error:', message);
    const errorElement = document.getElementById('error-message');
    const errorContainer = document.getElementById('error');
    
    if (errorElement && errorContainer) {
        errorElement.textContent = message;
        errorContainer.style.display = 'block';
    } else {
        alert(message);
    }
}

function loadLocalStorageData() {
    try {
        const stored = localStorage.getItem('notifications');
        if (stored) {
            const localData = JSON.parse(stored);
            notifications = localData;
            totalCount = localData.length;
            totalPages = Math.ceil(totalCount / itemsPerPage);
            renderNotificationTable();
            updatePagination();
            
            const loading = document.getElementById('loading');
            const table = document.getElementById('notification-table');
            if (loading) loading.style.display = 'none';
            if (table) table.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading localStorage data:', error);
    }
}

// ============================================
// AUTO REFRESH
// ============================================

function startAutoRefresh() {
    // Tự động refresh unread count mỗi 30 giây
    setInterval(async () => {
        try {
            await loadUnreadCount();
        } catch (error) {
            console.error('Auto refresh error:', error);
        }
    }, 30000);
}

function setupNotificationPreview() {
    const form = document.getElementById('notification-form');
    if (!form) return;

    // Elements to watch
    const watchElements = [
        '#title',
        '#message', 
        '#type',
        '#icon',
        '#action_text',
        '#action_url',
        '#target_audience'
    ];

    // Add event listeners
    watchElements.forEach(selector => {
        const element = form.querySelector(selector);
        if (element) {
            element.addEventListener('input', updatePreview);
            element.addEventListener('change', updatePreview);
        }
    });
}

function updatePreview() {
    const form = document.getElementById('notification-form');
    if (!form) return;

    const title = form.querySelector('#title')?.value || 'Tiêu đề thông báo';
    const content = form.querySelector('#message')?.value || 'Nội dung thông báo sẽ hiển thị ở đây...';
    const icon = form.querySelector('#icon')?.value || 'fa-bell';
    const actionText = form.querySelector('#action_text')?.value;
    const actionUrl = form.querySelector('#action_url')?.value;
    const targetAudience = form.querySelector('#target_audience')?.value;

    // Update preview elements
    const previewIcon = document.getElementById('preview-icon');
    const previewTitle = document.getElementById('preview-title');
    const previewText = document.getElementById('preview-text');
    const previewAction = document.getElementById('preview-action');
    const previewAudience = document.getElementById('preview-audience');

    if (previewIcon) {
        previewIcon.className = `fas ${icon} text-blue-600 preview-icon`;
    }
    
    if (previewTitle) {
        previewTitle.textContent = title.length > 40 ? title.substring(0, 40) + '...' : title;
    }
    
    if (previewText) {
        previewText.textContent = content.length > 60 ? content.substring(0, 60) + '...' : content;
    }
    
    if (previewAction) {
        if (actionText && actionUrl) {
            previewAction.style.display = 'block';
            const link = previewAction.querySelector('a');
            if (link) {
                link.textContent = actionText.length > 15 ? actionText.substring(0, 15) + '...' : actionText;
                link.href = actionUrl;
            }
        } else {
            previewAction.style.display = 'none';
        }
    }
    
    if (previewAudience) {
        const audienceText = getTargetAudienceText(targetAudience) || 'Chưa chọn';
        previewAudience.textContent = `📍 Gửi đến: ${audienceText}`;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM loaded, initializing notification system...');
        
        // Initialize system
        initializeSystem();
        
        // Start auto refresh
        startAutoRefresh();
        
        // Add event listeners for filters
        const searchInput = document.getElementById('search');
        const typeFilter = document.getElementById('type-filter');
        const dateFromInput = document.getElementById('date-from');
        const dateToInput = document.getElementById('date-to');
        const sortSelect = document.getElementById('sort');
        const displaySelect = document.getElementById('display');
        const unreadOnlyCheckbox = document.getElementById('unread-only');

        if (searchInput) {
            searchInput.addEventListener('input', () => applyFilters());
        }
        if (typeFilter) {
            typeFilter.addEventListener('change', () => applyFilters());
        }
        if (dateFromInput) {
            dateFromInput.addEventListener('change', () => applyFilters());
        }
        if (dateToInput) {
            dateToInput.addEventListener('change', () => applyFilters());
        }
        if (sortSelect) {
            sortSelect.addEventListener('change', () => applyFilters());
        }
        if (displaySelect) {
            displaySelect.addEventListener('change', () => applyFilters());
        }
        if (unreadOnlyCheckbox) {
            unreadOnlyCheckbox.addEventListener('change', toggleUnreadOnly);
        }

        // Tab switching listeners
        const adminTab = document.getElementById('admin-tab');
        const userTab = document.getElementById('user-tab');
        
        if (adminTab) {
            adminTab.addEventListener('click', switchToAdminView);
        }
        if (userTab) {
            userTab.addEventListener('click', switchToUserView);
        }

    } catch (error) {
        console.error('Lỗi tải trang:', error);
        showError('Không thể tải trang: ' + error.message);
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
    setupNotificationPreview(); 
});
// Thêm vào event listener
document.getElementById('target_audience')?.addEventListener('change', updateRecipientCount);
// ============================================
// UTILITY FUNCTIONS
// ============================================

// Debounce function to prevent too many API calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// GLOBAL EXPORTS
// ============================================


window.openUserSelectionModal = openUserSelectionModal;
window.closeUserSelectionModal = closeUserSelectionModal;
window.saveNotification = saveNotification;
window.deleteNotification = deleteNotification;
window.sendNotification = sendNotification;
window.previewNotification = previewNotification;
window.closePreview = closePreview;
window.applyFilters = applyFilters;
window.fetchAdminNotifications = fetchAdminNotifications;
window.fetchUserNotifications = fetchUserNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.deleteUserNotification = deleteUserNotification;
window.viewUserNotification = viewUserNotification;
window.switchToAdminView = switchToAdminView;
window.switchToUserView = switchToUserView;
window.toggleUnreadOnly = toggleUnreadOnly;
window.viewNotificationStats = viewNotificationStats;
window.closeStatsModal = closeStatsModal;

window.loadUsersPage = loadUsersPage;
window.searchUsers = searchUsers;
window.selectAllUsers = selectAllUsers;
window.clearAllUsers = clearAllUsers;
window.toggleUserSelection = toggleUserSelection;
window.confirmUserSelection = confirmUserSelection;