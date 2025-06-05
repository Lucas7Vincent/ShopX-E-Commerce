/* URL API */
const API_BASE_URL = 'https://localhost:7088/api'
const forbiddenPageUrl = "/Admin/templates/errors/403.html"; // Đường dẫn đến trang 403.html của bạn
const notFoundPageUrl = "/Admin/templates/errors/404.html"; // (Tùy chọn) Nếu muốn xử lý lỗi token nghiêm trọng hơn


/* Kiểm tra trạng thái đăng nhập */
function checkAuthToken() {
  const token = sessionStorage.getItem("token");

  if (!token) {
    window.location.href = "/Customer/templates/login.html";
    return;
  }

  try {
    // Tách phần payload từ JWT
    const payloadBase64 = token.split('.')[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    // Kiểm tra các trường thời gian quan trọng
    const now = Date.now() / 1000; // Chuyển sang giây
    const bufferTime = 60; // Dự phòng 60 giây

    if (payload.exp && now > payload.exp - bufferTime) {
      throw new Error('Token expired');
    }

    if (payload.nbf && now < payload.nbf) {
      throw new Error('Token not yet valid');
    }

  } catch (error) {
    console.error('Token validation failed:', error);
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("tokenExpiry");
    window.location.href = "/Customer/templates/login.html";
    return;
  }
}

/* Kiểm tra và điều hướng nếu lỗi */
function checkErrorCode(code) {
  if (code == 404) {
    window.location.href = notFoundPageUrl;
    return;
  }
  else if (code == 401 && code == 403) {
    window.location.href = forbiddenPageUrl
    return
  }
  else return;
}

// Gọi hàm kiểm tra khi trang được tải
//document.addEventListener("DOMContentLoaded", checkAuthToken);

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Đưa dữ liệu vào thẻ input
 * @param {Date|string} dateInput - The date to format.
 * @returns {string} Formatted date string ('YYYY-MM-DD') or empty string if invalid.
 */
function formatDateForInput(dateInput) {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    // Kiểm tra xem date có hợp lệ không sau khi new Date()
    if (isNaN(date.getTime())) {
      console.warn("formatDateForInput received an invalid date:", dateInput);
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Error formatting date for input:", dateInput, e);
    return '';
  }
}
window.formatDateForInput = formatDateForInput

function formatCurrency(amount) {
  if (typeof amount !== 'number') return 'N/A';
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function formatCurrencyCompact(amount) {
  if (typeof amount !== 'number') return 'N/A';
  if (amount >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(2) + ' tỷ đồng';
  } else if (amount >= 1_000_000) {
    return (amount / 1_000_000).toFixed(2) + ' triệu đồng';
  } else {
    return amount.toLocaleString('vi-VN') + ' đồng';
  }
}

document.addEventListener('DOMContentLoaded', function () {

  // --- Lấy các container tĩnh (phải có trong index.html) ---
  const sidebarContainer = document.getElementById('sidebar');
  const headerContainer = document.getElementById('header');
  const contentArea = document.querySelector('.content-area');
  const bodyElement = document.body;

  if (!sidebarContainer || !headerContainer || !contentArea) {
    return;
  }

  // --- Thiết lập Event Listeners sử dụng Delegation ---
  setupSidebarListeners(sidebarContainer, contentArea);
  setupHeaderListeners(headerContainer);
  setupGlobalListeners(bodyElement, headerContainer); // Cần headerContainer để kiểm tra click ngoài menu

  // --- Gọi các hàm khởi tạo khác (nếu có) ---
  // Ví dụ: Cập nhật badges. Vẫn có thể gặp timing issue nếu badge nằm trong component load động.
  // Gọi sau một khoảng trễ nhỏ là giải pháp tạm thời không lý tưởng.
  // Cách tốt hơn là trigger hàm này sau khi component load xong (từ loadComponent)
  setTimeout(updateBadges, 500); // Đợi 0.5s để component có thể đã load xong

}); // Kết thúc DOMContentLoaded

// --- Hàm thiết lập Listener cho Sidebar ---
function setupSidebarListeners(sidebarContainer, contentArea) {
  sidebarContainer.addEventListener('click', function (e) {
    const sidebarElement = sidebarContainer.querySelector('.sidebar'); // Sidebar thực tế bên trong container
    if (!sidebarElement) return; // Thoát nếu sidebar chưa load

    // 1. Xử lý Sidebar Toggle (Thu gọn/Mở rộng)
    const toggleButton = e.target.closest('#sidebarToggle');
    if (toggleButton) {
      e.preventDefault();
      sidebarElement.classList.toggle('sidebar-collapsed'); // Class để thu gọn
      contentArea.classList.toggle('content-expanded');   // Class để nội dung mở rộng

      // Reset trạng thái các group khi thu gọn sidebar
      if (sidebarElement.classList.contains('sidebar-collapsed')) {
        sidebarContainer.querySelectorAll('.sidebar-group.active').forEach(group => {
          group.classList.remove('active');
          const content = group.querySelector('.sidebar-group-content');
          const icon = group.querySelector('.sidebar-group-toggle .fa-chevron-down');
          if (content) content.style.maxHeight = '0px';
          if (icon) icon.style.transform = 'rotate(0deg)';
        });
      }
      return; // Dừng xử lý click tại đây
    }

    // 2. Xử lý Group Toggle (Accordion)
    const groupToggleButton = e.target.closest('.sidebar-group-toggle');
    if (groupToggleButton && !sidebarElement.classList.contains('sidebar-collapsed')) { // Chỉ hoạt động khi không thu gọn
      e.preventDefault();
      const group = groupToggleButton.closest('.sidebar-group');
      if (group) {
        group.classList.toggle('active');
        const icon = groupToggleButton.querySelector('.fa-chevron-down');
        const content = group.querySelector('.sidebar-group-content');

        if (icon) {
          icon.style.transform = group.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
        if (content) {
          // Đặt max-height dựa trên trạng thái active
          content.style.maxHeight = group.classList.contains('active') ? content.scrollHeight + 40 + 'px' : '0px';
        }
      }
      return; // Dừng xử lý click tại đây
    }

  });
}

// --- Hàm thiết lập Listener cho Header ---
function setupHeaderListeners(headerContainer) {
  headerContainer.addEventListener('click', function (e) {
    // 1. Xử lý Admin Toggle Dropdown
    const adminToggleButton = e.target.closest('#adminToggle');
    if (adminToggleButton) {
      e.stopPropagation(); // Ngăn sự kiện lan ra body, tránh việc đóng ngay lập tức
      const adminSubmenu = document.getElementById('adminSubmenu'); // Tìm submenu khi click
      adminSubmenu?.classList.toggle('hidden');
      return;
    }

    // 2. Xử lý nút chuông thông báo (nếu cần)
    const bellButton = e.target.closest('.fa-bell'); // Ví dụ selector
    if (bellButton) {
      // Thêm logic xử lý thông báo ở đây
      return;
    }
  });
}

// --- Hàm thiết lập Listener Toàn cục (ví dụ: click ra ngoài) ---
function setupGlobalListeners(bodyElement, headerContainer) { // Truyền headerContainer vào
  bodyElement.addEventListener('click', function (e) {
    // 1. Đóng Admin Submenu khi click ra ngoài
    const adminToggle = headerContainer.querySelector('#adminToggle'); // Tìm trong header
    const adminSubmenu = headerContainer.querySelector('#adminSubmenu'); // Tìm trong header

    if (adminToggle && adminSubmenu && !adminSubmenu.classList.contains('hidden')) {
      // Kiểm tra xem click có nằm ngoài cả nút toggle và submenu không
      if (!adminToggle.contains(e.target) && !adminSubmenu.contains(e.target)) {
        adminSubmenu.classList.add('hidden');
      }
    }
    // 2. Xử lý các link dummy href="#" (nếu chưa được xử lý ở router.js)
    const dummyLink = e.target.closest('a[href="#"]');
    if (dummyLink) {
      e.preventDefault();
    }
  });
}

// --- Hàm cập nhật Badges (Vẫn cần gọi đúng thời điểm) ---
function updateBadges() {
  const badges = document.querySelectorAll('.badge-expanded, .badge-collapsed');
  if (badges.length > 0) {
    badges.forEach(badge => {
      const count = parseInt(badge.getAttribute('data-count')) || 0;
      badge.textContent = count > 99 ? '99+' : (count > 0 ? count : ''); // Ẩn nếu count là 0
      badge.style.display = count > 0 ? '' : 'none'; // Ẩn hoàn toàn nếu count là 0
    });
  } else {
  }
}

// Logout
function logout(event) {
  event.preventDefault();
  sessionStorage.removeItem('token');
  window.location.href = '/Customer/templates/login.html';
}

checkAuthToken()