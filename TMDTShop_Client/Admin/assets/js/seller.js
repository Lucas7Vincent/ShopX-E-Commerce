const API_BASE = "https://localhost:7088/api";
let currentSellerId = 1;
let sellerCategories = [];
let categoryPagination = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
};
let currentActiveSection = 'shop'; // Default section

// ✅ Hàm lưu trạng thái vào localStorage và URL
function saveActiveSection(sectionName) {
    currentActiveSection = sectionName;
    sessionStorage.setItem('activeSection', sectionName);
    
    // Cập nhật URL hash mà không reload trang
    if (window.location.hash !== `#${sectionName}`) {
        history.replaceState(null, null, `#${sectionName}`);
    }
    }
    function updateActiveNavItem(sectionName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active', 'bg-blue-50', 'text-blue-600');
        });
        
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active', 'bg-blue-50', 'text-blue-600');
        }
    }

// ✅ Hàm khôi phục trạng thái 
function restoreActiveSection() {
    console.group("=== RESTORE ACTIVE SECTION ===");
    
    // Ưu tiên 1: URL hash
    let sectionToActivate = window.location.hash.substring(1);
    
    // Ưu tiên 2: sessionStorage
    if (!sectionToActivate) {
        sectionToActivate = sessionStorage.getItem('activeSection');
    }
    
    // Ưu tiên 3: Mặc định
    if (!sectionToActivate) {
        sectionToActivate = 'shop';
    }
    
    // Kiểm tra section có tồn tại không
    const targetSection = document.getElementById(`${sectionToActivate}-section`);
    if (!targetSection) {
        console.warn(`Section ${sectionToActivate} không tồn tại, fallback về shop`);
        sectionToActivate = 'shop';
    }
    
    console.log(`🔄 Restoring section: ${sectionToActivate}`);
    
    // Kích hoạt section
    setActiveSection(sectionToActivate);
    
    // Cập nhật nav item active
    updateActiveNavItem(sectionToActivate);
    
    console.groupEnd();
    return sectionToActivate;
}


document.addEventListener('DOMContentLoaded', function() {
    
    try {
        // Apply immediate styles
        applyImmediateStyles();
        
        // Debug token
        debugCheckToken();
        
        // Check token validity
        if (!checkTokenValidity()) {
            console.error('Token không hợp lệ! Chuyển hướng đến trang đăng nhập...');
            setTimeout(() => {
                window.location.href = "../../Customer/templates/login.html";
            }, 2000);
            return;
        }
        
        // Initialize UI first
        initializeUI();
        
        // ✅ Sau khi UI được khởi tạo, khôi phục trạng thái
        setTimeout(() => {
            restoreActiveSection();
            
            // Load seller info và shop data
            loadSellerInfo();
            loadShopCategories();
            loadShopManagementData();
            
            // Fix layout
            fixLayoutAfterLoad();
        }, 200);
        
    } catch (error) {
        console.error("Lỗi trong DOM Content Loaded:", error);
    }
    
    console.groupEnd();
});
window.addEventListener('popstate', function(event) {
    console.log('🔙 Browser navigation detected');
    
    const hash = window.location.hash.substring(1);
    if (hash) {
        setActiveSection(hash);
    } else {
        setActiveSection('shop');
    }
});

// ✅ Thêm listener cho hashchange
window.addEventListener('hashchange', function(event) {
    console.log('🔗 Hash changed');
    
    const hash = window.location.hash.substring(1);
    if (hash && hash !== currentActiveSection) {
        setActiveSection(hash);
    }
});
// Hàm helper để set active section
function setActiveSection(sectionName) {
    console.log(`🎯 Setting active section: ${sectionName}`);
    
    // Remove active class from all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-blue-50', 'text-blue-600');
    });
    
    // Add active class to target section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    // Add active class to corresponding nav item
    const targetNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (targetNavItem) {
        targetNavItem.classList.add('active', 'bg-blue-50', 'text-blue-600');
    }
    
    // Update page title
    const titles = {
        'shop': 'Quản lý cửa hàng',
        'categories': 'Quản lý danh mục', 
        'products': 'Quản lý sản phẩm',
        'orders': 'Quản lý đơn hàng',
        'statistics': 'Thống kê',
        'notifications': 'Thông báo'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[sectionName] || 'Trang quản lý';
    }
    
    // ✅ Lưu trạng thái sau khi set
    saveActiveSection(sectionName);
    
    // Load dữ liệu cho section nếu cần
    loadSectionData(sectionName);
}
// Thêm biến global để theo dõi thông tin shop
let globalShopData = {
    shopName: '',
    loaded: false
};

// Thêm biến global để lưu danh sách sản phẩm
let sellerProducts = [];

// Hàm để tìm token trong Storage (session và local)
function findTokenInStorage() {
    // Kết quả tìm kiếm
    const result = {
        sessionToken: null,
        localToken: null,
        sessionTokenKey: null,
        localTokenKey: null,
        allKeys: { session: {}, local: {} }
    };
    
    // Kiểm tra trong sessionStorage
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        
        result.allKeys.session[key] = value ? true : false;
        
        // Nếu key chứa 'token' (case-insensitive)
        if (key.toLowerCase().includes('token')) {
            if (!result.sessionToken) {
                result.sessionToken = value;
                result.sessionTokenKey = key;
            }
            // Ưu tiên 'authToken' nếu tìm thấy
            if (key === 'authToken') {
                result.sessionToken = value;
                result.sessionTokenKey = key;
            }
        }
        
        // Kiểm tra nếu value là JWT token (không quan tâm key)
        if (value && typeof value === 'string' && value.split('.').length === 3) {
            try {
                // Thử parse phần payload
                const payload = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                if (payload.exp && !result.sessionToken) {
                    result.sessionToken = value;
                    result.sessionTokenKey = key;
                }
            } catch (e) {}
        }
    }
    
    // Kiểm tra trong localStorage 
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        result.allKeys.local[key] = value ? true : false;
        
        // Nếu key chứa 'token' (case-insensitive)
        if (key.toLowerCase().includes('token')) {
            if (!result.localToken) {
                result.localToken = value;
                result.localTokenKey = key;
            }
            // Ưu tiên 'authToken' nếu tìm thấy
            if (key === 'authToken') {
                result.localToken = value;
                result.localTokenKey = key;
            }
        }
        
        // Kiểm tra nếu value là JWT token (không quan tâm key)
        if (value && typeof value === 'string' && value.split('.').length === 3) {
            try {
                // Thử parse phần payload
                const payload = JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                if (payload.exp && !result.localToken) {
                    result.localToken = value;
                    result.localTokenKey = key;
                }
            } catch (e) {}
        }
    }
    
    return result;
}



// Script debug đăng nhập trước khi tải file chính
(function() {
    try {
        console.group("===== KIỂM TRA ĐĂNG NHẬP =====");
        
        // Tìm kiếm token trong storage
        const tokenInfo = findTokenInStorage();
        
        console.log("== Tất cả keys trong sessionStorage:", tokenInfo.allKeys.session);
        console.log("== Tất cả keys trong localStorage:", tokenInfo.allKeys.local);
        
        console.log("Token từ sessionStorage:", tokenInfo.sessionToken ? `Tìm thấy (key: ${tokenInfo.sessionTokenKey})` : "Không tìm thấy");
        console.log("Token từ localStorage:", tokenInfo.localToken ? `Tìm thấy (key: ${tokenInfo.localTokenKey})` : "Không tìm thấy");
        
        // Cho trang seller.js biết token và key
        if (tokenInfo.sessionToken) {
            // Lưu vào key authToken nếu key gốc khác
            if (tokenInfo.sessionTokenKey !== 'authToken') {
                console.log(`Đang sao chép token từ ${tokenInfo.sessionTokenKey} sang authToken trong sessionStorage`);
                sessionStorage.setItem('authToken', tokenInfo.sessionToken);
            }
        } else if (tokenInfo.localToken) {
            // Nếu không có trong session nhưng có trong local, sao chép từ local sang session
            console.log(`Đang sao chép token từ localStorage (${tokenInfo.localTokenKey}) sang authToken trong sessionStorage`);
            sessionStorage.setItem('authToken', tokenInfo.localToken);
        }
        
        // Kiểm tra lại token sau khi đã chuẩn hóa
        const token = sessionStorage.getItem("authToken") || localStorage.getItem("authToken");
        
        if (!token) {
            console.error("KHÔNG CÓ TOKEN SAU KHI CHUẨN HÓA! Chuyển hướng đến trang đăng nhập...");
            alert("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.");
            window.location.href = "../../Customer/templates/login.html";
            return;
        }
        
        // Phân tích token
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error("Token không đúng định dạng JWT!");
                alert("Token không hợp lệ. Vui lòng đăng nhập lại.");
                window.location.href = "../../Customer/templates/login.html";
                return;
            }
            
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            console.log("Thông tin payload:", payload);
            
            // Kiểm tra vai trò
            if (!payload.role || (typeof payload.role === 'string' && !payload.role.includes('Seller')) || 
                (Array.isArray(payload.role) && !payload.role.some(r => r.includes('Seller')))) {
                console.error("TOKEN KHÔNG CÓ QUYỀN SELLER!");
                alert("Tài khoản của bạn không có quyền truy cập trang người bán. Vui lòng đăng nhập bằng tài khoản người bán.");
                window.location.href = "../../Customer/templates/login.html";
                return;
            }
            
            // Kiểm tra thời gian hết hạn
            if (payload.exp) {
                const expTime = new Date(payload.exp * 1000);
                const now = new Date();
                if (expTime <= now) {
                    console.error("TOKEN ĐÃ HẾT HẠN!");
                    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    window.location.href = "../../Customer/templates/login.html";
                    return;
                }
            }
            
        } catch (e) {
            console.error("Lỗi khi phân tích token:", e);
            alert("Đã xảy ra lỗi khi xác thực đăng nhập. Vui lòng đăng nhập lại.");
            window.location.href = "../../Customer/templates/login.html";
            return;
        }
        
        console.log("Kiểm tra đăng nhập thành công!");
        console.groupEnd();
        
    } catch (error) {
        console.error("Lỗi khi kiểm tra đăng nhập:", error);
        alert("Đã xảy ra lỗi khi kiểm tra đăng nhập. Vui lòng thử lại.");
    }
})();

document.addEventListener("DOMContentLoaded", () => {
    console.group("=== DOM CONTENT LOADED - SELLER.JS ===");
    console.log("DOM Content Loaded - Initializing seller dashboard...");
    
    try {
        // Apply critical styles to ensure correct layout immediately
        const applyImmediateStyles = () => {
            // Lấy trạng thái sidebar từ localStorage
            const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
            
            // Áp dụng styles cho sidebar
            const sidebar = document.getElementById("sidebar");
            if (sidebar) {
                sidebar.style.position = "fixed";
                sidebar.style.top = "0";
                sidebar.style.left = "0";
                sidebar.style.height = "100vh";
                sidebar.style.zIndex = "50";
                sidebar.style.width = sidebarCollapsed ? "5rem" : "16rem";
                sidebar.style.transition = "all 0.3s ease-in-out";
                
                if (sidebarCollapsed) {
                    sidebar.classList.add("collapsed");
                }
            }
            
            // Áp dụng styles cho header
            const header = document.querySelector("header");
            if (header) {
                header.style.position = "fixed";
                header.style.top = "0";
                header.style.left = sidebarCollapsed ? "5rem" : "16rem";
                header.style.width = sidebarCollapsed ? "calc(100% - 5rem)" : "calc(100% - 16rem)";
                header.style.zIndex = "40";
                header.style.backgroundColor = "white";
                header.style.transition = "all 0.3s ease-in-out";
                
                if (sidebarCollapsed) {
                    header.classList.add("collapsed");
                }
            }
            
            // Áp dụng styles cho main content
            const mainContent = document.getElementById("mainContent");
            if (mainContent) {
                mainContent.style.marginLeft = sidebarCollapsed ? "5rem" : "16rem";
                mainContent.style.width = sidebarCollapsed ? "calc(100% - 5rem)" : "calc(100% - 16rem)";
                mainContent.style.paddingTop = "4rem";
                mainContent.style.transition = "all 0.3s ease-in-out";
                
                if (sidebarCollapsed) {
                    mainContent.classList.add("collapsed");
                }
            }
            
            console.log("Applied immediate styles - Sidebar collapsed:", sidebarCollapsed);
        };
        
        // Gọi ngay lập tức để áp dụng styles
        applyImmediateStyles();
        
        // Thêm style để xử lý transition cho sidebar và content
        const style = document.createElement('style');
        style.textContent = `
            .sidebar {
                width: 16rem !important; /* 256px */
                transition: all 0.3s ease-in-out !important;
                position: fixed !important;
                height: 100vh !important;
                z-index: 50 !important;
                top: 0 !important;
                left: 0 !important;
            }
            .sidebar.collapsed {
                width: 5rem !important; /* 80px */
            }
            /* Chỉnh content (không bao gồm header) */
            .content {
                margin-left: 16rem !important;
                transition: all 0.3s ease-in-out !important;
                width: calc(100% - 16rem) !important;
                padding-top: 4rem !important; /* Đảm bảo content nằm dưới header */
            }
            .content.collapsed {
                margin-left: 5rem !important;
                width: calc(100% - 5rem) !important;
            }
            /* Xử lý riêng cho header để nó luôn sát với sidebar */
            header {
                transition: all 0.3s ease-in-out !important;
                position: fixed !important;
                top: 0 !important;
                left: 16rem !important; /* Căn chỉnh chính xác với sidebar */
                width: calc(100% - 16rem) !important;
                z-index: 40 !important;
                height: 4rem !important;
                background-color: white !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
            }
            header.collapsed {
                left: 5rem !important; /* Căn chỉnh chính xác với sidebar thu gọn */
                width: calc(100% - 5rem) !important;
            }
            /* Đảm bảo main section dưới header */
            #mainContent {
                margin-top: 4rem !important;
            }
            /* Media query cho mobile */
            @media (max-width: 768px) {
                .sidebar {
                    transform: translateX(-100%) !important;
                }
                .sidebar.mobile-visible {
                    transform: translateX(0) !important;
                }
                .content, .content.collapsed {
                    margin-left: 0 !important;
                    width: 100% !important;
                }
                header, header.collapsed {
                    left: 0 !important;
                    width: 100% !important;
                }
            }
        `;
        document.head.appendChild(style);
        
        // Đầu tiên, xóa class "nav-item" từ nút toggle sidebar
        const toggleSidebarBtn = document.getElementById("toggleSidebar");
        if (toggleSidebarBtn) {
            toggleSidebarBtn.classList.remove("nav-item");
            toggleSidebarBtn.classList.add("sidebar-toggle");
        }
        
        // Debug: Kiểm tra token hiện tại và hiển thị thông tin
        debugCheckToken();
        
        // Kiểm tra tính hợp lệ của token trước khi tải trang
        if (!checkTokenValidity()) {
            console.error('Token không hợp lệ! Chuyển hướng đến trang đăng nhập...');
            setTimeout(() => {
                window.location.href = window.location.origin + '/Customer/templates/login.html';
            }, 2000);
            return;
        }
        const productPaginationContainer = document.getElementById('product-pagination');
        const categoryPaginationContainer = document.getElementById('category-pagination');
        
        if (productPaginationContainer) {
            console.log('Phần tử phân trang sản phẩm đã sẵn sàng');
        } else {
            console.warn('Không tìm thấy phần tử phân trang sản phẩm (product-pagination)');
        }
        
        if (categoryPaginationContainer) {
            console.log('Phần tử phân trang danh mục đã sẵn sàng');
        } else {
            console.warn('Không tìm thấy phần tử phân trang danh mục (category-pagination)');
        }
        
        // Hiển thị tên shop ngay lập tức từ localStorage/sessionStorage nếu có
        displayShopNameFromStorage();
        
        loadSellerInfo();
        initializeUI();
        loadShopCategories();
        
        // Tự động tải thông tin shop khi trang được tải
        setTimeout(() => {
            // Tải thông tin cửa hàng sau khi trang đã được khởi tạo
            loadShopManagementData();
            
            // Đảm bảo tên người bán được hiển thị đúng
            const shopItem = document.querySelector('.nav-item[data-section="shop"]');
            if (shopItem) {
                console.log('Adding click event to shop nav item to ensure data loads');
                // Giả lập click nếu đang ở tab shop
                if (window.location.hash === '#shop') {
                    shopItem.click();
                }
            }
            
            // Đảm bảo bố cục chính xác
            fixLayoutAfterLoad();
        }, 500);
    } catch (error) {
        console.error("Lỗi trong DOM Content Loaded:", error);
    }
    
    console.groupEnd();
});

// Hàm debug để kiểm tra token
function debugCheckToken() {
    try {
        console.group("===== DEBUG TOKEN INFO =====");
        
        // Lấy token từ session và local storage
        const sessionToken = sessionStorage.getItem("authToken");
        const localToken = localStorage.getItem("authToken");
        
        console.log("Session storage token:", sessionToken ? "Có" : "Không có");
        console.log("Local storage token:", localToken ? "Có" : "Không có");
        
        if (sessionToken || localToken) {
            const token = sessionToken || localToken;
            console.log("Token được sử dụng:", token);
            
            // Phân tích token
            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    console.error("Token không đúng định dạng JWT!");
                } else {
                    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                    console.log("Thông tin payload:", payload);
                    
                    // Kiểm tra thời gian hết hạn
                    if (payload.exp) {
                        const expTime = new Date(payload.exp * 1000);
                        const now = new Date();
                        console.log("Thời gian hết hạn:", expTime.toLocaleString());
                        console.log("Thời gian hiện tại:", now.toLocaleString());
                        console.log("Token còn hiệu lực:", expTime > now ? "Có" : "Không");
                        
                        // Kiểm tra vai trò
                        if (payload.role) {
                            console.log("Vai trò:", payload.role);
                            console.log("Là Seller:", payload.role.includes("Seller") ? "Có" : "Không");
                        } else {
                            console.warn("Token không chứa thông tin vai trò!");
                        }
                    }
                }
            } catch (e) {
                console.error("Lỗi khi phân tích token:", e);
            }
        } else {
            console.error("KHÔNG CÓ TOKEN ĐĂNG NHẬP! Hãy đăng nhập lại.");
            showToast("Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.", "error");
        }
        
        console.groupEnd();
    } catch (error) {
        console.error("Lỗi khi debug token:", error);
    }
}

// Hàm mới để hiển thị shopName từ storage
function displayShopNameFromStorage() {
    try {
        // Thử lấy từ sellerData trước
        const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}');
        // Nếu không có, thử lấy từ userData
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        
        // Lấy shopName từ một trong hai nguồn
        const shopName = sellerData.shopName || userData.shopName || '';
        
        if (shopName) {
            console.log('Đã tìm thấy shopName từ storage:', shopName);
            updateShopNameDisplay(shopName);
        } else {
            console.log('Không tìm thấy shopName trong storage');
        }
    } catch (error) {
        console.error('Lỗi khi lấy shopName từ storage:', error);
    }
}

// Hàm riêng để cập nhật hiển thị tên shop
function updateShopNameDisplay(shopName) {
    if (!shopName) return false;
    
    // Cập nhật biến global
    globalShopData.shopName = shopName;
    globalShopData.loaded = true;
    
    // Cập nhật UI
    const usernameDisplay = document.getElementById('seller-username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = shopName;
        usernameDisplay.classList.remove('hidden');
        console.log('Đã cập nhật shopName trong header:', shopName);
    }
    
    return true;
}

