using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Discounts
{
    // Input: Cập nhật mã giảm giá (Admin)
    public class DiscountUpdateDto
    {
        [Required][Range(0.01, 100)] public decimal DiscountPercent { get; set; }
        [Required] public DateTime StartDate { get; set; }
        [Required] public DateTime EndDate { get; set; }
        [Required] public bool IsActive { get; set; }
        // Không cho đổi DiscountCode
    }
}
