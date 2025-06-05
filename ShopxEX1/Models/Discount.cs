namespace ShopxEX1.Models
{
    public class Discount
    {
        public int DiscountID { get; set; }
        public string DiscountCode { get; set; } = string.Empty;
        public decimal DiscountPercent { get; set; }
        public int Budget { get; set; }
        public int MaxDiscountPercent { get; set; }
        public decimal RemainingBudget { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public bool IsActive { get; set; }
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>(); // Quan hệ 1-n
    }
}