async function loadSellerInfo() {
    try {
        const token = getTokenFromSession();
        if (!token) {
            console.warn('Không có token, không thể tải thông tin người bán');
            showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error');
            setTimeout(() => { 
                window.location.href = window.location.origin + '/Customer/templates/login.html'; 
            }, 1500);
            return;
        }
        
        // Parse JWT token để lấy userInfo cơ bản
        const userInfo = parseJwtToken(token);
        console.log('User info từ token:', userInfo);
        
        // Kiểm tra role từ token
        if (!userInfo.role || !userInfo.role.includes('Seller')) {
            console.error('Token không có quyền Seller');
            showToast('Tài khoản của bạn không có quyền truy cập trang này', 'error');
            setTimeout(() => { 
                window.location.href = window.location.origin + '/Customer/templates/login.html'; 
            }, 2000);
            return;
        }
        
        // Ưu tiên sử dụng dữ liệu từ sessionStorage trước khi gọi API
        let userData = {};
        try {
            userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            console.log('User data từ sessionStorage:', userData);
        } catch (e) {
            console.error('Lỗi khi parse userData từ sessionStorage:', e);
        }
        
        // Gán ID người bán từ userData trước
        if (userData.sellerId) {
            currentSellerId = userData.sellerId;
            console.log('Đã lấy sellerId từ userData:', currentSellerId);
        }
        
        // Lấy thông tin chi tiết từ API backend
        let sellerData = {};
        try {
            // Gọi API /sellers/current để lấy thông tin người bán hiện tại
            const response = await fetchAPI('/sellers/current');
            if (response && Object.keys(response).length > 0) {
                sellerData = response;
                console.log('Seller data từ API:', sellerData);
                
                // Cập nhật currentSellerId nếu API trả về ID
                if (sellerData.sellerID || sellerData.sellerId) {
                    currentSellerId = sellerData.sellerID || sellerData.sellerId;
                    console.log('Đã cập nhật sellerId từ API:', currentSellerId);
                }
                
                // Lưu thông tin seller vào sessionStorage
                console.log('Lưu sellerData vào sessionStorage:', sellerData);
                sessionStorage.setItem('sellerData', JSON.stringify(sellerData));
                
                // Cập nhật thông tin shop trong userData nếu cần
                if (sellerData.shopName && userData && userData.role === 'seller') {
                    userData.shopName = sellerData.shopName;
                    userData.sellerId = currentSellerId;
                    userData.avatar = sellerData.avatar || sellerData.logo || userData.avatar;
                    sessionStorage.setItem('userData', JSON.stringify(userData));
                    console.log('Cập nhật userData với shopName mới:', userData.shopName);
                }
            } else {
                console.warn('API không trả về dữ liệu seller');
                
                // Nếu API không trả về dữ liệu, tạo một bản ghi sellerData từ userData
                if (Object.keys(userData).length > 0) {
                    sellerData = {
                        shopName: userData.shopName || 'Cửa hàng của tôi',
                        sellerId: userData.sellerId || currentSellerId,
                        avatar: userData.avatar || '',
                        email: userData.email || '',
                        phone: userData.phone || '',
                        address: userData.address || '',
                        status: 'active'
                    };
                    
                    sessionStorage.setItem('sellerData', JSON.stringify(sellerData));
                    console.log('Tạo sellerData từ userData:', sellerData);
                }
            }
        } catch (apiError) {
            console.error('Lỗi khi gọi API lấy thông tin seller:', apiError);
            // Tiếp tục sử dụng thông tin từ localStorage/sessionStorage
            
            // Nếu chưa có sellerData trong sessionStorage, tạo từ userData
            if (!sessionStorage.getItem('sellerData') && Object.keys(userData).length > 0) {
                sellerData = {
                    shopName: userData.shopName || 'Cửa hàng của tôi',
                    sellerId: userData.sellerId || currentSellerId,
                    avatar: userData.avatar || '',
                    email: userData.email || '',
                    phone: userData.phone || '',
                    address: userData.address || '',
                    status: 'active'
                };
                
                sessionStorage.setItem('sellerData', JSON.stringify(sellerData));
                console.log('Tạo sellerData từ userData sau lỗi API:', sellerData);
            }
        }
        
        // Ưu tiên lấy shopName từ API, nếu không có thì lấy từ userData
        let shopName = sellerData.shopName || userData.shopName || '';
        
        // Cập nhật tên shop trong header sử dụng hàm mới
        if (shopName) {
            updateShopNameDisplay(shopName);
        } else {
            // Nếu không có shopName, hiển thị tên người dùng thay thế
            const usernameDisplay = document.getElementById('seller-username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = sellerData.username || userData.fullName || userInfo.name || 'Người bán';
                usernameDisplay.classList.remove('hidden');
                console.log('Không có shopName, hiển thị tên thay thế:', usernameDisplay.textContent);
            }
        }
        
        // Khởi tạo dữ liệu tổng quan
        await loadDashboardData();
        
        // Đảm bảo loadShopManagementData được gọi sau khi có dữ liệu
        await loadShopManagementData();
    } catch (error) {
        console.error('Không thể tải thông tin người bán:', error);
        showToast(`Không thể tải thông tin người bán: ${error.message}`, "error");
    }
}

// Hàm phân tích JWT token để lấy thông tin cơ bản
function parseJwtToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT token:', e);
        return {};
    }
}

// Hàm kiểm tra tính hợp lệ của token
function checkTokenValidity() {
    const token = getTokenFromSession();
    
    if (!token) {
        console.error('Không tìm thấy token đăng nhập!');
        return false;
    }
    
    try {
        const decodedToken = parseJwtToken(token);
        console.log('Token decoded:', decodedToken);
        
        // Kiểm tra role
        if (!decodedToken.role || !decodedToken.role.includes('Seller')) {
            console.error('Token không có quyền Seller!');
            showToast('Tài khoản không có quyền truy cập trang người bán!', 'error');
            return false;
        }
        
        // Kiểm tra thời gian hết hạn
        if (decodedToken.exp) {
            const expirationTime = new Date(decodedToken.exp * 1000);
            const currentTime = new Date();
            
            if (currentTime > expirationTime) {
                console.error('Token đã hết hạn', {
                    expTime: expirationTime.toLocaleString(),
                    currentTime: currentTime.toLocaleString()
                });
                showToast('Phiên đăng nhập đã hết hạn! Vui lòng đăng nhập lại.', 'error');
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Lỗi khi kiểm tra token:', error);
        return false;
    }
}

async function loadSectionData(sectionId) {
    try {
        console.group(`=== LOADING DATA FOR SECTION: ${sectionId} ===`);
        
        // Ensure section is visible
        const targetSection = document.getElementById(`${sectionId}-section`);
        if (!targetSection) {
            console.warn(`Section ${sectionId} không tồn tại`);
            console.groupEnd();
            return;
        }
        
        // Load data based on section
        switch (sectionId) {
            case 'shop':
                await loadShopData();
                break;
            case 'categories':
                await loadShopCategories(1);
                break;
            case 'products':
                await loadProducts(1);
                break;
            case 'orders':
                // Load orders if implemented
                if (typeof loadOrdersSection === 'function') {
                    await loadOrdersSection();
                }
                break;
            case 'statistics':
                // Load statistics if implemented
                if (typeof loadStatisticsSection === 'function') {
                    await loadStatisticsSection();
                }
                break;
            case 'notifications':
                // Load notifications if implemented
                if (typeof loadNotificationsSection === 'function') {
                    await loadNotificationsSection();
                }
                break;
            default:
                console.log(`No specific data loading for section: ${sectionId}`);
        }
        
        console.groupEnd();
    } catch (error) {
        console.error(`Lỗi khi tải dữ liệu cho ${sectionId}:`, error);
        console.groupEnd();
    }
}

// Khởi tạo sự kiện cho form sản phẩm và các nút liên quan
function initProductFormHandlers() {
    // Xử lý nút thêm sản phẩm mới
    const addProductBtn = document.getElementById('add-product-btn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', openAddProductModal);
    }
    
    // Xử lý form submit
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.addEventListener('submit', handleProductFormSubmit);
    }
    
    // Xử lý sự kiện đóng modal
    const closeProductModalBtn = document.getElementById('close-product-modal-btn');
    const cancelProductBtn = document.getElementById('cancel-product-form-btn');
    
    if (closeProductModalBtn) {
        closeProductModalBtn.addEventListener('click', () => {
            document.getElementById('product-modal').classList.add('hidden');
        });
    }
    
    if (cancelProductBtn) {
        cancelProductBtn.addEventListener('click', () => {
            document.getElementById('product-modal').classList.add('hidden');
        });
    }
    
    // Xử lý sự kiện thay đổi hình ảnh
    const productImage = document.getElementById('product-image');
    if (productImage) {
        productImage.addEventListener('change', handleProductImageChange);
    }
}

// Thêm gọi hàm khởi tạo vào initializeUI
function initializeUI() {
    console.group("=== INITIALIZE UI ===");
    console.log("Initializing UI components...");
    
    try {
        const navItems = document.querySelectorAll(".nav-item");
        
        // ✅ Thêm event listener cho navigation
        if (navItems && navItems.length > 0) {
            navItems.forEach(item => {
                // Skip logout button và toggle button
                if (item.id === 'logout-btn' || item.id === 'toggleSidebar') {
                    return;
                }
                
                const sectionId = item.getAttribute("data-section");
                if (sectionId) {
                    // Remove existing listeners
                    const newItem = item.cloneNode(true);
                    item.parentNode.replaceChild(newItem, item);
                    
                    // Add new listener
                    newItem.addEventListener("click", (e) => {
                        e.preventDefault();
                        console.log(`🖱️ Nav clicked: ${sectionId}`);
                        
                        // Set active section và lưu trạng thái
                        setActiveSection(sectionId);
                    });
                }
            });
        }
        
        // ✅ Khôi phục trạng thái sau khi setup events
        setTimeout(() => {
            restoreActiveSection();
        }, 100);
        
        // Initialize product form handlers
        initProductFormHandlers();
        
        // Setup category handlers
        setupCategoryHandlers();
        
        // Logout handler
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            const newLogoutBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
            
            newLogoutBtn.addEventListener("click", function(e) {
                e.preventDefault();
                if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                    logout();
                }
            });
        }
        
        console.log("UI initialization completed successfully");
    } catch (error) {
        console.error("Lỗi khi khởi tạo UI:", error);
    }
    
    console.groupEnd();
}

// Hàm đồng bộ hóa dữ liệu với info.js
function synchronizeWithInfoJS() {
    // Nếu có window.sellerUtils từ info.js, sử dụng nó
    if (!window.sellerUtils) {
        window.sellerUtils = {
            // Hàm đảm bảo thông tin shop, tương tự trong info.js
            ensureShopInfo: async function() {
                try {
                    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    const token = getTokenFromSession();
                    
                    if (userData.role?.toLowerCase() === 'seller' && token) {
                        // Chỉ thực hiện nếu là seller và có token
                        const response = await fetchAPI(`/sellers/${userData.sellerId || currentSellerId}`);
                        
                        if (response && response.shopName) {
                            // Cập nhật userData với thông tin shop mới nhất
                            userData.shopName = response.shopName;
                            sessionStorage.setItem('userData', JSON.stringify(userData));
                            
                            // Lưu thông tin seller vào sellerData
                            sessionStorage.setItem('sellerData', JSON.stringify(response));
                            
                            return userData;
                        }
                    }
                    
                    return userData;
                } catch (error) {
                    console.error('Error in ensureShopInfo:', error);
                    return JSON.parse(sessionStorage.getItem('userData') || '{}');
                }
            }
        };
    }
    
    // Kiểm tra hash trong URL và hiển thị tab tương ứng
    setTimeout(() => {
        const hash = window.location.hash.substring(1); // Loại bỏ dấu # từ hash
        if (hash) {
            console.log('Hash detected in URL:', hash);
            const sectionToShow = hash;
            
            // Tìm nav item tương ứng
            const navItem = document.querySelector(`.nav-item[data-section="${sectionToShow}"]`);
            if (navItem) {
                console.log('Clicking nav item for section:', sectionToShow);
                navItem.click();
            }
        }
        
        // Thêm xử lý cho nút shop tab đặc biệt
        const shopNavItem = document.querySelector('.nav-item[data-section="shop"]');
        if (shopNavItem) {
            shopNavItem.addEventListener('click', async () => {
                console.log('Shop tab clicked');
                try {
                    // Load dữ liệu shop
                    await loadShopManagementData();
                    
                    // Đảm bảo section shop hiển thị
                    const shopSection = document.getElementById('shop-section');
                    if (shopSection) {
                        console.log('Showing shop section');
                        document.querySelectorAll('.section').forEach(section => {
                            section.classList.remove('active');
                        });
                        shopSection.classList.add('active');
                    }
                } catch (error) {
                    console.error('Lỗi khi tải thông tin shop:', error);
                    showToast('Không thể tải thông tin cửa hàng', 'error');
                }
            });
        }
    }, 200);
}

// Hàm xử lý đăng xuất
function logout() {
    try {
        console.log('Đăng xuất khỏi tài khoản...');
        sessionStorage.clear();
        localStorage.clear();
        showToast('Đăng xuất thành công!', 'success');
        // Sử dụng đường dẫn tuyệt đối thay vì đường dẫn tương đối
        let loginPath = '/Customer/templates/login.html';
        console.log('Redirecting to:', loginPath);
        window.location.href = loginPath;
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.', 'error');
    }
}

async function loadDashboardData() {
    try {
        const dashboardData = await fetchAPI(`/sellers/${currentSellerId}/dashboard`);
        // renderDashboard(dashboardData);
    } catch (error) {
        showToast(`Không thể tải dữ liệu dashboard: ${error.message}`, "error");
    }
}

// function renderDashboard(data) {
//     // Cập nhật tổng doanh thu
//     // document.querySelector("#dashboard-section [data-stat='revenue'] .text-2xl").textContent = `${data.totalRevenue.toLocaleString("vi-VN")}đ`;
//     // document.querySelector("#dashboard-section [data-stat='revenue'] .text-sm").textContent = `${data.revenueChange}% so với tháng trước`;

//     // Cập nhật tổng đơn hàng
//     // document.querySelector("#dashboard-section [data-stat='orders'] .text-2xl").textContent = data.totalOrders;
//     // document.querySelector("#dashboard-section [data-stat='orders'] .text-sm").textContent = `${data.ordersChange}% so với tháng trước`;

//     // Cập nhật số sản phẩm
//     // document.querySelector("#dashboard-section [data-stat='products'] .text-2xl").textContent = data.totalProducts;
//     // document.querySelector("#dashboard-section [data-stat='products'] .text-sm").textContent = `${data.newProducts} sản phẩm mới`;

//     // Cập nhật doanh thu 7 ngày (giả định dữ liệu biểu đồ)
//     // renderRevenueChart(data.recentRevenue);

//     // Cập nhật sản phẩm bán chạy
//     const topProducts = document.querySelector("#dashboard-section .grid > div:nth-child(2) > div");
//     topProducts.innerHTML = data.topProducts.map(product => `
//         <div class="flex items-center p-4 border rounded-lg">
//             <img src="${product.image}" alt="${product.name}" class="w-12 h-12 object-cover mr-4">
//             <div>
//                 <p class="font-semibold">${product.name}</p>
//                 <p class="text-sm text-gray-600">${product.orders} đơn • ${product.revenue.toLocaleString("vi-VN")}đ</p>
//             </div>
//         </div>
//     `).join("");

//     // Cập nhật đơn hàng gần đây
//     const recentOrders = document.querySelector("#dashboard-section table tbody");
//     recentOrders.innerHTML = data.recentOrders.map(order => `
//         <tr>
//             <td class="px-6 py-4">${order.orderId}</td>
//             <td class="px-6 py-4">${order.customerName}</td>
//             <td class="px-6 py-4">${order.date}</td>
//             <td class="px-6 py-4">${order.quantity}</td>
//             <td class="px-6 py-4">${order.total.toLocaleString("vi-VN")}đ</td>
//             <td class="px-6 py-4">${order.status}</td>
//             <td class="px-6 py-4">
//                 <a href="#" class="text-blue-600 hover:text-blue-900">Chi tiết</a>
//             </td>
//         </tr>
//     `).join("");
// }

