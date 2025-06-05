// START OF FILE index.js // BẮT ĐẦU FILE index.js

/* ==============================
   CẤU HÌNH TOÀN CỤC & HẰNG SỐ
   ============================== */
const API_BASE_URL = 'https://localhost:7088/api';

/* ==============================
   ĐỊNH NGHĨA COMPONENT ALPINE.JS
   ============================== */
document.addEventListener('alpine:init', () => {
    console.log("Sự kiện Alpine 'alpine:init' đã kích hoạt. Đang đăng ký các component Alpine.");
    Alpine.data('headerData', () => ({
        mobileMenuOpen: false,
        // Các state khác cho dropdown con (nếu muốn quản lý tập trung thay vì x-data lồng nhau)

        logoutUser() {
            if (typeof window.handleLogout === 'function') {
                window.handleLogout();
            } else {
                console.error('hàm handleLogout không được định nghĩa toàn cục.');
                sessionStorage.clear(); // Xóa dự phòng
                window.location.href = "/Customer/templates/login.html";
            }
        },
        // init() được Alpine gọi khi component được khởi tạo
        init() {
            console.log('component.init() của headerData Alpine ĐƯỢC GỌI.');
            // Gọi các hàm để load dữ liệu và thiết lập cho header
            if (typeof window.initializeHeaderFunctionality === 'function') {
                window.initializeHeaderFunctionality();
            }
            if (typeof window.loadHeaderCategories === 'function') {
                window.loadHeaderCategories();
            }
            if (typeof window.updateCartDropdown === 'function') {
                window.updateCartDropdown();
            }
            // Lắng nghe sự kiện cartUpdated để cập nhật dropdown giỏ hàng
            document.addEventListener('cartUpdated', () => {
                console.log('sự kiện cartUpdated đã nhận được trong headerData, đang cập nhật dropdown giỏ hàng.');
                if (typeof window.updateCartDropdown === 'function') {
                    window.updateCartDropdown();
                }
            });
        }
    }));

    // Bạn có thể định nghĩa thêm các Alpine.data khác ở đây nếu cần
});


/* ==============================
   CÁC HÀM HỖ TRỢ TOÀN CỤC
   ============================== */

/**
 * Định dạng một số thành tiền tệ Việt Nam (VND).
 * @param {number} amount - Số tiền cần định dạng.
 * @returns {string} Chuỗi tiền tệ đã định dạng hoặc '0đ'.
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '0đ';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}
window.formatCurrency = formatCurrency; // Đưa ra toàn cục nếu các script không phải module khác cần dùng

/**
 * Lấy URL hình ảnh hợp lệ hoặc ảnh giữ chỗ.
 * @param {string} apiImageUrl - URL hình ảnh từ API.
 * @returns {string} URL hình ảnh hợp lệ hoặc ảnh giữ chỗ.
 */
function getImageUrl(apiImageUrl) {
    const placeholderImage = '../assets/images/placeholder.png'; // Điều chỉnh đường dẫn nếu cần
    if (!apiImageUrl || typeof apiImageUrl !== 'string' || apiImageUrl.toLowerCase() === 'string' || apiImageUrl.trim() === '') {
        return placeholderImage;
    }
    if (/^(https?:)?\/\//i.test(apiImageUrl)) { // Kiểm tra xem có phải là URL tuyệt đối không
        return apiImageUrl;
    }
    // Nếu apiImageUrl là đường dẫn tương đối từ server, bạn có thể cần nối với base URL của server
    // Hiện tại, nếu không phải absolute URL và không phải placeholder keywords, trả về placeholder
    return placeholderImage;
}
window.getImageUrl = getImageUrl;

/**
 * Chuẩn hóa lại kiểu hiển thị ngày/tháng/năm
 * @param {string} apiImageUrl - URL hình ảnh từ API.
 * @returns {string} URL hình ảnh hợp lệ hoặc ảnh giữ chỗ.
 */
function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
window.formatDate = formatDate;

/**
 * Đặt một giá trị vào sessionStorage.
 * @param {string} key - Khóa.
 * @param {string} value - Giá trị.
 */
