namespace ShopxEX1.Models
{
    public class Order
    {
        public int OrderID { get; set; }
        public int UserID { get; set; } // FK (NOT NULL trong SQL mới)
        public int? DiscountID { get; set; }
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPayment { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? DiscountCode { get; set; } // Cho phép NULL
        public string ShippingAddress { get; set; } = string.Empty;

        // Navigation Properties
        public virtual User User { get; set; } = null!; // Quan hệ n-1
        public virtual Discount Discount { get; set; } = null!; // Quan hệ n-1
        public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>(); // Quan hệ 1-n
    }
}
