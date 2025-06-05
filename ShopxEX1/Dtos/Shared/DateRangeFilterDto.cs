namespace ShopxEX1.Dtos.Shared
{
    // Dùng làm tham số lọc ngày tháng (cho Lịch sử mua hàng)
    public class DateRangeFilterDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}