function setSession(key, value) {
    try {
        sessionStorage.setItem(key, value);
    } catch (e) {
        console.error("Lỗi khi đặt sessionStorage:", e);
    }
}
window.setSession = setSession;

// Hàm định dạng hiển thị ngày/tháng/năm
function date(dateTime) {
    const dateTimeString = dateTime;
    const date = new Date(dateTimeString);

    const year = date.getFullYear(); // 2025
    const month = date.getMonth() + 1; // 5 (Cộng thêm 1 vì tháng trong JS bắt đầu từ 0)
    const day = date.getDate(); // 19

    const formattedDate = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
    return formattedDate
}

// Hàm so sánh thời gian (return: ngày)
function getDateDifference(date) {
    const currentDate = new Date()
    date = new Date(date)
    return (currentDate - date) / (1000 * 60 * 60 * 24)
}

window.date = date;

/**
 * Lấy một giá trị từ sessionStorage.
 * @param {string} key - Khóa.
 * @returns {string|null} Giá trị hoặc null nếu không tìm thấy.
 */
function getSession(key) {
    try {
        return sessionStorage.getItem(key);
    } catch (e) {
        console.error("Lỗi khi lấy sessionStorage:", e);
        return null;
    }
}
/**
 * Tính số ngày chênh lệch từ một ngày đến hiện tại
 * @param {string|Date} dateString - Ngày cần tính (ISO string hoặc Date object)
 * @returns {number} Số ngày chênh lệch (số dương nếu trong quá khứ)
 */
function getDateDifference(dateString) {
    try {
        const inputDate = new Date(dateString);
        const currentDate = new Date();
        
        // Kiểm tra tính hợp lệ của ngày
        if (isNaN(inputDate.getTime())) {
            console.warn('Invalid date provided to getDateDifference:', dateString);
            return Infinity; // Trả về số lớn để prevent return button
        }
        
        // Tính chênh lệch theo milliseconds, rồi chuyển sang ngày
        const timeDifference = currentDate.getTime() - inputDate.getTime();
        const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
        
        console.log(`📅 Date difference calculation:`, {
            inputDate: inputDate.toISOString(),
            currentDate: currentDate.toISOString(),
            daysDifference: daysDifference,
            roundedDays: Math.floor(daysDifference)
        });
        
        return Math.floor(daysDifference); // Làm tròn xuống để chỉ tính ngày hoàn chỉnh
    } catch (error) {
        console.error('Error calculating date difference:', error);
        return Infinity; // Trả về số lớn để prevent return button
    }
}

/**
 * Kiểm tra xem đơn hàng có thể yêu cầu hoàn tiền không (trong vòng 3 ngày)
 * @param {string|Date} deliveryDate - Ngày giao hàng
 * @returns {boolean} True nếu có thể yêu cầu hoàn tiền
 */
function canRequestReturn(deliveryDate) {
    const daysDiff = getDateDifference(deliveryDate);
    return daysDiff <= 3 && daysDiff >= 0; // Trong vòng 3 ngày và không phải tương lai
}

/**
 * Format thời gian còn lại để yêu cầu hoàn tiền
 * @param {string|Date} deliveryDate - Ngày giao hàng 
 * @returns {string} Thông báo thời gian còn lại
 */
function getReturnTimeRemaining(deliveryDate) {
    const daysDiff = getDateDifference(deliveryDate);
    const remainingDays = 3 - daysDiff;
    
    if (remainingDays > 0) {
        return `Còn ${remainingDays} ngày để yêu cầu hoàn tiền`;
    } else {
        return `Đã hết thời hạn yêu cầu hoàn tiền (${Math.abs(remainingDays)} ngày trước)`;
    }
}
window.getSession = getSession;


/* ==============================
   CÁC HÀM XÁC THỰC & NGƯỜI DÙNG
   ============================== */

/**
 * Lấy vai trò của người dùng từ JWT token trong sessionStorage.
 * @returns {string|null} Vai trò người dùng hoặc null nếu không tìm thấy/lỗi.
 */
