namespace ShopxEX1.Dtos.Categories
{
    public class CategoryFilterDto
    {
        public string? SearchTerm { get; set; } // Tìm theo tên
        public string? SortBy { get; set; } // "PriceAsc", "PriceDesc", "NameAsc"
    }
}
