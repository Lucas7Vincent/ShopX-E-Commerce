namespace ShopxEX1.Models
{
    public class  Seller
    {
    public int SellerID { get; set; }
    public int UserID { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }

    // Navigation Properties
    public virtual User User { get; set; } = null!;
    public virtual ICollection<SellerCategory> SellerCategories { get; set; } = new List<SellerCategory>();
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    }
    
}