function renderRevenueChart(revenueData) {
    // Giả định revenueData là mảng các giá trị doanh thu trong 7 ngày
    const ctx = document.querySelector("#dashboard-section canvas")?.getContext("2d");
    if (ctx) {
        new Chart(ctx, {
            type: "line",
            data: {
                labels: ["Ngày 1", "Ngày 2", "Ngày 3", "Ngày 4", "Ngày 5", "Ngày 6", "Ngày 7"],
                datasets: [{
                    label: "Doanh thu",
                    data: revenueData,
                    borderColor: "#3b82f6",
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}



// Hàm tạo dữ liệu danh mục mẫu
function createDummyCategories() {
    console.log('Tạo dữ liệu danh mục mẫu...');
    return [
        {
            sellerCategoryID: 1,
            categoryName: "Điện thoại",
            description: "Các loại điện thoại di động",
            isActive: true
        },
        {
            sellerCategoryID: 2,
            categoryName: "Laptop",
            description: "Các loại máy tính xách tay",
            isActive: true
        },
        {
            sellerCategoryID: 3,
            categoryName: "Phụ kiện",
            description: "Phụ kiện điện tử các loại",
            isActive: true
        }
    ];
}

// Cập nhật hàm renderShopCategories để thay đổi cách hiển thị trạng thái và hành động
function renderShopCategories() {
    console.group("=== RENDER SHOP CATEGORIES ===");
    const tbody = document.getElementById("category-table-body");
    if (!tbody) {
        console.warn('Không tìm thấy phần tử hiển thị danh mục (category-table-body)');
        console.groupEnd();
        return;
    }
    
    console.log('Bắt đầu render', sellerCategories.length, 'danh mục vào bảng');
    tbody.innerHTML = "";
    
    if (!sellerCategories || sellerCategories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                    Chưa có danh mục nào. Hãy thêm danh mục mới.
                </td>
            </tr>
        `;
        console.log('Hiển thị bảng trống vì không có danh mục');
    } else {
        sellerCategories.forEach((category, index) => {
            // Chuẩn hóa dữ liệu để tránh undefined
            const categoryData = {
                sellerCategoryID: category.sellerCategoryID || category.id || index + 1,
                categoryName: category.categoryName || category.name || "Danh mục " + (index + 1),
                description: category.description || "Không có mô tả",
                isActive: category.isActive === undefined ? true : category.isActive
            };
            
            const row = document.createElement("tr");
            
            // Tạo nút trạng thái có thể nhấp để thay đổi
            const statusButton = categoryData.isActive ? 
                `<button onclick="toggleCategoryActiveStatus(${categoryData.sellerCategoryID}, true)" class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-500 text-white hover:bg-green-600 transition w-24 justify-center">Hoạt động</button>` :
                `<button onclick="toggleCategoryActiveStatus(${categoryData.sellerCategoryID}, false)" class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-500 text-white hover:bg-gray-600 transition w-24 justify-center">Ngừng bán</button>`;
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${categoryData.categoryName}</td>
                <td class="px-6 py-4 whitespace-nowrap">${categoryData.description}</td>
                <td class="px-6 py-4 whitespace-nowrap">${statusButton}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="edit-btn text-blue-600 hover:text-blue-900 mr-4">Sửa</button>
                </td>
            `;
            
            row.querySelector(".edit-btn").addEventListener("click", () => openEditShopCategoryModal(categoryData.sellerCategoryID));
            tbody.appendChild(row);
        });
    }
    
    console.log('Hoàn thành render danh mục vào bảng');
    console.groupEnd();
}

function renderCategoryList() {
    console.group("=== RENDER CATEGORY LIST ===");
    const container = document.getElementById("categoryList");
    if (!container) {
        console.warn('Không tìm thấy phần tử hiển thị danh sách danh mục (categoryList)');
        console.groupEnd();
        return;
    }
    
    console.log('Bắt đầu render', sellerCategories.length, 'danh mục vào grid');
    
    if (!sellerCategories || sellerCategories.length === 0) {
        container.innerHTML = "<p class='text-gray-500 text-center'>Chưa có danh mục nào.</p>";
        console.log('Hiển thị grid trống vì không có danh mục');
    } else {
        container.innerHTML = "";
        
        sellerCategories.forEach((category, index) => {
            // Chuẩn hóa dữ liệu
            const categoryData = {
                categoryName: category.categoryName || category.name || "Danh mục " + (index + 1),
                description: category.description || "Không có mô tả",
                isActive: category.isActive === undefined ? true : category.isActive
            };
            
            const div = document.createElement("div");
            div.className = "border p-4 rounded-lg";
            div.innerHTML = `
                <h4 class="font-semibold">${categoryData.categoryName}</h4>
                <p>${categoryData.description}</p>
                <p>Trạng thái: ${categoryData.isActive ? 
                    "<span class='text-green-500'>Hoạt động</span>" : 
                    "<span class='text-red-500'>Không hoạt động</span>"}</p>
            `;
            container.appendChild(div);
        });
    }
    
    console.log('Hoàn thành render danh mục vào grid');
    console.groupEnd();
}

async function handleShopCategoryFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const mode = form.dataset.mode;
    const submitButton = document.getElementById("save-btn");
    const saveText = document.getElementById("save-text");
    const saveSpinner = document.getElementById("save-spinner");

    const categoryData = {
        categoryName: document.getElementById("category-name").value,
        description: document.getElementById("category-description").value,
        isActive: document.getElementById("category-is-active").checked
    };

    if (!categoryData.categoryName) {
        showToast("Tên danh mục không được để trống.", "error");
        return;
    }

    // Vô hiệu hóa nút gửi
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("opacity-50");
    }
    
    if (saveText) saveText.classList.add("hidden");
    if (saveSpinner) saveSpinner.classList.remove("hidden");

    try {
        let response;
        if (mode === "edit") {
            const categoryId = form.dataset.categoryId;
            // Cập nhật: Không dùng dấu / đầu tiên, bỏ sellerId
            response = await fetchAPI(`sellerCategories/${categoryId}`, {
                method: "PUT",
                body: JSON.stringify(categoryData)
            });
            sellerCategories = sellerCategories.map(cat =>
                cat.sellerCategoryID === parseInt(categoryId) ? { ...cat, ...categoryData } : cat
            );
            showToast("Danh mục đã được cập nhật!", "success");
        } else {
            // Cập nhật: Không dùng dấu / đầu tiên, bỏ sellerId
            response = await fetchAPI('sellerCategories', {
                method: "POST",
                body: JSON.stringify(categoryData)
            });
            sellerCategories.push(response);
            showToast("Danh mục đã được tạo!", "success");
        }
        renderShopCategories();
        renderCategoryList();
        
        const categoryModal = document.getElementById("category-modal");
        if (categoryModal) {
            categoryModal.classList.add("hidden");
        } else {
            console.warn("Không tìm thấy phần tử category-modal");
        }
    } catch (error) {
        showToast(`Lỗi: ${error.message}`, "error");
    } finally {
        // Khôi phục trạng thái nút
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove("opacity-50");
        }
        
        if (saveText) saveText.classList.remove("hidden");
        if (saveSpinner) saveSpinner.classList.add("hidden");
    }
}

async function openEditShopCategoryModal(categoryId) {
    try {
        console.log('Đang mở modal chỉnh sửa danh mục với ID:', categoryId);
        // Cập nhật: Không dùng dấu / đầu tiên, bỏ sellerId
        const category = await fetchAPI(`sellerCategories/${categoryId}`);
        if (!category) {
            showToast("Không tìm thấy danh mục.", "error");
            return;
        }
        
        // Phần còn lại của hàm giữ nguyên
        const modal = document.getElementById("category-modal");
        const form = document.getElementById("category-form");
        const titleElement = document.getElementById("modal-title");
        const nameInput = document.getElementById("category-name");
        const descriptionInput = document.getElementById("category-description");
        const isActiveCheckbox = document.getElementById("category-is-active");
        
        if (titleElement) titleElement.textContent = "Sửa Danh Mục Shop";
        if (nameInput) nameInput.value = category.categoryName || "";
        if (descriptionInput) descriptionInput.value = category.description || "";
        if (isActiveCheckbox) isActiveCheckbox.checked = category.isActive;
        
        form.dataset.mode = "edit";
        form.dataset.categoryId = categoryId;
        
        modal.classList.remove("hidden");
        console.log('Đã mở modal chỉnh sửa danh mục');
    } catch (error) {
        console.error('Lỗi khi mở modal chỉnh sửa danh mục:', error);
        showToast(`Không thể tải danh mục: ${error.message}`, "error");
    }
}

// Thêm hàm mới để xử lý toggle trạng thái danh mục (thay thế cho deleteShopCategory)
async function toggleCategoryActiveStatus(categoryId, currentIsActive) {
    // Hiển thị hộp thoại xác nhận với thông báo phù hợp
    const confirmMessage = currentIsActive ? 
        "Bạn có chắc chắn muốn ngừng bán danh mục này?" : 
        "Bạn có chắc chắn muốn kích hoạt lại danh mục này?";
    
    if (!confirm(confirmMessage)) return;
    
    try {
        // Tìm dữ liệu của danh mục trong mảng local
        const currentCategory = sellerCategories.find(cat => cat.sellerCategoryID === categoryId);
        
        if (!currentCategory) {
            showToast("Không tìm thấy thông tin danh mục", "error");
            return;
        }
        
        // Tạo data cho request với đầy đủ thông tin hiện tại, chỉ thay đổi isActive
        const updateData = {
            categoryName: currentCategory.categoryName, // Thêm trường CategoryName bắt buộc
            description: currentCategory.description,   // Thêm trường mô tả để đảm bảo
            isActive: !currentIsActive                  // Đảo trạng thái hoạt động
        };
        
        // Gọi API cập nhật trạng thái
        await fetchAPI(`sellerCategories/${categoryId}`, { 
            method: "PUT",
            body: JSON.stringify(updateData)
        });
        
        // Cập nhật dữ liệu cục bộ
        sellerCategories = sellerCategories.map(cat => 
            cat.sellerCategoryID === categoryId ? { ...cat, isActive: !currentIsActive } : cat
        );
        
        // Cập nhật giao diện
        renderShopCategories();
        renderCategoryList();
        
        // Hiển thị thông báo thành công
        const successMessage = currentIsActive ? 
            "Đã ngừng bán danh mục!" : 
            "Đã kích hoạt lại danh mục!";
        showToast(successMessage, "success");
    } catch (error) {
        showToast(`Lỗi khi cập nhật trạng thái danh mục: ${error.message}`, "error");
    }
}

// Đảm bảo hàm này có sẵn trong global scope để có thể gọi từ HTML
window.toggleCategoryActiveStatus = toggleCategoryActiveStatus;

async function fetchAPI(endpoint, options = {}) {
    const token = getTokenFromSession();
    if (!token) {
        console.error('Không có token xác thực, không thể gọi API');
        showToast('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error');
        setTimeout(() => { 
            window.location.href = window.location.origin + '/Customer/templates/login.html'; 
        }, 1500);
        throw new Error('Không có token xác thực');
    }

    // Kiểm tra endpoint
    if (!endpoint) {
        console.error('fetchAPI: Thiếu endpoint');
        throw new Error('Thiếu endpoint API');
    }
    if (options.queryParams) {
        const queryString = new URLSearchParams();
        for (const [key, value] of Object.entries(options.queryParams)) {
            queryString.append(key, value);
        }
        endpoint = `${endpoint}?${queryString.toString()}`;
        delete options.queryParams;
    }
    // Lấy thông tin từ token để debug
    const tokenInfo = parseJwtToken(token);
    const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId;

    const defaultHeaders = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Client-App": "SellerPortal", 
        "X-Client-Version": "1.0.0"     
    };
    if (token) defaultHeaders["Authorization"] = `Bearer ${token}`;
    options.headers = { ...defaultHeaders, ...options.headers };

    // Ensure endpoint starts with a slash if not already
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${API_BASE}${normalizedEndpoint}`;
    console.log(`Gọi API: ${options.method || 'GET'} ${fullUrl}`);
    
    // Debug log chi tiết hơn về API request
    console.group(`=== API Request: ${options.method || 'GET'} ${endpoint} ===`);
    console.log('URL đầy đủ:', fullUrl);
    console.log('Token info:', {
        tokenExists: !!token,
        sellerId: currentSellerId || 'unknown'
    });
    console.log('Headers:', options.headers);
    if (options.body) console.log('Body:', options.body);
    console.groupEnd();
    
    try {
            console.log('Đang gửi request đến:', fullUrl);
        const response = await fetch(fullUrl, options);
        
        // Debug log chi tiết phản hồi
        console.group(`=== API Response: ${response.status} ${response.statusText} ===`);
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        console.log('Headers:', Object.fromEntries([...response.headers.entries()]));
            
            // Bắt lỗi CORS nếu có
            if (!response.headers.get('content-type')) {
                console.warn('Không có content-type header - có thể là lỗi CORS');
            }
        console.groupEnd();
        
        // Xử lý các mã trạng thái khác nhau
        if (response.status === 401) {
            const errorMsg = "Phiên đăng nhập hết hạn hoặc không có quyền truy cập. Vui lòng đăng nhập lại.";
            console.error(errorMsg);
            // Kiểm tra xem token có phải là token của Seller không
            const tokenDetails = parseJwtToken(token);
            console.log('Token role:', tokenDetails.role);
            if (!tokenDetails.role || !tokenDetails.role.includes('Seller')) {
                console.error('Token không có quyền Seller');
                showToast('Tài khoản của bạn không có quyền truy cập trang này', 'error');
            } else {
                showToast(errorMsg, "error");
            }
            setTimeout(() => { window.location.href = window.location.origin + '/Customer/templates/login.html'; }, 2000);
            throw new Error("Unauthorized");
        }
        
        if (response.status === 404) {
            console.warn(`API endpoint không tồn tại: ${fullUrl}`);
            // Đối với endpoint không tồn tại, trả về null thay vì ném lỗi
            // để mã có thể tiếp tục với dữ liệu dự phòng
            return null;
        }
        
        if (!response.ok) {
            let errorMessage = `Lỗi HTTP: ${response.status} tại ${fullUrl}`;
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                console.error('API Error Data:', errorData);
                errorMessage = errorData.message || JSON.stringify(errorData.errors) || errorMessage;
            } else {
                errorMessage = await response.text() || errorMessage;
            }
            console.error(`API Error (${fullUrl}):`, errorMessage);
            throw new Error(errorMessage);
        }
        
        // Trả về null cho status 204 (No Content)
        if (response.status === 204) return null;
        
        // Parse JSON từ response
        const data = await response.json();
        console.log(`API ${fullUrl} trả về dữ liệu:`, data);
        return data;
    } catch (error) {
        // Xử lý lỗi mạng hoặc lỗi xử lý response
        console.error(`API Error (${fullUrl}):`, error.message);
        throw error;
    }
}

function getTokenFromSession() {
    // Tìm kiếm tất cả các key có chứa từ token trong sessionStorage và localStorage
    let sessionToken = null;
    let localToken = null;
    
    console.group("===== CHECK ALL STORAGE KEYS FOR TOKEN =====");
    
    // Kiểm tra trong sessionStorage
    console.log("Kiểm tra tất cả key trong sessionStorage:");
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        
        console.log(`- Key: ${key}`);
        
        // Nếu key có chứa từ "token" (không phân biệt hoa thường)
        if (key.toLowerCase().includes("token")) {
            console.log(`  >>> Tìm thấy key chứa "token": ${key}`);
            console.log(`  >>> Giá trị: ${value ? value.substring(0, 20) + '...' : 'null'}`);
            
            // Ưu tiên key "authToken" nếu tồn tại
            if (key === "authToken") {
                sessionToken = value;
                console.log("  >>> Đã tìm thấy key chính xác 'authToken'");
            } 
            // Nếu chưa tìm thấy key chính xác, lưu key có chứa token đầu tiên
            else if (!sessionToken) {
                sessionToken = value;
                console.log(`  >>> Sử dụng key thay thế: ${key}`);
            }
        }
    }
    
    // Kiểm tra trong localStorage
    console.log("Kiểm tra tất cả key trong localStorage:");
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        console.log(`- Key: ${key}`);
        
        // Nếu key có chứa từ "token" (không phân biệt hoa thường)
        if (key.toLowerCase().includes("token")) {
            console.log(`  >>> Tìm thấy key chứa "token": ${key}`);
            console.log(`  >>> Giá trị: ${value ? value.substring(0, 20) + '...' : 'null'}`);
            
            // Ưu tiên key "authToken" nếu tồn tại
            if (key === "authToken") {
                localToken = value;
                console.log("  >>> Đã tìm thấy key chính xác 'authToken'");
            } 
            // Nếu chưa tìm thấy key chính xác, lưu key có chứa token đầu tiên
            else if (!localToken) {
                localToken = value;
                console.log(`  >>> Sử dụng key thay thế: ${key}`);
            }
        }
    }
    
    // Kiểm tra các key cụ thể
    const directSessionToken = sessionStorage.getItem("authToken");
    const directLocalToken = localStorage.getItem("authToken");
    
    console.log("Kiểm tra trực tiếp authToken trong sessionStorage:", directSessionToken ? "Có" : "Không có");
    console.log("Kiểm tra trực tiếp authToken trong localStorage:", directLocalToken ? "Có" : "Không có");
    
    // Ưu tiên token từ sessionStorage
    const token = sessionToken || localToken;
    console.log("Token được sử dụng:", token ? "Có" : "Không có");
    
    // Nếu token tồn tại, kiểm tra cấu trúc JWT
    if (token) {
        // Kiểm tra cấu trúc token cơ bản
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error('Token không đúng định dạng JWT (phải có 3 phần được phân tách bởi dấu chấm)');
        } else {
            try {
                // Kiểm tra thời gian hết hạn của token
                const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                console.log('Thông tin token:', payload);
                
                if (payload.exp) {
                    const expirationTime = payload.exp * 1000; // Chuyển từ giây sang milli giây
                    const currentTime = Date.now();
                    const timeLeft = expirationTime - currentTime;
                    
                    if (timeLeft <= 0) {
                        console.error('Token đã hết hạn', {
                            expTime: new Date(expirationTime).toLocaleString(),
                            currentTime: new Date(currentTime).toLocaleString(),
                            timeLeftMinutes: Math.floor(timeLeft / 60000)
                        });
                    } else {
                        console.log('Token còn hiệu lực:', Math.floor(timeLeft / 60000), 'phút');
                    }
                }
            } catch (e) {
                console.error('Không thể parse payload của token:', e);
            }
        }
    }
    
    console.groupEnd();
    return token;
}

function updateShopUI(shopData) {
    // Kiểm tra xem shopData có tồn tại không
    if (!shopData || typeof shopData !== 'object') {
        console.warn('shopData không hợp lệ:', shopData);
        shopData = {
            shopName: 'Cửa hàng chưa cập nhật tên',
            email: '',
            phone: '',
            address: '',
            isActive: true
        };
    }
    
    // Cập nhật thông tin cơ bản của shop
    const shopLogo = document.getElementById('shopLogo');
    const shopName = document.getElementById('shopName');
    const shopStatus = document.getElementById('shopStatus');
    const shopDescription = document.getElementById('shopDescription');
    const shopEmail = document.getElementById('shopEmail');
    const shopPhone = document.getElementById('shopPhone');
    const shopAddress = document.getElementById('shopAddress');
    const totalRevenue = document.getElementById('totalRevenue');
    const totalSales = document.getElementById('totalSales');
    
    // Log thông tin shop để debug
    console.log('Shop data for UI update:', shopData);
    
    // Đảm bảo tất cả phần tử UI được cập nhật an toàn
    if (shopLogo) shopLogo.src = shopData.avatar || shopData.logo || 'https://via.placeholder.com/150';
    if (shopName) shopName.textContent = shopData.shopName || 'Cửa hàng chưa cập nhật tên';
    
    // Xử lý hiển thị trạng thái của shop
    if (shopStatus) {
        const isActive = shopData.isActive; // Dựa trên Seller.IsActive
        const statusText = isActive ? 'Đang hoạt động' : 'Đang bảo trì';
        const dotColor = isActive ? 'bg-green-500' : 'bg-red-500';
        
        // Tạo HTML với chấm + text
        shopStatus.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="w-3 h-3 ${dotColor} rounded-full animate-pulse"></div>
                <span>${statusText}</span>
            </div>
        `;
        
        shopStatus.className = 'text-sm ' + (isActive ? 'text-green-600' : 'text-red-600');
        shopStatus.style.display = 'block';
    }
    
    if (shopDescription) shopDescription.textContent = shopData.description || 'Chưa có mô tả';
    if (shopEmail) shopEmail.textContent = shopData.email || 'Chưa cập nhật email';
    if (shopPhone) shopPhone.textContent = shopData.phone || 'Chưa cập nhật SĐT';
    if (shopAddress) shopAddress.textContent = shopData.address || 'Chưa cập nhật địa chỉ';
    if (totalRevenue) totalRevenue.textContent = formatCurrency(shopData.totalRevenue || 0);
    if (totalSales) totalSales.textContent = `Tổng ${shopData.totalOrders || 0} đơn hàng`;
    
    // Xóa bỏ các phần tử liên quan đến đánh giá shop
    const shopRatingElement = document.getElementById('shopRating');
    const reviewCountElement = document.getElementById('reviewCount');
    
    if (shopRatingElement) shopRatingElement.parentElement?.remove();
    if (reviewCountElement) reviewCountElement.parentElement?.remove();
    
    // Cập nhật thông tin chi tiết trong form chỉnh sửa cửa hàng
    const editShopForm = document.getElementById('edit-shop-form');
    if (editShopForm) {
        const shopNameInput = editShopForm.querySelector('[name="shopName"]');
        const statusSelect = editShopForm.querySelector('[name="status"]');
        const descriptionTextarea = editShopForm.querySelector('[name="description"]');
        const emailInput = editShopForm.querySelector('[name="contactEmail"]');
        const phoneInput = editShopForm.querySelector('[name="phoneNumber"]');
        const addressInput = editShopForm.querySelector('[name="address"]');
        const currentLogo = document.getElementById('currentLogo');
        
        if (shopNameInput) shopNameInput.value = shopData.shopName || '';
        
        // Đảm bảo select dropdown được cập nhật đúng
        if (statusSelect) {
            // Dựa vào HTML, dropdown có giá trị "Active" và "Inactive"
            const currentStatus = shopData.isActive ? 'Active' : 'Inactive';
            console.log('Cập nhật status select thành:', currentStatus);
            
            // Cập nhật trực tiếp giá trị để đảm bảo đúng
            statusSelect.value = currentStatus;
        }
        
        if (descriptionTextarea) descriptionTextarea.value = shopData.description || '';
        if (emailInput) emailInput.value = shopData.email || '';
        if (phoneInput) phoneInput.value = shopData.phone || '';
        if (addressInput) addressInput.value = shopData.address || '';
        
        if (currentLogo && (shopData.avatar || shopData.logo)) {
            currentLogo.src = shopData.avatar || shopData.logo;
            currentLogo.classList.remove('hidden');
            const logoPlaceholder = document.getElementById('logoPlaceholder');
            if (logoPlaceholder) logoPlaceholder.style.display = 'none';
        }
    }
}

/**
 * Định dạng tiền tệ Việt Nam
 * @param {number} amount - Số tiền cần định dạng
 * @returns {string} Chuỗi tiền tệ đã định dạng
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Định dạng thời gian theo định dạng Việt Nam
 * @param {string} dateString - Chuỗi thời gian cần định dạng
 * @returns {string} Chuỗi thời gian đã định dạng
 */
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Xử lý form chỉnh sửa thông tin cửa hàng
async function setupEditShopHandlers() {
    const editShopBtn = document.getElementById('edit-shop-btn');
    const editShopModal = document.getElementById('edit-shop-modal');
    const closeShopModal = document.getElementById('close-shop-modal');
    const cancelShopBtn = document.getElementById('cancel-shop-btn');
    const editShopForm = document.getElementById('edit-shop-form');
    const logoInput = document.getElementById('logoInput');
    const bannerInput = document.getElementById('bannerInput');
    
    // Xử lý mở modal chỉnh sửa
    if (editShopBtn && editShopModal) {
        editShopBtn.addEventListener('click', () => {
            // Tải lại dữ liệu shop trước khi mở modal
            loadShopManagementData().then(() => {
                editShopModal.classList.remove('hidden');
            });
        });
    }
    
    // Xử lý đóng modal
    if (closeShopModal && editShopModal) {
        closeShopModal.addEventListener('click', () => {
            editShopModal.classList.add('hidden');
        });
    }
    
    // Xử lý nút hủy
    if (cancelShopBtn && editShopModal) {
        cancelShopBtn.addEventListener('click', () => {
            editShopModal.classList.add('hidden');
        });
    }
    
    // Xử lý upload ảnh logo
    if (logoInput) {
        logoInput.addEventListener('change', (e) => {
            handleImagePreview(e, 'logo');
        });
    }
    
    // Xử lý upload ảnh banner
    if (bannerInput) {
        bannerInput.addEventListener('change', (e) => {
            handleImagePreview(e, 'banner');
        });
    }
    
    // Xử lý submit form
    if (editShopForm) {
        editShopForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleShopFormSubmit(e);
        });
    }
}

// Xử lý preview hình ảnh
function handleImagePreview(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewContainer = document.getElementById(`${type}Preview`);
        const previewImg = previewContainer.querySelector('img');
        const currentImg = document.getElementById(`current${type.charAt(0).toUpperCase() + type.slice(1)}`);
        const placeholder = document.getElementById(`${type}Placeholder`);
        
        if (previewContainer) previewContainer.classList.remove('hidden');
        if (previewImg) previewImg.src = e.target.result;
        if (currentImg) {
            currentImg.classList.add('hidden');
            if (placeholder) placeholder.style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

// Xử lý xóa hình ảnh
function removeImage(type) {
    const previewContainer = document.getElementById(`${type}Preview`);
    const input = document.getElementById(`${type}Input`);
    const placeholder = document.getElementById(`${type}Placeholder`);
    
    if (previewContainer) previewContainer.classList.add('hidden');
    if (input) input.value = '';
    if (placeholder) placeholder.style.display = 'block';
}

// Xử lý submit form
// Xử lý submit form
async function handleProductFormSubmit(e) {
    e.preventDefault();
    
    try {
        const form = e.target;
        const mode = form.dataset.mode;
        const submitButton = document.getElementById('product-save-btn');
        
        // Vô hiệu hóa nút submit khi đang xử lý
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang lưu...';
        }
        
        // Lấy thông tin từ form
        const productData = {
            productName: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            stockQuantity: parseInt(document.getElementById('product-quantity').value),
            categoryID: document.getElementById('product-category').value,
            sellerCategoryID: document.getElementById('product-seller-category').value, // Thêm dòng này
            isActive: document.getElementById('product-is-active').checked
        };
        
        // Kiểm tra dữ liệu
        if (!productData.productName) {
            showToast('Tên sản phẩm không được để trống', 'error');
            return;
        }
        
        if (!productData.price || isNaN(productData.price)) {
            showToast('Giá sản phẩm không hợp lệ', 'error');
            return;
        }
        
        if (!productData.categoryID) {
            showToast('Vui lòng chọn danh mục chung', 'error');
            return;
        }
        
        if (!productData.sellerCategoryID) {
            showToast('Vui lòng chọn danh mục shop', 'error');
            return;
        }
        
        // Xử lý upload ảnh nếu có
        const imageInput = document.getElementById('product-image');
        if (imageInput && imageInput.files.length > 0) {
            const imageUrl = await uploadImage(imageInput.files[0]);
            if (imageUrl) {
                productData.imageURL = imageUrl;
            }
        }
        
        let response;
        console.log('Dữ liệu sản phẩm gửi lên API:', productData);
        
        if (mode === 'edit') {
            const productId = form.dataset.productId;
            if (!productId) {
                throw new Error('Thiếu ID sản phẩm');
            }
            response = await fetchAPI(`Products/${productId}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
            showToast('Cập nhật sản phẩm thành công!', 'success');
        } else {
            response = await fetchAPI('Products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
            showToast('Thêm sản phẩm mới thành công!', 'success');
        }
        
        // Đóng modal
        document.getElementById('product-modal').classList.add('hidden');
        
        // Tải lại danh sách sản phẩm
        await loadProducts(1);
        
    } catch (error) {
        console.error('Lỗi khi lưu sản phẩm:', error);
        showToast(`Lỗi: ${error.message}`, 'error');
    } finally {
        // Kích hoạt lại nút submit
        const submitButton = document.getElementById('product-save-btn');
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Lưu sản phẩm';
        }
    }
}

// Upload ảnh lên Cloudinary
async function uploadImage(file) {
    const CLOUDINARY_CLOUD_NAME = "dgewgggyd"; // Thay bằng cloud name thực tế
    const CLOUDINARY_UPLOAD_PRESET = "ShopX_Images"; // Thay bằng upload preset thực tế
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Không thể upload ảnh');
        }
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Lỗi upload ảnh:', error);
        throw error;
    }
}
let productPagination = {
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
};
/**
 * Tải dữ liệu sản phẩm theo trang và hiển thị danh sách cùng với phân trang
 * 
 * Hàm này thực hiện các nhiệm vụ:
 * 1. Lấy ID người bán từ token đăng nhập
 * 2. Gọi API để lấy danh sách sản phẩm theo ID người bán và trang hiện tại
 * 3. Xử lý phản hồi từ nhiều cấu trúc API khác nhau
 * 4. Cập nhật dữ liệu sản phẩm global (sellerProducts)
 * 5. Trích xuất thông tin phân trang từ phản hồi
 * 6. Hiển thị sản phẩm và phân trang
 * 
 * @param {number} page - Số trang cần tải (bắt đầu từ 1)
 * @returns {Promise<void>}
 */