function getRoleFromToken() {
    const token = getSession('token');
    if (!token) return null;
    try {
        const payloadBase64Url = token.split('.')[1];
        if (!payloadBase64Url) return null;
        let payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padding = payloadBase64.length % 4;
        if (padding) payloadBase64 += '='.repeat(4 - padding);
        const payloadObject = JSON.parse(atob(payloadBase64));
        return payloadObject.role || null;
    } catch (error) {
        console.error('Lỗi giải mã token hoặc lấy vai trò:', error);
        return null;
    }
}
window.getRoleFromToken = getRoleFromToken; // Đưa ra nếu các script không phải module cần

/**
 * Xử lý việc đăng xuất của người dùng.
 */
async function handleLogout() {
    const token = getSession("token");
    try {
        if (token) {
            await fetch(`${API_BASE_URL}/Auth/logout`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
            });
        }
    } catch (err) {
        console.error("Lỗi API trong quá trình đăng xuất:", err);
    } finally {
        sessionStorage.clear(); // Xóa tất cả dữ liệu session
        // deleteCookie("token"); // Nếu bạn đang dùng cookies
        window.location.href = "/Customer/templates/login.html"; // Chuyển hướng đến trang đăng nhập
    }
}
window.handleLogout = handleLogout;

/**
 * Khởi tạo các phần tử header như tên tài khoản và các link dành riêng cho vai trò.
 */
function initializeHeaderFunctionality() {
    console.log("Đang khởi tạo chức năng header...");
    // 1. Hiển thị Tên Tài khoản
    const accountNameElement = document.getElementById('accountName');
    const token = getSession("token");
    if (accountNameElement) {
        if (token) {
            try {
                const payloadBase64 = token.split('.')[1];
                let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
                const padding = payloadBase64Standard.length % 4;
                if (padding) payloadBase64Standard += '='.repeat(4 - padding);
                const payload = JSON.parse(atob(payloadBase64Standard));
                const userData = JSON.parse(getSession('userData') || '{}');
                const userNameToDisplay = userData.fullName || payload.unique_name || 'Tài khoản';
                accountNameElement.textContent = userNameToDisplay;
            } catch (error) {
                console.error('Lỗi giải mã token cho tên tài khoản:', error);
                accountNameElement.textContent = 'Tài khoản';
            }
        } else {
            accountNameElement.textContent = 'Tài khoản';
        }
    }

    // 2. Hiển thị Link Dành riêng cho Vai trò trong Header
    const userRole = getRoleFromToken();
    const roleLinkContainerHeader = document.getElementById('role-specific-link-container'); // ID phải tồn tại trong header.html
    if (roleLinkContainerHeader) {
        if (userRole === "Admin") {
            roleLinkContainerHeader.innerHTML = `<a href="/Admin/index.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100" role="menuitem">Truy cập Admin</a>`;
        } else if (userRole === "Seller") {
            roleLinkContainerHeader.innerHTML = `<a href="/Admin/templates/seller.html" class="block px-4 py-2 text-gray-700 hover:bg-gray-100" role="menuitem">Kênh người bán</a>`;
        } else {
            roleLinkContainerHeader.innerHTML = ''; // Xóa nếu không có vai trò cụ thể hoặc chưa đăng nhập
        }
    } else {
        // console.warn("Phần tử với ID 'role-specific-link-container' không tìm thấy trong header.");
    }

    // 3. Setup Header Search Form
    const headerSearchForm = document.getElementById('headerSearchForm');
    const headerSearchInput = document.getElementById('headerSearchInput');

    if (headerSearchForm && headerSearchInput) {
        headerSearchForm.addEventListener('submit', function (event) {
            event.preventDefault(); // Ngăn form submit theo cách truyền thống
            const searchTerm = headerSearchInput.value.trim();
            if (searchTerm) {
                // Chuyển hướng đến trang kết quả tìm kiếm với searchTerm làm query parameter
                window.location.href = `/Customer/templates/search-results.html?searchTerm=${encodeURIComponent(searchTerm)}`;
            } else {
                // Có thể thông báo người dùng nhập từ khóa hoặc không làm gì cả
                // headerSearchInput.focus(); // Ví dụ: focus lại vào ô tìm kiếm
            }
        });
    } else {
        console.warn("Header search form or input not found.");
    }
}
window.initializeHeaderFunctionality = initializeHeaderFunctionality;


