using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace ShopxEX1.Dtos.Products
{
    // Input: Seller tạo sản phẩm
    public class ProductCreateDto
    {
        [Required][StringLength(100)] public string ProductName { get; set; } = string.Empty;
        [Required] public int CategoryID { get; set; } // Cần ID để liên kết
        [Required] public int SellerCategoryID { get; set; } // Cần ID để liên kết
        // SellerID lấy từ context
        [StringLength(4000)] public string? Description { get; set; }
        [Required][Range(0.01, double.MaxValue)][Column(TypeName = "decimal(18, 2)")] public decimal Price { get; set; }
        [Required][Range(0, int.MaxValue)] public int StockQuantity { get; set; }
        [StringLength(255)] public string? ImageURL { get; set; }
        public IFormFile? ImageFile { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
