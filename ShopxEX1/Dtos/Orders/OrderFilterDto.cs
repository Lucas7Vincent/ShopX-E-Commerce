using ShopxEX1.Dtos.Shared;

namespace ShopxEX1.Dtos.Orders
{
    // Input: Lọc đơn hàng
    public class OrderFilterDto : DateRangeFilterDto // Kế thừa bộ lọc ngày
    {
        public string? Status { get; set; }
        public string? SearchTerm { get; set; } // Tìm kiếm theo tên khách hàng hoặc mã đơn hàng
        public decimal? MinPrice { get; set; } // Giá từ
        public decimal? MaxPrice { get; set; } // Giá đến
        public string? SortBy { get; set; } // Chuỗi để xác định cách sắp xếp, ví dụ: "totalAmount_asc", "customerName_desc"
    }
}