async function loadProducts(page = 1) {
    try {
        console.group("=== LOAD PRODUCTS ===");
        console.log('Đang tải sản phẩm của seller hiện tại - trang', page);
         // Kiểm tra phần tử phân trang
        const paginationContainer = document.getElementById('product-pagination');
        if (!paginationContainer) {
            console.warn('Không tìm thấy phần tử phân trang (id="product-pagination"). Phân trang sẽ không hiển thị.');
        } else {
            console.log('Đã tìm thấy phần tử phân trang, tiếp tục tải dữ liệu...');
        }
        // Cập nhật trạng thái phân trang hiện tại
        productPagination.currentPage = page;
        
        // Lấy token và seller ID hiện tại
        const token = getTokenFromSession();
        if (!token) {
            showToast('Vui lòng đăng nhập để xem sản phẩm.', 'error');
            console.groupEnd();
            return;
        }
        
        const tokenInfo = parseJwtToken(token);
        const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId;
        
        console.log('DEBUG - Token info:', {
            token: token ? token.substring(0, 15) + '...' : 'không có',
            tokenInfo: tokenInfo,
            sellerId: currentSellerId,
            typeOfSellerId: typeof currentSellerId
        });
        
        if (!currentSellerId) {
            showToast('Không tìm thấy thông tin người bán.', 'error');
            console.warn('Không tìm thấy sellerId trong token. Sử dụng giá trị mặc định.');
            // Vẫn tiếp tục với ID mặc định để hiển thị UI
        }
        
        console.log(`Đang tải sản phẩm cho seller ID: ${currentSellerId || 'unknown'}, trang ${page}`);
        
        // Hiển thị loading trong bảng
        const productTableBody = document.getElementById('product-table-body');
        const productList = document.getElementById('productList');
        
        if (productTableBody) {
            productTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải sản phẩm...</td></tr>`;
        }
        
        // Cập nhật trang hiện tại
        productPagination.currentPage = page;
        
        // Tạo params cho API call
        const params = new URLSearchParams();
        params.append('includeInactive', 'true');
        params.append('pageNumber', page.toString());
        params.append('pageSizeInput', productPagination.pageSize.toString());
        
        // Thay vì sử dụng 'seller/products', sử dụng trực tiếp API endpoint với seller ID
        const baseEndpoint = currentSellerId ? 
            `Products/shop/${currentSellerId}` : 
            'seller/Products';
            
        const apiEndpoint = `${baseEndpoint}?${params.toString()}`;
        console.log(`Gọi API với endpoint: ${apiEndpoint}`);
        
        // Gọi API an toàn với try/catch
        let response = null;
        try {
            response = await fetchAPI(apiEndpoint);
            console.log('DEBUG - Phản hồi API gốc:', response);
        } catch (apiError) {
            console.error('Lỗi khi gọi API:', apiError);
            showToast(`Lỗi khi tải sản phẩm: ${apiError.message}`, "error");
            // Tiếp tục với response=null để hiển thị dữ liệu mẫu
        }
        
        // Xử lý phản hồi API
        if (response) {
            console.log('DEBUG - Loại phản hồi:', typeof response);
            
            // Kiểm tra cấu trúc phản hồi chi tiết hơn
            const hasProducts = !!response.products;
            const productsIsArray = hasProducts && Array.isArray(response.products);
            const productsIsObject = hasProducts && typeof response.products === 'object' && !Array.isArray(response.products);
            const hasProductsItems = productsIsObject && !!response.products.items;
            const hasProductsData = productsIsObject && !!response.products.data;
            
            console.log('DEBUG - Cấu trúc phản hồi chi tiết:', {
                isArray: Array.isArray(response),
                hasProducts,
                productsIsArray,
                productsIsObject,
                hasProductsItems,
                hasProductsData,
                hasItems: !!response.items,
                hasData: !!response.data
            });
            
            // Log chi tiết về cấu trúc products nếu là object
            if (hasProducts && productsIsObject) {
                console.log('DEBUG - Thuộc tính của response.products:', Object.keys(response.products));
                if (response.products.items) {
                    console.log('DEBUG - response.products.items là array:', Array.isArray(response.products.items));
                    console.log('DEBUG - Số lượng items:', Array.isArray(response.products.items) ? response.products.items.length : 'không phải array');
                }
            }
            
            console.log('DEBUG - Cấu trúc phản hồi:', 
                Array.isArray(response) ? 'Array' : 
                (response.products ? 'Có trường products' : 
                 (response.items ? 'Có trường items' : 'Khác'))
            );
            
            // Kiểm tra shop maintenance
            if (response.shop && response.shop.status === "maintenance") {
                console.warn('Shop đang trong trạng thái bảo trì:', response.shop);
                showToast(`Shop đang trong trạng thái bảo trì`, "warning");
                sellerProducts = [];
                renderProducts(sellerProducts);
                console.groupEnd();
                return;
            }
            
            // Xử lý dữ liệu từ response
            let products = [];
            
            // Kiểm tra các cấu trúc phản hồi có thể có
            if (response.products && Array.isArray(response.products)) {
                // Nếu products là mảng trực tiếp
                products = response.products;
                console.log('Sử dụng dữ liệu từ response.products (array):', products.length, 'sản phẩm');
            } else if (response.products && response.products.products && Array.isArray(response.products.products)) {
                // Nếu products là object có chứa mảng products (cấu trúc lồng)
                products = response.products.products;
                console.log('Sử dụng dữ liệu từ response.products.products:', products.length, 'sản phẩm');
            } else if (response.products && response.products.items && Array.isArray(response.products.items)) {
                // Nếu products là object có chứa mảng items (cấu trúc phân trang)
                products = response.products.items;
                console.log('Sử dụng dữ liệu từ response.products.items:', products.length, 'sản phẩm');
            } else if (response.products && response.products.data && Array.isArray(response.products.data)) {
                // Nếu products là object có chứa mảng data
                products = response.products.data;
                console.log('Sử dụng dữ liệu từ response.products.data:', products.length, 'sản phẩm');
            } else if (Array.isArray(response)) {
                // Nếu response là mảng trực tiếp
                products = response;
                console.log('Sử dụng response trực tiếp (array):', products.length, 'sản phẩm');
            } else if (response.items && Array.isArray(response.items)) {
                products = response.items;
                console.log('Sử dụng dữ liệu từ response.items:', products.length, 'sản phẩm');
            } else if (response.data && Array.isArray(response.data)) {
                products = response.data;
                console.log('Sử dụng dữ liệu từ response.data:', products.length, 'sản phẩm');
            } else if (response.products) {
                // Nếu products là object nhưng không có cấu trúc được xác định trước đó, 
                // thử lấy phần tử đầu tiên nếu nó là mảng
                const firstKey = Object.keys(response.products)[0];
                if (firstKey && Array.isArray(response.products[firstKey])) {
                    products = response.products[firstKey];
                    console.log(`Sử dụng dữ liệu từ response.products.${firstKey}:`, products.length, 'sản phẩm');
                } else {
                    console.error('Không thể xác định cấu trúc phản hồi API để lấy sản phẩm:', response);
                    products = [];
                }
            } else {
                console.error('Không thể xác định cấu trúc phản hồi API để lấy sản phẩm:', response);
                products = [];
            }
            
            console.log(`Đã nhận ${products.length} sản phẩm thuộc về seller ID ${currentSellerId || 'unknown'}`);
            console.log('Mẫu sản phẩm đầu tiên:', products.length > 0 ? products[0] : 'không có sản phẩm');
            
            // LƯU TRỮ DỮ LIỆU TRƯỚC KHI TRÍCH XUẤT THÔNG TIN PHÂN TRANG VÀ RENDER
            sellerProducts = products;
            
            // CẬP NHẬT THÔNG TIN PHÂN TRANG
            extractPaginationInfo(response);
            
            // RENDER SẢN PHẨM
            renderProducts(sellerProducts);
            
            // RENDER PHÂN TRANG SAU KHI ĐÃ CÓ DỮ LIỆU VÀ THÔNG TIN PHÂN TRANG
            renderProductPagination();
            
            // Đảm bảo hàm đổi trang được đăng ký vào window
            window.changePage = changePage;
            
        } else {
            console.warn('API không trả về dữ liệu hoặc có lỗi');
            
            // Tạo dữ liệu mẫu nếu là môi trường development, nhưng đặt sellerID
            let dummyProducts = createDummyProducts();
            dummyProducts = dummyProducts.map(product => ({
                ...product,
                sellerId: currentSellerId
            }));
            
            console.log('Đã tạo', dummyProducts.length, 'sản phẩm mẫu cho sellerID', currentSellerId || 'unknown');
            
            sellerProducts = dummyProducts;
            renderProducts(sellerProducts);
            
            showToast(`API không trả về dữ liệu. Đang hiển thị dữ liệu mẫu.`, "warning");
            productPagination.currentPage = page;
            productPagination.totalItems = sellerProducts.length;
            productPagination.totalPages = 1;
            renderPagination();
            
            // Đảm bảo hàm đổi trang được đăng ký vào window
            window.changePage = changePage;
        }
        console.groupEnd();
    } catch (error) {
        console.error('Lỗi khi tải danh sách sản phẩm:', error);
        showToast(`Không thể tải danh sách sản phẩm: ${error.message}`, "error");
        
        const token = getTokenFromSession();
        const tokenInfo = token ? parseJwtToken(token) : {};
        const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId || 0;
        
        // Tạo dữ liệu mẫu nếu có lỗi, nhưng đặt sellerID
        let dummyProducts = createDummyProducts();
        dummyProducts = dummyProducts.map(product => ({
            ...product,
            sellerId: currentSellerId
        }));
        
        sellerProducts = dummyProducts;
        
        // Hiển thị giao diện với dữ liệu mẫu
        renderProducts(sellerProducts);
        productPagination.currentPage = 1;
        productPagination.totalItems = sellerProducts.length;
        productPagination.totalPages = 1;
        renderPagination();
        
        // Đảm bảo hàm đổi trang được đăng ký vào window
        window.changePage = changePage;
        
        console.groupEnd();
    }
}

/**
 * Load featured products for shop dashboard - SỬ DỤNG ĐÚNG API NHƯ STATISTICS
 */
async function loadFeaturedProducts() {
    console.group("=== LOAD FEATURED PRODUCTS ===");
    
    try {
        // Lấy token và validate
        const token = getTokenFromSession();
        if (!token) {
            console.error('Không tìm thấy token để tải sản phẩm nổi bật');
            renderFeaturedProductsError('Không tìm thấy token xác thực');
            return;
        }

        console.log(`✅ Token found, loading featured products...`);
        
        // 🔥 SỬA: Sử dụng cùng format params như trong seller-statistics.js
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Lấy 30 ngày gần đây
        const endDate = new Date();

        const params = new URLSearchParams({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            limit: '5' // Giới hạn 5 sản phẩm nổi bật
        });

        // 🔥 SỬA: Sử dụng đúng endpoint như statistics
        const endpoint = `/Statistics/top-products?${params}`;
        console.log(`📡 Calling endpoint: ${API_BASE}${endpoint}`);
        
        // 🔥 SỬA: Sử dụng makeRequest với auth header như statistics
        const response = await makeRequestWithAuth(endpoint);
        
        console.log('📊 API response cho featured products:', response);
        
        // Xử lý response giống như trong statistics
        let products = [];
        
        if (response) {
            if (Array.isArray(response)) {
                products = response;
            } else if (response.data && Array.isArray(response.data)) {
                products = response.data;
            } else if (response.items && Array.isArray(response.items)) {
                products = response.items;
            } else if (response.products && Array.isArray(response.products)) {
                products = response.products;
            }
        }
        
        console.log(`✅ Đã xử lý ${products.length} sản phẩm nổi bật`);
        
        // Hiển thị sản phẩm nổi bật
        renderFeaturedProducts(products);
        
    } catch (error) {
        console.error('❌ Lỗi khi tải sản phẩm nổi bật:', error);
        renderFeaturedProductsError(error.message);
    }
    
    console.groupEnd();
}

/**
 * Make request with authentication - CÙNG LOGIC VỚI STATISTICS
 */
async function makeRequestWithAuth(endpoint, method = 'GET', data = null) {
    const token = getTokenFromSession();
    
    if (!token) {
        throw new Error('Không tìm thấy token xác thực');
    }

    // Validate token format
    if (!isValidJWTFormat(token)) {
        throw new Error('Token không hợp lệ');
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

    const fullUrl = `${API_BASE}${endpoint}`;
    console.log(`🌐 Making ${method} request to: ${fullUrl}`);

    try {
        const response = await fetch(fullUrl, config);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token không hợp lệ hoặc đã hết hạn');
            } else if (response.status === 403) {
                throw new Error('Không có quyền truy cập');
            } else if (response.status === 404) {
                throw new Error('Không tìm thấy dữ liệu');
            } else {
                throw new Error(`Lỗi server: ${response.status} - ${response.statusText}`);
            }
        }

        const result = await response.json();
        console.log(`✅ API response:`, result);
        return result;
        
    } catch (error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Không thể kết nối tới server. Vui lòng kiểm tra kết nối mạng.');
        } else {
            throw error;
        }
    }
}

/**
 * Validate JWT format - HELPER FUNCTION
 */
function isValidJWTFormat(token) {
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
 * Render featured products với kích thước hình ảnh cố định
 */
function renderFeaturedProducts(products) {
   const container = document.getElementById('featured-products');
   if (!container) {
       console.warn('❌ Không tìm thấy container featured-products');
       return;
   }

   if (!products || products.length === 0) {
       container.innerHTML = `
           <div class="text-center text-gray-500 py-8">
               <i class="fas fa-box-open text-4xl mb-4 opacity-50"></i>
               <p class="font-semibold mb-1">Chưa có sản phẩm nổi bật</p>
               <p class="text-sm">Hãy thêm sản phẩm và bán hàng để hiển thị ở đây</p>
           </div>
       `;
       return;
   }

   // Giới hạn 5 sản phẩm đầu tiên cho featured products
   const featuredProducts = products.slice(0, 5);
   
   container.innerHTML = featuredProducts.map((product, index) => {
       // 🔥 CHUẨN HÓA: Sử dụng cùng field mapping như statistics
       const productData = {
           id: product.productID || product.id || 0,
           name: product.productName || product.name || 'Sản phẩm',
           price: product.unitPrice || product.price || 0,
           soldQuantity: product.totalQuantitySold || product.quantitySold || 0,
           revenue: product.totalRevenue || product.revenue || 0,
           isActive: product.isActive !== false,
           image: product.imageUrl || product.imageURL || product.thumbnail || product.image || 
                  `https://via.placeholder.com/60x60/3B82F6/FFFFFF?text=SP${index+1}`
       };

       // Badge thứ hạng với màu sắc
       const rankBadge = index < 3 ? `
           <div class="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg z-10
               ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                 index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 
                 'bg-gradient-to-br from-orange-400 to-orange-600'}">
               ${index + 1}
           </div>
       ` : '';

       return `
           <div class="featured-product-item flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all duration-200 relative">
               ${rankBadge}
               
               <!-- 🔥 SỬA: Container hình ảnh với kích thước cố định -->
               <div class="flex-shrink-0 mr-4">
                   <img src="${productData.image}" 
                        alt="${productData.name}" 
                        class="featured-product-image"
                        onerror="this.src='https://via.placeholder.com/60x60/3B82F6/FFFFFF?text=SP'"
                        loading="lazy">
               </div>
               
               <!-- 🔥 SỬA: Content với flex layout cải thiện -->
               <div class="featured-product-content">
                   <h4 class="font-medium text-gray-900 truncate mb-1 text-sm" title="${productData.name}">
                       ${productData.name}
                   </h4>
                   <p class="text-sm font-semibold text-blue-600 mb-2">
                       ${formatCurrency(productData.price)}
                   </p>
                   <div class="flex items-center space-x-2 flex-wrap">
                       <span class="px-2 py-1 text-xs rounded-full font-medium ${
                           productData.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                       }">
                           ${productData.isActive ? 'Còn hàng' : 'Hết hàng'}
                       </span>
                       <span class="text-xs text-gray-500">
                           <i class="fas fa-shopping-cart mr-1"></i>${productData.soldQuantity} đã bán
                       </span>
                   </div>
               </div>
               
               <!-- 🔥 SỬA: Price section với layout cố định -->
               <div class="featured-product-price">
                   <div class="text-sm font-semibold text-green-600">
                       ${formatCurrency(productData.revenue)}
                   </div>
                   <div class="text-xs text-gray-500">doanh thu</div>
               </div>
           </div>
       `;
   }).join('');

   console.log(`✅ Đã render ${featuredProducts.length} sản phẩm nổi bật với hình ảnh tối ưu`);
}
/**
 * Format currency - HELPER FUNCTION
 */
