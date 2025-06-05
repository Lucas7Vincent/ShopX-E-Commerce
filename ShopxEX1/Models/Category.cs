namespace ShopxEX1.Models
{
    public class Category
    {
        public int CategoryID { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Image { get; set; }

        // Navigation Properties
        public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
