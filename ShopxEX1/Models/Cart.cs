namespace ShopxEX1.Models
{
    public class Cart
    {
        public int CartID { get; set; }
        public int UserID { get; set; } // FK (NOT NULL trong SQL mới)
        public DateTime CreatedAt { get; set; }

        // Navigation Properties
        public virtual User User { get; set; } = null!;
        public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
    }
}
