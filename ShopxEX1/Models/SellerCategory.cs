namespace ShopxEX1.Models
{
    public class SellerCategory
    {
        public int SellerCategoryID { get; set; }
        public int SellerID { get; set; }
        public string? CategoryName { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public virtual Seller? Seller { get; set; } // Quan hệ n-1
        public virtual ICollection<Product> Products { get; set; } = new List<Product>(); // Quan hệ 1-n
    }
}
