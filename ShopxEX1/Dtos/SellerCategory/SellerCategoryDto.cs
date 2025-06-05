namespace ShopxEX1.Dtos.SellerCategory
{
    /// <summary>
    /// Output: Đại diện cho một danh mục do người bán tạo ra, bao gồm tên cửa hàng của người bán.
    /// Công dụng: Liệt kê các danh mục của một người bán cụ thể, dùng trong việc lọc sản phẩm hoặc quản lý hồ sơ người bán.
    /// </summary>
    public class SellerCategoryDto
    {
        public int SellerCategoryID { get; set; } // ID danh mục của người bán
        public string CategoryName { get; set; } = string.Empty; // Tên danh mục (đặt tên nhất quán)
        public string? Description { get; set; } // Mô tả (có thể null)
        public bool IsActive { get; set; } // Trạng thái kích hoạt
        public int SellerID { get; set; } // Giữ lại khóa ngoại (FK) đến người bán
        public string SellerShopName { get; set; } = string.Empty; // Bao gồm tên cửa hàng của người bán
    }
}
