namespace ShopxEX1.Dtos.Orders
{
    // Output: Tóm tắt đơn hàng (cho Seller quản lý, User xem lịch sử)
    public class OrderSummaryDto
    {
        public int OrderID { get; set; }
        public DateTime? OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPayment { get; set; }
        public string Status { get; set; } = string.Empty;
        public int NumberOfItems { get; set; } // Tính toán
        public string? CustomerName { get; set; } // Tên khách hàng (cho Seller/Admin)
    }
}
