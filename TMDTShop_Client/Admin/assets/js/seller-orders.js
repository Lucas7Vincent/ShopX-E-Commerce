/**
 * Debounce function để tránh gọi API quá nhiều lần
 * @param {Function} func - Function cần debounce
 * @param {number} wait - Thời gian chờ (ms)
 * @returns {Function} - Function đã được debounce
 */
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


// ...existing code... (giữ nguyên toàn bộ code còn lại)
    // Biến lưu trữ dữ liệu đơn hàng và thông tin phân trang
    let sellerOrders = [];
    let orderPagination = {
        currentPage: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0
    };

    // Biến lưu trữ bộ lọc đơn hàng và sắp xếp
    let orderFilter = {
        startDate: null,
        endDate: null,
        status: null,
        searchTerm: '',
        minPrice: null,
        maxPrice: null,
        sortBy: 'OrderID',
        sortDirection: 'asc',
        pageSize: 10
    };

    // Cờ để theo dõi quá trình tải
    let ordersLoading = false;
    let debugMode = true; // Để dễ dàng bật/tắt debug

    // Khởi tạo quản lý đơn hàng khi DOM đã sẵn sàng và khi chuyển tab đến tab đơn hàng
    document.addEventListener('DOMContentLoaded', () => {
        if (debugMode) console.log('DOM loaded - checking orders section');
        
        // Kiểm tra xem có phải đang ở phần orders không
        setTimeout(() => {
            checkAndInitOrdersSection();
        }, 300); // Delay nhỏ để đảm bảo các thành phần UI đã được tạo
        
        // Thêm listener cho các sự kiện click vào tab 
        // (lấy tất cả các tab trong sidebar và theo dõi sự kiện click)
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems) {
            navItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    const sectionId = this.getAttribute('data-section');
                    if (sectionId === 'orders') {
                        // Đảm bảo rằng khi chuyển đến tab orders, các hàm init được gọi
                        if (debugMode) console.log('Orders tab clicked');
                        setTimeout(() => {
                            checkAndInitOrdersSection();
                        }, 300);
                    }
                });
            });
        }
        
        // Thêm xử lý responsive cho bảng đơn hàng
        window.addEventListener('resize', adjustOrdersTableResponsive);
    });

    // Các hằng số định nghĩa trạng thái đơn hàng
    const ORDER_STATUSES = Object.freeze({
        CHO_XAC_NHAN: "Chờ xác nhận",
        DANG_XU_LY: "Đang xử lý",
        DANG_GIAO: "Đang giao",
        DA_GIAO: "Đã giao",
        YEU_CAU_TRA_HANG_HOAN_TIEN: "Yêu cầu trả hàng/ hoàn tiền",
        DA_HOAN_TIEN: "Đã hoàn tiền",
        TU_CHOI_HOAN_TIEN: "Từ chối hoàn tiền",
        DA_HUY: "Đã hủy"
    });
    const STATUS_MAPPING = {
        'Chờ xác nhận': { 
            display: 'Chờ xác nhận', 
            class: 'status-pending', 
            vietnameseName: 'chờ xác nhận',
            color: 'yellow',
            allowedTransitions: ['Đang xử lý', 'Đã hủy']
        },
        'Đang xử lý': { 
            display: 'Đang xử lý', 
            class: 'status-processing', 
            vietnameseName: 'đang xử lý',
            color: 'blue',
            allowedTransitions: ['Đang giao', 'Đã hủy']
        },
        'Đang giao': {  
            display: 'Đang giao', 
            class: 'status-shipping', 
            vietnameseName: 'đang giao',
            color: 'indigo',
            allowedTransitions: ['Đã giao']
        },
        'Đã giao': {  
            display: 'Đã giao', 
            class: 'status-delivered', 
            vietnameseName: 'đã giao',
            color: 'green',
            allowedTransitions: [] // Customer có thể yêu cầu hoàn tiền, nhưng seller không thể chuyển
        },
        'Yêu cầu trả hàng/ hoàn tiền': { 
            display: 'Yêu cầu hoàn tiền', 
            class: 'status-refund-request', 
            vietnameseName: 'yêu cầu trả hàng/ hoàn tiền',
            color: 'orange',
            allowedTransitions: ['Đã hoàn tiền']
        },
        'Đã hoàn tiền': { 
            display: 'Đã hoàn tiền', 
            class: 'status-refunded', 
            vietnameseName: 'đã hoàn tiền',
            color: 'purple',
            allowedTransitions: []
        },
            'Từ chối hoàn tiền': {  
            display: 'Từ chối hoàn tiền', 
            class: 'status-refund-rejected', 
            vietnameseName: 'từ chối hoàn tiền',
            color: 'gray',
            allowedTransitions: ['Yêu cầu trả hàng/ hoàn tiền']
            },
        'Đã hủy': { 
            display: 'Đã hủy', 
            class: 'status-cancelled', 
            vietnameseName: 'đã hủy',
            color: 'red',
            allowedTransitions: []
        }
    };
    const STATUS_VARIATIONS = {
        // Vietnamese variations
        'chờ xác nhận': 'Chờ xác nhận',
        'cho xac nhan': 'Chờ xác nhận',
        'đang xử lý': 'Đang xử lý',
        'dang xu ly': 'Đang xử lý',
        'đang giao': 'Đang giao',  // ✅ FIXED: Backend exact value
        'dang giao': 'Đang giao',
        'đã giao': 'Đã giao',
        'da giao': 'Đã giao',
        'yêu cầu trả hàng/ hoàn tiền': 'Yêu cầu trả hàng/ hoàn tiền',
        'yeu cau tra hang/ hoan tien': 'Yêu cầu trả hàng/ hoàn tiền',
        'đã hoàn tiền': 'Đã hoàn tiền',
        'da hoan tien': 'Đã hoàn tiền',
        'từ chối hoàn tiền': 'Từ chối hoàn tiền', 
        'tu choi hoan tien': 'Từ chối hoàn tiền',
        'đã hủy': 'Đã hủy',
        'da huy': 'Đã hủy',
        
        // English variations
        'pending': 'Chờ xác nhận',
        'processing': 'Đang xử lý',
        'shipping': 'Đang giao',    // ✅ FIXED: Maps to correct backend value
        'shipped': 'Đang giao',
        'delivered': 'Đã giao',
        'refund request': 'Yêu cầu trả hàng/ hoàn tiền',
        'refunded': 'Đã hoàn tiền',
        'refund rejected': 'Từ chối hoàn tiền',
        'cancelled': 'Đã hủy'
    };
    const VIETNAMESE_TO_API = Object.entries(STATUS_MAPPING).reduce((acc, [apiStatus, info]) => {
        acc[info.vietnameseName.toLowerCase()] = apiStatus;
        acc[info.display.toLowerCase()] = apiStatus;
        return acc;
    }, {});
    
    // Thêm các biến thể vào mapping
    Object.entries(STATUS_VARIATIONS).forEach(([variation, apiStatus]) => {
        VIETNAMESE_TO_API[variation.toLowerCase()] = apiStatus;
    });


    function getAvailableStatuses(currentStatus) {
        // Chuyển đổi trạng thái hiện tại thành lowercase để so sánh
        const status = currentStatus?.toLowerCase() || '';
        
        // Danh sách tất cả các trạng thái
        const allStatuses = [
            { value: 'Chờ xác nhận', text: 'Chờ xác nhận' },
            { value: 'Đang xử lý', text: 'Đang xử lý' },
            { value: 'Đang giao', text: 'Đang giao' },
            { value: 'Đã giao', text: 'Đã giao' },
            { value: 'Yêu cầu trả hàng/ hoàn tiền', text: 'Yêu cầu trả hàng/ hoàn tiền' },
            { value: 'Đã hoàn tiền', text: 'Đã hoàn tiền' },
            { value: 'Từ chối hoàn tiền', text: 'Từ chối hoàn tiền' },
            { value: 'Đã hủy', text: 'Đã hủy' }
        ];
        
        // Định nghĩa các trạng thái được phép chuyển từ trạng thái hiện tại
        const statusTransitions = {
            'chờ xác nhận': ['Đang xử lý', 'Đã hủy'],
            'cho xac nhan': ['Đang xử lý', 'Đã hủy'],
            'pending': ['Đang xử lý', 'Đã hủy'],
            
            'đang xử lý': ['Đang giao', 'Đã hủy'],  // ✅ Chuyển sang "Đang giao"
            'dang xu ly': ['Đang giao', 'Đã hủy'],
            'processing': ['Đang giao', 'Đã hủy'],
            
            'đang giao': ['Đã giao'],  // ✅ FIXED: Backend exact key
            'dang giao': ['Đã giao'],
            'shipping': ['Đã giao'],
            'shipped': ['Đã giao'],
            
            'đã giao': [],  // ✅ Seller không thể chuyển từ "Đã giao"
            'da giao': [],
            'delivered': [],
            
            'yêu cầu trả hàng/ hoàn tiền': ['Đã hoàn tiền'],
            'yeu cau tra hang/ hoan tien': ['Đã hoàn tiền'],
            
            // Final states
            'đã hoàn tiền': [],
            'da hoan tien': [],
            'từ chối hoàn tiền': [],
            'tu choi hoan tien': [],
            'đã hủy': [],
            'da huy': [],
            'cancelled': [],
            'refunded': []
        };
        
        // Lấy danh sách trạng thái có thể chuyển đến
        const allowedTransitions = statusTransitions[status] || [];
        
        // Lọc các trạng thái cho phép
        return allStatuses.filter(s => allowedTransitions.includes(s.value));
    }

    /**
     * Lấy class CSS tương ứng với trạng thái
     * @param {string} status - Trạng thái đơn hàng
     * @returns {string} - Tên class CSS
     */
    function getStatusClass(status) {
    const normalizedStatus = status.toLowerCase().trim();
    
    // Sử dụng STATUS_MAPPING làm nguồn chính thực
    for (const [apiStatus, info] of Object.entries(STATUS_MAPPING)) {
        if (normalizedStatus === apiStatus.toLowerCase() || 
            normalizedStatus === info.vietnameseName || 
            normalizedStatus === info.display.toLowerCase()) {
            return info.class;
        }
    }
    
    // Fallback cases để xử lý các trường hợp cũ
    switch (true) {
        case normalizedStatus.includes('pending') || normalizedStatus.includes('chờ'):
            return 'status-pending';
        case normalizedStatus.includes('processing') || normalizedStatus.includes('đang xử lý'):
            return 'status-processing';
        case normalizedStatus.includes('shipped') || normalizedStatus.includes('đang giao hàng'):
            return 'status-shipped';
        case normalizedStatus.includes('delivered') || normalizedStatus.includes('đã giao'):
            return 'status-delivered';
        case normalizedStatus.includes('refunded') || normalizedStatus.includes('đã hoàn tiền'):
            return 'status-refunded';
        case normalizedStatus.includes('cancelled') || normalizedStatus.includes('đã hủy'):
            return 'status-cancelled';
        default:
            return 'status-default';
    }
}
    /**
     * Lấy trạng thái tiếp theo trong luồng xử lý đơn hàng
     * @param {string} currentStatus - Trạng thái hiện tại
     * @returns {string|null} - Trạng thái tiếp theo hoặc null nếu không có
     */
    function getNextStatusInFlow(currentStatus) {
        const status = currentStatus?.toLowerCase().trim();
        
        switch (true) {
            case status.includes('chờ xác nhận'):
                return 'Đang xử lý';
                
            case status.includes('đang xử lý'):
                return 'Đang giao';
                
            case status.includes('đang giao'):
                return 'Đã giao';
                
            case status.includes('yêu cầu trả hàng/ hoàn tiền'):
                return 'Đã hoàn tiền'; // ✅ FIXED
                
            default:
                return null;
        }
    }
   
    async function handleConfirmRefund(orderId) {
        if (confirm(`Xác nhận hoàn tiền cho đơn hàng #${orderId}? Đơn hàng sẽ chuyển sang trạng thái "Đã hoàn tiền".`)) {
            const result = await updateOrderStatus(orderId, 'Đã hoàn tiền', 'Seller xác nhận hoàn tiền');
            if (result.success) {
                displayToastMessage(`Đơn hàng #${orderId} đã được xác nhận hoàn tiền`, 'success');
                loadSellerOrders(orderPagination.currentPage);
            } else {
                displayToastMessage(`Lỗi: ${result.message}`, 'error');
            }
        }
    }
    /**
     * Lấy thông tin hiển thị cho trạng thái đơn hàng
     * @param {string} status - Trạng thái đơn hàng
     * @param {number} orderId - ID của đơn hàng
     * @returns {Object} - Thông tin trạng thái
     */
