using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Products
{
    // Input: Seller cập nhật sản phẩm
    public class ProductUpdateDto
    {
        [Required][StringLength(100)] public string ProductName { get; set; } = string.Empty;
        [Required] public int CategoryID { get; set; }
        [Required] public int SellerCategoryID { get; set; }
        [StringLength(4000)] public string? Description { get; set; }
        [Required][Range(0.01, double.MaxValue)][Column(TypeName = "decimal(18, 2)")] public decimal Price { get; set; }
        [Required][Range(0, int.MaxValue)] public int StockQuantity { get; set; }
        [StringLength(255)] public string? ImageURL { get; set; }
        [Required] public bool IsActive { get; set; }
    }
}
