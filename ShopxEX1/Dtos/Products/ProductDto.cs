using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Products
{
    // Output: Chi tiết sản phẩm (cho User xem)
    public class ProductDto
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; } // User cần biết còn hàng không
        public string? ImageURL { get; set; }
        public bool IsActive { get; set; }
        // --- Thông tin cần JOIN từ Service ---
        public string? CategoryName { get; set; }
        public int CategoryID { get; set; }
        public int SellerID { get; set; }
        public string? SellerStoreName { get; set; } // Tên cửa hàng bán
        public int SellerCategoryID { get; set; } // Cần ID để liên kết
        public string Status { get; set; } = "active";
    }
}
