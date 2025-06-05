namespace ShopxEX1.Dtos.Categories
{
    // Output: Hiển thị danh mục sản phẩm 
    public class CategoryDto
    {
        public int CategoryID { get; set; }
        public string CategoryName { get; set; } = string.Empty; 
        public string? Description { get; set; }
        public string? Image { get; set; }
    }
}
