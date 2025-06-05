

class RebuyOrderHandler {
    constructor() {
        this.apiBase = window.API_BASE_URL || 'https://localhost:7088/api';
        console.log('🔄 RebuyOrderHandler initialized');
    }

    /**
     * Main entry point - Show rebuy modal
     */
    async showRebuyModal(orderId) {
        try {
            console.log(`🔄 Starting rebuy process for order ${orderId}`);
            
            // ✅ VALIDATE LOGIN
            const token = window.getSession ? window.getSession('token') : 
                         sessionStorage.getItem('token') || localStorage.getItem('token');
            
            if (!token) {
                alert('Vui lòng đăng nhập để sử dụng chức năng này');
                window.location.href = '/Customer/templates/login.html';
                return;
            }
            
            // ✅ SHOW LOADING MODAL
            this.showLoadingModal();
            
            // ✅ FETCH REBUY DATA FROM API
            const rebuyData = await this.fetchRebuyData(orderId);
            
            // ✅ SHOW REBUY CONFIRMATION MODAL
            this.showRebuyConfirmationModal(orderId, rebuyData);
            
        } catch (error) {
            console.error('❌ Error in rebuy process:', error);
            this.hideLoadingModal();
            
            // ✅ USER-FRIENDLY ERROR MESSAGES
            let errorMessage = 'Có lỗi xảy ra khi xử lý yêu cầu';
            
            if (error.message.includes('401')) {
                errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại';
                setTimeout(() => {
                    window.location.href = '/Customer/templates/login.html';
                }, 2000);
            } else if (error.message.includes('404')) {
                errorMessage = 'Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập';
            } else if (error.message.includes('400')) {
                errorMessage = 'Đơn hàng này không thể mua lại';
            } else {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
        }
    }

    /**
     * Fetch rebuy data from API
     */
    async fetchRebuyData(orderId) {
        const token = window.getSession ? window.getSession('token') : 
                     sessionStorage.getItem('token') || localStorage.getItem('token');

        const response = await fetch(`${this.apiBase}/Orders/${orderId}/rebuy`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Lỗi ${response.status}: Không thể kiểm tra đơn hàng`);
        }

        return await response.json();
    }

    /**
     * Show loading modal
     */
    showLoadingModal() {
        const modalHtml = `
            <div id="rebuyLoadingModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 max-w-sm mx-4">
                    <div class="text-center">
                        <i class="fas fa-spinner fa-spin text-indigo-500 text-3xl mb-4"></i>
                        <p class="text-gray-700">Đang kiểm tra sản phẩm...</p>
                        <p class="text-sm text-gray-500 mt-2">Vui lòng chờ</p>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Hide loading modal
     */
    hideLoadingModal() {
        const modal = document.getElementById('rebuyLoadingModal');
        if (modal) modal.remove();
    }

    /**
     * Show rebuy confirmation modal with product list
     */
    showRebuyConfirmationModal(orderId, rebuyData) {
        this.hideLoadingModal();

        const { rebuyItems, unavailableItems } = rebuyData;

        let modalContent = '';

        // ✅ AVAILABLE ITEMS SECTION
        if (rebuyItems && rebuyItems.length > 0) {
            modalContent += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-green-600 mb-3">
                        <i class="fas fa-check-circle mr-2"></i>Sản phẩm có thể mua lại (${rebuyItems.length})
                    </h3>
                    <div class="space-y-3 max-h-60 overflow-y-auto border rounded-lg">
                        ${rebuyItems.map(item => `
                            <div class="flex items-center space-x-3 p-3 hover:bg-gray-50">
                                <input type="checkbox" 
                                       id="rebuy-item-${item.productID}" 
                                       class="rebuy-checkbox w-4 h-4" 
                                       data-product-id="${item.productID}"
                                       data-quantity="${item.originalQuantity}"
                                       checked>
                                <img src="${window.getImageUrl ? window.getImageUrl(item.imageURL) : item.imageURL}" 
                                     alt="${item.productName}" 
                                     class="w-12 h-12 object-cover rounded border"
                                     onerror="this.src='/Customer/assets/images/placeholder.jpg'">
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm text-gray-900 truncate">${item.productName}</p>
                                    <p class="text-xs text-gray-500">Số lượng: ${item.originalQuantity}</p>
                                    <p class="text-xs text-gray-500">Danh mục: ${item.categoryName || 'Không xác định'}</p>
                                    <div class="flex items-center space-x-2 text-xs mt-1">
                                        <span class="text-red-600 font-medium">${window.formatCurrency ? window.formatCurrency(item.currentPrice) : item.currentPrice}₫</span>
                                        ${item.priceChanged ? 
                                            `<span class="text-gray-400 line-through">${window.formatCurrency ? window.formatCurrency(item.originalPrice) : item.originalPrice}₫</span>` : ''}
                                        ${item.priceChanged ? 
                                            `<span class="text-xs px-1 py-0.5 rounded ${item.priceDifference > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}">
                                                ${item.priceDifference > 0 ? '↗' : '↘'} ${Math.abs(item.priceDifference).toLocaleString()}₫
                                            </span>` : ''}
                                    </div>
                                    <p class="text-xs text-gray-500">Còn lại: ${item.availableStock} sản phẩm</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // ✅ UNAVAILABLE ITEMS SECTION
        if (unavailableItems && unavailableItems.length > 0) {
            modalContent += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-red-600 mb-3">
                        <i class="fas fa-exclamation-triangle mr-2"></i>Sản phẩm không thể mua lại (${unavailableItems.length})
                    </h3>
                    <div class="space-y-2 max-h-40 overflow-y-auto">
                        ${unavailableItems.map(item => `
                            <div class="flex items-center space-x-3 p-2 bg-red-50 border border-red-200 rounded">
                                <i class="fas fa-times-circle text-red-500 flex-shrink-0"></i>
                                <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm text-red-800 truncate">${item.productName}</p>
                                    <p class="text-xs text-red-600">${item.reason}</p>
                                    ${item.requestedQuantity && item.availableQuantity !== undefined ? 
                                        `<p class="text-xs text-red-600">Yêu cầu: ${item.requestedQuantity}, Còn lại: ${item.availableQuantity}</p>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // ✅ NO ITEMS AVAILABLE
        if (!rebuyItems || rebuyItems.length === 0) {
            modalContent = `
                <div class="text-center py-8">
                    <i class="fas fa-sad-tear text-gray-400 text-4xl mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">Không thể mua lại</h3>
                    <p class="text-gray-600">Tất cả sản phẩm trong đơn hàng này đều không còn sẵn sàng.</p>
                    ${unavailableItems && unavailableItems.length > 0 ? 
                        `<p class="text-sm text-gray-500 mt-2">Có ${unavailableItems.length} sản phẩm không khả dụng</p>` : ''}
                </div>
            `;
        }

        const modalHtml = `
            <div id="rebuyConfirmationModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div class="p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold text-gray-800">
                                <i class="fas fa-redo-alt mr-2 text-indigo-600"></i>Mua lại đơn hàng #${orderId}
                            </h2>
                            <button onclick="rebuyHandler.closeRebuyModal()" class="text-gray-400 hover:text-gray-600 text-2xl">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        
                        <div class="overflow-y-auto max-h-[60vh]">
                            ${modalContent}
                        </div>
                        
                        ${rebuyItems && rebuyItems.length > 0 ? `
                            <div class="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t">
                                <button onclick="rebuyHandler.closeRebuyModal()" 
                                        class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 order-last sm:order-first">
                                    Hủy
                                </button>
                                <button onclick="rebuyHandler.selectAllItems(true)" 
                                        class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                                    Chọn tất cả
                                </button>
                                <button onclick="rebuyHandler.selectAllItems(false)" 
                                        class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                                    Bỏ chọn tất cả
                                </button>
                                <button onclick="rebuyHandler.confirmRebuy(${orderId})" 
                                        class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">
                                    <i class="fas fa-cart-plus mr-2"></i>Thêm vào giỏ hàng
                                </button>
                            </div>
                        ` : `
                            <div class="flex justify-center pt-4 border-t">
                                <button onclick="rebuyHandler.closeRebuyModal()" 
                                        class="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">
                                    Đóng
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Select/deselect all items
     */
    selectAllItems(checked) {
        const checkboxes = document.querySelectorAll('.rebuy-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    /**
     * Confirm rebuy - add selected items to cart
     */
    async confirmRebuy(orderId) {
        try {
            const selectedItems = [];
            const checkboxes = document.querySelectorAll('.rebuy-checkbox:checked');
            
            if (checkboxes.length === 0) {
                alert('Vui lòng chọn ít nhất một sản phẩm để thêm vào giỏ hàng');
                return;
            }
            
            checkboxes.forEach(checkbox => {
                selectedItems.push({
                    productId: parseInt(checkbox.dataset.productId),
                    quantity: parseInt(checkbox.dataset.quantity)
                });
            });
            
            console.log('🛒 Adding selected items to cart:', selectedItems);
            
            // ✅ SHOW LOADING STATE ON BUTTON
            const confirmBtn = event.target;
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang thêm...';
            confirmBtn.disabled = true;
            
            // ✅ CALL API TO ADD TO CART
            const result = await this.addRebuyItemsToCart(orderId, selectedItems);
            
            // ✅ CLOSE MODAL AND SHOW SUCCESS
            this.closeRebuyModal();
            this.showSuccessModal(result);
            
        } catch (error) {
            console.error('❌ Error confirming rebuy:', error);
            alert(`Lỗi: ${error.message}`);
            
            // ✅ RESTORE BUTTON STATE
            const confirmBtn = event.target;
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-cart-plus mr-2"></i>Thêm vào giỏ hàng';
                confirmBtn.disabled = false;
            }
        }
    }

    /**
     * Add rebuy items to cart via API
     */
    async addRebuyItemsToCart(orderId, items) {
        const token = window.getSession ? window.getSession('token') : 
                     sessionStorage.getItem('token') || localStorage.getItem('token');

        const response = await fetch(`${this.apiBase}/Orders/${orderId}/add-to-cart`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(items)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Lỗi ${response.status}: Không thể thêm vào giỏ hàng`);
        }

        return await response.json();
    }

    /**
     * Show success modal
     */
    showSuccessModal(result) {
        const { addedItems, failedItems } = result;
        
        let content = '';
        
        if (addedItems && addedItems.length > 0) {
            content += `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-green-600 mb-2">
                        <i class="fas fa-check-circle mr-2"></i>Đã thêm vào giỏ hàng (${addedItems.length})
                    </h3>
                    <ul class="text-sm text-gray-700 space-y-1 max-h-40 overflow-y-auto">
                        ${addedItems.map(item => `
                            <li class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-2 flex-shrink-0"></i>
                                <span class="truncate">${item.productName} (x${item.quantityAdded})</span>
                                ${item.wasUpdated ? '<span class="text-xs text-blue-600 ml-2">(cập nhật)</span>' : '<span class="text-xs text-green-600 ml-2">(mới)</span>'}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (failedItems && failedItems.length > 0) {
            content += `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-red-600 mb-2">
                        <i class="fas fa-exclamation-triangle mr-2"></i>Không thể thêm (${failedItems.length})
                    </h3>
                    <ul class="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        ${failedItems.map(item => `
                            <li class="flex items-start">
                                <i class="fas fa-times text-red-500 mr-2 flex-shrink-0 mt-0.5"></i>
                                <span class="flex-1">${item.productName || 'Sản phẩm'}: ${item.reason}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }

        const modalHtml = `
            <div id="rebuySuccessModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div class="text-center mb-4">
                        <i class="fas fa-shopping-cart text-indigo-500 text-3xl mb-2"></i>
                        <h2 class="text-xl font-bold text-gray-800">Cập nhật giỏ hàng</h2>
                    </div>
                    
                    ${content}
                    
                    <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 justify-center">
                        <button onclick="rebuyHandler.closeSuccessModal()" 
                                class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                            Đóng
                        </button>
                        <button onclick="window.location.href='/Customer/templates/cart.html'" 
                                class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">
                            <i class="fas fa-shopping-cart mr-2"></i>Xem giỏ hàng
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    /**
     * Close rebuy modal
     */
    closeRebuyModal() {
        const modal = document.getElementById('rebuyConfirmationModal');
        if (modal) modal.remove();
    }

    /**
     * Close success modal
     */
    closeSuccessModal() {
        const modal = document.getElementById('rebuySuccessModal');
        if (modal) modal.remove();
    }

    /**
     * Quick rebuy all available items
     */
    async quickRebuyAll(orderId) {
        try {
            console.log(`🚀 Quick rebuy all for order ${orderId}`);
            
            const token = window.getSession ? window.getSession('token') : 
                         sessionStorage.getItem('token') || localStorage.getItem('token');
            
            if (!token) {
                alert('Vui lòng đăng nhập để sử dụng chức năng này');
                return;
            }

            this.showLoadingModal();

            const response = await fetch(`${this.apiBase}/Orders/${orderId}/rebuy-all`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Lỗi ${response.status}`);
            }

            const result = await response.json();
            this.hideLoadingModal();
            this.showSuccessModal(result);

        } catch (error) {
            console.error('❌ Error in quick rebuy all:', error);
            this.hideLoadingModal();
            alert(`Lỗi: ${error.message}`);
        }
    }
}

// ✅ GLOBAL INSTANCE
window.rebuyHandler = new RebuyOrderHandler();

// ✅ GLOBAL SHORTCUT FUNCTIONS
window.showRebuyModal = (orderId) => window.rebuyHandler.showRebuyModal(orderId);
window.quickRebuyAll = (orderId) => window.rebuyHandler.quickRebuyAll(orderId);