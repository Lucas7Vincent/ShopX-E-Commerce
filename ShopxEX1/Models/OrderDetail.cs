namespace ShopxEX1.Models
{
    public class OrderDetail
    {
        public int OrderDetailID { get; set; }
        public int OrderID { get; set; } // FK (NOT NULL trong SQL mới)
        public int ProductID { get; set; } // FK (NOT NULL trong SQL mới)
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        // Bỏ DiscountApplied nếu không có cột

        // Navigation Properties
        public virtual Order Order { get; set; } = null!;
        public virtual Product Product { get; set; } = null!;
    }
}
