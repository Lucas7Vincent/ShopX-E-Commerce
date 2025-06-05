namespace ShopxEX1.Helpers
{
    /// <summary>
    /// Hàm phân trang
    /// </summary>
    /// <typeparam name="T">Kiểu dữ liệu</typeparam>
    public class PagedResult<T> where T : class
    {
        public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public int TotalCount { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
        public bool HasPreviousPage => PageNumber > 1;
        public bool HasNextPage => PageNumber < TotalPages;

        public PagedResult(IEnumerable<T> items, int pageNumber, int pageSize, int totalCount)
        {
            Items = items;
            PageNumber = pageNumber;
            PageSize = pageSize;
            TotalCount = totalCount;
        }
    }
}
