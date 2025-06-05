namespace ShopxEX1.Dtos.Shared
{
    // Dùng làm tham số cho các API cần phân trang
    public class PagingOptions
    {
        private const int MaxPageSize = 50;
        private int _pageSize = 10;
        public int PageNumber { get; set; } = 1;
        public int PageSize { get => _pageSize; set => _pageSize = (value > MaxPageSize) ? MaxPageSize : value; }
    }
}
