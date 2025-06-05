// FAQ toggle functionality
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const answer = button.nextElementSibling;
            const icon = button.querySelector('i');
            
            // Toggle answer visibility
            answer.classList.toggle('hidden');
            
            // Rotate icon
            icon.classList.toggle('transform');
            icon.classList.toggle('rotate-180');
        });
    });

    // Form submission handling
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                if (response.ok) {
                    alert('Cảm ơn bạn đã liên hệ với chúng tôi. Chúng tôi sẽ phản hồi sớm nhất có thể!');
                    contactForm.reset();
                } else {
                    throw new Error('Có lỗi xảy ra khi gửi tin nhắn');
                }
            } catch (error) {
                alert(error.message);
            }
        });
    }
}); 