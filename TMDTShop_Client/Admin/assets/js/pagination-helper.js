/**
 * Pagination Helper - Utility functions for pagination
 * This file contains generalized functions for pagination UI
 * Version: 1.3.0 - With critical reliability improvements and diagnostics
 */

console.log("Pagination Helper loaded - v1.3.0 (Critical Reliability Improvements & Diagnostics)");

// Debug flag - set to true to enable additional debug info
const PAGINATION_DEBUG = true;

/**
 * Compatibility function to check if seller.js change page functions exist
 * and use them if available
 * 
 * @param {string} funcName - The name of the function to check
 * @param {number} page - The page number to navigate to
 */
function safeCallPageChangeFunction(funcName, page) {
    try {
        console.group(`Attempting to call page change function: ${funcName}(${page})`);
        
        // First check if the function is directly accessible in the global scope
        if (typeof window[funcName] === 'function') {
            console.log(`Calling page change function from window: ${funcName}(${page})`);
            window[funcName](page);
            console.groupEnd();
            return true;
        } 
        
        // Try alternative scopes
        if (typeof self[funcName] === 'function') {
            console.log(`Calling page change function from self: ${funcName}(${page})`);
            self[funcName](page);
            console.groupEnd();
            return true;
        } 
        
        if (typeof this[funcName] === 'function') {
            console.log(`Calling page change function from this: ${funcName}(${page})`);
            this[funcName](page);
            console.groupEnd();
            return true;
        }
        
        // Check if global function exists but with different case
        const windowKeys = Object.keys(window);
        const matchingKey = windowKeys.find(key => key.toLowerCase() === funcName.toLowerCase());
        if (matchingKey && typeof window[matchingKey] === 'function') {
            console.log(`Found function with different case: ${matchingKey}(${page})`);
            window[matchingKey](page);
            console.groupEnd();
            return true;
        }
        
        // Check for direct function by name as a last resort (only for known functions)
        if ((funcName === 'changePage' || funcName === 'changeCategoryPage') && 
            typeof eval(funcName) === 'function') {
            console.log(`Calling page change function via direct reference: ${funcName}(${page})`);
            eval(`${funcName}(${page})`);
            console.groupEnd();
            return true;
        }
        
        // If still not found, use appropriate built-in functions as fallbacks
        console.warn(`Function ${funcName} not found, trying fallbacks...`);
        
        // Try to use fallback functions based on the page change type
        if (funcName === 'changePage' || funcName.toLowerCase() === 'changepage') {
            if (typeof loadProducts === 'function') {
                console.log('Using fallback to loadProducts function');
                loadProducts(page);
                console.groupEnd();
                return true;
            } else {
                console.error('No loadProducts fallback function available');
            }
        } else if (funcName === 'changeCategoryPage' || funcName.toLowerCase() === 'changecategorypage') {
            if (typeof loadShopCategories === 'function') {
                console.log('Using fallback to loadShopCategories function');
                loadShopCategories(page);
                console.groupEnd();
                return true;
            } else {
                console.error('No loadShopCategories fallback function available');
            }
        }
        
        console.error(`Failed to find any suitable function for ${funcName}(${page})`);
        console.groupEnd();
        return false;
    } catch (error) {
        console.error(`Error in safeCallPageChangeFunction for ${funcName}(${page}):`, error);
        console.groupEnd();
        return false;
    }
}

/**
 * Render pagination UI for a specific container
 * 
 * @param {string} containerId - ID of the container to render pagination in
 * @param {Object} paginationObj - Pagination information (currentPage, totalPages, etc.)
 * @param {string} changePageFuncName - Name of the function to call when changing pages
 * @param {string} itemLabel - Label for the items being paginated
 */
