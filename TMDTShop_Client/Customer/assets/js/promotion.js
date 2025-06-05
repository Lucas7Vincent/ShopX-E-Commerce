// Sample product data (can be replaced with actual data or fetched from an API)
const products = [
    {
        id: 1,
        name: "Điện thoại SuperPhone X Pro Max Plus Ultra",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cHJvZHVjdHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60", // Higher quality placeholder
        originalPrice: 15000000,
        discountedPrice: 12000000,
        discountPercentage: 20,
        category: "Điện thoại",
        popularity: 5
    },
    {
        id: 2,
        name: "Laptop UltraBook Pro X1 Carbon Gen 12",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8cHJvZHVjdHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60",
        originalPrice: 30000000,
        discountedPrice: 25000000,
        discountPercentage: 16.67,
        category: "Laptop",
        popularity: 4
    },
    {
        id: 3,
        name: "Tai nghe SoundMax Pro Wireless ANC",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8cHJvZHVjdHxlbnwwfHwwfHx8MA%3D%3D&auto=format&fit=crop&w=500&q=60",
        originalPrice: 2000000,
        discountedPrice: 1500000,
        discountPercentage: 25,
        category: "Tai nghe",
        popularity: 3
    },
    {
        id: 4,
        name: "Đồng hồ SmartWatch Z Series 9 GPS",
        image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHByb2R1Y3R8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60",
        originalPrice: 5000000,
        discountedPrice: 4000000,
        discountPercentage: 20,
        category: "Đồng hồ",
        popularity: 5
    },
    {
        id: 5,
        name: "Điện thoại NovaPhone 12 Lite Edition",
        image: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTB8fHByb2R1Y3R8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60",
        originalPrice: 18000000,
        discountedPrice: 15500000,
        discountPercentage: 13.89,
        category: "Điện thoại",
        popularity: 4
    },
    {
        id: 6,
        name: "Laptop Gamer Extreme RTX 4090",
        image: "https://images.unsplash.com/photo-1585298723682-7115561c51b7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTh8fHByb2R1Y3R8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60",
        originalPrice: 45000000,
        discountedPrice: 40000000,
        discountPercentage: 11.11,
        category: "Laptop",
        popularity: 5
    },
    {
        id: 7,
        name: "Máy ảnh Mirrorless Alpha ZV-E99",
        image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZWxlY3Ryb25pY3N8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=500&q=60",
        originalPrice: 22000000,
        discountedPrice: 19500000,
        discountPercentage: 11.36,
        category: "Máy ảnh", // New category for testing filter
        popularity: 4
    },
    {
        id: 8,
        name: "Bàn phím cơ RGB Pro Gamer X",
        image: "https://images.unsplash.com/photo-1601412436009-d964bd02edbc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTJ8fGVsZWN0cm9uaWNzfGVufDB8fDB8fHww&auto=format&fit=crop&w=500&q=60",
        originalPrice: 1800000,
        discountedPrice: 1500000,
        discountPercentage: 16.67,
        category: "Phụ kiện", // New category
        popularity: 3
    }
];

// Function to render products
function renderProducts(productsToRender) {
    const productsContainer = document.getElementById("productsContainer");
    if (!productsContainer) return;
    productsContainer.innerHTML = ""; // Clear existing products

    productsToRender.forEach(product => {
        const productCardHTML = `
            <div class="product-card flex flex-col">
                <div class="relative overflow-hidden">
                    <div class="discount-badge">-${product.discountPercentage.toFixed(0)}%</div>
                    <img data-src="${product.image}" alt="${product.name}" class="lazy-image product-image w-full h-56 object-cover transition-transform duration-300 ease-in-out group-hover:scale-105">
                </div>
                <div class="product-details p-5 flex flex-col flex-grow">
                    <h3 class="product-name text-lg font-poppins font-semibold text-shopx-dark mb-2 h-14 overflow-hidden">${product.name}</h3>
                    <div class="flex items-baseline mb-3">
                        <p class="product-price-discounted text-xl font-bold text-red-500 mr-2">${product.discountedPrice.toLocaleString("vi-VN")}₫</p>
                        <p class="product-price-original text-sm text-gray-500 line-through">${product.originalPrice.toLocaleString("vi-VN")}₫</p>
                    </div>
                    <div class="text-xs text-gray-500 mb-4">Danh mục: ${product.category}</div>
                    <button class="view-details-button mt-auto bg-shopx-blue hover:bg-blue-700 text-white font-poppins font-medium py-2.5 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-shopx-blue focus:ring-opacity-50">
                        Xem Chi Tiết
                    </button>
                </div>
            </div>
        `;
        productsContainer.insertAdjacentHTML("beforeend", productCardHTML);
    });
    initLazyLoad(); // Initialize lazy loading after products are rendered
}

