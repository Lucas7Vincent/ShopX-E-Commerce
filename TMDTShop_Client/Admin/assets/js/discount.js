document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const adminToggle = document.getElementById('adminToggle');
    const adminSubmenu = document.getElementById('adminSubmenu');
    const navLinks = document.querySelectorAll('.sidebar-item, .sidebar-group-content a');
    const contents = document.querySelectorAll('[data-content]');
    const pageTitle = document.getElementById('pageTitle');
    const groupToggles = document.querySelectorAll('.sidebar-group-toggle');
    
    let coupons = [
        { id: 1, code: 'SUMMER20', type: 'percentage', value: 20, expiry: '2025-08-31', maxUses: 100, minOrder: 500000, used: 45 },
        { id: 2, code: 'FIXED500K', type: 'fixed', value: 500000, expiry: '2025-12-31', maxUses: 50, minOrder: 2000000, used: 10 }
    ];

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('w-64');
        sidebar.classList.toggle('w-16');
        document.querySelectorAll('.sidebar-item-text').forEach(text => {
            text.classList.toggle('hidden');
        });
        document.querySelectorAll('.sidebar-header-text').forEach(text => {
            text.classList.toggle('hidden');
        });
    });

    adminToggle.addEventListener('click', () => {
        adminSubmenu.classList.toggle('hidden');
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            contents.forEach(content => {
                content.classList.toggle('hidden', content.getAttribute('data-content') !== target);
                content.classList.toggle('active', content.getAttribute('data-content') === target);
            });
            navLinks.forEach(l => l.classList.remove('bg-blue-600'));
            link.classList.add('bg-blue-600');
            pageTitle.textContent = link.textContent.trim();
        });
    });

    groupToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const content = toggle.nextElementSibling;
            const chevron = toggle.querySelector('.fa-chevron-down');
            content.classList.toggle('hidden');
            chevron.classList.toggle('rotate-180');
        });
    });

    function renderCoupons() {
        const tableBody = document.getElementById('couponTable');
        tableBody.innerHTML = '';
        coupons.forEach(coupon => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="p-3">${coupon.code}</td>
                <td class="p-3">${coupon.type === 'percentage' ? `${coupon.value}%` : `${coupon.value.toLocaleString()}đ`}</td>
                <td class="p-3">${new Date(coupon.expiry).toLocaleDateString('vi-VN')}</td>
                <td class="p-3">${coupon.used >= coupon.maxUses || new Date(coupon.expiry) < new Date() ? 'Hết hạn' : 'Hoạt động'}</td>
                <td class="p-3">
                    <button class="edit-coupon text-blue-600 hover:text-blue-800 mr-2" data-id="${coupon.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-coupon text-red-600 hover:text-red-800" data-id="${coupon.id}"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        document.querySelectorAll('.edit-coupon').forEach(button => {
            button.addEventListener('click', () => editCoupon(button.getAttribute('data-id')));
        });
        document.querySelectorAll('.delete-coupon').forEach(button => {
            button.addEventListener('click', () => deleteCoupon(button.getAttribute('data-id')));
        });
    }

    function saveCoupon() {
        const coupon = {
            id: coupons.length + 1,
            code: document.getElementById('couponCode').value,
            type: document.getElementById('couponType').value,
            value: parseInt(document.getElementById('couponValue').value),
            expiry: document.getElementById('couponExpiry').value,
            maxUses: parseInt(document.getElementById('couponMaxUses').value),
            minOrder: parseInt(document.getElementById('couponMinOrder').value),
            used: 0
        };
        coupons.push(coupon);
        renderCoupons();
        document.querySelector('[data-target="coupons"]').click();
    }

    function editCoupon(id) {
        const coupon = coupons.find(c => c.id == id);
        document.getElementById('couponCode').value = coupon.code;
        document.getElementById('couponType').value = coupon.type;
        document.getElementById('couponValue').value = coupon.value;
        document.getElementById('couponExpiry').value = coupon.expiry;
        document.getElementById('couponMaxUses').value = coupon.maxUses;
        document.getElementById('couponMinOrder').value = coupon.minOrder;
        document.querySelector('[data-target="create-coupon"]').click();
        document.getElementById('saveCoupon').onclick = () => {
            coupon.code = document.getElementById('couponCode').value;
            coupon.type = document.getElementById('couponType').value;
            coupon.value = parseInt(document.getElementById('couponValue').value);
            coupon.expiry = document.getElementById('couponExpiry').value;
            coupon.maxUses = parseInt(document.getElementById('couponMaxUses').value);
            coupon.minOrder = parseInt(document.getElementById('couponMinOrder').value);
            renderCoupons();
            document.querySelector('[data-target="coupons"]').click();
        };
    }

    function deleteCoupon(id) {
        coupons = coupons.filter(c => c.id != id);
        renderCoupons();
    }

    document.getElementById('saveCoupon').addEventListener('click', saveCoupon);
    document.getElementById('couponSearch').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        const filteredCoupons = coupons.filter(coupon => coupon.code.toLowerCase().includes(search));
        coupons = filteredCoupons;
        renderCoupons();
        coupons = [...coupons]; // Restore original list
    });

    renderCoupons();
});