function getOrderStatusInfo(status, orderId) {
    const apiStatus = normalizeStatusForApi(status) || status;
    const statusInfo = STATUS_MAPPING[apiStatus] || {
        display: status || 'Không xác định',
        class: 'status-default'
    };
    
    let html = '';
    
    // ✅ NEW LOGIC: Xử lý đặc biệt cho "Yêu cầu trả hàng/ hoàn tiền"
    if (apiStatus === 'Yêu cầu trả hàng/ hoàn tiền') {
        html = `
            <button class="status-badge interactive ${statusInfo.class}" 
                onclick="handleRejectRefundByStatus(${orderId})"
                title="Click để TỪ CHỐI yêu cầu hoàn tiền">
                ${statusInfo.display}
                <i class="fas fa-times fa-xs ml-2 text-red-500"></i>
            </button>
        `;
    } else {
        // Logic bình thường cho các trạng thái khác
        const nextStatus = getNextStatusInFlow(apiStatus);
        const isInteractive = !!nextStatus;
        
        if (isInteractive) {
            html = `
                <button class="status-badge interactive ${statusInfo.class}" 
                    onclick="handleStatusButtonClick(${orderId}, '${status}')"
                    title="Nhấp để chuyển sang '${STATUS_MAPPING[nextStatus]?.display || nextStatus}'">
                    ${statusInfo.display}
                    <i class="fas fa-arrow-right fa-xs ml-2"></i>
                </button>
            `;
        } else {
            html = `<span class="status-badge ${statusInfo.class}">${statusInfo.display}</span>`;
        }
    }
    
    return {
        class: statusInfo.class,
        text: statusInfo.display,
        html,
        isInteractive: true
    };
}


function getOrderActions(orderId, status) {
    const apiStatus = normalizeStatusForApi(status);
    
    let actions = `
        <button onclick="viewOrderDetails(${orderId})" 
                class="action-button action-button-view" 
                title="Xem chi tiết">
            <i class="fas fa-eye"></i> Xem
        </button>
    `;
    
    // ✅ NEW LOGIC: Xử lý nút cho "Yêu cầu trả hàng/ hoàn tiền"
    if (apiStatus === 'Yêu cầu trả hàng/ hoàn tiền') {
        actions += `
            <button onclick="handleAcceptRefundByButton(${orderId})" 
                    class="action-button action-button-accept ml-2" 
                    title="XÁC NHẬN hoàn tiền">
                <i class="fas fa-check-circle"></i> Xác nhận
            </button>
        `;
    } else {
        // Logic bình thường cho các trạng thái khác
        // Cancel button cho giai đoạn đầu
        if (apiStatus === 'Chờ xác nhận' || apiStatus === 'Đang xử lý') {
            actions += `
                <button onclick="handleCancelOrder(${orderId})" 
                        class="action-button action-button-cancel ml-2" 
                        title="Hủy đơn hàng">
                    <i class="fas fa-times-circle"></i> Hủy
                </button>
            `;
        }
    }
    
    return actions;
}

// ✅ NEW: Handler function - TỪ CHỐI qua click trạng thái
async function handleRejectRefundByStatus(orderId) {
    if (confirm(`❌ TỪ CHỐI yêu cầu hoàn tiền cho đơn hàng #${orderId}?\n\n• Đơn hàng sẽ chuyển sang "Từ chối hoàn tiền"\n• Khách hàng KHÔNG thể yêu cầu hoàn tiền lại\n• Seller từ chối hoàn tiền`)) {
        const result = await updateOrderStatus(orderId, 'Từ chối hoàn tiền');
        if (result.success) {
            displayToastMessage(`❌ Đã từ chối yêu cầu hoàn tiền cho đơn hàng #${orderId}`, 'info');
            loadSellerOrders(orderPagination.currentPage);
        }
    }
}

// ✅ NEW: Handler function - ĐỒNG Ý qua nút "Xác nhận"
async function handleAcceptRefundByButton(orderId) {
    if (confirm(`✅ XÁC NHẬN hoàn tiền cho đơn hàng #${orderId}?\n\n• Khách hàng sẽ được hoàn tiền\n• Đơn hàng chuyển sang "Đã hoàn tiền"\n• Seller đồng ý hoàn tiền`)) {
        const result = await updateOrderStatus(orderId, 'Đã hoàn tiền');
        if (result.success) {
            displayToastMessage(`✅ Đã xác nhận hoàn tiền cho đơn hàng #${orderId}`, 'success');
            loadSellerOrders(orderPagination.currentPage);
        }
    }
}