function formatCurrency(amount) {
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
 * Render lỗi cho featured products
 */
function renderFeaturedProductsError(errorMessage) {
    const container = document.getElementById('featured-products');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center text-red-500 py-8">
            <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
            <p class="font-semibold mb-1">Lỗi tải sản phẩm nổi bật</p>
            <p class="text-sm text-gray-600 mb-4">${errorMessage}</p>
            <button onclick="loadFeaturedProducts()" class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition text-sm">
                <i class="fas fa-retry mr-1"></i>Thử lại
            </button>
        </div>
    `;
}

async function loadShopData() {
    try {
        console.group("=== LOAD SHOP DATA ===");
        console.log("Đang tải dữ liệu shop...");
        
        // Tải thông tin seller
        await loadSellerInfo();
        
        // Tải danh mục shop
        await loadShopCategories();
        
        // 🔥 THÊM: Tải sản phẩm nổi bật
        await loadFeaturedProducts();
        
        console.log("Hoàn thành tải dữ liệu shop");
        console.groupEnd();
        
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu shop:', error);
        showToast('Không thể tải đầy đủ dữ liệu shop', 'warning');
        console.groupEnd();
    }
}

/**
 * Trích xuất thông tin phân trang từ response API
 * 
 * Hàm này xử lý nhiều cấu trúc phản hồi khác nhau để trích xuất thông tin phân trang như:
 * - Tổng số phần tử (totalItems)
 * - Tổng số trang (totalPages)
 * - Số phần tử trên mỗi trang (pageSize)
 * - Trang hiện tại (currentPage)
 * 
 * Hàm hỗ trợ nhiều định dạng phản hồi API khác nhau và tự động nhận diện cấu trúc.
 * Có khả năng tính toán các giá trị còn thiếu (ví dụ: tính totalPages từ totalItems và pageSize).
 * 
 * @param {Object} response - Phản hồi từ API chứa thông tin phân trang
 * @param {Object} paginationObj - Đối tượng phân trang để cập nhật (mặc định là productPagination)
 * @returns {Object} Đối tượng phân trang đã được cập nhật
 */
function extractPaginationInfo(response, paginationObj = productPagination) {
    console.group("=== EXTRACT PAGINATION INFO ===");
    try {
        // Đảm bảo response tồn tại
        if (!response) {
            console.warn('Response trống hoặc không hợp lệ');
            console.groupEnd();
            return paginationObj;
        }
        
        // Sao chép đối tượng phân trang để không thay đổi trực tiếp
        let pagination = {...paginationObj};
        
        // Đảm bảo các thuộc tính cơ bản luôn có giá trị mặc định
        pagination.currentPage = pagination.currentPage || 1;
        pagination.pageSize = pagination.pageSize || 10;
        pagination.totalItems = pagination.totalItems || 0;
        pagination.totalPages = pagination.totalPages || 0;
        
        console.log('Đang trích xuất thông tin phân trang từ response:', response);
        
        // Xác định cấu trúc của response để xử lý phù hợp
        let paginationSource = null;
        
        // Kiểm tra nếu response chứa thông tin phân trang trực tiếp
        if (response.totalItems !== undefined || response.totalPages !== undefined || 
            response.pageSize !== undefined || response.pageNumber !== undefined) {
            paginationSource = response;
            console.log('Phát hiện thông tin phân trang ở cấp root của response');
        } 
        // Kiểm tra nếu response có thuộc tính pagination
        else if (response.pagination) {
            paginationSource = response.pagination;
            console.log('Phát hiện thông tin phân trang trong thuộc tính pagination');
        }
        // Kiểm tra nếu response có thuộc tính meta
        else if (response.meta) {
            paginationSource = response.meta;
            console.log('Phát hiện thông tin phân trang trong thuộc tính meta');
        }
        // Kiểm tra nếu response có thuộc tính data.products
        else if (response.products) {
            paginationSource = response.products;
            console.log('Phát hiện thông tin phân trang trong thuộc tính products');
        }
        // Xử lý trường hợp response là mảng items
        else if (Array.isArray(response)) {
            console.log('Response là mảng, ước tính thông tin phân trang từ độ dài');
            pagination.totalItems = response.length;
            pagination.totalPages = Math.ceil(response.length / pagination.pageSize);
        }
        // Xử lý trường hợp response có thuộc tính items là mảng
        else if (response.items && Array.isArray(response.items)) {
            console.log('Ước tính thông tin phân trang từ thuộc tính items');
            pagination.totalItems = response.items.length;
        }
        
        // Trích xuất thông tin từ nguồn phân trang đã xác định
        if (paginationSource) {
            // Trích xuất totalItems (tổng số mục)
            if (paginationSource.totalItems !== undefined) {
                pagination.totalItems = paginationSource.totalItems;
                console.log('totalItems:', pagination.totalItems);
            } else if (paginationSource.total !== undefined) {
                pagination.totalItems = paginationSource.total;
                console.log('totalItems (từ total):', pagination.totalItems);
            } else if (paginationSource.totalCount !== undefined) {
                pagination.totalItems = paginationSource.totalCount;
                console.log('totalItems (từ totalCount):', pagination.totalItems);
            }
            
            // Trích xuất totalPages (tổng số trang)
            if (paginationSource.totalPages !== undefined) {
                pagination.totalPages = paginationSource.totalPages;
                console.log('totalPages:', pagination.totalPages);
            } else if (paginationSource.pages !== undefined) {
                pagination.totalPages = paginationSource.pages;
                console.log('totalPages (từ pages):', pagination.totalPages);
            }
            
            // Trích xuất pageSize (kích thước trang)
            if (paginationSource.pageSize !== undefined) {
                pagination.pageSize = paginationSource.pageSize;
                console.log('pageSize:', pagination.pageSize);
            }
            
            // Trích xuất currentPage (trang hiện tại)
            if (paginationSource.currentPage !== undefined) {
                pagination.currentPage = paginationSource.currentPage;
                console.log('currentPage:', pagination.currentPage);
            } else if (paginationSource.pageNumber !== undefined) {
                pagination.currentPage = paginationSource.pageNumber;
                console.log('currentPage (từ pageNumber):', pagination.currentPage);
            }
        }
        
        // Tính toán các giá trị còn thiếu nếu có đủ thông tin
        if (!pagination.totalPages && pagination.totalItems && pagination.pageSize) {
            pagination.totalPages = Math.ceil(pagination.totalItems / pagination.pageSize);
            console.log('Tính toán totalPages từ totalItems và pageSize:', pagination.totalPages);
        }
        
        // Đảm bảo các giá trị phân trang hợp lệ
        if (!pagination.totalPages || pagination.totalPages < 1) {
            pagination.totalPages = 1;
            console.log('Thiết lập totalPages = 1 (giá trị tối thiểu)');
        }
        
        if (pagination.currentPage < 1) {
            pagination.currentPage = 1;
            console.log('Điều chỉnh currentPage = 1 (giá trị tối thiểu)');
        }
        
        if (pagination.currentPage > pagination.totalPages) {
            pagination.currentPage = pagination.totalPages;
            console.log('Điều chỉnh currentPage bằng totalPages vì vượt quá giới hạn');
        }
        
        // Cập nhật lại đối tượng phân trang gốc
        Object.assign(paginationObj, pagination);
        
        console.log('Thông tin phân trang sau khi xử lý:', paginationObj);
        console.groupEnd();
        return paginationObj;
    } catch (error) {
        console.error('Lỗi khi trích xuất thông tin phân trang:', error);
        console.error('Chi tiết lỗi:', error.message);
        
        // Đảm bảo đối tượng phân trang vẫn có giá trị mặc định hợp lệ
        paginationObj.currentPage = paginationObj.currentPage || 1;
        paginationObj.totalPages = paginationObj.totalPages || 1;
        paginationObj.pageSize = paginationObj.pageSize || 10;
        paginationObj.totalItems = paginationObj.totalItems || 0;
        
        console.groupEnd();
        return paginationObj;
    }
}
/**
 * Hiển thị điều khiển phân trang trên giao diện
 * 
 * Hàm này tạo và hiển thị UI phân trang, bao gồm:
 * - Nút điều hướng trước/sau
 * - Các nút số trang với trạng thái hoạt động được đánh dấu 
 * - Hiển thị tổng số mục nếu có
 * 
 * Sử dụng bên trong khi không có tệp pagination-helper.js
 * 
 * @param {string} containerId - ID của container chứa phân trang
 * @param {Object} paginationObj - Đối tượng phân trang (productPagination hoặc categoryPagination)
 * @param {string} changePageFuncName - Tên hàm JavaScript để đổi trang (ví dụ: "changePage" hoặc "changeCategoryPage")
 * @param {string} [itemLabel="sản phẩm"] - Nhãn cho loại mục (để hiển thị "Tổng cộng X {itemLabel}")
 * @returns {void}
 */
function renderPagination(containerId, paginationObj, changePageFuncName, itemLabel = "sản phẩm") {
    // Kiểm tra nếu đã có pagination helper
    if (typeof renderPaginationUI === 'function') {
        // Sử dụng hàm generic từ pagination-helper.js thay vì dùng implementation này
        renderPaginationUI(containerId, paginationObj, changePageFuncName, itemLabel);
        return;
    }

    // Legacy implementation khi chưa có pagination-helper.js
    console.group(`=== RENDER PAGINATION (${containerId}) ===`);
    const paginationContainer = document.getElementById(containerId);
    if (!paginationContainer) {
        console.warn(`Không tìm thấy container ${containerId}`);
        console.groupEnd();
        return;
    }
    
    // Nếu không có trang nào hoặc chỉ có 1 trang, không hiển thị phân trang
    if (!paginationObj.totalPages || paginationObj.totalPages <= 1) {
        paginationContainer.innerHTML = '';
        console.log('Không hiển thị phân trang vì chỉ có 1 trang hoặc không có dữ liệu');
        console.groupEnd();
        return;
    }
    
    console.log('Đang render phân trang với thông tin:', paginationObj);
    
    let paginationHTML = `<div class="flex justify-center my-4">
        <nav class="flex items-center space-x-1">
            <button class="pagination-btn px-3 py-1 rounded-l border ${paginationObj.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}" 
                    onclick="${changePageFuncName}(${paginationObj.currentPage - 1})" ${paginationObj.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>`;
    
    // Giới hạn hiển thị số trang nếu có quá nhiều trang
    const maxDisplayedPages = 5;
    let startPage = Math.max(1, paginationObj.currentPage - Math.floor(maxDisplayedPages / 2));
    let endPage = Math.min(paginationObj.totalPages, startPage + maxDisplayedPages - 1);
    
    // Điều chỉnh lại startPage nếu endPage đã đạt giới hạn
    if (endPage - startPage + 1 < maxDisplayedPages) {
        startPage = Math.max(1, endPage - maxDisplayedPages + 1);
    }
    
    // Hiển thị nút đầu trang nếu cần
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-white text-blue-600 hover:bg-blue-50" onclick="${changePageFuncName}(1)">1</button>`;
        
        if (startPage > 2) {
            paginationHTML += `<span class="px-3 py-1 border-t border-b border-r bg-white text-gray-600">...</span>`;
        }
    }
    
    // Hiển thị các số trang chính
    for (let i = startPage; i <= endPage; i++) {
        if (i === paginationObj.currentPage) {
            paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-blue-500 text-white" onclick="${changePageFuncName}(${i})">${i}</button>`;
        } else {
            paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-white text-blue-600 hover:bg-blue-50" onclick="${changePageFuncName}(${i})">${i}</button>`;
        }
    }
    
    // Hiển thị nút cuối trang nếu cần
    if (endPage < paginationObj.totalPages) {
        if (endPage < paginationObj.totalPages - 1) {
            paginationHTML += `<span class="px-3 py-1 border bg-white text-gray-600">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-white text-blue-600 hover:bg-blue-50" onclick="${changePageFuncName}(${paginationObj.totalPages})">${paginationObj.totalPages}</button>`;
    }
    
    paginationHTML += `
        <button class="pagination-btn px-3 py-1 rounded-r border ${paginationObj.currentPage === paginationObj.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}" 
                onclick="${changePageFuncName}(${paginationObj.currentPage + 1})" ${paginationObj.currentPage === paginationObj.totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    </nav>`;
    
    // Thêm thông tin về tổng số mục
    if (paginationObj.totalItems) {
        paginationHTML += `
            <div class="ml-4 text-sm text-gray-600 flex items-center">
                Tổng cộng ${paginationObj.totalItems} ${itemLabel}
            </div>
        `;
    }
    
    paginationHTML += `</div>`;
    
    paginationContainer.innerHTML = paginationHTML;
    console.log(`Đã render phân trang cho ${containerId} thành công`);
    console.groupEnd();
}

/**
 * Hiển thị phân trang cho danh sách sản phẩm
 * Hàm này sử dụng lại renderPaginationUI với các thiết lập phù hợp cho sản phẩm
 * 
 * @returns {void}
 */
function renderProductPagination() {
    console.log("Rendering product pagination...");
    renderPagination('product-pagination', productPagination, 'changePage', 'sản phẩm');
    // Kiểm tra xem hàm helper đã được load chưa
    if (typeof window.renderProductPaginationUI === 'function') {
        console.log("Using helper function for product pagination");
        // Sử dụng helper function
        window.renderProductPaginationUI();
    } else {
        console.log("Using fallback pagination rendering for products");
        // Fallback implementation nếu không có helper
        renderPagination('product-pagination', productPagination, 'changePage', 'sản phẩm');
    }
    
    // Đảm bảo hàm đổi trang được đăng ký vào window
    window.changePage = changePage;
}

// Hàm đổi trang
function changePage(page) {
    console.log(`Chuyển đến trang ${page}`);
    if (page < 1 || (productPagination.totalPages && page > productPagination.totalPages)) return;
    
    // Cuộn lên đầu phần sản phẩm
    const productsSection = document.getElementById('products-section');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    loadProducts(page);
}

// Đảm bảo hàm này có thể được gọi từ DOM
window.changePage = changePage;

// Hàm tạo dữ liệu sản phẩm mẫu cho trường hợp API không trả về dữ liệu
function createDummyProducts() {
    console.log('Tạo dữ liệu sản phẩm mẫu...');
    
    // Lấy seller ID từ token nếu có
    let currentSellerId = 0;
    try {
        const token = getTokenFromSession();
        if (token) {
            const tokenInfo = parseJwtToken(token);
            currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId || 0;
        }
    } catch (error) {
        console.warn('Không thể lấy sellerID từ token:', error);
    }
    
    return [
        {
            productID: 1001 + (currentSellerId * 100),
            name: "iPhone 14 Pro Max",
            categoryName: "Điện thoại",
            price: 28000000,
            stockQuantity: 10,
            isActive: true,
            sellerId: currentSellerId,
            sellerID: currentSellerId,
            thumbnail: "https://via.placeholder.com/150/0000FF/FFFFFF?text=iPhone"
        },
        {
            productID: 1002 + (currentSellerId * 100),
            name: "MacBook Pro M2",
            categoryName: "Laptop",
            price: 35000000,
            stockQuantity: 5,
            isActive: true,
            sellerId: currentSellerId,
            sellerID: currentSellerId,
            thumbnail: "https://via.placeholder.com/150/00FF00/FFFFFF?text=MacBook"
        },
        {
            productID: 1003 + (currentSellerId * 100),
            name: "Samsung Galaxy S23",
            categoryName: "Điện thoại",
            price: 22000000,
            stockQuantity: 8,
            isActive: false,
            sellerId: currentSellerId,
            sellerID: currentSellerId,
            thumbnail: "https://via.placeholder.com/150/FF0000/FFFFFF?text=Samsung"
        }
    ];
}

function renderProducts(products) {
    console.group("=== RENDER PRODUCTS ===");
    const productTableBody = document.getElementById('product-table-body');
    const productList = document.getElementById('productList');
    
    console.log('Đã tìm thấy product-table-body:', !!productTableBody);
    console.log('Đã tìm thấy productList:', !!productList);
    console.log('Số lượng sản phẩm cần render:', products ? products.length : 0);
    
    // Debug sản phẩm
    if (products && products.length > 0) {
        console.log('DEBUG - Sản phẩm đầu tiên:', products[0]);
    } else {
        console.warn('Không có sản phẩm để render');
    }
    
    // Hàm định dạng tiền tệ
    const formatCurrency = (amount) => {
        if (typeof amount !== 'number') return 'N/A';
        return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
            .replace(/\s₫$/, 'đ'); // Sửa định dạng tiền Việt Nam
    };
    
    // Hàm lấy URL hình ảnh
    const getImageUrl = (imageURL) => {
        if (!imageURL || imageURL === "/images/string") return '../assets/images/placeholder.png';
        const isFullUrl = /^(https?:)?\/\//i.test(imageURL);
        if (isFullUrl) return imageURL;
        return imageURL;
    };
    
    // Nếu không tìm thấy phần tử, thoát hàm
    if (!productTableBody && !productList) {
        console.warn('Không tìm thấy phần tử hiển thị sản phẩm');
        console.groupEnd();
        return;
    }
    
    // Kiểm tra products có phải array không
    if (!Array.isArray(products)) {
        console.error('Lỗi: products không phải là array', products);
        if (productTableBody) {
            productTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Lỗi: Dữ liệu sản phẩm không hợp lệ</td></tr>`;
        }
        if (productList) {
            productList.innerHTML = `<div class="w-full text-center py-4 text-gray-500">Lỗi: Dữ liệu sản phẩm không hợp lệ</div>`;
        }
        console.groupEnd();
        return;
    }
    
    // Thêm style cho product-name-ellipsis nếu chưa có
    if (!document.querySelector('style#product-styles')) {
        const style = document.createElement('style');
        style.id = 'product-styles';
        style.textContent = `
            .product-name-ellipsis {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.4em;
                max-height: 2.8em;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Render cho bảng sản phẩm
    if (productTableBody) {
        if (!products || products.length === 0) {
            productTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                        Chưa có sản phẩm nào. Hãy thêm sản phẩm mới.
                    </td>
                </tr>
            `;
            console.log('Hiển thị bảng trống vì không có sản phẩm');
        } else {
            productTableBody.innerHTML = '';
            console.log('Bắt đầu render', products.length, 'sản phẩm vào bảng');
            
            products.forEach((product, index) => {
                // Chuẩn hóa dữ liệu product để tránh undefined
                const productData = {
                    productID: product.productID || product.id || index + 1,
                    name: product.productName || product.name || "Sản phẩm " + (index + 1),
                    categoryName: product.categoryName || product.category?.name || "Chưa phân loại",
                    price: product.price || 0,
                    stockQuantity: product.stockQuantity || product.quantity || 0,
                    isActive: product.isActive === undefined ? true : product.isActive,
                    thumbnail: product.thumbnail || product.image || product.productImage || product.imageURL || "https://via.placeholder.com/50?text=" + (product.productName || product.name || "Product")
                };
                
                const row = document.createElement('tr');
                
                // Xác định trạng thái sản phẩm
                let statusBadge = '';
                                // Kiểm tra xem sản phẩm có thuộc về seller hiện tại hay không
                const tokenInfo = parseJwtToken(getTokenFromSession() || '');
                const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId;
                const productSellerId = productData.sellerId || productData.sellerID;
                const isOwner = !productSellerId || productSellerId.toString() === currentSellerId?.toString();
                
                if (isOwner) {
                    // Nếu là chủ sở hữu, hiển thị button để thay đổi trạng thái
                    if (productData.isActive) {
                        statusBadge = `<button onclick="window.changeProductStatus(${productData.productID}, false)" class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white justify-center bg-green-500 w-24 hover:bg-green-600" title="Nhấp để ngừng bán">Đang bán</button>`;
                    } else {
                        statusBadge = `<button onclick="window.changeProductStatus(${productData.productID}, true)" class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full text-white justify-center bg-gray-500 w-24 hover:bg-gray-600" title="Nhấp để bán lại">Ngừng bán</button>`;
                    }
                } else {
                    // Nếu không phải chủ sở hữu, chỉ hiển thị badge trạng thái
                    if (productData.isActive) {
                        statusBadge = `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 w-24 justify-center">Đang bán</span>`;
                    } else {
                        statusBadge = `<span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 w-24 justify-center">Ngừng bán</span>`;
                    }
                }
                
                const imageUrl = getImageUrl(productData.thumbnail);
                
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <img src="${imageUrl}" alt="${productData.name}" class="w-10 h-10 object-cover rounded-full">
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div class="product-name-ellipsis">${productData.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${productData.categoryName}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(productData.price)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${productData.stockQuantity}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${isOwner ? `
                        <button class="text-blue-600 hover:text-blue-900 mr-3 edit-product" data-id="${productData.productID}">Sửa</button>
                        <button class="text-red-600 hover:text-red-900 delete-product" data-id="${productData.productID}">Xóa</button>
                        ` : `<span class="text-gray-500">Không có quyền</span>`}
                    </td>
                `;
                
                productTableBody.appendChild(row);
                
                const editBtn = row.querySelector('.edit-product');
                const deleteBtn = row.querySelector('.delete-product');
                
                if (editBtn) {
                    editBtn.addEventListener('click', () => openEditProductModal(productData.productID));
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => deleteProduct(productData.productID));
                }
            });
            
            console.log('Hoàn thành render sản phẩm vào bảng');
        }
    }
    
    // Render cho danh sách sản phẩm (grid)
    if (productList) {
        if (!products || products.length === 0) {
            productList.innerHTML = `<p class="text-gray-500 text-center">Chưa có sản phẩm nào.</p>`;
            console.log('Hiển thị danh sách trống vì không có sản phẩm');
        } else {
            productList.innerHTML = '';
            console.log('Bắt đầu render', products.length, 'sản phẩm vào grid');
            
            products.forEach((product, index) => {
                // Chuẩn hóa dữ liệu product
                const productData = {
                    productID: product.productID || product.id || index + 1,
                    name: product.productName || product.name || "Sản phẩm " + (index + 1),
                    price: product.price || 0,
                    isActive: product.isActive === undefined ? true : product.isActive,
                    thumbnail: product.thumbnail || product.image || product.productImage || product.imageURL || "https://via.placeholder.com/150?text=" + (product.productName || product.name || "Product")
                };
                
                const imageUrl = getImageUrl(productData.thumbnail);
                
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow overflow-hidden';
                card.innerHTML = `
                    <div class="h-40 bg-gray-200 relative">
                        <img src="${imageUrl}" alt="${productData.name}" class="w-full h-full object-cover">
                        ${!productData.isActive ? '<div class="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs">Không hoạt động</div>' : ''}
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold product-name-ellipsis">${productData.name}</h3>
                        <p class="text-gray-600">${formatCurrency(productData.price)}</p>
                        <div class="mt-2 flex justify-end space-x-2">
                            <button class="text-blue-600 hover:text-blue-800 text-sm edit-product-btn" data-id="${productData.productID}">
                                <i class="fas fa-edit"></i> Sửa
                            </button>
                            <button class="text-red-600 hover:text-red-800 text-sm delete-product-btn" data-id="${productData.productID}">
                                <i class="fas fa-trash"></i> Xóa
                            </button>
                        </div>
                    </div>
                `;
                
                productList.appendChild(card);
                
                const editBtn = card.querySelector('.edit-product-btn');
                const deleteBtn = card.querySelector('.delete-product-btn');
                
                if (editBtn) {
                    editBtn.addEventListener('click', () => openEditProductModal(productData.productID));
                }
                
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => deleteProduct(productData.productID));
                }
            });
            
            console.log('Hoàn thành render sản phẩm vào grid');
        }
    }
    
    console.groupEnd();
}

// Thêm sản phẩm mới
async function openAddProductModal() {
    // Lấy modal
    const productModal = document.getElementById('product-modal');
    if (!productModal) {
        console.error('Không tìm thấy product-modal');
        return;
    }
    
    // Cập nhật tiêu đề modal
    const modalTitle = document.getElementById('product-modal-title');
    if (modalTitle) modalTitle.textContent = 'Thêm Sản Phẩm Mới';
    
    // Reset form
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.reset();
        productForm.dataset.mode = 'create';
        
        // Lấy danh mục sản phẩm
        await loadCategoriesToForm();
    }
    
    // Hiển thị modal
    productModal.classList.remove('hidden');
}

// Mở modal chỉnh sửa sản phẩm
// Mở modal chỉnh sửa sản phẩm
async function openEditProductModal(productId) {
    try {
        console.log(`Mở modal chỉnh sửa sản phẩm ID: ${productId}`);
        
        // Lấy thông tin sản phẩm từ API
        const product = await fetchAPI(`Products/${productId}?includeInactive=true`);
        
        if (!product) {
            showToast('Không thể tải thông tin sản phẩm', 'error');
            return;
        }
        
        console.log('Thông tin sản phẩm:', product);
        
        // Lấy modal và form
        const productModal = document.getElementById('product-modal');
        const productForm = document.getElementById('product-form');
        
        if (!productModal || !productForm) {
            showToast('Không tìm thấy form chỉnh sửa sản phẩm', 'error');
            return;
        }
        
        // Cập nhật tiêu đề modal
        const modalTitle = document.getElementById('product-modal-title');
        if (modalTitle) modalTitle.textContent = 'Chỉnh Sửa Sản Phẩm';
        
        // Đặt chế độ chỉnh sửa và lưu ID sản phẩm
        productForm.dataset.mode = 'edit';
        productForm.dataset.productId = productId;
        
        // Lấy danh mục sản phẩm
        await loadCategoriesToForm();
        
        // Chuẩn hóa dữ liệu trước khi điền vào form
        const productData = {
            name: product.productName || product.name || '',
            price: product.price || 0,
            stockQuantity: product.stockQuantity || product.quantity || 0,
            description: product.description || '',
            isActive: product.isActive === undefined ? true : product.isActive,
            categoryID: product.categoryID || product.categoryId || '',
            sellerCategoryID: product.sellerCategoryID || product.sellerCategoryId || '',
            images: product.images || [],
            thumbnail: product.thumbnail || product.image || product.productImage || product.imageURL || ''
        };
        
        // Điền thông tin sản phẩm vào form
        document.getElementById('product-name').value = productData.name;
        document.getElementById('product-price').value = productData.price;
        document.getElementById('product-quantity').value = productData.stockQuantity;
        document.getElementById('product-description').value = productData.description;
        document.getElementById('product-is-active').checked = productData.isActive;
        
        // Chọn danh mục chung
        const categorySelect = document.getElementById('product-category');
        if (categorySelect && productData.categoryID) {
            [...categorySelect.options].some(option => {
                if (option.value == productData.categoryID) {
                    option.selected = true;
                    return true;
                }
                return false;
            });
        }
        
        // Chọn danh mục shop
        const sellerCategorySelect = document.getElementById('product-seller-category');
        if (sellerCategorySelect && productData.sellerCategoryID) {
            [...sellerCategorySelect.options].some(option => {
                if (option.value == productData.sellerCategoryID) {
                    option.selected = true;
                    return true;
                }
                return false;
            });
        }
        
        // Hiển thị hình ảnh hiện tại
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview && productData.thumbnail) {
            imagePreview.innerHTML = `
                <div class="relative">
                    <img src="${productData.thumbnail}" alt="${productData.name}" class="w-full h-32 object-cover">
                    <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1" onclick="removeImagePreview()">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        // Hiển thị modal
        productModal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Lỗi khi mở modal chỉnh sửa sản phẩm:', error);
        showToast(`Không thể mở modal chỉnh sửa: ${error.message}`, 'error');
    }
}

// Hàm xóa xem trước ảnh
function removeImagePreview() {
    const imagePreview = document.getElementById('image-preview');
    if (imagePreview) {
        imagePreview.innerHTML = '';
    }
    const imageInput = document.getElementById('product-image');
    if (imageInput) {
        imageInput.value = '';
    }
}

// Đảm bảo hàm có thể được gọi từ HTML
window.removeImagePreview = removeImagePreview;
// Tải danh mục sản phẩm vào form
async function loadCategoriesToForm() {
    try {
        // Lấy token để trích xuất sellerId
        const token = getTokenFromSession();
        if (!token) {
            showToast('Vui lòng đăng nhập để tải danh mục.', 'error');
            return;
        }
        
        const tokenInfo = parseJwtToken(token);
        const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId;
        
        // Lấy các select element
        const categorySelect = document.getElementById('product-category');
        const sellerCategorySelect = document.getElementById('product-seller-category');
        
        if (!categorySelect && !sellerCategorySelect) {
            console.error('Không tìm thấy dropdown danh mục trong form');
            return;
        }
        
        // 1. Tải danh mục chung
        const categories = await fetchAPI('categories/all');
        
        // 2. Tải danh mục của seller
        const sellerCategories = await fetchAPI('sellerCategories');
        
        console.log('Danh mục chung:', categories);
        console.log('Danh mục seller:', sellerCategories);
        
        // Điền danh mục chung vào dropdown - PHẦN CODE MỚI THÊM VÀO
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">-- Chọn danh mục --</option>';
            
            if (categories && Array.isArray(categories)) {
                categories.forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.categoryID || category.categoryId || category.id;
                    option.textContent = category.categoryName || category.name;
                    categorySelect.appendChild(option);
                });
                console.log(`Đã thêm ${categories.length} danh mục chung vào dropdown`);
            } else {
                console.warn('Không có danh mục chung hoặc dữ liệu không phải mảng:', categories);
            }
        }
        
        // Điền danh mục của seller vào dropdown
        if (sellerCategorySelect && sellerCategories && Array.isArray(sellerCategories)) {
            sellerCategorySelect.innerHTML = '<option value="">-- Chọn danh mục shop --</option>';
            
            // Chỉ hiển thị danh mục đang hoạt động
            const activeSellerCategories = sellerCategories.filter(cat => cat.isActive);
            
            activeSellerCategories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.sellerCategoryID || category.id;
                option.textContent = category.categoryName || category.name;
                sellerCategorySelect.appendChild(option);
            });
        }
        
    } catch (error) {
        console.error('Lỗi khi tải danh mục:', error);
        showToast('Không thể tải danh mục sản phẩm.', 'error');
    }
}