// Lazy Loading Function
function initLazyLoad() {
    const lazyImages = document.querySelectorAll(".lazy-image");
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove("lazy-image");
                img.classList.add("loaded"); // Optional: for styling loaded images
                observer.unobserve(img);
            }
        });
    }, { rootMargin: "0px 0px 100px 0px" }); // Load images 100px before they enter viewport

    lazyImages.forEach(img => {
        imageObserver.observe(img);
    });
}

// Countdown timer function
function startCountdown(endDate) {
    const countdownContainer = document.getElementById("countdown");
    if (!countdownContainer) return;

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            clearInterval(interval);
            countdownContainer.innerHTML = "<p class=\"text-3xl font-poppins font-bold text-white\">Ưu đãi đã kết thúc!</p>";
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        countdownContainer.innerHTML = `
            <div class="countdown-item">
                <div class="countdown-number days">${String(days).padStart(2, '0')}</div>
                <div class="countdown-label">Ngày</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-number hours">${String(hours).padStart(2, '0')}</div>
                <div class="countdown-label">Giờ</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-number minutes">${String(minutes).padStart(2, '0')}</div>
                <div class="countdown-label">Phút</div>
            </div>
            <div class="countdown-item">
                <div class="countdown-number seconds">${String(seconds).padStart(2, '0')}</div>
                <div class="countdown-label">Giây</div>
            </div>
        `;

    }, 1000);
}

// Banner image rotation
const bannerImages = [
    "https://images.unsplash.com/photo-1504270997636-07ddfbd48945?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&h=600&q=80",
    "https://images.unsplash.com/photo-1483985988355-763728e1935b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&h=600&q=80",
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&h=600&q=80"
];
let currentBannerIndex = 0;

function changeBannerImage() {
    const bannerImageEl = document.getElementById("banner-image");
    if (bannerImageEl) {
        bannerImageEl.style.opacity = 0;
        setTimeout(() => {
            currentBannerIndex = (currentBannerIndex + 1) % bannerImages.length;
            bannerImageEl.style.backgroundImage = `url('${bannerImages[currentBannerIndex]}')`;
            bannerImageEl.style.opacity = 1; // Full opacity for new image
        }, 700); // Slightly longer for smoother transition
    }
}

// Event Listeners for sorting and filtering
function setupEventListeners() {
    const sortSelect = document.getElementById("sortSelect");
    const categorySelect = document.getElementById("categorySelect");

    if (sortSelect) {
        sortSelect.addEventListener("change", applyFiltersAndSort);
    }
    if (categorySelect) {
        categorySelect.addEventListener("change", applyFiltersAndSort);
    }
}

function applyFiltersAndSort() {
    const sortSelect = document.getElementById("sortSelect");
    const categorySelect = document.getElementById("categorySelect");
    let filteredProducts = [...products];

    // Filter by category
    if (categorySelect && categorySelect.value !== "all") {
        filteredProducts = filteredProducts.filter(product => product.category === categorySelect.value);
    }

    // Sort products
    if (sortSelect) {
        switch (sortSelect.value) {
            case "discount":
                filteredProducts.sort((a, b) => b.discountPercentage - a.discountPercentage);
                break;
            case "priceAsc":
                filteredProducts.sort((a, b) => a.discountedPrice - b.discountedPrice);
                break;
            case "priceDesc":
                filteredProducts.sort((a, b) => b.discountedPrice - a.discountedPrice);
                break;
            case "popular":
                filteredProducts.sort((a, b) => b.popularity - a.popularity);
                break;
            // Default: no specific sort or sort by ID/original order
        }
    }
    renderProducts(filteredProducts);
}

// Populate category filter dynamically
function populateCategories() {
    const categorySelect = document.getElementById("categorySelect");
    if (!categorySelect) return;

    const categories = [...new Set(products.map(p => p.category))]; // Get unique categories
    categories.sort(); // Sort alphabetically

    // Clear existing options except the first one ("Tất cả danh mục")
    while (categorySelect.options.length > 1) {
        categorySelect.remove(1);
    }

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}


// Initialize
document.addEventListener("DOMContentLoaded", () => {
    populateCategories(); // Populate categories before rendering products
    renderProducts(products); // Initial render of all products
    
    // Set countdown to 3 days from now for demonstration
    const promotionEndDate = new Date().getTime() + (3 * 24 * 60 * 60 * 1000); 
    startCountdown(promotionEndDate);
    
    // Initialize banner
    const bannerImageEl = document.getElementById("banner-image");
    if (bannerImageEl && bannerImages.length > 0) {
        bannerImageEl.style.backgroundImage = `url('${bannerImages[0]}')`;
        bannerImageEl.style.opacity = 1;
        setInterval(changeBannerImage, 6000); // Change banner every 6 seconds
    }
    setupEventListeners();
});
