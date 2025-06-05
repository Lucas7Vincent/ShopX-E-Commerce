// Kiểm tra và xử lý role người dùng
function checkUserRole() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const roleAccessItem = document.getElementById('roleAccessItem');
    const roleAccessLink = document.getElementById('roleAccessLink');
    const accountName = document.getElementById('accountName');

    // Hiển thị tên người dùng nếu đã đăng nhập
    if (userData.fullName) {
        accountName.textContent = userData.fullName;
    }

    // Kiểm tra và hiển thị menu theo role
    if (userData.role === 'Admin') {
        roleAccessItem.classList.remove('hidden');
        roleAccessLink.textContent = 'Truy cập với quyền ADMIN';
        roleAccessLink.href = '../../Admin/templates/index.html';
    } else if (userData.role === 'Seller') {
        roleAccessItem.classList.remove('hidden');
        roleAccessLink.textContent = 'Truy cập với quyền SELLER';
        roleAccessLink.href = '../../Seller/templates/index.html';
    }
}

// Kiểm tra quyền truy cập trang
function checkPageAccess() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const currentPath = window.location.pathname;

    // Kiểm tra quyền truy cập trang Admin
    if (currentPath.includes('/Admin/') && userData.role !== 'Admin') {
        window.location.href = '/Customer/templates/login.html';
        return false;
    }

    // Kiểm tra quyền truy cập trang Seller
    if (currentPath.includes('/Seller/') && userData.role !== 'Seller') {
        window.location.href = '/Customer/templates/login.html';
        return false;
    }

    return true;
}

// Kiểm tra đăng nhập
function checkLogin() {
    const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        if (!userData.token) {
        window.location.href = '/Customer/templates/login.html';
        return false;
    }
    return true;
}

// Hàm gắn sự kiện logout cho nút đăng xuất
function attachLogoutEvent() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton && !logoutButton.hasAttribute('data-logout-attached')) {
        logoutButton.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            const token = sessionStorage.getItem("token");
            try {
                await fetch("https://localhost:7088/api/Auth/logout", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + token
                    }
                });

                // Xóa tất cả sessionStorage
                sessionStorage.removeItem("token");
                sessionStorage.removeItem("isLoggedIn");
                sessionStorage.removeItem("userName");
                sessionStorage.removeItem("userEmail");
                sessionStorage.removeItem("userPhone");
                sessionStorage.removeItem("userBirthdate");
                sessionStorage.removeItem("userGender");
                sessionStorage.removeItem("userAddress");

                // Chuyển hướng về trang đăng nhập
                window.location.href = "login.html";
            } catch (err) {
                console.error("Lỗi khi logout:", err);
                alert("Đăng xuất thất bại. Vui lòng thử lại.");
            }
        });
        logoutButton.setAttribute('data-logout-attached', 'true');
    }
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra role và hiển thị menu tương ứng
    checkUserRole();
    attachLogoutEvent();

    // Xử lý dropdown menu
    const userMenuButton = document.getElementById('userMenuButton');
    const userMenuDropdown = document.getElementById('userMenuDropdown');

    if (userMenuButton && userMenuDropdown) {
        userMenuButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            userMenuDropdown.classList.toggle('hidden');
            this.setAttribute('aria-expanded', !userMenuDropdown.classList.contains('hidden'));
        });

        // Đóng dropdown khi click ra ngoài
        document.addEventListener('click', function(e) {
            if (!userMenuButton.contains(e.target) && !userMenuDropdown.contains(e.target)) {
                userMenuDropdown.classList.add('hidden');
                userMenuButton.setAttribute('aria-expanded', 'false');
            }
        });
    }
});

window.attachLogoutEvent = attachLogoutEvent;

class AuthManager {
    static async logout() {
        try {
            const token = this.getToken();
            if (!token) return;

            await fetch("https://localhost:7088/api/Auth/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            this.clearUserData();
            window.location.href = "login.html";
        } catch (error) {
            console.error("Logout failed:", error);
            // Show user-friendly error message
        }
    }

    static clearUserData() {
        sessionStorage.clear();
        document.cookie.split(";").forEach(cookie => {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
    }
} 