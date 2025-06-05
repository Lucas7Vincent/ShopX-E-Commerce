namespace ShopxEX1.Models
{
    public class Product
    {
        public int ProductID { get; set; }
        public int CategoryID { get; set; }
        public int SellerCategoryID { get; set; } = 1;
        public int SellerID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? ImageURL { get; set; }
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public bool IsActive { get; set; }

        // Navigation Properties
        public virtual Category Category { get; set; } = null!; // Quan hệ n-1
        public virtual SellerCategory SellerCategory { get; set; } = null!; // Quan hệ n-1
        public virtual Seller Seller { get; set; } = null!; // Quan hệ n-1
        public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
        public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
    }
}
