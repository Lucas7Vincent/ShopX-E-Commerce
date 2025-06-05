namespace ShopxEX1.Dtos.Products
{
    // Output: Tóm tắt sản phẩm (cho danh sách, tìm kiếm)
    public class ProductSummaryDto
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string? ImageURL { get; set; }
        public int SellerID { get; set; }
        public int SellercategoryID { get; set; }
        public bool IsActive { get; set; }
        public string? CategoryName { get; set; }
        public string? ShopName { get; set; }
        public int StockQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = "active";
    }
}
