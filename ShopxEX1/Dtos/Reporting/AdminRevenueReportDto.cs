namespace ShopxEX1.Dtos.Reporting
{
    public class AdminRevenueReportDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public List<string> ChartLabels { get; set; } = new();          // Nhãn cho trục X (ví dụ: "Tháng 1", "2023", "Q1 2023")
        public List<decimal> ChartRevenueData { get; set; } = new();    // Dữ liệu doanh thu (triệu VND)
        public List<int> ChartOrderData { get; set; } = new();          // Dữ liệu số đơn hàng
        public Dictionary<string, decimal> RevenueBreakdown { get; set; } = new();
    }
}
