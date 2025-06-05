// Hàm để kiểm tra và đặt vai trò người dùng (gọi từ HTML)
async function checkRole() {
    // Lấy thông tin từ token
    const token = sessionStorage.getItem('token');
    if (!token) {
        console.log('No token found, cannot check role');
        return;
    }
    
    // Giải mã token để lấy thông tin người dùng
    const userData = parseJwtToken(token);
    console.log('userData from token in checkRole:', userData);
    
    // Kết hợp với dữ liệu từ sessionStorage
    const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
    const combinedData = { ...storedUserData, ...userData };
    let role = combinedData.role || '';
    let shopName = combinedData.shopName || '';
    
    // Hiển thị thông tin debug chi tiết
    console.log('checkRole function called:');
    console.log('- token exists:', !!token);
    console.log('- userData after parse:', combinedData);
    console.log('- role value:', role);
    console.log('- role type:', typeof role);
    console.log('- shopName value:', shopName);
    
    // Cập nhật thông tin shop nếu cần
    if (role.toLowerCase() === 'seller' && window.sellerUtils) {
        try {
            console.log('User is a seller, trying to update shop info with sellerUtils');
            const updatedData = await window.sellerUtils.ensureShopInfo();
            if (updatedData && updatedData.shopName) {
                shopName = updatedData.shopName;
                console.log('Updated shopName in checkRole:', shopName);
            }
        } catch (error) {
            console.error('Error updating shop info in checkRole:', error);
        }
    }
    
    // Kiểm tra DOM
    const roleSelect = document.getElementById('role');
    console.log('- roleSelect element found:', !!roleSelect);
    if (roleSelect) {
        console.log('- Current roleSelect value:', roleSelect.value);
        console.log('- roleSelect options count:', roleSelect.options.length);
    }
    
    // Ghi đè giá trị vai trò nếu là seller
    if (role && role.toLowerCase() === 'seller') {
        console.log('Role is seller, will override select value');
        setTimeout(() => {
            const roleSelectAfterDelay = document.getElementById('role');
            if (roleSelectAfterDelay) {
                // Lưu giá trị ban đầu để so sánh
                const oldValue = roleSelectAfterDelay.value;
                
                // Thiết lập giá trị mới
                roleSelectAfterDelay.value = 'seller';
                
                // Kiểm tra xem việc thiết lập có thành công không
                console.log('Role select modification:');
                console.log('- Old value:', oldValue);
                console.log('- New value after set:', roleSelectAfterDelay.value);
                console.log('- Change successful:', oldValue !== roleSelectAfterDelay.value);
                
                // Hiển thị container shopName nếu là seller
                const shopNameContainer = document.getElementById('shopNameContainer');
                if (shopNameContainer) {
                    shopNameContainer.classList.remove('hidden');
                    console.log('ShopName container is now visible');
                    
                    // Đặt giá trị cho trường shopName
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput && shopName) {
                        shopNameInput.value = shopName;
                        console.log('ShopName value set to:', shopName);
                    }
                }
            } else {
                console.error('roleSelect element not found after delay!');
            }
        }, 300); // Đợi lâu hơn một chút
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const API_BASE = "https://localhost:7088/api";
    
    // Cloudinary Configuration
    const CLOUDINARY_CLOUD_NAME = "dgewgggyd";
    const CLOUDINARY_UPLOAD_PRESET = "ShopX_Images";
    const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    // Hàm đồng bộ userData trong sessionStorage với dữ liệu từ token
    async function syncUserDataWithToken() {
        const token = sessionStorage.getItem('token');
        if (!token) return null;
        
        try {
            // Giải mã token để lấy thông tin
            const payloadBase64 = token.split('.')[1];
            if (!payloadBase64) return null;

            let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const padding = payloadBase64Standard.length % 4;
            if (padding) {
                payloadBase64Standard += '='.repeat(4 - padding);
            }

            const payloadJson = atob(payloadBase64Standard);
            const payload = JSON.parse(payloadJson);
            
            // Lấy thông tin từ token
            const tokenData = {
                userId: payload.sub || payload.nameid,
                email: payload.email,
                role: payload.role || '',
            };
            
            // Lấy thông tin chi tiết từ sessionStorage
            const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            
            // Cập nhật role trong userData theo token (ưu tiên token)
            storedUserData.role = tokenData.role;
            
            // Lưu lại vào sessionStorage
            sessionStorage.setItem('userData', JSON.stringify(storedUserData));
            console.log('Đã đồng bộ userData với token, role =', tokenData.role);
            
            return storedUserData;
        } catch (error) {
            console.error('Lỗi khi đồng bộ userData:', error);
            return null;
        }
    }

    // Hàm giải mã token JWT để lấy thông tin người dùng
    function parseJwtToken(token) {
        if (!token) return null;
        
        try {
            const payloadBase64 = token.split('.')[1];
            if (!payloadBase64) {
                throw new Error('Invalid token format: Missing payload');
            }

            let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const padding = payloadBase64Standard.length % 4;
            if (padding) {
                payloadBase64Standard += '='.repeat(4 - padding);
            }

            const payloadJson = atob(payloadBase64Standard);
            const payload = JSON.parse(payloadJson);
            console.log('Token payload:', payload);
            
            // Lấy thông tin từ claims trong token
            const tokenData = {
                userId: payload.sub || payload.nameid,
                email: payload.email,
                role: payload.role ? payload.role.toLowerCase() : '',
                sellerId: payload.SellerId || 0
            };
            
            // Lấy thông tin chi tiết từ sessionStorage
            const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            
            // Quan trọng: Đảm bảo role luôn được lấy từ token, KHÔNG từ sessionStorage
            const combinedData = {
                ...storedUserData,  // Dữ liệu chi tiết từ sessionStorage (fullName, phone, gender, address, avatar, shopName...)
                userId: tokenData.userId,
                email: tokenData.email,
                role: tokenData.role, // Luôn lấy role từ token
                sellerId: tokenData.sellerId
            };
            
            // Đảm bảo giữ lại shopName từ sessionStorage nếu có 
            if (storedUserData.shopName) {
                combinedData.shopName = storedUserData.shopName;
            }
            
            console.log('Combined userData from token and sessionStorage:', combinedData);
            return combinedData;
        } catch (error) {
            console.error('Lỗi khi parse JWT token:', error);
            return null;
        }
    }

    // Kiểm tra nếu là seller và cập nhật thông tin shop
    async function ensureSellerShopInfo() {
        try {
            const token = sessionStorage.getItem('token');
            if (!token) return;
            
            // Lấy thông tin người dùng từ token
            const userData = parseJwtToken(token);
            console.log('Initial userData from token on page load:', userData);
            
            // Nếu có sellerUtils và người dùng là seller, sử dụng nó để cập nhật thông tin shop
            if (window.sellerUtils && userData.role === 'seller') {
                console.log('User is a seller, calling sellerUtils.ensureShopInfo()');
                const updatedData = await window.sellerUtils.ensureShopInfo();
                console.log('After ensureShopInfo, userData:', updatedData);
                
                // Kiểm tra cập nhật UI nếu cần
                if (updatedData && updatedData.shopName) {
                    console.log('Updated shop name available:', updatedData.shopName);
                    
                    // Cập nhật shopName vào sessionStorage
                    const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    storedUserData.shopName = updatedData.shopName;
                    sessionStorage.setItem('userData', JSON.stringify(storedUserData));
                    console.log('Updated sessionStorage with shopName:', updatedData.shopName);
                    
                    // Cập nhật trường shopName nếu có
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput) {
                        shopNameInput.value = updatedData.shopName;
                        console.log('Updated shopName input with:', updatedData.shopName);
                    }
                }
            }
        } catch (error) {
            console.error('Error in ensureSellerShopInfo:', error);
        }
    }

    // Hàm upload ảnh lên Cloudinary
    async function uploadImageToCloudinary(file) {
        if (!file) return null;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        try {
            const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Cloudinary upload failed: ${errorData.error.message}`);
            }

            const data = await response.json();
            return data.secure_url;
        } catch (error) {
            console.error('Lỗi upload ảnh:', error);
            throw error;
        }
    }

    // Hàm cập nhật thông tin người dùng từ userData
    async function updateUserInfo() {
        // Đảm bảo thông tin shop được cập nhật nếu cần
        try {
            // Nếu có sellerUtils, sử dụng để lấy thông tin shop
            if (window.sellerUtils) {
                await window.sellerUtils.ensureShopInfo();
                console.log('Shop info updated by sellerUtils');
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật thông tin shop:', error);
        }
        
        // Lấy thông tin người dùng từ token
        const token = sessionStorage.getItem('token');
        const userData = parseJwtToken(token);
        console.log('userData from token in updateUserInfo:', userData);
        
        // Kết hợp với dữ liệu chi tiết từ sessionStorage nếu có
        const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
        const combinedUserData = { ...storedUserData, ...userData };
        
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) {
            avatarImg.src = combinedUserData.avatar || `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/v1/default-avatar.png`;
        }

        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        if (userName && userEmail) {
            userName.textContent = combinedUserData.fullName || 'Chưa cập nhật';
            userEmail.textContent = combinedUserData.email || 'Chưa cập nhật';
        }

        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        if (sidebarUserName && sidebarUserEmail) {
            sidebarUserName.textContent = combinedUserData.fullName || 'Chưa cập nhật';
            sidebarUserEmail.textContent = combinedUserData.email || 'Chưa cập nhật';
        }

        const accountName = document.getElementById('accountName');
        if (accountName) {
            accountName.textContent = combinedUserData.fullName || 'Chưa cập nhật';
        }

        const roleSelect = document.getElementById('role');
        const shopNameContainer = document.getElementById('shopNameContainer');
        const fullNameField = document.getElementById('fullName');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');
        const birthdateField = document.getElementById('birthdate');
        const genderMale = document.querySelector('input[name="gender"][value="male"]');
        const genderFemale = document.querySelector('input[name="gender"][value="female"]');
        const addressField = document.getElementById('address');

        if (roleSelect && shopNameContainer) {
            // Kiểm tra và chuẩn hóa vai trò từ token
            const role = combinedUserData.role || '';
            const shopName = combinedUserData.shopName || '';
            console.log('Role from token/userData (raw):', role);
            console.log('ShopName from userData:', shopName);
            
            // Chuẩn hóa vai trò cho việc so sánh (chuyển thành chữ thường)
            const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
            console.log('Role after lowercase:', roleLower);
            
            // Không tự tạo options mới, chỉ đặt giá trị cho option có sẵn
            try {
                if (roleLower === 'seller') {
                    roleSelect.value = 'seller';
                    console.log('Setting role value to: seller');
                    // Hiển thị phần shop name nếu là seller
                    shopNameContainer.classList.remove('hidden');
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput) {
                        shopNameInput.value = shopName;
                        console.log('Shop name set to:', shopName);
                    }
                } else {
                    roleSelect.value = 'customer';
                    console.log('Setting role value to: customer');
                    shopNameContainer.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error setting role value:', error);
            }
            
            console.log('Final selected role:', roleSelect.value);
        }
        if (fullNameField) fullNameField.value = combinedUserData.fullName || '';
        if (emailField) emailField.value = combinedUserData.email || '';
        if (phoneField) phoneField.value = combinedUserData.phone || '';
        if (birthdateField) birthdateField.value = combinedUserData.birthday ? combinedUserData.birthday.split('T')[0] : '';
        if (genderMale && genderFemale) {
            const gender = combinedUserData.gender;
            genderMale.checked = gender === true || gender === 'true' || gender === 1;
            genderFemale.checked = gender === false || gender === 'false' || gender === 0 || !gender;
        }
        if (addressField) addressField.value = combinedUserData.address || '';
    }

    // Hàm kiểm tra token
    async function checkToken() {
        const token = sessionStorage.getItem('token');
        console.log('Token in info.js:', token);

        if (!token) {
            console.log('No token found, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }

        try {
            const userData = parseJwtToken(token);
            if (!userData) {
                throw new Error('Invalid token format or missing data');
            }

            const payloadBase64 = token.split('.')[1];
            if (!payloadBase64) {
                throw new Error('Invalid token format: Missing payload');
            }

            let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const padding = payloadBase64Standard.length % 4;
            if (padding) {
                payloadBase64Standard += '='.repeat(4 - padding);
            }

            const payloadJson = atob(payloadBase64Standard);
            const payload = JSON.parse(payloadJson);
            console.log('Payload in info.js:', payload);

            const now = Date.now() / 1000;
            const bufferTime = 60;

            if (payload.exp && now > payload.exp - bufferTime) {
                throw new Error('Token expired');
            }

            if (payload.nbf && now < payload.nbf) {
                throw new Error('Token not yet valid');
            }

            return true;
        } catch (error) {
            console.error('Token validation failed:', error);
            sessionStorage.clear();
            window.location.href = 'login.html';
            return false;
        }
    }

    // Kiểm tra token và cập nhật thông tin, bao gồm thông tin shop
    async function initUserData() {
        const tokenValid = await checkToken();
        if (tokenValid) {
            // Đồng bộ userData trong sessionStorage với token
            await syncUserDataWithToken();
            // Đảm bảo thông tin shop trước khi cập nhật UI
            await ensureSellerShopInfo();
            // Cập nhật UI với thông tin người dùng
            updateUserInfo();
        }
    }

    // Khởi tạo dữ liệu người dùng và UI
    await initUserData();

    // Đăng xuất
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function () {
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // Giỏ hàng
    document.getElementById('cartButton')?.addEventListener('click', function () {
        this.querySelector('.cart-dropdown')?.classList.toggle('active');
    });

    // Menu tài khoản
    const userMenu = document.getElementById('userMenu');
    const button = userMenu?.querySelector('button');
    const userMenuDropdown = document.getElementById('userMenuDropdown');

    if (button && userMenuDropdown) {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            userMenuDropdown.classList.toggle('active');
            button.setAttribute('aria-expanded', !isExpanded);
            userMenuDropdown.setAttribute('aria-hidden', isExpanded);
        });

        document.addEventListener('click', function (e) {
            if (!userMenu.contains(e.target)) {
                userMenuDropdown.classList.remove('active');
                button.setAttribute('aria-expanded', 'false');
                userMenuDropdown.setAttribute('aria-hidden', 'true');
            }
        });

        button.addEventListener('keydown', function (e) {
            if (['Enter', ' '].includes(e.key)) {
                e.preventDefault();
                button.click();
            }
        });

        document.querySelectorAll('#userMenuDropdown a').forEach(link => {
            link.addEventListener('keydown', function (e) {
                if (['Enter', ' '].includes(e.key)) {
                    e.preventDefault();
                    link.click();
                }
            });
        });
    }

    // Menu di động
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', function () {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Chỉnh sửa thông tin hồ sơ
    const editToggle = document.getElementById('editToggle');
    const actionButtons = document.getElementById('actionButtons');
    const profileForm = document.getElementById('profileForm');
    const formFields = profileForm?.querySelectorAll('input, select');
    const roleSelect = document.getElementById('role');
    const shopNameContainer = document.getElementById('shopNameContainer');
    
    console.log('editToggle found:', editToggle !== null);
    console.log('actionButtons found:', actionButtons !== null);
    console.log('profileForm found:', profileForm !== null);
    console.log('roleSelect found:', roleSelect !== null);

    function enableFields() {
        if (formFields) {
            formFields.forEach(field => {
                field.disabled = false;
            });
            document.querySelectorAll('input[name="gender"]').forEach(radio => {
                radio.disabled = false;
            });
        }
    }

    function disableFields() {
        if (formFields) {
            formFields.forEach(field => {
                field.disabled = true;
            });
            document.querySelectorAll('input[name="gender"]').forEach(radio => {
                radio.disabled = true;
            });
        }
    }

    // Thêm global event listener để bắt event trên button editToggle
    document.addEventListener('click', function(e) {
        if (e.target.id === 'editToggle' || e.target.closest('#editToggle')) {
            handleEditToggle();
        }
    });

    async function handleEditToggle() {
        console.log('Edit toggle clicked');
        const tokenValid = await checkToken();
        if (tokenValid) {
            enableFields();
            if (actionButtons) actionButtons.style.display = 'flex';
            if (editToggle) editToggle.style.display = 'none';
            if (roleSelect) {
                roleSelect.addEventListener('change', function() {
                    if (shopNameContainer) {
                        shopNameContainer.classList.toggle('hidden', this.value !== 'seller');
                    }
                });
            }
        }
    }

    if (editToggle) {
        console.log('Adding click event to editToggle');
        editToggle.addEventListener('click', handleEditToggle);
    }
    
    // Xử lý sự kiện hủy
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            disableFields();
            actionButtons.style.display = 'none';
            editToggle.style.display = '';
            shopNameContainer.classList.add('hidden');
            updateUserInfo();
        });
    }

    // Xử lý sự kiện submit form
    

    if (profileForm) {
        profileForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const token = sessionStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
    
            try {
                const userData = parseJwtToken(token);
                const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                const combinedUserData = { ...storedUserData, ...userData };
                
                const isSocialAccount = !!(combinedUserData.socialProvider || storedUserData.socialProvider);
                console.log('Is social account:', isSocialAccount);
                
                const userId = userData.userId;
                if (!userId) {
                    throw new Error('Không thể xác định ID người dùng từ token');
                }
    
                // ✅ COLLECT form data
                const fullName = document.getElementById('fullName').value.trim();
                const email = document.getElementById('email').value.trim();
                const phone = document.getElementById('phone').value.trim();
                const birthdateInput = document.getElementById('birthdate').value;
                const genderRadio = document.querySelector('input[name="gender"]:checked');
                const genderValue = genderRadio ? (genderRadio.value === 'male') : null;
                const address = document.getElementById('address').value.trim();
                const role = roleSelect?.value || 'customer';
                
                // ✅ VALIDATE required fields
                if (!fullName) {
                    alert('Vui lòng nhập họ tên');
                    return;
                }
                
                if (!email) {
                    alert('Vui lòng nhập email');
                    return;
                }
                
                // ✅ VALIDATE email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    alert('Định dạng email không hợp lệ');
                    return;
                }
                
                // ✅ VALIDATE birthday
                let formattedBirthday = '';
                if (birthdateInput) {
                    const date = new Date(birthdateInput);
                    if (isNaN(date.getTime())) {
                        alert('Định dạng ngày sinh không hợp lệ');
                        return;
                    }
                    if (date > new Date()) {
                        alert('Ngày sinh không thể là ngày trong tương lai');
                        return;
                    }
                    formattedBirthday = date.toISOString().split('T')[0];
                }
    
                // ✅ VALIDATE phone if provided
                if (phone && !/^[0-9+\-\s\(\)]*$/.test(phone)) {
                    alert('Số điện thoại chỉ được chứa số và ký tự đặc biệt');
                    return;
                }
    
                // ✅ BUILD request body
                let body = {
                    fullName: fullName,
                    email: email,
                    phone: phone || null,
                    birthday: formattedBirthday || null,
                    gender: genderValue,
                    address: address || null,
                    role: role
                };
                
                // ✅ INCLUDE social account identifiers
                if (isSocialAccount) {
                    body.socialProvider = combinedUserData.socialProvider || storedUserData.socialProvider;
                    body.socialID = combinedUserData.socialID || storedUserData.socialID;
                    console.log('Adding social account info to request:', {
                        socialProvider: body.socialProvider,
                        socialID: body.socialID
                    });
                }
    
                // ✅ SELLER LOGIC - CHỈ GỬI SHOPNAME, BACKEND XỬ LÝ TẤT CẢ
                if (role === 'seller') {
                    let shopName = '';
                    
                    const shopNameInput = document.getElementById('shopName');
                    if (shopNameInput) {
                        shopName = shopNameInput.value.trim();
                        
                        // Fallback to existing shopName if input is empty
                        if (!shopName && combinedUserData.shopName) {
                            shopName = combinedUserData.shopName;
                        }
                        
                        // Validate shopName is required for seller
                        if (!shopName) {
                            alert('Vui lòng nhập tên cửa hàng');
                            return;
                        }
                    }
                    
                    // ✅ CHỈ GỬI shopName - BACKEND SẼ TẠO/CẬP NHẬT SELLERPROFILE
                    body.shopName = shopName;
                    console.log('Sending seller data in single request:', {
                        role: role,
                        shopName: shopName,
                        isSocialAccount: isSocialAccount
                    });
                } else {
                    // ✅ Customer role - preserve existing shop info for social accounts
                    if (combinedUserData.shopName) {
                        body.shopName = combinedUserData.shopName;
                        console.log('Preserving shop name for social account switching to customer');
                    }
                }
    
                // ✅ LOG request data
                console.log('📤 Sending single update-profile request:', {
                    url: `${API_BASE}/Auth/update-profile`,
                    method: 'PUT',
                    isSocialAccount: isSocialAccount,
                    body: body
                });
    
                // ✅ SINGLE API CALL - update-profile XỬ LÝ TẤT CẢ
                const response = await fetch(`${API_BASE}/Auth/update-profile`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });
    
                // ✅ ENHANCED error handling
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ API Error Response:', {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        body: errorText,
                        isSocialAccount: isSocialAccount
                    });
                    
                    try {
                        const errorData = JSON.parse(errorText);
                        console.error('❌ Parsed error data:', errorData);
                        
                        if (errorData.errors) {
                            console.error('🔍 Detailed validation errors:', errorData.errors);
                            
                            let errorMessages = [];
                            for (const [field, fieldErrors] of Object.entries(errorData.errors)) {
                                if (Array.isArray(fieldErrors)) {
                                    fieldErrors.forEach(error => {
                                        errorMessages.push(`${field}: ${error}`);
                                    });
                                } else {
                                    errorMessages.push(`${field}: ${fieldErrors}`);
                                }
                            }
                            
                            if (errorMessages.length > 0) {
                                const detailedError = `Dữ liệu không hợp lệ:\n${errorMessages.join('\n')}`;
                                console.error('🎯 Formatted error message:', detailedError);
                                throw new Error(detailedError);
                            }
                        }
                        
                        throw new Error(errorData.message || errorData.title || 'Cập nhật thông tin thất bại');
                    } catch (parseError) {
                        console.error('❌ Could not parse error response:', parseError);
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                }
    
                const data = await response.json();
                console.log('✅ Update success:', data);
    
                // ✅ Update session storage and UI
                if (data.token) {
                    sessionStorage.setItem('token', data.token);
                    console.log('Updated token');
                }
    
                const updatedUserData = data.user || data;
                
                // ✅ PRESERVE social account identifiers
                if (isSocialAccount) {
                    updatedUserData.socialProvider = body.socialProvider;
                    updatedUserData.socialID = body.socialID;
                    console.log('Preserved social account identifiers:', {
                        socialProvider: updatedUserData.socialProvider,
                        socialID: updatedUserData.socialID
                    });
                }
                
                sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
    
                alert('Cập nhật thông tin thành công');
                
                // ✅ Reset form state
                disableFields();
                actionButtons.style.display = 'none';
                editToggle.style.display = '';
                shopNameContainer.classList.add('hidden');
                updateUserInfo();
    
            } catch (error) {
                console.error('❌ Update profile error:', error);
                alert(error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
            }
        });
    }

    // === AVATAR UPLOAD ===
    const avatarCamera = document.getElementById('avatarCamera');
    const avatarInput = document.getElementById('avatarInput');
    const avatarImg = document.getElementById('avatarImg');

    if (avatarCamera && avatarInput && avatarImg) {
        avatarCamera.addEventListener('click', function () {
            avatarInput.click();
        });

        avatarInput.addEventListener('change', async function (e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    alert('Kích thước file không được vượt quá 5MB');
                    return;
                }

                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    alert('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF)');
                    return;
                }

                try {
                    const token = sessionStorage.getItem('token');
                    if (!token) {
                        window.location.href = 'login.html';
                        return;
                    }

                    const imageUrl = await uploadImageToCloudinary(file);
                    if (!imageUrl) {
                        throw new Error('Không thể upload ảnh lên Cloudinary');
                    }

                    // Lấy userData từ token và sessionStorage
                    const userData = parseJwtToken(token);
                    const storedUserData = JSON.parse(sessionStorage.getItem('userData') || '{}');
                    const combinedUserData = { ...storedUserData, ...userData };
                    
                    // Log shopName before creating payload
                    console.log('Current shopName in userData:', combinedUserData.shopName);
                    
                    const payload = {
                        fullName: combinedUserData.fullName || '',
                        email: combinedUserData.email || '',
                        phone: combinedUserData.phone || '',
                        birthday: combinedUserData.birthday || '',
                        gender: combinedUserData.gender,
                        address: combinedUserData.address || '',
                        avatar: imageUrl,
                        role: combinedUserData.role || '',
                        shopName: combinedUserData.shopName || ''
                    };
                    
                    console.log('Avatar update payload with role and shopName:', payload);
                    console.log('Explicitly checking if shopName is included:', 'shopName' in payload, payload.shopName);

                    const response = await fetch(`${API_BASE}/Auth/update-profile`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Không thể cập nhật avatar');
                    }

                    const result = await response.json();
                    
                    // Cập nhật token mới nếu có
                    if (result.token) {
                        sessionStorage.setItem('token', result.token);
                    }
                    
                    // Đảm bảo giữ nguyên giá trị shopName
                    const updatedUserData = result.user || result;
                    const originalShopName = combinedUserData.shopName;
                    
                    if (originalShopName && (!updatedUserData.shopName || updatedUserData.shopName === '')) {
                        updatedUserData.shopName = originalShopName;
                        console.log('Preserved shopName in avatar update:', originalShopName);
                    }
                    
                    // Log to check what's actually in the updated data
                    console.log('Final userData before saving to sessionStorage:', updatedUserData);
                    console.log('shopName in final userData:', updatedUserData.shopName);
                    
                    sessionStorage.setItem('userData', JSON.stringify(updatedUserData));
                    avatarImg.src = updatedUserData.avatar;
                    alert('Cập nhật avatar thành công');
                } catch (error) {
                    console.error('Lỗi khi upload avatar:', error);
                    alert('Có lỗi xảy ra khi upload avatar: ' + error.message);
                }
            }
        });
    }

    // === SIDEBAR TAB SWITCH ===
    const sidebarAccount = document.getElementById('sidebarAccount');
    const sidebarChangePassword = document.getElementById('sidebarOrders');
    const accountInfoSection = document.getElementById('account-info-section');
    const changePasswordSection = document.getElementById('order-section');

    function setActiveTab(tab) {
        if (tab === 'account') {
            sidebarAccount.classList.add('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarAccount.classList.remove('text-gray-700');
            sidebarChangePassword.classList.remove('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarChangePassword.classList.add('text-gray-700');
            accountInfoSection.classList.remove('hidden');
            changePasswordSection.classList.add('hidden');
        } else {
            sidebarChangePassword.classList.add('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarChangePassword.classList.remove('text-gray-700');
            sidebarAccount.classList.remove('bg-blue-50', 'border-blue-600', 'text-blue-600', 'active');
            sidebarAccount.classList.add('text-gray-700');
            changePasswordSection.classList.remove('hidden');
            accountInfoSection.classList.add('hidden');
        }
    }

    if (sidebarAccount && sidebarChangePassword && accountInfoSection && changePasswordSection) {
        sidebarAccount.addEventListener('click', function (e) {
            e.preventDefault();
            setActiveTab('account');
        });
        sidebarChangePassword.addEventListener('click', function (e) {
            e.preventDefault();
            setActiveTab('changePassword');
        });
    }

    // Xử lý form đổi mật khẩu
    const changePasswordForm = document.getElementById('changePasswordForm');
    const passwordError = document.getElementById('passwordError');

    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Lấy giá trị từ form
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            
            // Kiểm tra mật khẩu
            if (newPassword.length < 6) {
                showPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự');
                return;
            }
            
            if (newPassword !== confirmNewPassword) {
                showPasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp');
                return;
            }
            
            // Ẩn thông báo lỗi nếu có
            hidePasswordError();
            
            // Lấy token từ sessionStorage
            const token = sessionStorage.getItem('token');
            if (!token) {
                window.location.href = 'login.html';
                return;
            }
            
            try {
                // Gọi API đổi mật khẩu
                const response = await fetch(`${API_BASE}/Auth/change-password`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmNewPassword
                    })
                });
                
                if (response.status === 204) {
                    // Thành công - status 204 No Content
                    alert('Đổi mật khẩu thành công');
                    changePasswordForm.reset();
                } else {
                    // Xử lý lỗi
                    const data = await response.json();
                    showPasswordError(data.message || 'Đã xảy ra lỗi khi đổi mật khẩu');
                }
            } catch (error) {
                console.error('Lỗi khi đổi mật khẩu:', error);
                showPasswordError('Đã xảy ra lỗi khi gửi yêu cầu');
            }
        });
    }

    function showPasswordError(message) {
        if (passwordError) {
            passwordError.textContent = message;
            passwordError.classList.remove('hidden');
        }
    }

    function hidePasswordError() {
        if (passwordError) {
            passwordError.textContent = '';
            passwordError.classList.add('hidden');
        }
    }

    // Ngay khi trang tải xong, kiểm tra vai trò
    checkRole();
});