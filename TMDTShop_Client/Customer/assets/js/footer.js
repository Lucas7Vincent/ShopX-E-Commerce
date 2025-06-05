// Footer functionality
function initFooter() {
    // Handle newsletter form submission
    const newsletterForm = document.querySelector('form[action="/newsletter"]');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            if (!validateEmail(email)) {
                alert('Email không hợp lệ');
                return;
            }
            
            try {
                const response = await fetch('/api/newsletter', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                if (response.ok) {
                    alert('Cảm ơn bạn đã đăng ký nhận tin!');
                    this.reset();
                } else {
                    throw new Error('Đăng ký thất bại');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Có lỗi xảy ra, vui lòng thử lại sau.');
            }
        });
    }

    // Handle social media links
    const socialLinks = document.querySelectorAll('.social-links a');
    socialLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.getAttribute('href');
            if (url && url !== '#') {
                window.open(url, '_blank');
            }
        });
    });

    // Handle payment method images
    const paymentImages = document.querySelectorAll('img[data-image-keyword="payment"]');
    paymentImages.forEach(img => {
        img.addEventListener('click', function() {
            // TODO: Implement payment method selection
            console.log('Payment method clicked:', this.src);
        });
    });
}

// Thêm validation
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
} 