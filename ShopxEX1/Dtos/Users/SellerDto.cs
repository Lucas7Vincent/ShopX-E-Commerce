namespace ShopxEX1.Dtos.Users
{
    /// <summary>
    /// Đại diện cho một danh mục do người bán tạo ra, bao gồm tên cửa hàng của người bán.
    /// Công dụng: Liệt kê các danh mục của một người bán cụ thể, dùng trong việc lọc sản phẩm hoặc quản lý hồ sơ người bán.
    /// </summary>

    public class SellerDto
    {
        public int SellerID { get; set; } // ID người bán
        public string ShopName { get; set; } = string.Empty; // Tên cửa hàng
        public bool IsActive { get; set; } // Trạng thái hoạt động

        // Bao gồm thông tin người dùng liên quan nếu cần hiển thị
        public int UserID { get; set; } // Giữ FK nếu cần để liên kết
        public string? UserFullName { get; set; } // Ví dụ: Làm phẳng tên đầy đủ của người dùng
        public string UserEmail { get; set; } = string.Empty; // Ví dụ: Email của người dùng

        // Tùy chọn: Có thể bao gồm danh sách tóm tắt danh mục nếu cần trong ngữ cảnh này
        // public List<SellerCategorySummaryDto> Categories { get; set; } = new();
    }
}