// ✅ NEW: Export functions mới
window.handleRejectRefundByStatus = handleRejectRefundByStatus;
window.handleAcceptRefundByButton = handleAcceptRefundByButton;

    

    
    
    
    /**
     * Xử lý sự kiện khi người dùng click vào nút trạng thái
     * @param {number} orderId - ID đơn hàng
     * @param {string} currentStatus - Trạng thái hiện tại
     */
    async function handleStatusButtonClick(orderId, currentStatus) {
        const nextStatus = getNextStatusInFlow(currentStatus);
        if (!nextStatus) return;
        
        if (confirm(`Bạn có chắc muốn chuyển đơn hàng #${orderId} từ "${currentStatus}" sang "${nextStatus}"?`)) {
            const result = await updateOrderStatus(orderId, nextStatus);
            if (result.success) {
                displayToastMessage(`Đã chuyển đơn hàng #${orderId} sang trạng thái "${nextStatus}"`, 'success');
                // Tải lại danh sách đơn hàng
                loadSellerOrders(orderPagination.currentPage);
            } else {
                displayToastMessage(`Không thể cập nhật trạng thái: ${result.message}`, 'error');
            }
        }
    }

    /**
     * Xử lý sự kiện khi người dùng click vào nút hủy đơn hàng
     * @param {number} orderId - ID đơn hàng
     */
    async function handleCancelOrder(orderId) {
        if (confirm(`Bạn có chắc chắn muốn HỦY đơn hàng #${orderId} không?`)) {
            const result = await updateOrderStatus(orderId, 'Đã hủy'); // ← API format
            if (result.success) {
                displayToastMessage(`Đơn hàng #${orderId} đã được hủy thành công`, 'success');
                loadSellerOrders(orderPagination.currentPage);
            } else {
                displayToastMessage(`Không thể hủy đơn hàng: ${result.message}`, 'error');
            }
        }
    }
    /**
     * Xử lý sự kiện khi người dùng click vào nút xác nhận hoàn tiền
     * @param {number} orderId - ID đơn hàng
     */
    async function handleConfirmRefundRequest(orderId) {
        if (confirm(`Xác nhận yêu cầu trả hàng và hoàn tiền cho đơn hàng #${orderId}? \nĐơn hàng sẽ được chuyển sang "Đã hoàn tiền".`)) {
            const result = await updateOrderStatus(orderId, 'Completed'); // ← Hoặc trạng thái phù hợp với API
            if (result.success) {
                displayToastMessage(`Đơn hàng #${orderId} đã được xác nhận hoàn tiền thành công`, 'success');
                loadSellerOrders(orderPagination.currentPage);
            } else {
                displayToastMessage(`Không thể xác nhận hoàn tiền: ${result.message}`, 'error');
            }
        }
    }
    /**
     * Gửi yêu cầu API để cập nhật trạng thái đơn hàng
     * @param {number} orderId - ID đơn hàng
     * @param {string} newStatus - Trạng thái mới
     * @returns {Object} - Kết quả cập nhật
     */
    /**
     * Gửi yêu cầu API để cập nhật trạng thái đơn hàng - FIXED VERSION
     */
    async function updateOrderStatus(orderId, newStatus) {
    try {
        console.log(`🚀 Updating order ${orderId} to status: ${newStatus}`);
        
        const token = getTokenFromStorage();
        if (!token) {
            return {
                success: false,
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
            };
        }
        
        // Chuẩn hóa trạng thái theo API
        const apiStatus = normalizeStatusForApi(newStatus) || newStatus;
        console.log(`📤 API Status: ${apiStatus}`);
        
        // ✅ FIXED: Request body format chính xác với OrderStatusUpdateDto
        const requestBody = {
            newStatus: apiStatus,  // ✅ ĐÚNG field name
            notes: `Cập nhật bởi seller lúc ${new Date().toLocaleString('vi-VN')}`  // ✅ ĐÚNG field name
        };
        
        console.log(`📤 Request body:`, requestBody);
        
        const response = await fetch(`${API_BASE}/Orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `Lỗi cập nhật trạng thái (${response.status})`;
            try {
                const errorData = await response.json();
                console.error(`❌ API Error Response:`, errorData);
                
                if (response.status === 400) {
                    if (errorData.errors) {
                        const validationErrors = Object.values(errorData.errors).flat();
                        errorMessage = `Lỗi validation: ${validationErrors.join(', ')}`;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    } else {
                        errorMessage = `Lỗi 400: Dữ liệu không hợp lệ`;
                    }
                } else {
                    errorMessage = errorData.message || errorMessage;
                }
            } catch (parseError) {
                const textError = await response.text();
                console.error(`❌ Raw error response:`, textError);
                errorMessage = `Lỗi ${response.status}: ${textError || response.statusText}`;
            }
            return {
                success: false,
                message: errorMessage
            };
        }
        
        // ✅ Handle success response
        const responseData = await response.json();
        console.log(`📦 Success response:`, responseData);
        
        console.log(`✅ Order ${orderId} status updated successfully to "${apiStatus}"`);
        return { 
            success: true, 
            message: responseData.message || `Cập nhật trạng thái thành công`
        };
        
    } catch (error) {
        console.error(`❌ Network/Exception error updating order ${orderId}:`, error);
        return {
            success: false,
            message: `Lỗi kết nối: ${error.message}`
        };
    }
}
    /**
     * Cập nhật hàm renderOrders để sử dụng các hàm mới
     * @param {Array} orders - Danh sách đơn hàng
     */
    function renderOrders(orders) {
        const orderTableBody = document.getElementById('order-table-body');
        if (!orderTableBody) {
            console.error('Không tìm thấy phần tử #order-table-body');
            return;
        }
        
        if (!orders || !Array.isArray(orders)) {
            console.error('Dữ liệu đơn hàng không hợp lệ:', orders);
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center">
                        <div class="text-gray-500">Không có dữ liệu đơn hàng hợp lệ</div>
                    </td>
                </tr>
            `;
            return;
        }
        
        if (orders.length > 0) {
            try {
                orderTableBody.innerHTML = orders.map((order, index) => {
                    // Lấy thông tin đơn hàng
                    const orderId = order.orderID || order.orderId || order.id || 'N/A';
                    const customerName = order.customerName || (order.customerInfo && order.customerInfo.fullName) || 'Khách hàng';
                    const orderDate = formatDateTime(order.orderDate || order.createdAt);
                    const totalPayment = parseFloat(order.totalPayment) || 0;
                    const totalAmount = parseFloat(order.totalAmount) || 0;
                    const status = order.status || 'Không xác định';
                    const itemCount = order.numberOfItems || order.totalItems || order.items?.length || 0;
                    
                    // Xác định thông tin trạng thái và khả năng tương tác
                    let statusInfo = getOrderStatusInfo(status, orderId);
                    
                    // Xác định hành động có thể thực hiện
                    let actions = getOrderActions(orderId, status);
                    
                    return `
                        <tr class="${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100 transition-colors duration-150">
                            <td class="px-3 py-2 whitespace-nowrap">
                                <div class="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
                                    <a href="#" onclick="viewOrderDetails(${orderId}); return false;" title="Xem chi tiết đơn hàng">#${orderId}</a>
                                </div>
                            </td>
                            <td class="px-3 py-2">
                                <div class="text-sm text-gray-900">${customerName}</div>
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap">
                                <div class="text-sm text-gray-500">${orderDate}</div>
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-medium text-right">
                                ${formatCurrency(totalAmount)}
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500 font-medium text-right">
                                ${formatCurrency(totalPayment)}
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-center">
                                <span class="text-sm">${itemCount}</span>
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-center">
                                ${statusInfo.html}
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-center">
                                <div class="action-btn-container">
                                    ${actions}
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            } catch (error) {
                console.error('Lỗi khi render danh sách đơn hàng:', error);
                orderTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-4 text-center">
                            <div class="text-red-500">Xảy ra lỗi khi hiển thị danh sách: ${error.message}</div>
                        </td>
                    </tr>
                `;
            }
        } else {
            // Nếu không có đơn hàng nào
            orderTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-6 py-4 text-center">
                        <div class="text-gray-500">Không có đơn hàng nào</div>
                    </td>
                </tr>
            `;
        }
        
        // Cập nhật số lượng đơn hàng hiển thị
        updateOrderCountDisplay(orders.length);
    }

    /**
     * Cập nhật hiển thị số lượng đơn hàng
     * @param {number} count - Số lượng đơn hàng
     */
    function updateOrderCountDisplay(count) {
        const ordersCountElement = document.getElementById('orders-count');
        const ordersCountInfoElement = document.getElementById('orders-count-info');
        
        if (ordersCountElement) {
            ordersCountElement.textContent = `${count} đơn hàng`;
        }
        
        if (ordersCountInfoElement) {
            ordersCountInfoElement.textContent = `Hiển thị ${count} đơn hàng`;
        }
    }

    // Đảm bảo các hàm được hiển thị ra ngoài để có thể gọi từ HTML
    window.handleStatusButtonClick = handleStatusButtonClick;
    window.handleCancelOrder = handleCancelOrder;
    window.handleConfirmRefundRequest = handleConfirmRefundRequest;

    /**
     * Kiểm tra và khởi tạo phần orders nếu đang hiển thị
     */
    function checkAndInitOrdersSection() {
        // Đảm bảo chỉ chạy nếu đang ở trang đơn hàng và phần orders đang hiển thị
        const ordersSection = document.getElementById('orders-section');
        if (!ordersSection) {
            if (debugMode) console.log('Orders section not found');
            return;
        }
        
        // Kiểm tra xem phần orders có đang hiển thị không
        if (ordersSection.classList.contains('active') || 
            window.getComputedStyle(ordersSection).display !== 'none') {
            if (debugMode) console.log('Orders section is visible - initializing');
            
            // Khởi tạo sự kiện cho các bộ lọc
            initOrderFilters();
            
            // Tải đơn hàng ban đầu nếu chưa có dữ liệu
            if (sellerOrders.length === 0 && !ordersLoading) {
                loadSellerOrders();
            }
            
            // Điều chỉnh bảng responsive
            adjustOrdersTableResponsive();
        } else {
            if (debugMode) console.log('Orders section exists but is not visible');
        }
    }

    /**
     * Điều chỉnh responsive cho bảng đơn hàng
     */
    function adjustOrdersTableResponsive() {
        const orderTable = document.querySelector('#orders-section table');
        if (!orderTable) return;
        
        const windowWidth = window.innerWidth;
        
        // Lấy tất cả các cột trong bảng
        const headerCells = orderTable.querySelectorAll('thead th');
        const rows = orderTable.querySelectorAll('tbody tr');
        
        if (windowWidth < 768) {
            // Ẩn một số cột trên màn hình nhỏ
            hideTableColumn(headerCells, rows, 3); // Ẩn cột Số lượng
            if (windowWidth < 640) {
                hideTableColumn(headerCells, rows, 2); // Ẩn cột Ngày đặt
            }
        } else {
            // Hiển thị lại tất cả các cột
            showAllTableColumns(headerCells, rows);
        }
    }

    /**
     * Ẩn một cột cụ thể trong bảng
     */
    function hideTableColumn(headers, rows, columnIndex) {
        if (columnIndex >= 0 && columnIndex < headers.length && headers[columnIndex]) {
            headers[columnIndex].style.display = 'none';
        }
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (columnIndex >= 0 && columnIndex < cells.length && cells[columnIndex]) {
                cells[columnIndex].style.display = 'none';
            }
        });
    }

    /**
     * Hiển thị lại tất cả các cột trong bảng
     */
    function showAllTableColumns(headers, rows) {
        headers.forEach(header => header.style.display = '');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => cell.style.display = '');
        });
    }

    /**
     * Tải đơn hàng của người bán từ API
     * @param {number} page - Số trang cần tải (bắt đầu từ 1)
     */
    async function loadSellerOrders(page = 1) {
        try {
            ordersLoading = true;
            const orderTableBody = document.getElementById('order-table-body');
            if (orderTableBody) {
                orderTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-4 text-center">
                            <div class="animate-pulse flex justify-center items-center">
                                <div class="h-6 w-6 bg-blue-200 rounded-full mr-2"></div>
                                <div class="h-4 bg-blue-100 rounded w-1/3"></div>
                            </div>
                            <div class="text-sm text-gray-500 mt-2">Đang tải đơn hàng...</div>
                        </td>
                    </tr>
                `;
            }

            const token = getTokenFromStorage();
            if (!token) {
                displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                setTimeout(() => window.location.href = '/Admin/login.html', 2000);
                return;
            }

            orderPagination.currentPage = page;
            const params = new URLSearchParams();
            params.append('pageNumber', page.toString());
            params.append('pageSize', orderFilter.pageSize.toString());

            // Chuẩn hóa và thêm tham số bộ lọc
            if (orderFilter.searchTerm && orderFilter.searchTerm.trim()) {
                params.append('SearchTerm', orderFilter.searchTerm.trim());
                if (debugMode) console.log('Search term param:', orderFilter.searchTerm.trim());
            }

            if (orderFilter.status && orderFilter.status.trim()) {
                const apiStatus = normalizeStatusForApi(orderFilter.status);
                if (apiStatus) {
                    params.append('Status', apiStatus);
                    if (debugMode) console.log('Status param:', apiStatus);
                }
            }

            if (orderFilter.startDate) {
                const startDate = new Date(orderFilter.startDate).toISOString();
                params.append('StartDate', startDate);
                if (debugMode) console.log('StartDate param:', startDate);
            }
            if (orderFilter.endDate) {
                const endDate = new Date(orderFilter.endDate);
                endDate.setHours(23, 59, 59, 999); // Bao gồm cả ngày cuối
                params.append('EndDate', endDate.toISOString());
                if (debugMode) console.log('EndDate param:', endDate.toISOString());
            }
            if (orderFilter.minPrice && !isNaN(parseFloat(orderFilter.minPrice))) {
                params.append('MinPrice', parseFloat(orderFilter.minPrice).toString());
                if (debugMode) console.log('MinPrice param:', orderFilter.minPrice);
            }

            if (orderFilter.maxPrice && !isNaN(parseFloat(orderFilter.maxPrice))) {
                params.append('MaxPrice', parseFloat(orderFilter.maxPrice).toString());
                if (debugMode) console.log('MaxPrice param:', orderFilter.maxPrice);
            }

            if (orderFilter.sortBy) {
                const normalizedSortBy = normalizeSortByForApi(orderFilter.sortBy);
                params.append('SortBy', normalizedSortBy);
                params.append('SortDirection', orderFilter.sortDirection.toUpperCase());
                if (debugMode) console.log('Sort params:', normalizedSortBy, orderFilter.sortDirection);
            }

            const apiUrl = `${API_BASE}/Orders/seller-orders`;
            if (debugMode) {
                console.log('Calling API:', apiUrl);
                console.log('With params:', Object.fromEntries(params.entries()));
            }

            const response = await fetch(`${apiUrl}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                try {
                    const errorText = await response.text();
                    if (errorText) {
                        const errorJson = JSON.parse(errorText);
                        if (errorJson.errors) {
                            const validationErrors = Object.values(errorJson.errors).flat().join(', ');
                            errorMessage = `Lỗi validation: ${validationErrors}`;
                        } else {
                            errorMessage = errorJson.message || errorJson.title || errorMessage;
                        }
                    }
                } catch (parseError) {
                    console.error('Lỗi phân tích phản hồi:', parseError);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            if (debugMode) {
                console.group('API Response');
                console.log('Status:', response.status);
                console.log('Data:', data);
                console.groupEnd();
            }

            sellerOrders = data.items || [];
            orderPagination.totalItems = data.totalCount || 0;
            orderPagination.totalPages = data.totalPages || 1;

            if (orderFilter.sortBy && sellerOrders.length > 0) {
                sellerOrders.sort((a, b) => {
                    let aVal, bVal;
                    
                    // Lấy giá trị để so sánh
                    switch(orderFilter.sortBy) {
                        case 'OrderID':
                            aVal = a.orderID || a.orderId || 0;
                            bVal = b.orderID || b.orderId || 0;
                            break;
                        case 'OrderDate':
                            aVal = new Date(a.orderDate || 0).getTime();
                            bVal = new Date(b.orderDate || 0).getTime();
                            break;
                        case 'TotalAmount':
                            aVal = parseFloat(a.totalAmount || 0);
                            bVal = parseFloat(b.totalAmount || 0);
                            break;
                        case 'TotalPayment':
                            aVal = parseFloat(a.totalPayment || 0);
                            bVal = parseFloat(b.totalPayment || 0);
                            break;
                        default:
                            aVal = a[orderFilter.sortBy] || 0;
                            bVal = b[orderFilter.sortBy] || 0;
                    }
                    
                    // Sắp xếp
                    if (orderFilter.sortDirection === 'desc') {
                        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
                    } else {
                        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                    }
                });
            }  
            // Trong loadSellerOrders, sau khi nhận data từ API:
sellerOrders = data.items || [];

// ✅ CLIENT-SIDE SEARCH nếu backend không hỗ trợ
            if (orderFilter.searchTerm && orderFilter.searchTerm.trim() && sellerOrders.length > 0) {
            const searchTerm = orderFilter.searchTerm.toLowerCase().trim();
            sellerOrders = sellerOrders.filter(order => {
                // Tìm trong nhiều fields
                const customerName = (order.customerName || 
                                    (order.customerInfo && order.customerInfo.fullName) || 
                                    '').toLowerCase();
                const orderId = (order.orderID || order.orderId || '').toString();
                const status = (order.status || '').toLowerCase();
                
                return customerName.includes(searchTerm) || 
                    orderId.includes(searchTerm) || 
                    status.includes(searchTerm);
            });
            
            if (debugMode) console.log(`✅ Client-side search filtered: ${sellerOrders.length} results`);
            }         
        // ✅ CLIENT-SIDE PRICE FILTER
            if ((orderFilter.minPrice !== null || orderFilter.maxPrice !== null) && sellerOrders.length > 0) {
                sellerOrders = sellerOrders.filter(order => {
                    const totalAmount = parseFloat(order.totalAmount || order.totalPayment || 0);
                    
                    if (orderFilter.minPrice !== null && totalAmount < orderFilter.minPrice) {
                        return false;
                    }
                    
                    if (orderFilter.maxPrice !== null && totalAmount > orderFilter.maxPrice) {
                        return false;
                    }
                    
                    return true;
                });
                
                if (debugMode) console.log(`✅ Client-side price filtered: ${sellerOrders.length} results`);
            } 

            renderOrders(sellerOrders);
            renderOrderPagination();
            updateOrderCountDisplay(sellerOrders.length);

        } catch (error) {
            console.error('Lỗi khi tải đơn hàng:', error);
            displayToastMessage(`Không thể tải danh sách đơn hàng: ${error.message}`, 'error');
            if (orderTableBody) {
                orderTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="px-6 py-4 text-center">
                            <div class="text-red-600">
                                <i class="fas fa-exclamation-circle mr-2"></i>
                                ${error.message}
                            </div>
                            <button onclick="loadSellerOrders(${page})" class="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                                Thử lại
                            </button>
                        </td>
                    </tr>
                `;
            }
        } finally {
            ordersLoading = false;
        }
    }

    /**
     * Chuyển đổi trường sắp xếp từ UI sang định dạng API
     * @param {string} sortBy - Trường sắp xếp từ UI
     * @returns {string} - Trường sắp xếp cho API
     */
    function normalizeSortByForApi(sortBy) {
    const sortByMap = {
        'OrderID': 'OrderId',        // ✅ Thử chữ 'd' nhỏ
        'OrderDate': 'OrderDate',
        'TotalAmount': 'TotalAmount',
        'TotalPayment': 'TotalPayment',
        'ItemCount': 'Items',
    };
    
    const result = sortByMap[sortBy] || sortBy;
    if (debugMode) console.log(`🔄 Sort mapping: "${sortBy}" -> "${result}"`);
    return result;
}

    /**
     * Cập nhật hiển thị số lượng đơn hàng
     * @param {number} count - Số lượng đơn hàng
     */
    function updateOrderCountDisplay(count) {
        const ordersCountElement = document.getElementById('orders-count');
        const ordersCountInfoElement = document.getElementById('orders-count-info');
        
        if (ordersCountElement) {
            ordersCountElement.textContent = `${count} đơn hàng`;
        }
        
        if (ordersCountInfoElement) {
            ordersCountInfoElement.textContent = `Hiển thị ${count} đơn hàng`;
        }
    }


    /**
     * Kiểm tra xem có thể cập nhật trạng thái đơn hàng không
     * @param {string} status - Trạng thái hiện tại của đơn hàng
     * @returns {boolean} - Có thể cập nhật hay không
     */
    function canUpdateOrderStatus(status) {
        const allowedStatuses = [
            'Chờ xác nhận', 'Đang xử lý', 'Đang giao hàng', 'Đã giao hàng',
            'pending', 'processing', 'shipped'
        ];
        
        return allowedStatuses.some(s => status.toLowerCase() === s.toLowerCase());
    }





    

    /**
     * Hiển thị phân trang cho danh sách đơn hàng
     */
    function renderOrderPagination() {
        // Cập nhật hiển thị thông tin trang
        const currentPageInfo = document.getElementById('current-page-info');
        const totalPagesInfo = document.getElementById('total-pages-info');
        const totalItemsInfo = document.getElementById('total-items-info');
        
        if (currentPageInfo) currentPageInfo.textContent = orderPagination.currentPage.toString();
        if (totalPagesInfo) totalPagesInfo.textContent = orderPagination.totalPages.toString();
        if (totalItemsInfo) totalItemsInfo.textContent = orderPagination.totalItems.toString();
        
        const pageInput = document.getElementById('page-input');
        if (pageInput) {
            pageInput.value = orderPagination.currentPage.toString();
            pageInput.max = orderPagination.totalPages.toString();
        }
        
        // Cập nhật trạng thái nút phân trang
        const prevPageBtn = document.getElementById('prev-page-btn');
        const nextPageBtn = document.getElementById('next-page-btn');
        
        if (prevPageBtn) prevPageBtn.disabled = orderPagination.currentPage <= 1;
        if (nextPageBtn) nextPageBtn.disabled = orderPagination.currentPage >= orderPagination.totalPages;
        
        // Thiết lập sự kiện cho các nút phân trang
        if (prevPageBtn) {
            prevPageBtn.onclick = () => {
                if (orderPagination.currentPage > 1) {
                    changeOrderPage(orderPagination.currentPage - 1);
                }
            };
        }
        
        if (nextPageBtn) {
            nextPageBtn.onclick = () => {
                if (orderPagination.currentPage < orderPagination.totalPages) {
                    changeOrderPage(orderPagination.currentPage + 1);
                }
            };
        }
        
        // Thiết lập sự kiện cho nút go-to-page
        const goToPageBtn = document.getElementById('go-to-page-btn');
        if (goToPageBtn && pageInput) {
            goToPageBtn.onclick = () => {
                const targetPage = parseInt(pageInput.value);
                if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= orderPagination.totalPages && targetPage !== orderPagination.currentPage) {
                    changeOrderPage(targetPage);
                } else {
                    pageInput.value = orderPagination.currentPage.toString();
                }
            };
            
            // Thêm xử lý sự kiện Enter
            pageInput.onkeyup = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    goToPageBtn.click();
                }
            };
        }
    }

    /**
     * Chuyển đến trang đơn hàng khác
     * @param {number} page - Số trang muốn chuyển đến
     */
    function changeOrderPage(page) {
        if (debugMode) console.log(`Chuyển đến trang đơn hàng ${page}`);
        if (page < 1 || (orderPagination.totalPages && page > orderPagination.totalPages)) return;
        
        // Cuộn lên đầu phần đơn hàng
        const ordersSection = document.getElementById('orders-section');
        if (ordersSection) {
            ordersSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        loadSellerOrders(page);
    }


    /**
     * Khởi tạo các bộ lọc đơn hàng và xử lý sự kiện
     */
    function initOrderFilters() {
        if (debugMode) console.log('🔧 Initializing order filters');
    
        // Get all filter elements
        const elements = {
            form: document.getElementById('order-filter-form'),
            status: document.getElementById('status-filter'),
            startDate: document.getElementById('start-date-filter'),
            endDate: document.getElementById('end-date-filter'),
            search: document.getElementById('search-filter'),
            minPrice: document.getElementById('min-price-filter'),
            maxPrice: document.getElementById('max-price-filter'),
            reset: document.getElementById('reset-filter-btn'),
            sort: document.getElementById('sort-orders-by'),
            pageSize: document.getElementById('page-size-select')
        };
    
        // Log missing elements
        Object.entries(elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`⚠️ Missing element: ${key}`);
            }
        });
    
        // Build status filter options
        if (elements.status && elements.status.options.length <= 1) {
            if (debugMode) console.log('🔧 Building status filter options');
            elements.status.innerHTML = '<option value="">Tất cả trạng thái</option>';
            Object.entries(STATUS_MAPPING).forEach(([dbStatus, { display }]) => {
                const option = document.createElement('option');
                option.value = dbStatus;
                option.textContent = display;
                elements.status.appendChild(option);
            });
        }
    
        // Build sort options
        if (elements.sort) {
            elements.sort.innerHTML = `
                <option value="OrderID:asc">Mã đơn hàng (Tăng dần)</option>
                <option value="OrderID:desc">Mã đơn hàng (Giảm dần)</option>
                <option value="OrderDate:desc">Ngày đặt (Mới nhất)</option>
                <option value="OrderDate:asc">Ngày đặt (Cũ nhất)</option>
                <option value="TotalAmount:desc">Tổng tiền (Cao nhất)</option>
                <option value="TotalAmount:asc">Tổng tiền (Thấp nhất)</option>
                <option value="TotalPayment:desc">Thanh toán (Cao nhất)</option>
                <option value="TotalPayment:asc">Thanh toán (Thấp nhất)</option>
            `;
        }
    
        // Apply filters function with extensive validation
        const applyFilters = () => {
            if (debugMode) console.log('🔍 Applying filters...');
            
            // Get values
            const status = elements.status?.value?.trim() || null;
            const searchTerm = elements.search?.value?.trim() || '';
            const startDate = elements.startDate?.value || null;
            const endDate = elements.endDate?.value || null;
            const minPriceStr = elements.minPrice?.value?.trim() || '';
            const maxPriceStr = elements.maxPrice?.value?.trim() || '';
    
            // Parse and validate prices
            let minPrice = null;
            let maxPrice = null;
    
            if (minPriceStr) {
                minPrice = parseFloat(minPriceStr);
                if (isNaN(minPrice) || minPrice < 0) {
                    displayToastMessage('Giá tối thiểu không hợp lệ', 'error');
                    elements.minPrice.focus();
                    return;
                }
            }
    
            if (maxPriceStr) {
                maxPrice = parseFloat(maxPriceStr);
                if (isNaN(maxPrice) || maxPrice < 0) {
                    displayToastMessage('Giá tối đa không hợp lệ', 'error');
                    elements.maxPrice.focus();
                    return;
                }
            }
    
            if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
                displayToastMessage('Giá tối thiểu không thể lớn hơn giá tối đa', 'error');
                elements.maxPrice.focus();
                return;
            }
    
            // Validate date range
            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                if (start > end) {
                    displayToastMessage('Ngày bắt đầu không thể sau ngày kết thúc', 'error');
                    elements.endDate.focus();
                    return;
                }
            }
    
            // Update orderFilter
            orderFilter.status = status;
            orderFilter.startDate = startDate;
            orderFilter.endDate = endDate;
            orderFilter.searchTerm = searchTerm;
            orderFilter.minPrice = minPrice;
            orderFilter.maxPrice = maxPrice;
    
            if (debugMode) {
                console.log('📋 Updated orderFilter:', JSON.stringify(orderFilter, null, 2));
            }
    
            // Apply filters
            loadSellerOrders(1);
        };
    
        // Debounced version for search
        const debouncedApplyFilters = debounce(applyFilters, 500);
    
        // Set default values
        if (elements.status) elements.status.value = orderFilter.status || '';
        if (elements.startDate) elements.startDate.value = orderFilter.startDate || '';
        if (elements.endDate) elements.endDate.value = orderFilter.endDate || '';
        if (elements.search) elements.search.value = orderFilter.searchTerm || '';
        if (elements.minPrice) elements.minPrice.value = orderFilter.minPrice || '';
        if (elements.maxPrice) elements.maxPrice.value = orderFilter.maxPrice || '';
        if (elements.sort) elements.sort.value = `${orderFilter.sortBy}:${orderFilter.sortDirection}`;
        if (elements.pageSize) elements.pageSize.value = orderFilter.pageSize.toString();
    
        // Event handlers
        if (elements.form) {
            elements.form.addEventListener('submit', (e) => {
                e.preventDefault();
                applyFilters();
            });
        }
    
        // Change events for immediate filters
        [elements.status, elements.startDate, elements.endDate, elements.minPrice, elements.maxPrice].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    if (debugMode) console.log(`🔄 Filter changed: ${element.id} = "${element.value}"`);
                    applyFilters();
                });
            }
        });
    
        // Search with debounce
        if (elements.search) {
            elements.search.addEventListener('input', () => {
                if (debugMode) console.log(`🔍 Search: "${elements.search.value}"`);
                debouncedApplyFilters();
            });
        }
    
        // Sort change
        if (elements.sort) {
            elements.sort.addEventListener('change', () => {
                const sortValue = elements.sort.value;
                const [sortBy, sortDirection] = sortValue.split(':');
                orderFilter.sortBy = sortBy;
                orderFilter.sortDirection = sortDirection;
                
                if (debugMode) console.log(`🔄 Sort changed: ${sortBy} ${sortDirection}`);
                loadSellerOrders(1);
            });
        }
    
        // Page size change
        if (elements.pageSize) {
            elements.pageSize.addEventListener('change', () => {
                orderFilter.pageSize = parseInt(elements.pageSize.value);
                if (debugMode) console.log(`📄 Page size: ${orderFilter.pageSize}`);
                loadSellerOrders(1);
            });
        }
    
        // Reset button
        if (elements.reset) {
            elements.reset.addEventListener('click', () => {
                if (debugMode) console.log('🔄 Resetting all filters');
                
                // Clear form
                if (elements.status) elements.status.value = '';
                if (elements.startDate) elements.startDate.value = '';
                if (elements.endDate) elements.endDate.value = '';
                if (elements.search) elements.search.value = '';
                if (elements.minPrice) elements.minPrice.value = '';
                if (elements.maxPrice) elements.maxPrice.value = '';
                if (elements.sort) elements.sort.value = 'OrderID:asc';
                if (elements.pageSize) elements.pageSize.value = '10';
    
                // Reset orderFilter
                orderFilter = {
                    startDate: null,
                    endDate: null,
                    status: null,
                    searchTerm: '',
                    minPrice: null,
                    maxPrice: null,
                    sortBy: 'OrderID',
                    sortDirection: 'asc',
                    pageSize: 10
                };
    
                loadSellerOrders(1);
            });
        }
    
        if (debugMode) console.log('✅ Order filters initialized');
    }
    /**
     * Cập nhật thông tin số lượng đơn hàng
     */
    function updateOrderCountInfo() {
        const countInfo = document.getElementById('orders-count-info');
        if (countInfo) {
            if (sellerOrders.length > 0) {
                countInfo.textContent = `Có ${orderPagination.totalItems} đơn hàng (đang hiển thị ${sellerOrders.length})`;
            } else if (ordersLoading) {
                countInfo.textContent = 'Đang tải thông tin đơn hàng...';
            } else {
                countInfo.textContent = 'Không có đơn hàng nào';
            }
        }
    }


    /**
     * Mở modal chi tiết đơn hàng
     * @param {number} orderId - ID của đơn hàng cần xem
     */
    async function viewOrderDetails(orderId) {
        try {
            // Hiển thị loading
            const orderDetailModal = document.getElementById('order-detail-modal');
            if (!orderDetailModal) return;
            
            orderDetailModal.classList.remove('hidden');
            
            const modalContent = orderDetailModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.innerHTML = `
                    <div class="p-6 text-center">
                        <i class="fas fa-spinner fa-spin text-blue-600 text-2xl mb-3"></i>
                        <p>Đang tải thông tin đơn hàng...</p>
                    </div>
                `;
            }
            
            // Lấy token
            const token = getTokenFromStorage();
            if (!token) {
                displayToastMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                orderDetailModal.classList.add('hidden');
                return;
            }
            
            // Gọi API lấy chi tiết đơn hàng
            const response = await fetch(`${API_BASE}/Orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`API trả về mã lỗi: ${response.status}`);
            }
            
            const order = await response.json();
            if (debugMode) console.log('Chi tiết đơn hàng từ API:', order);
            
            // Hiển thị thông tin đơn hàng
            renderOrderDetail(order);
            
        } catch (error) {
            console.error('Lỗi khi tải chi tiết đơn hàng:', error);
            displayToastMessage(`Không thể tải thông tin đơn hàng: ${error.message}`, 'error');
            
            const orderDetailModal = document.getElementById('order-detail-modal');
            if (orderDetailModal) {
                orderDetailModal.classList.add('hidden');
            }
        }
    }

    /**
     * Hiển thị chi tiết đơn hàng trong modal
     * @param {Object} order - Dữ liệu đơn hàng cần hiển thị
     */
    function renderOrderDetail(order) {
        const orderDetailModal = document.getElementById('order-detail-modal');
        const modalContent = orderDetailModal.querySelector('.modal-content');
        
        if (!modalContent) return;
        
        if (debugMode) console.log('Hiển thị chi tiết đơn hàng:', order);
        
        // Hàm định dạng tiền tệ
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('vi-VN', { 
                style: 'currency', 
                currency: 'VND',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(amount);
        };
        
        // Hàm định dạng ngày giờ
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        // Lấy thông tin trạng thái
        const getStatusInfo = (status) => {
            // Sử dụng STATUS_MAPPING làm nguồn chính thực
            for (const [apiStatus, info] of Object.entries(STATUS_MAPPING)) {
                if (status?.toLowerCase() === apiStatus.toLowerCase() || 
                    status?.toLowerCase() === info.vietnameseName || 
                    status?.toLowerCase() === info.display.toLowerCase()) {
                    return { 
                        class: `bg-${getColorForStatus(apiStatus)} text-${getColorForStatus(apiStatus)}-800`, 
                        text: info.display 
                    };
                }
            }
            
            // Fallback
            return { class: 'bg-gray-100 text-gray-800', text: status || 'Không xác định' };
        };
        
        // Helper function để lấy màu cho trạng thái
        const getColorForStatus = (apiStatus) => {
            const colorMap = {
                'Pending': 'yellow',
                'Processing': 'blue',
                'Shipped': 'indigo',
                'Delivered': 'green',
                'Completed': 'green',
                'Cancelled': 'red'
            };
            return colorMap[apiStatus] || 'gray';
        };
        // Xác định ID, trạng thái và các biến khác
        const orderId = order.orderID || order.orderId || order.id;
        const status = order.status;
        const statusInfo = getStatusInfo(status);
        
        // Lấy thông tin khách hàng từ các cấu trúc có thể có
        const customer = order.customerInfo || order.customer || order.user || {};
        
        // Xác định các hành động có thể thực hiện dựa trên trạng thái
        const canUpdateStatus = !['đã hủy', 'hoàn thành', 'cancelled', 'completed'].includes(status?.toLowerCase());
        
        // Tạo dữ liệu sản phẩm
        let orderItemsHtml = '';
        
        // Kiểm tra tất cả các khả năng trường chứa danh sách sản phẩm
        const items = order.items || order.orderItems || order.orderDetails || [];
        
        if (items && items.length > 0) {
            orderItemsHtml = items.map(item => `
                <tr>
                    <td class="px-4 py-3 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0">
                                <img class="h-10 w-10 rounded object-cover" 
                                    src="${item.productImageURL || item.imageUrl || 'https://dummyimage.com/50x50/e0e0e0/000000.png&text=No+Image'}" 
                                    alt="${item.productName || 'Sản phẩm'}" 
                                    onerror="this.src='https://dummyimage.com/50x50/e0e0e0/000000.png&text=Err';">
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${item.productName}</div>
                                ${item.productID || item.productId ? `<div class="text-xs text-gray-500">ID: ${item.productID || item.productId}</div>` : ''}
                                ${item.shopName ? `<div class="text-xs text-gray-500">Shop: ${item.shopName}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.unitPrice || item.price || 0)}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${item.quantity || 0}</td>
                    <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">${formatCurrency(item.lineTotal || (item.unitPrice * item.quantity) || (item.price * item.quantity) || 0)}</td>
                </tr>
            `).join('');
        } else {
            orderItemsHtml = `
                <tr>
                    <td colspan="4" class="px-4 py-3 text-center text-gray-500">
                        Không có thông tin sản phẩm
                    </td>
                </tr>
            `;
        }
        
        // Tạo HTML chi tiết đơn hàng
        modalContent.innerHTML = `
            <div class="flex justify-between items-center p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h3 class="text-lg font-semibold">Chi tiết đơn hàng #${orderId}</h3>
                <button type="button" onclick="closeOrderDetailModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Thông tin khách hàng</h4>
                        <p class="mb-1"><span class="font-medium">Tên khách hàng:</span> ${customer.fullName || customer.name || customer.customerName || 'Không có thông tin'}</p>
                        <p class="mb-1"><span class="font-medium">Email:</span> ${customer.email || 'Không có thông tin'}</p>
                        <p class="mb-1"><span class="font-medium">Số điện thoại:</span> ${customer.phone || customer.phoneNumber || 'Không có thông tin'}</p>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Thông tin đơn hàng</h4>
                        <p class="mb-1"><span class="font-medium">Mã đơn hàng:</span> #${orderId}</p>
                        <p class="mb-1"><span class="font-medium">Ngày đặt:</span> ${formatDate(order.orderDate || order.createdAt)}</p>
                        <p class="mb-1">
                            <span class="font-medium">Trạng thái:</span> 
                            <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">${statusInfo.text}</span>
                        </p>
                    </div>
                </div>
                
                <div class="mb-6 bg-gray-50 p-4 rounded-lg">
                    <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Địa chỉ giao hàng</h4>
                    <p>${order.shippingAddress || customer.address || 'Không có thông tin địa chỉ'}</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="text-sm font-medium text-gray-500 mb-2 border-b pb-1">Sản phẩm</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thành tiền</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${orderItemsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="border-t border-gray-200 pt-4">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm text-gray-500">Tổng tiền sản phẩm:</span>
                        <span>${formatCurrency(order.totalAmount || order.subtotal || order.subTotal || 0)}</span>
                    </div>
                    ${order.shippingFee ? `
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm text-gray-500">Phí vận chuyển:</span>
                        <span>${formatCurrency(order.shippingFee || 0)}</span>
                    </div>
                    ` : ''}
                    <div class="flex justify-between items-center font-semibold text-lg">
                        <span>Tổng thanh toán:</span>
                        <span>${formatCurrency(order.totalPayment || order.totalAmount || order.total || 0)}</span>
                    </div>
                </div>
                
                ${canUpdateStatus ? `
                    
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Đóng modal chi tiết đơn hàng
     */
    function closeOrderDetailModal() {
        const orderDetailModal = document.getElementById('order-detail-modal');
        if (orderDetailModal) {
            orderDetailModal.classList.add('hidden');
        }
    }



    /**
     * Mở modal cập nhật trạng thái đơn hàng
     * @param {number} orderId - ID của đơn hàng cần cập nhật
     * @param {string} currentStatus - Trạng thái hiện tại của đơn hàng
     */
    function openUpdateStatusModal(orderId, currentStatus) {
        try {
            if (debugMode) console.log(`Opening status update modal for order #${orderId} with current status: ${currentStatus}`);
            
            const updateStatusModal = document.getElementById('update-status-modal');
            if (!updateStatusModal) {
                if (debugMode) console.error('Không tìm thấy modal cập nhật trạng thái');
                displayToastMessage('Không tìm thấy giao diện cập nhật trạng thái', 'error');
                return;
            }
            
            // Lấy phần tử select trong modal
            const statusSelect = updateStatusModal.querySelector('#new-status');
            if (statusSelect) {
                // Xóa tất cả options hiện tại
                statusSelect.innerHTML = '';
                
                // Thêm các options dựa vào trạng thái hiện tại
                const availableStatuses = getAvailableStatuses(currentStatus);
                if (availableStatuses.length === 0) {
                    displayToastMessage('Không có trạng thái nào có thể cập nhật từ ' + currentStatus, 'info');
                    return;
                }
                
                availableStatuses.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status.value;
                    option.textContent = status.text;
                    statusSelect.appendChild(option);
                });
            }
            
            // Lưu orderId vào form để sử dụng khi submit
            const updateStatusForm = updateStatusModal.querySelector('#update-status-form');
            if (updateStatusForm) {
                updateStatusForm.dataset.orderId = orderId;
            }
            
            // Xóa nội dung ghi chú
            const statusNote = updateStatusModal.querySelector('#status-note');
            if (statusNote) {
                statusNote.value = '';
            }
            
            // Hiển thị modal
            updateStatusModal.classList.remove('hidden');
            
            // Đặt focus vào select
            if (statusSelect) {
                setTimeout(() => statusSelect.focus(), 100);
            }
            
            // Thêm sự kiện đóng modal khi click ngoài
            updateStatusModal.addEventListener('click', (e) => {
                if (e.target === updateStatusModal) {
                    closeUpdateStatusModal();
                }
            });
            
            // Đảm bảo nút cập nhật có sự kiện click
            const updateButton = updateStatusModal.querySelector('button[type="button"]:last-child');
            if (updateButton) {
                // Xóa tất cả các event listener cũ
                const newUpdateButton = updateButton.cloneNode(true);
                updateButton.parentNode.replaceChild(newUpdateButton, updateButton);
                
                // Thêm sự kiện mới
                newUpdateButton.addEventListener('click', handleStatusChange);
            }
        } catch (error) {
            if (debugMode) console.error('Lỗi khi mở modal cập nhật trạng thái:', error);
            displayToastMessage('Có lỗi khi mở giao diện cập nhật trạng thái', 'error');
        }
    }

    /**
     * Đóng modal cập nhật trạng thái
     */
    function closeUpdateStatusModal() {
        const updateStatusModal = document.getElementById('update-status-modal');
        if (updateStatusModal) {
            updateStatusModal.classList.add('hidden');
        }
    }


    /**
     * Chuyển đổi trạng thái từ UI sang định dạng API
     * @param {string} status - Trạng thái từ UI
     * @returns {string|null} - Trạng thái cho API
     */
    function normalizeStatusForApi(status) {
        if (!status) return null;
        
        const statusLower = status.toLowerCase().trim();
        
        // ✅ UPDATED: Mapping với trạng thái database chính xác
        const statusMap = {
            'chờ xác nhận': 'Chờ xác nhận',
            'cho xac nhan': 'Chờ xác nhận',
            'pending': 'Chờ xác nhận',
            
            'đang xử lý': 'Đang xử lý',
            'dang xu ly': 'Đang xử lý',
            'processing': 'Đang xử lý',
            
            'đang giao': 'Đang giao',
            'đang giao hàng': 'Đang giao',
            'dang giao': 'Đang giao',
            'shipping': 'Đang giao',
            
            'đã giao': 'Đã giao',
            'da giao': 'Đã giao',
            'delivered': 'Đã giao',
            
            'yêu cầu trả hàng/ hoàn tiền': 'Yêu cầu trả hàng/ hoàn tiền',
            'yeu cau tra hang hoan tien': 'Yêu cầu trả hàng/ hoàn tiền',
            'refund request': 'Yêu cầu trả hàng/ hoàn tiền',
            
            'đã hoàn tiền': 'Đã hoàn tiền',
            'da hoan tien': 'Đã hoàn tiền',
            'refunded': 'Đã hoàn tiền',
            
            
            'đã hủy': 'Đã hủy',
            'da huy': 'Đã hủy',
            'cancelled': 'Đã hủy'
        };
        
        return statusMap[statusLower] || status;
    }
    /**
     * Xử lý khi người dùng click vào trạng thái đơn hàng
     * @param {Event} event - Sự kiện click
     * @param {string} currentStatus - Trạng thái hiện tại
     */
    function handleStatusChange(event, currentStatus) {
        const button = event.currentTarget;
        const tr = button.closest('tr');
        const orderId = tr.querySelector('td:first-child a')?.textContent?.replace('#', '');
        
        if (!orderId) {
            console.error('Không tìm thấy ID đơn hàng');
            return;
        }
        
        // Xác định trạng thái tiếp theo
        let nextStatus = '';
        const statusLower = currentStatus.toLowerCase();
        
        if (statusLower.includes('pending') || statusLower.includes('chờ xác nhận')) {
            nextStatus = 'Processing'; // Đang xử lý
        } else if (statusLower.includes('processing') || statusLower.includes('đang xử lý')) {
            nextStatus = 'Đang giao hàng'; // Đang giao
        } else if (statusLower.includes('shipped') || statusLower.includes('đang giao hàng')) {
            nextStatus = 'Đã giao hàng'; // Đã giao hàng
        } else {
            alert('Không thể chuyển tiếp trạng thái này!');
            return;
        }
        
        if (confirm(`Bạn có chắc muốn chuyển đơn hàng #${orderId} từ "${currentStatus}" sang "${nextStatus}"?`)) {
            // Gọi API cập nhật trạng thái ở đây
            updateOrderStatus(orderId, nextStatus);
        }
    }

    /**
     * Xử lý hủy đơn hàng
     * @param {number} orderId - ID đơn hàng cần hủy
     */
    async function handleCancelOrder(orderId) {
        if (confirm(`Bạn có chắc chắn muốn HỦY đơn hàng #${orderId} không?\nSản phẩm sẽ được hoàn lại kho.`)) {
            const result = await updateOrderStatus(orderId, 'Đã hủy');
            if (result.success) {
                displayToastMessage(`✅ Đơn hàng #${orderId} đã được hủy thành công`, 'success');
                loadSellerOrders(orderPagination.currentPage);
            }
        }
    }

    
    function formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Ngày không hợp lệ';
            
            return date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Ho_Chi_Minh'
            });
        } catch (error) {
            console.warn('Error formatting date:', dateString, error);
            return 'Lỗi định dạng ngày';
        }
    }
    
    function formatCurrency(amount) {
        if (!amount || isNaN(amount)) return '0₫';
        
        try {
            return new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(parseFloat(amount));
        } catch (error) {
            console.warn('Error formatting currency:', amount, error);
            return `${amount}₫`;
        }
    }

    /**
     * Lấy token từ localStorage hoặc sessionStorage
     * @returns {string|null} JWT token hoặc null nếu không tìm thấy
     */
    function getTokenFromStorage() {
        return localStorage.getItem('authToken') || 
            sessionStorage.getItem('authToken') ||
            localStorage.getItem('access_token') || 
            sessionStorage.getItem('access_token') ||
            null;
    }

    /**
     * Hiển thị thông báo toast - hàm an toàn để tránh lỗi đệ quy
     * @param {string} message - Nội dung thông báo
     * @param {string} type - Loại thông báo: 'info', 'success', 'error'
     * @param {number} duration - Thời gian hiển thị (ms)
     */
    function displayToastMessage(message, type = 'info', duration = 3000) {
        try {
            // Kiểm tra window.showToast (dự phòng nếu đã có trong global)
            if (window.showToast && typeof window.showToast === 'function' && window.showToast !== showToast) {
                window.showToast(message, type, duration);
                return;
            }
            
            // Nếu không có showToast toàn cục, tạo toast riêng
            const toast = document.getElementById('toast-notification');
            if (!toast) {
                if (debugMode) console.warn('Không tìm thấy phần tử toast-notification');
                return;
            }
            
            // Xóa các class type cũ
            toast.classList.remove('info', 'success', 'error');
            
            // Thiết lập nội dung và loại thông báo
            toast.textContent = message;
            toast.classList.add(type);
            toast.classList.add('show');
            
            // Tự động ẩn sau một khoảng thời gian
            setTimeout(() => {
                toast.classList.remove('show');
            }, duration);
        } catch (error) {
            // Nếu có lỗi, chỉ log ra console để tránh lỗi đệ quy
            if (debugMode) console.error('Lỗi khi hiển thị toast:', error);
        }
    }

    // Chức năng showToast an toàn cho global scope
    window.showToast = displayToastMessage;

    /**
     * Tạo dữ liệu đơn hàng mẫu trong trường hợp API lỗi
     * @returns {Array} Danh sách đơn hàng mẫu
     */
    function createDummyOrders() {
        return [
            {
                orderId: 1001,
                customerName: 'Nguyễn Văn A',
                orderDate: new Date().toISOString(),
                totalItems: 2,
                totalAmount: 1500000,
                status: 'Pending'
            },
            {
                orderId: 1002,
                customerName: 'Trần Thị B',
                orderDate: new Date(Date.now() - 86400000).toISOString(), // Hôm qua
                totalItems: 1,
                totalAmount: 800000,
                status: 'Processing'
            },
            {
                orderId: 1003,
                customerName: 'Lê Văn C',
                orderDate: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 ngày trước
                totalItems: 3,
                totalAmount: 2200000,
                status: 'Delivered'
            }
        ];
    }

    // Đảm bảo các hàm được export cho sử dụng từ HTML
    window.loadSellerOrders = loadSellerOrders;
    window.changeOrderPage = changeOrderPage;
    window.viewOrderDetails = viewOrderDetails;
    window.handleConfirmRefund = handleConfirmRefund;
    window.closeOrderDetailModal = closeOrderDetailModal;
    window.openUpdateStatusModal = openUpdateStatusModal;
    window.closeUpdateStatusModal = closeUpdateStatusModal;
    window.checkAndInitOrdersSection = checkAndInitOrdersSection;