// Xóa sản phẩm
async function deleteProduct(productId) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return;
    
    try {
        showToast('Đang xóa sản phẩm...', 'info');
        
        // Lấy thông tin seller từ token
        const token = getTokenFromSession();
        if (!token) {
            showToast('Vui lòng đăng nhập.', 'error'); 
            return;
        }
        
        // Lấy sellerId từ token để kiểm tra quyền
        const tokenInfo = parseJwtToken(token);
        const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId;
        
        // Trước khi xóa, kiểm tra thông tin sản phẩm
        const product = await fetchAPI(`Products/${productId}`);
        
        if (!product) {
            showToast('Không tìm thấy thông tin sản phẩm', 'error');
            return;
        }
        
        // Kiểm tra sản phẩm có thuộc về seller hiện tại không
        const productSellerId = product.sellerId || product.sellerID;
        if (productSellerId && productSellerId.toString() !== currentSellerId?.toString()) {
            console.warn(`Sản phẩm ID ${productId} thuộc về seller ${productSellerId}, không phải seller hiện tại ${currentSellerId}`);
            showToast('Bạn không có quyền xóa sản phẩm này', 'error');
            return;
        }
        
        // Thử nhiều cách xóa sản phẩm khác nhau
        let deleteSuccess = false;
        let lastError = null;
        
        // Cách 1: Gọi API xóa sản phẩm (DELETE với status=delete)
        try {
            await fetchAPI(`Products/${productId}?status=delete`, {
                method: 'DELETE'
            });
            deleteSuccess = true;
        } catch (err1) {
            lastError = err1;
            console.warn('Không thể xóa sản phẩm bằng DELETE request:', err1);
            
            // Cách 2: Chuyển trạng thái sản phẩm thành không hoạt động
            try {
                await fetchAPI(`Products/${productId}?status=notActive`, {
                    method: 'DELETE'
                });
                deleteSuccess = true;
                console.log('Đã chuyển sản phẩm sang trạng thái không hoạt động');
            } catch (err2) {
                lastError = err2;
                console.warn('Không thể cập nhật trạng thái sản phẩm:', err2);
            }
        }
        
        if (deleteSuccess) {
            showToast('Sản phẩm đã được xóa thành công', 'success');
            
            // Cập nhật danh sách sản phẩm cục bộ tạm thời để UX mượt hơn
            sellerProducts = sellerProducts.filter(product => 
                (product.productID != productId) && (product.id != productId));
            renderProducts(sellerProducts);
            
            // Tải lại danh sách sản phẩm từ API sau 1 giây
            setTimeout(() => {
                loadProducts(1);
            }, 1000);
        } else {
            throw lastError || new Error('Không thể xóa sản phẩm');
        }
    } catch (error) {
        // Xử lý lỗi Forbidden (403) đặc biệt
        if (error.message && error.message.includes('403')) {
            showToast('Bạn không có quyền xóa sản phẩm này', 'error');
            console.error('Lỗi quyền truy cập:', error.message);
        } else {
        console.error('Lỗi khi xóa sản phẩm:', error);
        showToast(`Không thể xóa sản phẩm: ${error.message}`, 'error');
        }
    }
}
// xử lí phân trang

// Xử lý hình ảnh sản phẩm
function handleProductImageChange(e) {
    const files = e.target.files;
    const imagePreview = document.getElementById('image-preview');
    
    if (!imagePreview) return;
    
    // Xóa xem trước cũ
    imagePreview.innerHTML = '';
    
    // Thêm xem trước mới
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'relative inline-block mr-2 mb-2';
            imgContainer.innerHTML = `
                <img src="${e.target.result}" class="w-20 h-20 object-cover rounded border">
                <button type="button" class="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center -mt-2 -mr-2 remove-image">
                    <i class="fas fa-times text-xs"></i>
                </button>
            `;
            
            // Thêm sự kiện xóa ảnh
            const removeBtn = imgContainer.querySelector('.remove-image');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    imgContainer.remove();
                });
            }
            
            imagePreview.appendChild(imgContainer);
        };
        
        reader.readAsDataURL(file);
    }
}

// Thêm hàm loadShopManagementData thiếu
async function loadShopManagementData() {
    try {
        console.group("===== LOADING SHOP MANAGEMENT DATA =====");
        console.log('Đang tải thông tin cửa hàng...');
        
        // Ưu tiên lấy dữ liệu từ sessionStorage trước
        let shopData = {};
        const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}');
        const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        
        console.log('Dữ liệu từ sellerData:', sellerData);
        console.log('Dữ liệu từ userData:', userData);
        
        // Kiểm tra các phần tử HTML cần cập nhật
        const shopName = document.getElementById('shopName');
        const shopLogo = document.getElementById('shopLogo');
        const shopStatus = document.getElementById('shopStatus');
        
        console.log('Phần tử shopName tồn tại:', !!shopName);
        console.log('Phần tử shopLogo tồn tại:', !!shopLogo);
        console.log('Phần tử shopStatus tồn tại:', !!shopStatus);
        
        // Kết hợp dữ liệu từ cả hai nguồn (ưu tiên sellerData)
        shopData = {
            ...userData,
            ...sellerData,
            shopName: sellerData.shopName || userData.shopName || 'Cửa hàng chưa cập nhật tên',
            isActive: sellerData.isActive !== undefined ? sellerData.isActive : true,
            description: sellerData.description || 'Chưa có mô tả',
            email: sellerData.email || userData.email || '',
            phone: sellerData.phone || userData.phone || '',
            address: sellerData.address || userData.address || '',
            totalRevenue: sellerData.totalRevenue || 0,
            totalOrders: sellerData.totalOrders || 0,
            avatar: sellerData.avatar || userData.avatar || '',
            logo: sellerData.logo || userData.avatar || ''
        };
        
        console.log('Đã kết hợp shopData:', shopData);
        
        // Kiểm tra trạng thái cửa hàng từ API
        try {
            console.log('Đang kiểm tra trạng thái cửa hàng từ API...');
            const statusResponse = await fetchAPI('/sellers/toggle-status');
            console.log('Phản hồi trạng thái cửa hàng:', statusResponse);
            
            if (statusResponse && statusResponse.success) {
                console.log('Trạng thái cửa hàng từ API:', statusResponse);
                shopData.isActive = statusResponse.isActive;
                
                // Cập nhật trong sessionStorage
                sellerData.isActive = statusResponse.isActive;
                sessionStorage.setItem('sellerData', JSON.stringify(sellerData));
            }
        } catch (statusError) {
            console.warn('Không thể lấy trạng thái cửa hàng:', statusError);
        }
        
        // Thử lấy thông tin từ API nếu có
        try {
            // Gọi API /sellers/current để lấy thông tin người bán hiện tại
            const token = getTokenFromSession();
            if (token) {
                const response = await fetchAPI('/sellers/current');
                if (response && Object.keys(response).length > 0) {
                    console.log('Dữ liệu shop từ API:', response);
                    // Cập nhật shopData với dữ liệu từ API
                    shopData = { ...shopData, ...response };
                    
                    // Lưu vào sessionStorage
                    sessionStorage.setItem('sellerData', JSON.stringify(shopData));
                }
            }
        } catch (apiError) {
            console.warn('Không thể tải thông tin shop từ API:', apiError);
            // Tiếp tục sử dụng dữ liệu từ localStorage/sessionStorage
        }
        
        // Cập nhật UI với dữ liệu
        updateShopUI(shopData);
        
        // Thiết lập các xử lý sự kiện cho form chỉnh sửa cửa hàng
        setupEditShopHandlers();
        
        console.groupEnd();
        
        return shopData;
    } catch (error) {
        console.error('Lỗi khi tải thông tin cửa hàng:', error);
        showToast('Không thể tải thông tin cửa hàng. Vui lòng thử lại sau.', 'error');
        
        // Trả về dữ liệu mặc định
        return {
            shopName: 'Cửa hàng chưa cập nhật tên',
            isActive: true,
            description: 'Chưa có mô tả',
            email: '',
            phone: '',
            address: ''
        };
    }
}

function showToast(message, type = 'info', duration = 2000) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, duration);
}

const mobileMenuButton = document.getElementById("mobileMenuButton");
if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
        // Lưu trạng thái active
        const activeNavItem = document.querySelector(".nav-item.bg-gray-200");
        const activeSectionId = activeNavItem ? activeNavItem.getAttribute("data-section") : "dashboard";
        
        // Toggle sidebar
        sidebar.classList.toggle("hidden");
        
        // Khôi phục trạng thái active sau khi toggle
        setTimeout(() => {
            const currentActiveItem = document.querySelector(`.nav-item[data-section="${activeSectionId}"]`);
            if (currentActiveItem) {
                currentActiveItem.classList.add("bg-gray-200");
            }
        }, 50);
    });
}

