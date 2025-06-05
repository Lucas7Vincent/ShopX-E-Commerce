// Định nghĩa API endpoint cho seller
const API_SELLER = "https://localhost:7088/api/sellers";

/**
 * Trích xuất userId từ JWT token
 * @returns {string|null} - UserId từ token
 */
function getUserIdFromToken() {
    const token = sessionStorage.getItem('token');
    if (!token) return null;

    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;

        let payloadBase64Standard = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const padding = payloadBase64Standard.length % 4;
        if (padding) {
            payloadBase64Standard += '='.repeat(4 - padding);
        }

        const payloadJson = atob(payloadBase64Standard);
        const payload = JSON.parse(payloadJson);
        
        return payload.sub || payload.userId || null;
    } catch (error) {
        console.error('Lỗi khi trích xuất userId từ token:', error);
        return null;
    }
}

/**
 * Lấy thông tin shop theo UserId
 * @param {string} userId - ID của người dùng
 * @returns {Promise<Object|null>} - Thông tin shop hoặc null nếu không tìm thấy
 */
async function getShopByUserId(userId) {
    const token = sessionStorage.getItem('token');
    if (!token) {
        console.warn('getShopByUserId: No token available');
        return null;
    }
    
    try {
        console.log('Fetching shop info for userId:', userId);
        const apiUrl = `${API_SELLER}/user/${userId}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            console.warn('Shop info fetch failed with status:', response.status);
            if (response.status === 404) {
                console.warn('Shop not found for this user. User might be a seller without a shop.');
            }
            return null;
        }
        
        const shopInfo = await response.json();
        console.log('Full shop info from API:', shopInfo);
        
        // Verify shop info contains the expected fields
        if (!shopInfo.shopName) {
            console.warn('API response does not contain shopName:', shopInfo);
        }
        
        // Check what properties are available in the response
        console.log('Shop info properties:', Object.keys(shopInfo));
        
        return shopInfo;
    } catch (error) {
        console.error('Exception when fetching shop info:', error);
        return null;
    }
}

/**
 * Đảm bảo thông tin shop được cập nhật trong userData
 * @returns {Promise<Object>} - userData đã cập nhật
 */
async function ensureShopInfo() {
    const userDataRaw = sessionStorage.getItem('userData');
    if (!userDataRaw) {
        console.warn('ensureShopInfo: No userData found in sessionStorage');
        return null;
    }
    
    const userData = JSON.parse(userDataRaw);
    console.log('ensureShopInfo: Current userData:', userData);
    console.log('ensureShopInfo: Current role:', userData.role);
    console.log('ensureShopInfo: Current shopName:', userData.shopName);
    
    // Chỉ xử lý nếu là seller và chưa có thông tin shop
    if (userData.role?.toLowerCase() !== 'seller') {
        console.log('ensureShopInfo: User is not a seller, returning existing userData');
        return userData;
    }
    
    if (userData.shopName && userData.shopName.trim() !== '') {
        console.log('ensureShopInfo: ShopName already exists:', userData.shopName);
        return userData;
    }
    
    try {
        // Lấy userId từ token
        const userId = getUserIdFromToken();
        if (!userId) {
            console.warn('ensureShopInfo: Could not extract userId from token');
            return userData;
        }
        
        console.log('Getting shop info for seller with userId:', userId);
        
        // Lấy thông tin shop
        const shopInfo = await getShopByUserId(userId);
        console.log('ensureShopInfo: Retrieved shopInfo from API:', shopInfo);
        
        if (!shopInfo) {
            console.warn('ensureShopInfo: No shop info returned from API');
            return userData;
        }
        
        if (!shopInfo.shopName) {
            console.warn('ensureShopInfo: shopInfo does not contain shopName property');
            return userData;
        }
        
        // Cập nhật userData
        const updatedData = {
            ...userData,
            shopName: shopInfo.shopName,
            sellerId: shopInfo.sellerId || shopInfo.id
        };
        
        console.log('ensureShopInfo: Updated userData with shop info:', updatedData);
        console.log('ensureShopInfo: ShopName in updated data:', updatedData.shopName);
        
        // Lưu lại vào sessionStorage
        sessionStorage.setItem('userData', JSON.stringify(updatedData));
        return updatedData;
    } catch (error) {
        console.error('Error ensuring shop info:', error);
        return userData;
    }
}

/**
 * Cập nhật thông tin người dùng hiện tại với thông tin shop
 * @returns {Promise<boolean>} - Kết quả cập nhật
 */
async function updateCurrentUserWithShopInfo() {
    try {
        const updated = await ensureShopInfo();
        return !!updated;
    } catch (error) {
        console.error('Failed to update user with shop info:', error);
        return false;
    }
}

// Đặt các hàm trong window để có thể gọi từ các file js khác
window.sellerUtils = {
    getUserIdFromToken,
    getShopByUserId,
    ensureShopInfo,
    updateCurrentUserWithShopInfo
}; 