namespace ShopxEX1.Dtos.Shared
{
    // Dùng cho các API trả về danh sách có phân trang (nếu cần cho demo xem SP)
    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public int TotalCount { get; set; }
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling(TotalCount / (double)PageSize) : 0;
    }
}
