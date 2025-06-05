// (Nếu file có JS nội tuyến, nó sẽ được đặt ở đây)

// Gợi ý: bạn có thể thêm logic JS như toggle sidebar
document.addEventListener('DOMContentLoaded', function () {
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
  
    if (toggleBtn && sidebar && mainContent) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
      });
    }
  });
  