// Hàm để đảm bảo bố cục đúng sau khi tải trang
function fixLayoutAfterLoad() {
    
    
    // Lấy các phần tử chính
    const sidebar = document.getElementById("sidebar");
    const header = document.querySelector("header");
    const mainContent = document.getElementById("mainContent");
    const contentElements = document.querySelectorAll(".content");
    
    // Kiểm tra trạng thái thu gọn từ localStorage
    const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
    
    if (!sidebar || !header || !mainContent) {
        console.error("Không tìm thấy các phần tử chính của layout");
        return;
    }
    
    // Force re-apply styles to ensure correct layout
    if (sidebar) {
        // Đặt trạng thái thu gọn cho sidebar nếu được lưu trong localStorage
        if (sidebarCollapsed) {
            sidebar.classList.add("collapsed");
        } else {
            sidebar.classList.remove("collapsed");
        }
        
        // Đặt inline styles cho sidebar
        sidebar.style.position = "fixed";
        sidebar.style.height = "100vh";
        sidebar.style.zIndex = "50";
        sidebar.style.top = "0";
        sidebar.style.left = "0";
        sidebar.style.width = sidebarCollapsed ? "5rem" : "16rem";
        sidebar.style.transition = "all 0.3s ease-in-out";
        
    }
    
    if (header) {
        // Đảm bảo header có class collapsed đồng bộ với sidebar
        if (sidebarCollapsed) {
            header.classList.add("collapsed");
        } else {
            header.classList.remove("collapsed");
        }
        
        // Đảm bảo header nằm đúng vị trí bằng cách áp dụng trực tiếp style
        header.style.position = "fixed";
        header.style.top = "0";
        header.style.left = sidebarCollapsed ? "5rem" : "16rem";
        header.style.width = sidebarCollapsed ? "calc(100% - 5rem)" : "calc(100% - 16rem)";
        header.style.transition = "all 0.3s ease-in-out";
        header.style.zIndex = "40";
        header.style.backgroundColor = "white";
        header.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
        header.style.height = "4rem";
        
        
    }
    
    // Cập nhật tất cả các content elements
    if (mainContent) {
        if (sidebarCollapsed) {
            mainContent.classList.add("collapsed");
        } else {
            mainContent.classList.remove("collapsed");
        }
        
        // Đảm bảo main content có đúng margin và width
        mainContent.style.marginLeft = sidebarCollapsed ? "5rem" : "16rem";
        mainContent.style.width = sidebarCollapsed ? "calc(100% - 5rem)" : "calc(100% - 16rem)";
        mainContent.style.transition = "all 0.3s ease-in-out";
        mainContent.style.paddingTop = "4rem";
        
        
    }
    
    // Kiểm tra kích thước màn hình và áp dụng styles cho mobile nếu cần
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        if (sidebar) sidebar.style.transform = "translateX(-100%)";
        if (mainContent) {
            mainContent.style.marginLeft = "0";
            mainContent.style.width = "100%";
        }
        if (header) {
            header.style.left = "0";
            header.style.width = "100%";
        }
    }
    
    // Đảm bảo icon toggle sidebar phù hợp với trạng thái hiện tại
    const toggleSidebarBtn = document.getElementById("toggleSidebar");
    if (toggleSidebarBtn) {
        const icon = toggleSidebarBtn.querySelector("i");
        const textElement = toggleSidebarBtn.querySelector(".sidebar-text");
        
        if (icon) {
            // Nếu sidebar đang thu gọn, icon nên là fa-chevron-right, nếu không thì fa-chevron-left
            if (sidebarCollapsed) {
                if (icon.classList.contains("fa-chevron-left")) {
                    icon.classList.replace("fa-chevron-left", "fa-chevron-right");
                }
            } else {
                if (icon.classList.contains("fa-chevron-right")) {
                    icon.classList.replace("fa-chevron-right", "fa-chevron-left");
                }
            }
        }
        
        if (textElement) {
            textElement.textContent = sidebarCollapsed ? "Mở rộng" : "Thu gọn";
        }
    }
    
    // Đảm bảo các sections được đặt đúng
    document.querySelectorAll('.section').forEach(section => {
        if (section.classList.contains('active')) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
    
    
    // Cung cấp một cách để người dùng gọi lại hàm này nếu cần
    window.fixLayout = fixLayoutAfterLoad;
}

// Đảm bảo rằng bố cục được sửa sau khi tất cả các element đã được tải
window.addEventListener('load', function() {
    setTimeout(fixLayoutAfterLoad, 100);
});

// Đảm bảo bố cục được cập nhật khi kích thước cửa sổ thay đổi
window.addEventListener('resize', function() {
    setTimeout(fixLayoutAfterLoad, 100);
});

// Thiết lập các xử lý sự kiện cho danh mục cửa hàng
function setupCategoryHandlers() {
    console.log('Thiết lập các xử lý sự kiện cho danh mục cửa hàng');
    
    // Xử lý nút thêm danh mục mới
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        console.log('Đã tìm thấy nút thêm danh mục');
        addCategoryBtn.addEventListener('click', openAddCategoryModal);
    } else {
        console.warn('Không tìm thấy nút thêm danh mục (add-category-btn)');
    }
    
    // Xử lý form submit
    const categoryForm = document.getElementById('category-form');
    if (categoryForm) {
        console.log('Đã tìm thấy form danh mục');
        categoryForm.addEventListener('submit', handleShopCategoryFormSubmit);
    } else {
        console.warn('Không tìm thấy form danh mục (category-form)');
    }
    
    // Xử lý đóng modal
    const closeCategoryModalBtn = document.getElementById('close-category-modal-btn');
    const cancelCategoryBtn = document.getElementById('cancel-category-form-btn');
    
    if (closeCategoryModalBtn) {
        console.log('Đã tìm thấy nút đóng modal danh mục');
        closeCategoryModalBtn.addEventListener('click', () => {
            const categoryModal = document.getElementById('category-modal');
            if (categoryModal) {
                categoryModal.classList.add('hidden');
            }
        });
    } else {
        console.warn('Không tìm thấy nút đóng modal danh mục (close-category-modal-btn)');
    }
    
    if (cancelCategoryBtn) {
        console.log('Đã tìm thấy nút hủy form danh mục');
        cancelCategoryBtn.addEventListener('click', () => {
            const categoryModal = document.getElementById('category-modal');
            if (categoryModal) {
                categoryModal.classList.add('hidden');
            }
        });
    } else {
        console.warn('Không tìm thấy nút hủy form danh mục (cancel-category-form-btn)');
    }
}

// Mở modal thêm danh mục mới
function openAddCategoryModal() {
    console.log('Đang mở modal thêm danh mục mới');
    
    // Lấy các phần tử DOM
    const modal = document.getElementById('category-modal');
    const form = document.getElementById('category-form');
    const titleElement = document.getElementById('modal-title');
    const nameInput = document.getElementById('category-name');
    const descriptionInput = document.getElementById('category-description');
    const isActiveCheckbox = document.getElementById('category-is-active');
    
    // Kiểm tra xem các phần tử DOM có tồn tại không
    if (!modal || !form) {
        console.error('Không tìm thấy modal hoặc form danh mục');
        showToast('Không thể mở form thêm danh mục', 'error');
        return;
    }
    
    // Cập nhật tiêu đề modal
    if (titleElement) titleElement.textContent = 'Thêm Danh Mục Mới';
    
    // Reset form
    form.reset();
    if (nameInput) nameInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (isActiveCheckbox) isActiveCheckbox.checked = true;
    
    // Đặt chế độ thêm mới
    form.dataset.mode = 'create';
    delete form.dataset.categoryId;
    
    // Hiển thị modal
    modal.classList.remove('hidden');
    console.log('Đã mở modal thêm danh mục mới');
}
/**
 * Hiển thị điều khiển phân trang cho danh mục cửa hàng
 * 
 * Hàm này sử dụng lại renderPaginationUI với các thiết lập phù hợp cho danh mục
 * - Nút điều hướng trước/sau
 * - Các nút số trang với trạng thái hoạt động được đánh dấu
 * - Hiển thị tổng số danh mục nếu có
 * 
 * @returns {void}
 */
function renderCategoryPagination() {
    // Kiểm tra xem hàm helper đã được load chưa
    if (typeof renderCategoryPaginationUI === 'function') {
        // Sử dụng helper function
        renderCategoryPaginationUI();
    } else {
        // Fallback implementation nếu không có helper
        renderPagination('category-pagination', categoryPagination, 'changeCategoryPage', 'danh mục');
    }
    
    // Đảm bảo hàm đổi trang được đăng ký vào window
    window.changeCategoryPage = changeCategoryPage;
}

// Thêm hàm đổi trang cho danh mục
function changeCategoryPage(page) {
    console.log(`Chuyển đến trang danh mục ${page}`);
    if (page < 1 || (categoryPagination.totalPages && page > categoryPagination.totalPages)) return;
    
    // Cuộn lên đầu phần danh mục
    const categoriesSection = document.getElementById('categories-section');
    if (categoriesSection) {
        categoriesSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    loadShopCategories(page);
}

/**
 * Tải danh mục cửa hàng theo trang và hiển thị danh sách cùng với phân trang
 * 
 * Hàm này thực hiện các nhiệm vụ:
 * 1. Gọi API để lấy danh mục cửa hàng của người bán hiện tại và trang cụ thể
 * 2. Xử lý phản hồi từ API và cập nhật dữ liệu danh mục toàn cục (sellerCategories)
 * 3. Cập nhật thông tin phân trang từ phản hồi API hoặc ước tính từ số lượng danh mục
 * 4. Hiển thị danh mục và phân trang trên giao diện
 * 5. Thiết lập xử lý sự kiện cho các phần tử danh mục
 * 
 * @param {number} page - Số trang cần tải (bắt đầu từ 1)
 * @returns {Promise<void>}
 */
async function loadShopCategories(page = 1) {
    try {
        console.group("=== LOAD SHOP CATEGORIES ===");
        console.log('Đang tải danh mục của shop...');
        
        // Cập nhật trang hiện tại trong đối tượng phân trang
        categoryPagination.currentPage = page;
        
        // Tạo params cho API call
        const params = new URLSearchParams();
        params.append('pageNumber', page.toString());
        params.append('pageSize', categoryPagination.pageSize.toString());

        // Loại bỏ dấu / ở đầu và thêm tham số phân trang
        const categories = await fetchAPI(`sellerCategories?pageNumber=${page}&pageSize=${categoryPagination.pageSize}`);
        
        if (categories) {
            if (Array.isArray(categories)) {
                // Lưu trữ dữ liệu danh mục trước khi xử lý phân trang
                sellerCategories = categories;
                
                // Ước tính thông tin phân trang nếu API không trả về
                categoryPagination.totalItems = categories.length;
                categoryPagination.totalPages = Math.ceil(categories.length / categoryPagination.pageSize);
            } else if (categories.data && Array.isArray(categories.data)) {
                // Lưu trữ dữ liệu danh mục từ cấu trúc API có .data
                sellerCategories = categories.data;
                
                // Lấy thông tin phân trang từ API
                if (categories.pagination) {
                    categoryPagination = {
                        ...categoryPagination,
                        ...categories.pagination
                    };
                }
            }
        } else {
            // Tạo dữ liệu mẫu nếu không có dữ liệu từ API
            sellerCategories = createDummyCategories();
            categoryPagination.totalItems = sellerCategories.length;
            categoryPagination.totalPages = 1;
        }
        
        // Render dữ liệu danh mục trên giao diện
        renderShopCategories();
        renderCategoryList();
        
        // Render phân trang sau khi đã có dữ liệu và thông tin phân trang
        renderCategoryPagination();
        
        // Thiết lập các xử lý sự kiện cho danh mục
        setupCategoryHandlers();
        
        // Đảm bảo hàm đổi trang được đăng ký vào window
        window.changeCategoryPage = changeCategoryPage;
        
        console.groupEnd();
    } catch (error) {
        console.error('Lỗi khi tải danh mục:', error);
        showToast(`Không thể tải danh mục: ${error.message}`, "error");
        
        // Tạo dữ liệu mẫu nếu có lỗi
        sellerCategories = createDummyCategories();
        
        // Render với dữ liệu mẫu
        renderShopCategories();
        renderCategoryList();
        renderCategoryPagination();
        
        // Thiết lập các xử lý sự kiện cho danh mục
        setupCategoryHandlers();
        
        // Đảm bảo hàm đổi trang được đăng ký vào window
        window.changeCategoryPage = changeCategoryPage;
        
        console.groupEnd();
    }
}


// Add the changeProductStatus function
window.changeProductStatus = async function (productId, newIsActiveDesired) {
    const token = getTokenFromSession();
    if (!token) { 
        showToast('Vui lòng đăng nhập.', 'error'); 
        return; 
    }
    
    // Lấy sellerId từ token để kiểm tra quyền
    const tokenInfo = parseJwtToken(token);
    const currentSellerId = tokenInfo.SellerId || tokenInfo.sellerId;
    
    // Kiểm tra sản phẩm có thuộc về seller hiện tại không
    try {
        // Trước khi thay đổi trạng thái, kiểm tra thông tin sản phẩm
        const product = await fetchAPI(`Products/${productId}?includeInactive=true`);
        
        if (!product) {
            showToast('Không tìm thấy thông tin sản phẩm', 'error');
            return;
        }
        
        // Kiểm tra sản phẩm có thuộc về seller hiện tại không
        const productSellerId = product.sellerId || product.sellerID;
        if (productSellerId && productSellerId.toString() !== currentSellerId?.toString()) {
            console.warn(`Sản phẩm ID ${productId} thuộc về seller ${productSellerId}, không phải seller hiện tại ${currentSellerId}`);
            showToast('Bạn không có quyền thay đổi trạng thái của sản phẩm này', 'error');
            return;
        }
        
        const apiStatusParam = newIsActiveDesired ? 'active' : 'notActive';
        const actionDescription = newIsActiveDesired ? 'BÁN LẠI' : 'NGỪNG BÁN';
        if (!confirm(`Bạn có chắc chắn muốn ${actionDescription} sản phẩm không?`)) return;

        // Thực hiện gọi API để thay đổi trạng thái
        try {
            await fetchAPI(`Products/${productId}?status=${apiStatusParam}`, { 
                method: 'DELETE'
            });
            
            showToast(`Đã ${actionDescription.toLowerCase()} sản phẩm thành công.`, 'success');
            // Reload the products list
            await loadProducts(1);
        } catch (error) {
            // Xử lý lỗi Forbidden (403) đặc biệt
            if (error.message && error.message.includes('403')) {
                showToast('Bạn không có quyền thay đổi trạng thái của sản phẩm này', 'error');
                console.error('Lỗi quyền truy cập:', error.message);
            } else {
                console.error(`Lỗi khi ${actionDescription.toLowerCase()} sản phẩm:`, error);
                showToast(`${actionDescription} sản phẩm thất bại. Lỗi: ${error.message}`, 'error');
            }
        }
    } catch (error) {
        console.error(`Lỗi khi kiểm tra thông tin sản phẩm:`, error);
        showToast(`Không thể kiểm tra thông tin sản phẩm: ${error.message}`, 'error');
    }
}

// Hàm để kiểm tra và chuyển đổi trạng thái cửa hàng (active/maintenance)
async function toggleShopStatus() {
    try {
        showToast('Đang chuyển đổi trạng thái cửa hàng...', 'info');
        console.log('Đang gọi API toggle-maintenance...');
        
        // Vô hiệu hóa nút trong quá trình gọi API
        const toggleButton = document.getElementById('toggleShopStatus');
        if (toggleButton) {
            toggleButton.disabled = true;
            toggleButton.classList.add('opacity-50');
            toggleButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang xử lý...';
        }
        
        // Lấy token trước khi gọi API
        const token = getTokenFromSession();
        if (!token) {
            showToast('Bạn cần đăng nhập lại để thực hiện chức năng này', 'error');
            return;
        }
        
        // Lấy trạng thái hiện tại từ sessionStorage
        const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}');
        const currentStatus = sellerData.isActive !== undefined ? sellerData.isActive : true;
        
        // Gọi API với đầy đủ đường dẫn
        const response = await fetchAPI('/sellers/toggle-status', {
            method: 'PUT'
        });
        
        console.log('Phản hồi từ API toggle-maintenance:', response);
        
        if (response && response.success) {
            // Cập nhật thông tin trong sessionStorage
            sellerData.isActive = response.isActive;
            sessionStorage.setItem('sellerData', JSON.stringify(sellerData));
            
            // Cập nhật userData nếu cần
            const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            if (userData && userData.role === 'seller') {
                userData.isActive = response.isActive;
                sessionStorage.setItem('userData', JSON.stringify(userData));
            }
            
            // Cập nhật UI
            console.log('Cập nhật UI với trạng thái mới:', response.isActive ? 'Hoạt động' : 'Bảo trì');
            updateShopUI(sellerData);
            
            // Hiển thị thông báo
            showToast(response.message || `Đã chuyển đổi sang chế độ ${response.isActive ? 'hoạt động' : 'bảo trì'}`, 'success');
            
            // Cập nhật token nếu có trả về
            if (response.token) {
                console.log('Đã nhận token mới từ server, đang cập nhật...');
                sessionStorage.setItem('authToken', response.token);
                console.log('Đã cập nhật token với trạng thái cửa hàng mới');
            }
        } else {
            showToast(response?.message || 'Không thể chuyển đổi trạng thái cửa hàng', 'error');
            
            // Khôi phục nút
            if (toggleButton) {
                toggleButton.disabled = false;
                toggleButton.classList.remove('opacity-50');
                const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}');
                const isActive = sellerData.isActive !== undefined ? sellerData.isActive : true;
                toggleButton.textContent = isActive ? 'Chuyển sang bảo trì' : 'Kích hoạt cửa hàng';
            }
        }
    } catch (error) {
        console.error('Lỗi khi chuyển đổi trạng thái cửa hàng:', error);
        showToast(`Lỗi khi chuyển đổi trạng thái cửa hàng: ${error.message}`, 'error');
        
        // Khôi phục nút trong trường hợp lỗi
        const toggleButton = document.getElementById('toggleShopStatus');
        if (toggleButton) {
            toggleButton.disabled = false;
            toggleButton.classList.remove('opacity-50');
            const sellerData = JSON.parse(sessionStorage.getItem('sellerData') || '{}');
            const isActive = sellerData.isActive !== undefined ? sellerData.isActive : true;
            toggleButton.textContent = isActive ? 'Chuyển sang bảo trì' : 'Kích hoạt cửa hàng';
        }
    }
}

// Hàm xử lý submit form - Phiên bản cải tiến
async function handleShopFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const token = getTokenFromSession();
    
    if (!token) {
        showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 'error');
        return;
    }
    
    // Vô hiệu hóa nút submit
    const submitButton = document.getElementById('save-shop-btn');
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang lưu...';
    }
    
    try {
        // ✅ THU THẬP DỮ LIỆU THEO ĐÚNG SellerDto FORMAT
        const statusValue = formData.get('status');
        const isActive = statusValue === 'Active'; // ✅ boolean conversion

        // ✅ GỬI THEO ĐÚNG CẤU TRÚC SellerDto (không thêm fields khác)
        const sellerData = {
            sellerID: 0, // Backend sẽ lấy từ token
            shopName: formData.get('shopName')?.trim(),
            isActive: isActive, // ✅ bool, không phải object
            userID: 0, // Backend sẽ lấy từ token  
            userFullName: formData.get('userFullName')?.trim(),
            userEmail: formData.get('userEmail')?.trim()
        };

        console.log('📤 Sending SellerDto data:', sellerData);

        // ✅ GỌI API CẬP NHẬT VỚI ENDPOINT ĐÚNG
        const response = await fetchAPI('/sellers/update-shop', {
            method: 'PUT',
            body: JSON.stringify(sellerData)
        });

        if (response && response.success) {
            console.log('✅ Shop update success:', response);

            // ✅ CẬP NHẬT UI
            if (response.seller) {
                updateShopUI(response.seller);
            }

            // ✅ CẬP NHẬT GLOBAL DATA
            globalShopData = {
                ...globalShopData,
                ...response.seller,
                loaded: true
            };

            // ✅ ĐÓNG MODAL
            const modal = document.getElementById('edit-shop-modal');
            if (modal) {
                modal.classList.add('hidden');
            }

            showToast(response.message || 'Cập nhật thông tin cửa hàng thành công', 'success');

            // ✅ TẢI LẠI DỮ LIỆU
            setTimeout(() => {
                loadShopManagementData();
            }, 1000);
        }

    } catch (error) {
        console.error('❌ Shop update error:', error);
        showToast(error.message || 'Có lỗi xảy ra khi cập nhật thông tin cửa hàng', 'error');
    } finally {
        // Khôi phục nút submit
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Lưu thay đổi';
        }
    }
}

