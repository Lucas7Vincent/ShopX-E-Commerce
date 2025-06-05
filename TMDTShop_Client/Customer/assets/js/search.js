document.addEventListener('DOMContentLoaded', () => {
    // Get search query from URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || 'Không có từ khóa';
    document.getElementById('search-query').textContent = query;

    // Fetch search results from API
    const fetchSearchResults = async () => {
        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) {
                throw new Error('Không thể tìm kiếm sản phẩm');
            }
            const data = await response.json();
            displaySearchResults(data);
        } catch (error) {
            console.error('Error:', error);
            // Display error message to user
            const resultsContainer = document.querySelector('.search-results');
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div class="text-center py-8">
                        <p class="text-red-500">${error.message}</p>
                    </div>
                `;
            }
        }
    };

    // Display search results
    const displaySearchResults = (results) => {
        const resultsContainer = document.querySelector('.search-results');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">Không tìm thấy sản phẩm nào phù hợp với từ khóa "${query}"</p>
                </div>
            `;
            return;
        }

        const productsHTML = results.map(product => `
            <div class="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 object-cover rounded-lg mb-4">
                <h3 class="font-medium text-lg mb-2">${product.name}</h3>
                <p class="text-gray-600 mb-2">${product.description}</p>
                <div class="flex justify-between items-center">
                    <span class="text-blue-600 font-bold">${product.price.toLocaleString('vi-VN')}đ</span>
                    <button class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        Thêm vào giỏ
                    </button>
                </div>
            </div>
        `).join('');

        resultsContainer.innerHTML = productsHTML;
    };

    // Initialize search
    fetchSearchResults();
}); 