/* ==============================
   CÁC HÀM DANH MỤC HEADER
   ============================== */

function createCategoryLinkElement(category, _isMobile = false) { // tham số isMobile có thể không cần nếu style giống nhau
    const link = document.createElement('a');
    link.href = `/Customer/templates/category-products.html?categoryId=${category.categoryID}&categoryName=${encodeURIComponent(category.categoryName)}`;
    link.className = `block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-600`; // Style nhất quán
    link.textContent = category.categoryName;
    link.setAttribute('role', 'menuitem');
    link.addEventListener('click', function (event) {
        event.preventDefault();
        setSession('categoryName', category.categoryName);
        setSession('categoryId', category.categoryID.toString());
        window.location.href = this.href;
    });
    return link;
}

async function loadHeaderCategories() {
    console.log("Đang tải danh mục header...");
    const desktopDropdownContent = document.getElementById('desktopCategoryDropdownContent');
    const mobileDropdownContent = document.getElementById('mobileCategoryDropdownContent');

    if (!desktopDropdownContent || !mobileDropdownContent) {
        // console.warn('Container dropdown danh mục không tìm thấy trong header.');
        return;
    }

    const loadingMsg = '<p class="px-4 py-2 text-gray-500 text-xs">Đang tải...</p>';
    desktopDropdownContent.innerHTML = loadingMsg;
    mobileDropdownContent.innerHTML = loadingMsg;

    try {
        const response = await fetch(`${API_BASE_URL}/Categories/all`);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP ${response.status} khi lấy danh mục`);
        }
        const categories = await response.json();

        desktopDropdownContent.innerHTML = ''; // Xóa thông báo đang tải
        mobileDropdownContent.innerHTML = '';   // Xóa thông báo đang tải

        if (categories && categories.length > 0) {
            categories.forEach(category => {
                desktopDropdownContent.appendChild(createCategoryLinkElement(category, false));
                mobileDropdownContent.appendChild(createCategoryLinkElement(category, true)); // Có thể dùng cùng hàm nếu style tương tự
            });
        } else {
            const noCategoryMsg = '<p class="px-4 py-2 text-gray-500 text-xs">Không có danh mục.</p>';
            desktopDropdownContent.innerHTML = noCategoryMsg;
            mobileDropdownContent.innerHTML = noCategoryMsg;
        }
    } catch (error) {
        console.error('Lỗi tải danh mục cho header:', error);
        const errorMsg = `<p class="px-4 py-2 text-red-500 text-xs">Lỗi tải danh mục.</p>`;
        if (desktopDropdownContent) desktopDropdownContent.innerHTML = errorMsg;
        if (mobileDropdownContent) mobileDropdownContent.innerHTML = errorMsg;
    }
}
window.loadHeaderCategories = loadHeaderCategories;


/* ==============================
   CÁC HÀM DROPDOWN GIỎ HÀNG HEADER
   ============================== */
async function updateCartDropdown() {
    console.log("Đang cập nhật dropdown giỏ hàng...");
    const token = getSession('token');
    const elements = {
        badge: document.getElementById('cartItemCountBadge'),
        count: document.getElementById('cartDropdownItemCount'),
        container: document.getElementById('cartDropdownItemsContainer'),
        totalPrice: document.getElementById('cartDropdownTotalPrice')
    };

    // Đảm bảo tất cả các phần tử tồn tại trước khi tiếp tục
    if (!Object.values(elements).every(el => el !== null)) {
        // console.warn("Một hoặc nhiều phần tử dropdown giỏ hàng không tìm thấy trong header.");
        return;
    }

    if (!token) {
        elements.badge.textContent = '0';
        elements.count.textContent = '0';
        elements.container.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">Vui lòng đăng nhập.</p>';
        elements.totalPrice.textContent = formatCurrency(0);
        return;
    }

    elements.container.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">Đang tải giỏ hàng...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/Cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const cartData = await response.json(); // Mong đợi CartDto
            elements.badge.textContent = cartData.totalItems || 0;
            elements.count.textContent = cartData.totalItems || 0;
            elements.totalPrice.textContent = formatCurrency(cartData.totalPrice || 0);
            elements.container.innerHTML = ''; // Xóa thông báo đang tải/item cũ

            if (cartData.cartItems && cartData.cartItems.length > 0) {
                cartData.cartItems.slice(0, 3).forEach(item => { // Hiển thị tối đa 3 item
                    elements.container.insertAdjacentHTML('beforeend', `
                           <div class="flex items-start space-x-2.5 py-2 border-b border-gray-100 last:border-b-0">
                               <img src="${getImageUrl(item.imageURL)}" alt="${item.productName}" class="w-10 h-10 object-cover rounded flex-shrink-0">
                               <div class="flex-1 min-w-0">
                                   <h4 class="text-xs font-medium text-gray-700 truncate" title="${item.productName}">${item.productName}</h4>
                                   <p class="text-xs text-gray-500">${item.quantity} x ${formatCurrency(item.price)}</p>
                               </div>
                           </div>`);
                });
                if (cartData.cartItems.length > 3) {
                    elements.container.insertAdjacentHTML('beforeend', '<p class="text-xs text-center text-gray-400 mt-2">...</p>');
                }
            } else {
                elements.container.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">Giỏ hàng trống.</p>';
            }
        } else if (response.status === 401) {
            elements.badge.textContent = '0';
            elements.count.textContent = '0';
            elements.totalPrice.textContent = formatCurrency(0);
            elements.container.innerHTML = '<p class="text-gray-500 text-xs text-center py-4">Phiên hết hạn.</p>';
        }
        else {
            elements.container.innerHTML = `<p class="text-red-500 text-xs text-center py-4">Lỗi ${response.status} tải giỏ hàng.</p>`;
            console.error("Lỗi tải giỏ hàng cho dropdown:", response.status, await response.text());
        }
    } catch (error) {
        elements.container.innerHTML = '<p class="text-red-500 text-xs text-center py-4">Lỗi kết nối.</p>';
        console.error("Lỗi mạng khi lấy giỏ hàng cho dropdown:", error);
    }
}
window.updateCartDropdown = updateCartDropdown;


/* ==============================
   KHỞI TẠO TRANG CHUNG (Không dành riêng cho component nào)
   ============================== */
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOMContentLoaded chung đã kích hoạt.");
});

/**
 * Kiểm tra trạng thái token xác thực.
 * Phiên bản này dành cho các trang có thể KHÔNG tải header
 * hoặc cần kiểm tra chuyển hướng ngay lập tức.
 * Đối với các trang có header, initializeHeaderFunctionality xử lý hiển thị tên.
 */
function checkAuthTokenForPage() {
    const token = getSession("token");
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes("/login.html");
    const isRegisterPage = currentPath.includes("/register.html"); // Thêm các trang công khai khác nếu cần

    if (!token && !isLoginPage && !isRegisterPage) {
        console.log('Không tìm thấy token trên trang được bảo vệ, đang chuyển hướng đến đăng nhập.');
        window.location.href = "/Customer/templates/login.html"; // Điều chỉnh đường dẫn
        return false; // Chưa xác thực
    }

    if (token) {
        try {
            const payloadBase64 = token.split('.')[1];
            if (!payloadBase64) throw new Error('Định dạng token không hợp lệ');
            let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const padding = payloadBase64Standard.length % 4;
            if (padding) payloadBase64Standard += '='.repeat(4 - padding);
            const payload = JSON.parse(atob(payloadBase64Standard));

            const now = Date.now() / 1000;
            const bufferTime = 60; // Bộ đệm 60 giây

            if (payload.exp && now > (payload.exp - bufferTime)) {
                throw new Error('Token đã hết hạn');
            }
            if (payload.nbf && now < payload.nbf) {
                throw new Error('Token chưa hợp lệ');
            }
            return true; // Đã xác thực
        } catch (error) {
            console.error('Lỗi xác thực token:', error.message);
            sessionStorage.clear();
            if (!isLoginPage && !isRegisterPage) {
                alert("Bạn cần phai đăng nhập!")
                window.location.href = "/Customer/templates/login.html"; // Điều chỉnh đường dẫn
            }
            return false; // Chưa xác thực
        }
    }
    return isLoginPage || isRegisterPage; // Cho phép truy cập đăng nhập/đăng ký nếu không có token
}
window.checkAuthTokenForPage = checkAuthTokenForPage; // Đưa ra để gọi trực tiếp nếu cần
checkAuthTokenForPage()

function getRoleFromToken() {
    const token = sessionStorage.getItem('token');
    if (!token) return null;
    try {
        const payloadBase64Url = token.split('.')[1];
        let payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padding = payloadBase64.length % 4;
        if (padding) payloadBase64 += '='.repeat(4 - padding);
        const payloadObject = JSON.parse(atob(payloadBase64));
        return payloadObject.role || null;
    } catch (error) { return null; }
}

function setSession(key, value) { sessionStorage.setItem(key, value); }
function getImageUrl(apiImageUrl) {
    const placeholderImage = '../assets/images/placeholder.png';
    if (!apiImageUrl || apiImageUrl.toLowerCase() === 'string' || apiImageUrl.trim() === '') return placeholderImage;
    if (/^(https?:)?\/\//i.test(apiImageUrl)) return apiImageUrl;
    return placeholderImage;
}

/* ==============================
   QUẢN LÝ SẢN PHẨM TRANG CHỦ
   ============================== */

/**
 * Cache lưu trữ tên shop theo sellerId để tránh gọi API nhiều lần
 */
const shopNameCache = new Map();

/**
 * Lấy tên shop dựa trên sellerId
 * @param {number|string} sellerId - ID của người bán
 * @returns {Promise<string>} Tên shop
 */
async function getShopNameBySellerId(sellerId) {
    // Nếu đã có trong cache thì trả về luôn
    if (shopNameCache.has(sellerId)) {
        return shopNameCache.get(sellerId);
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/Seller/${sellerId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const sellerData = await response.json();
        const shopName = sellerData.shopName || `Shop ${sellerId}`;
        
        // Lưu vào cache để dùng lại
        shopNameCache.set(sellerId, shopName);
        
        return shopName;
    } catch (error) {
        console.error(`Lỗi khi lấy thông tin shop cho sellerId ${sellerId}:`, error);
        return `Shop ${sellerId}`;
    }
}

/**
 * Tạo HTML cho thẻ sản phẩm
 * @param {Object} product - Đối tượng sản phẩm từ API
 * @param {boolean} isNew - Có phải sản phẩm mới không
 * @returns {string} HTML của thẻ sản phẩm
 */
function createProductCardHTML(product, isNew = false) {
    // Nếu đã có shopName trong product, dùng luôn
    if (product.shopName) {
        return createProductCardWithShopName(product, product.shopName, isNew);
    }
    
    // Nếu chưa có shopName, đặt giá trị mặc định và sau đó sẽ được cập nhật bằng JavaScript
    const sellerId = product.sellerId || null;
    const defaultShopName = sellerId ? `Shop ${sellerId}` : 'Shop không xác định';
    
    const html = createProductCardWithShopName(product, defaultShopName, isNew);
    
    // Nếu có sellerId, tải shopName và cập nhật sau
    if (sellerId) {
        // ID duy nhất cho sản phẩm này
        const productCardId = `product-${product.productID}-${Date.now()}`;
        
        // Đảm bảo phần tử shopName có ID để cập nhật sau
        const updatedHtml = html.replace(
            `<a href="seller-profile.html?sellerId=${sellerId}" class="text-gray-600 hover:text-blue-600 text-xs">${defaultShopName}</a>`,
            `<a href="seller-profile.html?sellerId=${sellerId}" class="text-gray-600 hover:text-blue-600 text-xs" id="${productCardId}">${defaultShopName}</a>`
        );
        
        // Tải shopName và cập nhật DOM
        setTimeout(async () => {
            try {
                const shopName = await getShopNameBySellerId(sellerId);
                const shopNameElement = document.getElementById(productCardId);
                if (shopNameElement) {
                    shopNameElement.textContent = shopName;
                }
            } catch (error) {
                console.error(`Lỗi cập nhật tên shop cho sản phẩm ${product.productID}:`, error);
            }
        }, 0);
        
        return updatedHtml;
    }
    
    return html;
}

// Khởi chạy các hàm khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
});