function renderPaginationUI(containerId, paginationObj, changePageFuncName, itemLabel = "sản phẩm") {
    try {
        if (PAGINATION_DEBUG) {
            console.group(`=== RENDER PAGINATION UI (${containerId}) ===`);
            console.log('Pagination object:', JSON.stringify(paginationObj || {}, null, 2));
            console.log('Change page function:', changePageFuncName);
            console.log('Item label:', itemLabel);
        } else {
            console.group(`=== RENDER PAGINATION (${containerId}) ===`);
        }
        
        // Verify container exists
        const paginationContainer = document.getElementById(containerId);
        if (!paginationContainer) {
            console.warn(`Không tìm thấy container ${containerId}`);
            console.groupEnd();
            return;
        }
        
        // Verify pagination object is valid
        if (!paginationObj || typeof paginationObj !== 'object') {
            console.warn(`Invalid pagination object:`, paginationObj);
            paginationContainer.innerHTML = '';
            console.groupEnd();
            return;
        }
        
        // Default to reasonable values if missing
        paginationObj = {
            currentPage: paginationObj.currentPage || 1,
            totalPages: paginationObj.totalPages || 1,
            totalItems: paginationObj.totalItems || 0,
            pageSize: paginationObj.pageSize || 10
        };
        
        // If no pages or only 1 page, don't show pagination
        if (!paginationObj.totalPages || paginationObj.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            console.log('Không hiển thị phân trang vì chỉ có 1 trang hoặc không có dữ liệu');
            console.groupEnd();
            return;
        }
        
        console.log('Đang render phân trang với thông tin:', paginationObj);
        
        // Create a safer onclick handler that uses our robust handler
        const safeOnClick = (page) => `javascript:window.safeCallPageChangeFunction('${changePageFuncName}', ${page});`;
        
        let paginationHTML = `<div class="flex justify-center my-4">
            <nav class="flex items-center space-x-1">
                <button class="pagination-btn px-3 py-1 rounded-l border ${paginationObj.currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}" 
                        onclick="${safeOnClick(paginationObj.currentPage - 1)}" ${paginationObj.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>`;
        
        // Limit the number of displayed pages if there are too many
        const maxDisplayedPages = 5;
        let startPage = Math.max(1, paginationObj.currentPage - Math.floor(maxDisplayedPages / 2));
        let endPage = Math.min(paginationObj.totalPages, startPage + maxDisplayedPages - 1);
        
        // Adjust startPage if endPage has reached the limit
        if (endPage - startPage + 1 < maxDisplayedPages) {
            startPage = Math.max(1, endPage - maxDisplayedPages + 1);
        }
        
        // Show first page button if needed
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-white text-blue-600 hover:bg-blue-50" onclick="${safeOnClick(1)}">1</button>`;
            
            if (startPage > 2) {
                paginationHTML += `<span class="px-3 py-1 border-t border-b border-r bg-white text-gray-600">...</span>`;
            }
        }
        
        // Show the main page numbers
        for (let i = startPage; i <= endPage; i++) {
            if (i === paginationObj.currentPage) {
                paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-blue-500 text-white" onclick="${safeOnClick(i)}">${i}</button>`;
            } else {
                paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-white text-blue-600 hover:bg-blue-50" onclick="${safeOnClick(i)}">${i}</button>`;
            }
        }
        
        // Show last page button if needed
        if (endPage < paginationObj.totalPages) {
            if (endPage < paginationObj.totalPages - 1) {
                paginationHTML += `<span class="px-3 py-1 border bg-white text-gray-600">...</span>`;
            }
            paginationHTML += `<button class="pagination-btn px-3 py-1 border bg-white text-blue-600 hover:bg-blue-50" onclick="${safeOnClick(paginationObj.totalPages)}">${paginationObj.totalPages}</button>`;
        }
        
        paginationHTML += `
            <button class="pagination-btn px-3 py-1 rounded-r border ${paginationObj.currentPage === paginationObj.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}" 
                    onclick="${safeOnClick(paginationObj.currentPage + 1)}" ${paginationObj.currentPage === paginationObj.totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </nav>`;
        
        // Add information about the total number of items
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
    } catch (error) {
        console.error(`Error rendering pagination UI for ${containerId}:`, error);
        try {
            // Try to clean up in case of error
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        } catch (cleanupError) {
            console.error('Error during pagination error cleanup:', cleanupError);
        }
        console.groupEnd();
    }
}

/**
 * Wrapper function for product pagination
 * Calls the generalized renderPaginationUI with product-specific parameters
 */
function renderProductPaginationUI() {
    // Make sure the productPagination variable is accessible
    if (typeof productPagination === 'undefined') {
        console.error('productPagination is not defined');
        return;
    }
    
    if (PAGINATION_DEBUG) {
        console.log('Rendering PRODUCT pagination UI with:', {
            containerId: 'product-pagination',
            currentPage: productPagination.currentPage,
            totalPages: productPagination.totalPages,
            totalItems: productPagination.totalItems 
        });
    }
    
    renderPaginationUI('product-pagination', productPagination, 'changePage', 'sản phẩm');
    
    // Don't register the changePage function here
    // The actual function is defined in seller.js
}

/**
 * Wrapper function for category pagination
 * Calls the generalized renderPaginationUI with category-specific parameters
 */
function renderCategoryPaginationUI() {
    // Make sure the categoryPagination variable is accessible
    if (typeof categoryPagination === 'undefined') {
        console.error('categoryPagination is not defined');
        return;
    }
    
    if (PAGINATION_DEBUG) {
        console.log('Rendering CATEGORY pagination UI with:', {
            containerId: 'category-pagination',
            currentPage: categoryPagination.currentPage,
            totalPages: categoryPagination.totalPages,
            totalItems: categoryPagination.totalItems 
        });
    }
    
    renderPaginationUI('category-pagination', categoryPagination, 'changeCategoryPage', 'danh mục');
    
    // Don't register the changeCategoryPage function here
    // The actual function is defined in seller.js
}

