// /assets/js/product-form.js
function setupImagePreview() {
    const imageInput = document.getElementById('imageInput');
    const previewImage = document.getElementById('previewImage');
    const imageURLInput = document.getElementById('ImageURL'); // Đổi tên cho rõ ràng hơn nếu muốn

    if (!imageInput || !previewImage) {
        console.warn('Image input hoặc preview element không tìm thấy trên trang này.');
        return; // Thoát nếu không tìm thấy các phần tử cần thiết
    }

    imageInput.addEventListener('change', function () {
        const file = this.files[0];
        console.log('File selected:', file); // Debug
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                console.log('File read successfully. Setting preview.'); // Debug
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
                if (imageURLInput) {
                    // Quyết định lưu gì vào input ẩn:
                    // imageURLInput.value = e.target.result; // Lưu base64 (có thể rất dài)
                    // Hoặc để trống và xử lý upload file thực tế ở form submit
                    imageURLInput.value = ''; // Ví dụ: chỉ dùng để preview, không lưu base64
                    console.log('Preview image set and hidden class removed.');
                }
            };
            reader.onerror = function (e) {
                console.error("FileReader error:", e);
            }
            reader.readAsDataURL(file); // Bắt đầu đọc file
        } else {
            // Reset preview nếu người dùng hủy chọn file
            previewImage.src = '#'; // Hoặc ảnh placeholder
            previewImage.classList.add('hidden');
            if (imageURLInput) imageURLInput.value = '';
        }
    });
    console.log('Image preview listener attached to #imageInput');
}

// Gọi hàm setup khi script này được load *sau khi* HTML đã vào DOM
// Nếu script này được đặt cuối thẻ body của template, nó sẽ tự chạy đúng lúc
// Hoặc đảm bảo nó được gọi sau khi loadContent hoàn thành
// setupImagePreview(); // Gọi trực tiếp nếu script đặt ở cuối template

// Nếu script load ở head hoặc load động, cần đảm bảo DOM sẵn sàng
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupImagePreview);
} else {
    setupImagePreview(); // Gọi ngay nếu DOM đã sẵn sàng
}

// Thêm logic xử lý submit form ở đây nếu cần
// const productForm = document.getElementById('product-form'); // Giả sử form có id
// productForm?.addEventListener('submit', handleFormSubmit);