async function fetchProducts() {
    const response = await fetch('/api/Product');
    const products = await response.json();
    const productList = document.getElementById('productDto-list');
    productList.innerHTML = '';
    products.forEach(productDto => {
        const div = document.createElement('div');
        div.className = 'productDto';
        div.innerHTML = `
            <h3>${productDto.productName}</h3>
            <p>Price: $${productDto.price}</p>
            <button onclick="addToCart(${productDto.productID})">Add to Cart</button>
        `;
        productList.appendChild(div);
    });
}

async function addToCart(productId) {
    const userId = 1; // Giả sử userId được lấy từ phiên đăng nhập
    await fetch('/api/Cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId, quantity: 1 })
    });
    fetchCart();
}

async function fetchCart() {
    const userId = 1;
    const response = await fetch(`/api/Cart/${userId}`);
    const cart = await response.json();
    const cartList = document.getElementById('cart-list');
    cartList.innerHTML = '';
    cart.cartItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <h3>${item.productDto.productName}</h3>
            <p>Quantity: ${item.quantity}</p>
            <input type="checkbox" ${item.isSelected ? 'checked' : ''} 
                   onchange="updateSelection(${item.cartItemID}, this.checked)">
            <button onclick="removeFromCart(${item.cartItemID})">Remove</button>
        `;
        cartList.appendChild(div);
    });
}

async function removeFromCart(cartItemId) {
    await fetch(`/api/Cart/${cartItemId}`, { method: 'DELETE' });
    fetchCart();
}

// Load dữ liệu khi trang khởi động
fetchProducts();
fetchCart();