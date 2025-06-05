namespace ShopxEX1.Dtos.Discounts
{
    public class DiscountFilterDto
    {
        public bool? IsActive { get; set; } // Lọc theo trạng thái active
        public DateTime? ValidOnDate { get; set; } // Lọc các mã còn hiệu lực vào một ngày cụ thể
        public string? SearchTerm { get; set; } // Tìm theo DiscountCode
    }
}
