namespace ShopxEX1.Models
{
    public class CartItem
    {
        public int CartItemID { get; set; }
        public int CartID { get; set; } // FK (NOT NULL trong SQL mới)
        public int ProductID { get; set; } // FK (NOT NULL trong SQL mới)
        public int Quantity { get; set; }
        public DateTime AddedAt { get; set; }

        // Navigation Properties
        public virtual Cart Cart { get; set; } = null!;
        public virtual Product Product { get; set; } = null!;
    }
}
