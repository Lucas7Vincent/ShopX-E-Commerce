using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Discounts
{
    // Input: Tạo mã giảm giá (Admin)
    public class DiscountCreateDto
    {
        [Required][StringLength(50)] public string DiscountCode { get; set; } = string.Empty;
        [Required][Range(0.01, 100)] public decimal DiscountPercent { get; set; }
        [Required][Range(1, int.MaxValue, ErrorMessage = "Budget phải là số không âm.")] public int Budget { get; set; }
        [Required][Range(1, int.MaxValue, ErrorMessage = "Budget phải là số không âm.")] public int MaxDiscountPercent { get; set; }
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime EndDate { get; set; } = DateTime.UtcNow.AddDays(1);
        public bool IsActive { get; set; } = true;
        // Validation: EndDate >= StartDate
    }
}