// Compatibility function to define standard pagination functions
// This ensures they're always available in the global scope
function ensurePaginationFunctionsExist() {
    console.group("Ensuring pagination functions exist");
    
    // Check if changePage function exists
    if (typeof window.changePage !== 'function') {
        console.log('Creating fallback changePage function');
        window.changePage = function(page) {
            console.log('Using compatibility changePage function:', page);
            try {
                // Try the standard loadProducts function first
                if (typeof loadProducts === 'function') {
                    console.log('Delegating to loadProducts function');
                    loadProducts(page);
                    return true;
                } 
                
                // Try to find any other suitable function
                const functionOptions = [
                    'loadSellerProducts', 'loadProductPage', 'goToProductPage',
                    'fetchProducts', 'fetchProductsPage', 'showProductsPage'
                ];
                
                for (const funcName of functionOptions) {
                    if (typeof window[funcName] === 'function') {
                        console.log(`Delegating to alternative function: ${funcName}`);
                        window[funcName](page);
                        return true;
                    }
                }
                
                console.error('No suitable function found for changePage compatibility');
                return false;
            } catch (error) {
                console.error('Error in compatibility changePage function:', error);
                return false;
            }
        };
    } else {
        console.log('Native changePage function already exists');
    }
    
    // Check if changeCategoryPage function exists
    if (typeof window.changeCategoryPage !== 'function') {
        console.log('Creating fallback changeCategoryPage function');
        window.changeCategoryPage = function(page) {
            console.log('Using compatibility changeCategoryPage function:', page);
            try {
                // Try the standard loadShopCategories function first
                if (typeof loadShopCategories === 'function') {
                    console.log('Delegating to loadShopCategories function');
                    loadShopCategories(page);
                    return true;
                }
                
                // Try to find any other suitable function
                const functionOptions = [
                    'loadSellerCategories', 'loadCategoryPage', 'goToCategoryPage',
                    'fetchCategories', 'fetchCategoriesPage', 'showCategoriesPage'
                ];
                
                for (const funcName of functionOptions) {
                    if (typeof window[funcName] === 'function') {
                        console.log(`Delegating to alternative function: ${funcName}`);
                        window[funcName](page);
                        return true;
                    }
                }
                
                console.error('No suitable function found for changeCategoryPage compatibility');
                return false;
            } catch (error) {
                console.error('Error in compatibility changeCategoryPage function:', error);
                return false;
            }
        };
    } else {
        console.log('Native changeCategoryPage function already exists');
    }
    
    console.groupEnd();
}

// Call to ensure the functions exist
ensurePaginationFunctionsExist();

// Export functions to be available globally
window.renderPaginationUI = renderPaginationUI;
window.renderProductPaginationUI = renderProductPaginationUI;
window.renderCategoryPaginationUI = renderCategoryPaginationUI;
window.safeCallPageChangeFunction = safeCallPageChangeFunction;
window.ensurePaginationFunctionsExist = ensurePaginationFunctionsExist;

// Log successful initialization
console.log("Pagination Helper initialized successfully");

// Run a check after a small delay to verify pagination functions availability
setTimeout(() => {
    console.group("=== PAGINATION FUNCTION AVAILABILITY CHECK ===");
    console.log("changePage function available:", typeof window.changePage === 'function' ? "Yes" : "No");
    console.log("changeCategoryPage function available:", typeof window.changeCategoryPage === 'function' ? "Yes" : "No");
    console.groupEnd();
    
    // Extra insurance: add DOM-based handlers for pagination buttons
    const addDirectEventHandlers = () => {
        console.log("Adding direct DOM event handlers for pagination buttons");
        // Find all pagination buttons
        const paginationBtns = document.querySelectorAll('.pagination-btn');
        paginationBtns.forEach(btn => {
            // Get the original onclick attribute
            const originalOnClick = btn.getAttribute('onclick');
            if (originalOnClick && (originalOnClick.includes('changePage') || originalOnClick.includes('changeCategoryPage'))) {
                btn.addEventListener('click', function(e) {
                    // Try to extract the page number
                    const match = originalOnClick.match(/\((\d+)\)/);
                    if (match && match[1]) {
                        const page = parseInt(match[1], 10);
                        // Determine which function to call
                        if (originalOnClick.includes('changePage')) {
                            console.log(`Direct handler calling changePage(${page})`);
                            if (typeof window.changePage === 'function') {
                                window.changePage(page);
                            } else if (typeof window.loadProducts === 'function') {
                                window.loadProducts(page);
                            }
                        } else if (originalOnClick.includes('changeCategoryPage')) {
                            console.log(`Direct handler calling changeCategoryPage(${page})`);
                            if (typeof window.changeCategoryPage === 'function') {
                                window.changeCategoryPage(page);
                            } else if (typeof window.loadShopCategories === 'function') {
                                window.loadShopCategories(page);
                            }
                        }
                    }
                });
            }
        });
    };
    
    // Run now and again when DOM might have changed
    addDirectEventHandlers();
    setTimeout(addDirectEventHandlers, 2000);
    setTimeout(addDirectEventHandlers, 5000);
}, 1000);