// Cải tiến hàm upload ảnh
async function uploadImage(file) {
    if (!file || file.size === 0) return null;
    
    // Check file size limit (2MB = 2 * 1024 * 1024 bytes)
    if (file.size > 2 * 1024 * 1024) {
        showToast('Kích thước file không được vượt quá 2MB', 'error');
        throw new Error('File quá lớn');
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Chỉ chấp nhận file PNG, JPG hoặc GIF', 'error');
        throw new Error('Định dạng file không được hỗ trợ');
    }
    
    const CLOUDINARY_CLOUD_NAME = "dgewgggyd";
    const CLOUDINARY_UPLOAD_PRESET = "ShopX_Images";
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
        showToast('Đang tải lên hình ảnh...', 'info');
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('Lỗi từ Cloudinary:', errorData || response.statusText);
            throw new Error('Không thể upload ảnh');
        }
        
        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error('Lỗi upload ảnh:', error);
        throw error;
    }
}

// Hàm lấy sản phẩm theo ID của seller
async function loadProductsBySellerId(sellerId, displayElementId = 'product-table-body', pageNumber = 1, pageSize = 20) {
    try {
        console.group("=== LOAD PRODUCTS BY SELLER ID ===");
        console.log(`Đang tải sản phẩm của seller ID: ${sellerId}...`);
        
        // Hiển thị trạng thái loading
        const displayElement = document.getElementById(displayElementId);
        if (displayElement) {
            if (displayElement.tagName === 'TBODY') {
                displayElement.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải sản phẩm...</td></tr>`;
        } else {
                displayElement.innerHTML = `<div class="w-full text-center py-4"><i class="fas fa-spinner fa-spin mr-2"></i>Đang tải sản phẩm...</div>`;
            }
        }
        
        // Gọi API chính xác từ ProductsController
        // Endpoint: GET /api/Products/shop/{sellerId}
        console.log(`Gọi API Products/shop/${sellerId} để lấy sản phẩm theo seller ID cụ thể`);
        const response = await fetchAPI(`Products/shop/${sellerId}?pageNumber=${pageNumber}&pageSizeInput=${pageSize}&includeInactive=true`);
        
        if (response) {
            console.log('Nhận được phản hồi API:', response);
            
            // Kiểm tra trạng thái shop
            if (response.shop && response.shop.status === "maintenance") {
                console.warn('Shop đang trong trạng thái bảo trì:', response.shop);
                showToast(`Shop "${response.shop.shopName}" đang trong trạng thái bảo trì`, "warning");
                
                // Hiển thị thông báo trong displayElement
                if (displayElement) {
                    if (displayElement.tagName === 'TBODY') {
                        displayElement.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Shop đang trong trạng thái bảo trì</td></tr>`;
                    } else {
                        displayElement.innerHTML = `<div class="w-full text-center py-4 text-gray-500">Shop đang trong trạng thái bảo trì</div>`;
                    }
                }
                console.groupEnd();
                return [];
            }
            
            // Xử lý dữ liệu sản phẩm
            let products = [];
            
            if (response.products && Array.isArray(response.products)) {
                // Nếu products là mảng trực tiếp
                products = response.products;
                console.log('Sử dụng dữ liệu từ response.products (array):', products.length, 'sản phẩm');
            } else if (response.products && response.products.products && Array.isArray(response.products.products)) {
                // Nếu products là object có chứa mảng products (cấu trúc lồng)
                products = response.products.products;
                console.log('Sử dụng dữ liệu từ response.products.products:', products.length, 'sản phẩm');
            } else if (response.products && response.products.items && Array.isArray(response.products.items)) {
                // Nếu products là object có chứa mảng items (cấu trúc phân trang)
                products = response.products.items;
                console.log('Sử dụng dữ liệu từ response.products.items:', products.length, 'sản phẩm');
            } else if (response.products && response.products.data && Array.isArray(response.products.data)) {
                // Nếu products là object có chứa mảng data
                products = response.products.data;
                console.log('Sử dụng dữ liệu từ response.products.data:', products.length, 'sản phẩm');
            } else if (Array.isArray(response)) {
                // Nếu response là mảng trực tiếp
                products = response;
                console.log('Sử dụng response trực tiếp (array):', products.length, 'sản phẩm');
            } else if (response.items && Array.isArray(response.items)) {
                products = response.items;
                console.log('Sử dụng dữ liệu từ response.items:', products.length, 'sản phẩm');
            } else if (response.data && Array.isArray(response.data)) {
                products = response.data;
                console.log('Sử dụng dữ liệu từ response.data:', products.length, 'sản phẩm');
            } else if (response.products) {
                // Nếu products là object nhưng không có cấu trúc được xác định trước đó, 
                // thử lấy phần tử đầu tiên nếu nó là mảng
                const firstKey = Object.keys(response.products)[0];
                if (firstKey && Array.isArray(response.products[firstKey])) {
                    products = response.products[firstKey];
                    console.log(`Sử dụng dữ liệu từ response.products.${firstKey}:`, products.length, 'sản phẩm');
                } else {
                    console.error('Không thể xác định cấu trúc phản hồi API để lấy sản phẩm:', response);
                    products = [];
                }
            } else {
                console.error('Không thể xác định cấu trúc phản hồi API để lấy sản phẩm:', response);
                products = [];
            }
            
            console.log(`Đã tìm thấy ${products.length} sản phẩm của seller ID: ${sellerId}`);
            
            // Hiển thị sản phẩm trong element được chỉ định
            if (displayElement && products.length > 0) {
                // Kiểm tra xem có sử dụng renderProducts không hay cần render trực tiếp
                const isTable = displayElement.tagName === 'TBODY';
                
                if (isTable) {
                    // Nếu display element là tbody, render dạng bảng
                    displayElement.innerHTML = '';
                    products.forEach(product => {
                        const row = createProductRow(product);
                        displayElement.appendChild(row);
                    });
                } else {
                    // Nếu display element là div, render dạng grid
                    displayElement.innerHTML = '';
                    products.forEach(product => {
                        const card = createProductCard(product);
                        displayElement.appendChild(card);
                    });
                }
            } else if (displayElement && products.length === 0) {
                // Hiển thị thông báo không có sản phẩm
                if (displayElement.tagName === 'TBODY') {
                    displayElement.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Không có sản phẩm nào</td></tr>`;
                } else {
                    displayElement.innerHTML = `<div class="w-full text-center py-4 text-gray-500">Không có sản phẩm nào</div>`;
                }
            }
            
            console.groupEnd();
            return products;
        } else {
            console.warn('API không trả về dữ liệu');
            showToast(`Không thể tải dữ liệu sản phẩm của seller ID: ${sellerId}`, "error");
            
            // Hiển thị thông báo lỗi trong displayElement
            if (displayElement) {
                if (displayElement.tagName === 'TBODY') {
                    displayElement.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Không thể tải dữ liệu sản phẩm</td></tr>`;
                } else {
                    displayElement.innerHTML = `<div class="w-full text-center py-4 text-gray-500">Không thể tải dữ liệu sản phẩm</div>`;
                }
            }
            
            console.groupEnd();
            return [];
        }
    } catch (error) {
        console.error('Lỗi khi tải sản phẩm theo seller ID:', error);
        showToast(`Không thể tải sản phẩm: ${error.message}`, "error");
        
        // Hiển thị thông báo lỗi trong displayElement
        const displayElement = document.getElementById(displayElementId);
        if (displayElement) {
            if (displayElement.tagName === 'TBODY') {
                displayElement.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-gray-500">Đã xảy ra lỗi khi tải dữ liệu</td></tr>`;
            } else {
                displayElement.innerHTML = `<div class="w-full text-center py-4 text-gray-500">Đã xảy ra lỗi khi tải dữ liệu</div>`;
            }
        }
        
        console.groupEnd();
        return [];
    }
}

// Hàm tạo hàng sản phẩm cho hiển thị dạng bảng
function createProductRow(product) {
    const row = document.createElement('tr');
    
    // Format tiền tệ
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Xử lý URL ảnh
    const getImageUrl = (imageURL) => {
        return imageURL || '/images/default-product.jpg';
    };

    // Xử lý trạng thái sản phẩm
    const getStatusClass = (isActive) => {
        return isActive ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100';
    };

    const getStatusText = (isActive) => {
        return isActive ? 'Đang bán' : 'Ngừng bán';
    };

    row.innerHTML = `
        <td class="px-4 py-3">
            <div class="flex items-center text-sm">
                <div class="relative hidden w-8 h-8 mr-3 rounded-full md:block">
                    <img class="object-cover w-full h-full rounded" src="${getImageUrl(product.imageURL)}" alt="${product.name}" loading="lazy" />
                </div>
                <div>
                    <p class="font-semibold">${product.name}</p>
                </div>
            </div>
        </td>
        <td class="px-4 py-3 text-sm">${formatCurrency(product.price)}</td>
        <td class="px-4 py-3 text-sm">${product.quantity}</td>
        <td class="px-4 py-3 text-sm">${product.categoryName || 'Chưa phân loại'}</td>
        <td class="px-4 py-3 text-sm">
            <span class="px-2 py-1 font-semibold leading-tight ${getStatusClass(product.isActive)} rounded-full">
                ${getStatusText(product.isActive)}
            </span>
        </td>
        <td class="px-4 py-3 text-sm">${new Date(product.createdAt).toLocaleDateString('vi-VN')}</td>
        <td class="px-4 py-3">
            <div class="flex items-center space-x-4 text-sm">
                <button class="flex items-center justify-between px-2 py-2 text-sm font-medium leading-5 text-purple-600 rounded-lg focus:outline-none focus:shadow-outline-gray" 
                        aria-label="Edit" 
                        onclick="openEditProductModal(${product.productID})">
                    <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path>
                    </svg>
                </button>
                <button class="flex items-center justify-between px-2 py-2 text-sm font-medium leading-5 ${product.isActive ? 'text-red-600' : 'text-green-600'} rounded-lg focus:outline-none focus:shadow-outline-gray"
                        aria-label="${product.isActive ? 'Disable' : 'Enable'}"
                        onclick="changeProductStatus(${product.productID}, ${product.isActive})">
                    <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
                        ${product.isActive ? 
                            '<path d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"></path>' :
                            '<path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"></path>'}
                    </svg>
                </button>
            </div>
        </td>
    `;

    return row;
}   

// Hàm tạo card sản phẩm cho hiển thị dạng grid
function createProductCard(product) {
    // Chuẩn hóa dữ liệu product
    const productData = {
        productID: product.productID || product.id || 0,
        name: product.productName || product.name || "Sản phẩm không tên",
        price: product.price || 0,
        isActive: product.isActive === undefined ? true : product.isActive,
        thumbnail: product.thumbnail || product.image || product.productImage || product.imageURL || "https://via.placeholder.com/150?text=" + (product.productName || product.name || "Product")
    };
    
    // Hàm định dạng tiền tệ
    const formatCurrency = (amount) => {
        if (typeof amount !== 'number') return 'N/A';
        return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
            .replace(/\s₫$/, 'đ');
    };
    
    // Lấy URL hình ảnh
    const getImageUrl = (imageURL) => {
        if (!imageURL || imageURL === "/images/string") return '../assets/images/placeholder.png';
        const isFullUrl = /^(https?:)?\/\//i.test(imageURL);
        if (isFullUrl) return imageURL;
        return imageURL;
    };
    
    const imageUrl = getImageUrl(productData.thumbnail);
    
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow overflow-hidden';
    card.innerHTML = `
        <div class="h-40 bg-gray-200 relative">
            <img src="${imageUrl}" alt="${productData.name}" class="w-full h-full object-cover">
            ${!productData.isActive ? '<div class="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 text-xs">Không hoạt động</div>' : ''}
        </div>
        <div class="p-4">
            <h3 class="font-semibold product-name-ellipsis">${productData.name}</h3>
            <p class="text-gray-600">${formatCurrency(productData.price)}</p>
        </div>
    `;
    
    return card;
}
// Nếu bạn đang sử dụng Select2 (kiểm tra jQuery trước)
function initializeSelects() {
    // Kiểm tra xem jQuery có được tải không
    if (typeof window.jQuery === 'undefined' || typeof $ === 'undefined') {
        console.warn('jQuery không được tải. Không thể khởi tạo Select2.');
        return;
    }
    
    // Kiểm tra xem Select2 có tồn tại không
    if (typeof $.fn.select2 === 'undefined') {
        console.warn('Select2 plugin không được tải.');
        return;
    }
    
    try {
        $('#product-category').select2({
            dropdownParent: $('#product-modal'),
            width: '100%'
        });
        
        $('#product-seller-category').select2({
            dropdownParent: $('#product-modal'),
            width: '100%'
        });
        console.log('Select2 dropdowns đã được khởi tạo thành công');
    } catch (error) {
        console.error('Lỗi khi khởi tạo Select2:', error);
    }
}

// Mở modal chỉnh sửa sản phẩm (đã sửa lỗi khi không có jQuery)
async function openEditProductModal(productId) {
    try {
        console.log(`Mở modal chỉnh sửa sản phẩm ID: ${productId}`);
        
        // Lấy thông tin sản phẩm từ API
        const product = await fetchAPI(`Products/${productId}?includeInactive=true`);
        
        if (!product) {
            showToast('Không thể tải thông tin sản phẩm', 'error');
            return;
        }
        
        console.log('Thông tin sản phẩm:', product);
        
        // Lấy modal và form
        const productModal = document.getElementById('product-modal');
        const productForm = document.getElementById('product-form');
        
        if (!productModal || !productForm) {
            showToast('Không tìm thấy form chỉnh sửa sản phẩm', 'error');
            return;
        }
        
        // Cập nhật tiêu đề modal
        const modalTitle = document.getElementById('product-modal-title');
        if (modalTitle) modalTitle.textContent = 'Chỉnh Sửa Sản Phẩm';
        
        // Đặt chế độ chỉnh sửa và lưu ID sản phẩm
        productForm.dataset.mode = 'edit';
        productForm.dataset.productId = productId;
        
        // Lấy danh mục sản phẩm
        await loadCategoriesToForm();
        
        // Chuẩn hóa dữ liệu trước khi điền vào form
        const productData = {
            name: product.productName || product.name || '',
            price: product.price || 0,
            stockQuantity: product.stockQuantity || product.quantity || 0,
            description: product.description || '',
            isActive: product.isActive === undefined ? true : product.isActive,
            categoryID: product.categoryID || product.categoryId || '',
            sellerCategoryID: product.sellerCategoryID || product.sellerCategoryId || '',
            images: product.images || [],
            thumbnail: product.thumbnail || product.image || product.productImage || product.imageURL || ''
        };
        
        // Điền thông tin sản phẩm vào form
        document.getElementById('product-name').value = productData.name;
        document.getElementById('product-price').value = productData.price;
        document.getElementById('product-quantity').value = productData.stockQuantity;
        document.getElementById('product-description').value = productData.description;
        document.getElementById('product-is-active').checked = productData.isActive;
        
        // Chọn danh mục chung
        const categorySelect = document.getElementById('product-category');
        if (categorySelect && productData.categoryID) {
            [...categorySelect.options].some(option => {
                if (option.value == productData.categoryID) {
                    option.selected = true;
                    return true;
                }
                return false;
            });
        }
        
        // Chọn danh mục shop
        const sellerCategorySelect = document.getElementById('product-seller-category');
        if (sellerCategorySelect && productData.sellerCategoryID) {
            [...sellerCategorySelect.options].some(option => {
                if (option.value == productData.sellerCategoryID) {
                    option.selected = true;
                    return true;
                }
                return false;
            });
        }
        
        // Hiển thị hình ảnh hiện tại
        const imagePreview = document.getElementById('image-preview');
        if (imagePreview && productData.thumbnail) {
            imagePreview.innerHTML = `
                <div class="relative">
                    <img src="${productData.thumbnail}" alt="${productData.name}" class="w-full h-32 object-cover rounded">
                    <button type="button" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1" onclick="removeImagePreview()">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            `;
        }
        
        // Thêm class để giới hạn chiều cao modal và thêm thanh cuộn
        productModal.classList.add('max-h-screen');
        
        // Hiển thị modal
        productModal.classList.remove('hidden');
        
        // Điều chỉnh kích thước modal dựa vào kích thước màn hình
        adjustModalSize();
        
    } catch (error) {
        console.error('Lỗi khi mở modal chỉnh sửa sản phẩm:', error);
        showToast(`Không thể mở modal chỉnh sửa: ${error.message}`, 'error');
    }
}
//load sp bán chạy


// Thêm hàm điều chỉnh kích thước modal
function adjustModalSize() {
    const productModal = document.getElementById('product-modal');
    const modalContent = productModal.querySelector('.modal-content');
    
    if (!modalContent) return;
    
    // Lấy kích thước màn hình
    const windowHeight = window.innerHeight;
    
    // Điều chỉnh kích thước modal tối đa là 90% chiều cao màn hình
    const maxHeight = windowHeight * 0.9;
    modalContent.style.maxHeight = `${maxHeight}px`;
    
    // Thêm thanh cuộn nếu nội dung vượt quá
    modalContent.style.overflowY = 'auto';
    
    // Căn giữa modal theo chiều dọc
    const modalHeight = modalContent.offsetHeight;
    if (modalHeight < windowHeight) {
        modalContent.style.marginTop = `${(windowHeight - modalHeight) / 2}px`;
    } else {
        modalContent.style.marginTop = '5vh';
    }
}
function adjustOrdersTableResponsive() {
    const screenWidth = window.innerWidth;
    const table = document.querySelector('#orders-section table');
    
    if (!table) return;
    
    const headers = table.querySelectorAll('thead th');
    const rows = table.querySelectorAll('tbody tr');
    
    // Reset trước
    showAllTableColumns(headers, rows);
    
    // Điều chỉnh theo kích thước màn hình
    if (screenWidth < 640) {
        // Ẩn cột ngày và tổng tiền (giữ tổng thanh toán)
        hideTableColumn(headers, rows, 2); // Ẩn cột ngày
        hideTableColumn(headers, rows, 4); // Ẩn cột tổng tiền (vẫn giữ tổng thanh toán)
    } else if (screenWidth < 768) {
        // Ẩn cột tổng tiền
        hideTableColumn(headers, rows, 4);
    }
}
/**
 * Lấy giá trị từ object theo tên trường, không phân biệt chữ hoa/thường
 * @param {Object} obj - Đối tượng cần truy xuất
 * @param {string} fieldName - Tên trường cần lấy
 * @param {*} defaultValue - Giá trị mặc định nếu không tìm thấy
 * @returns {*} - Giá trị tìm được hoặc giá trị mặc định
 */
function getFieldValueCaseInsensitive(obj, fieldName, defaultValue = null) {
    if (!obj || typeof obj !== 'object') return defaultValue;
    
    // Tìm kiếm trường field thường
    if (obj[fieldName] !== undefined) return obj[fieldName];
    
    // Tìm kiếm không phân biệt hoa thường
    const fieldLower = fieldName.toLowerCase();
    for (const key in obj) {
        if (key.toLowerCase() === fieldLower) {
            return obj[key];
        }
    }
    
    return defaultValue;
}

// Sử dụng:
const orderId = getFieldValueCaseInsensitive(order, 'orderId', 'N/A');
const totalPayment = parseFloat(getFieldValueCaseInsensitive(order, 'totalPayment', 0));
// Thêm sự kiện resize để điều chỉnh kích thước modal khi thay đổi kích thước cửa sổ
window.addEventListener('resize', function() {
    // Chỉ điều chỉnh kích thước nếu modal đang hiển thị
    const productModal = document.getElementById('product-modal');
    if (productModal && !productModal.classList.contains('hidden')) {
        adjustModalSize();
    }
});
window.changeCategoryPage = changeCategoryPage;
// Export hàm để sử dụng từ bên ngoài
window.loadProductsBySellerId = loadProductsBySellerId;