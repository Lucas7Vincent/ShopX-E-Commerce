// Dữ liệu sản phẩm mặc định
const products = [
    { id: 1, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 2, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 3, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 4, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 5, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 6, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 7, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 8, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 9, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 10, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 11, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 12, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 13, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 14, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 15, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 16, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 17, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 18, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 19, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
    { id: 20, name: 'Sản phẩm A', image: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp', price: 100000, category: 'Laptop', quantity: 50 },
  ];

  function loadProducts() {
    const tbody = document.getElementById('productTableBody');
    tbody.innerHTML = '';
    products.forEach(product => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="py-3 px-4 border-b">${product.id}</td>
        <td class="py-3 px-4 border-b">${product.name}</td>
          <td class="py-3 px-4 border-b">
            <img src="${product.image}" alt="${product.name}" class="w-10 h-10 object-cover rounded">
          </td>
          <td class="py-3 px-4 border-b">${product.price.toLocaleString()}đ</td>
          <td class="py-3 px-4 border-b">${product.category}</td>
          <td class="py-3 px-4 border-b">${product.quantity}</td>
          <td class="py-3 px-4 border-b space-x-2">
            <button class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition duration-200 edit-btn" data-id="${product.id}">
              <i class="fas fa-edit mr-1"></i> Sửa
            </button>
            <button class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition duration-200 delete-btn" data-id="${product.id}">
              <i class="fas fa-trash-alt mr-1"></i> Xóa
            </button>
          </td>
      `;
      tbody.appendChild(row);
    });
  }

  document.getElementById('addProductBtn').addEventListener('click', () => {
    alert('Chức năng thêm sản phẩm đang được phát triển!');
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('edit-btn')) {
      const id = e.target.getAttribute('data-id');
      alert(`Chỉnh sửa sản phẩm với ID: ${id}`);
    }
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.getAttribute('data-id');
      if (confirm(`Bạn có chắc muốn xóa sản phẩm với ID: ${id}?`)) {
        alert(`Đã xóa sản phẩm với ID: ${id}`);
      }
    }
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#productTableBody tr');
    rows.forEach(row => {
      const name = row.children[1].textContent.toLowerCase();
      row.style.display = name.includes(searchTerm) ? '' : 'none';
    });
  });

  

//document.addEventListener('DOMContentLoaded', loadProducts);

  