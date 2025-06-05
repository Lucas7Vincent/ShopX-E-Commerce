using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Reporting;
using System.Globalization;
using System.Linq.Expressions;

namespace ShopxEX1.Services.Implementations
{
    public class ReportingService : IReportingService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<ReportingService> _logger;

        public ReportingService(AppDbContext context, ILogger<ReportingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        // === Báo cáo cho Admin ===
        public async Task<Dictionary<int, List<decimal>>> GetAdminMonthlyRevenueByYearAsync(int year)
        {
            _logger.LogInformation("Admin: Lấy doanh thu hàng tháng cho năm {Year}", year);
            var monthlyRevenue = await _context.Orders
                .Where(o => o.OrderDate.Year == year && o.Status == "Đã giao") // Chỉ tính đơn hàng "Đã giao"
                .GroupBy(o => o.OrderDate.Month)
                .Select(g => new { Month = g.Key, Total = g.Sum(o => o.TotalPayment) }) // Dùng TotalPayment
                .OrderBy(r => r.Month)
                .ToListAsync();

            var result = new Dictionary<int, List<decimal>>();
            var revenuesForYear = new List<decimal>(new decimal[12]); // Khởi tạo list 12 tháng với giá trị 0

            foreach (var revenue in monthlyRevenue)
            {
                if (revenue.Month >= 1 && revenue.Month <= 12)
                {
                    revenuesForYear[revenue.Month - 1] = revenue.Total / 1000000; // Chia cho 1 triệu
                }
            }
            result.Add(year, revenuesForYear);
            return result;
        }


        public async Task<AdminRevenueReportDto> GetAdminOverallRevenueAsync(ReportInterval interval, int? year, int? month, int? quarter)
        {
            _logger.LogInformation("Admin: Lấy báo cáo doanh thu tổng thể - Interval: {Interval}, Year: {Year}, Month: {Month}, Quarter: {Quarter}",
                interval, year, month, quarter);

            var query = _context.Orders.Where(o => o.Status == "Đã giao").AsQueryable();

            var report = new AdminRevenueReportDto();
            var culture = new CultureInfo("vi-VN"); // Để định dạng tên tháng/quý

            switch (interval)
            {
                case ReportInterval.AllTime:
                    // Nhóm theo năm
                    var yearlyData = await query
                        .GroupBy(o => o.OrderDate.Year)
                        .Select(g => new
                        {
                            Year = g.Key,
                            Revenue = g.Sum(o => o.TotalPayment),
                            Orders = g.Count()
                        })
                        .OrderBy(g => g.Year)
                        .ToListAsync();

                    report.TotalRevenue = yearlyData.Sum(y => y.Revenue);
                    report.TotalOrders = yearlyData.Sum(y => y.Orders);
                    report.ChartLabels = yearlyData.Select(y => y.Year.ToString()).ToList();
                    report.ChartRevenueData = yearlyData.Select(y => y.Revenue / 1000000).ToList(); // Triệu VND
                    report.ChartOrderData = yearlyData.Select(y => y.Orders).ToList();
                    break;

                case ReportInterval.Yearly:
                    if (!year.HasValue) throw new ArgumentException("Năm là bắt buộc cho báo cáo theo năm.");
                    query = query.Where(o => o.OrderDate.Year == year.Value);

                    // Nhóm theo tháng
                    var monthlyDataForYear = await query
                        .GroupBy(o => o.OrderDate.Month)
                        .Select(g => new
                        {
                            Month = g.Key,
                            Revenue = g.Sum(o => o.TotalPayment),
                            Orders = g.Count()
                        })
                        .OrderBy(g => g.Month)
                        .ToListAsync();

                    report.TotalRevenue = monthlyDataForYear.Sum(m => m.Revenue);
                    report.TotalOrders = monthlyDataForYear.Sum(m => m.Orders);
                    // Tạo đủ 12 nhãn tháng
                    for (int i = 1; i <= 12; i++)
                    {
                        report.ChartLabels.Add($"Tháng {i}");
                        var dataForMonth = monthlyDataForYear.FirstOrDefault(m => m.Month == i);
                        report.ChartRevenueData.Add(dataForMonth != null ? (dataForMonth.Revenue / 1000000) : 0);
                        report.ChartOrderData.Add(dataForMonth != null ? dataForMonth.Orders : 0);
                    }
                    break;

                case ReportInterval.Quarterly:
                    if (!year.HasValue) throw new ArgumentException("Năm là bắt buộc cho báo cáo theo quý.");
                    // Lấy 10 quý gần nhất, kết thúc bằng quý được chỉ định (hoặc quý hiện tại nếu không có)
                    int targetYear = year.Value;
                    int targetQuarter = quarter ?? (DateTime.UtcNow.Month - 1) / 3 + 1; // Quý hiện tại nếu không có

                    var quarterlyDataList = new List<dynamic>();
                    for (int i = 0; i < 10; i++) // Lấy 10 quý
                    {
                        int currentDataYear = targetYear;
                        int currentDataQuarter = targetQuarter - i;

                        while (currentDataQuarter <= 0)
                        {
                            currentDataQuarter += 4;
                            currentDataYear--;
                        }
                        if (currentDataYear < 1900) break; // Giới hạn năm tối thiểu

                        int firstMonthOfQuarter = (currentDataQuarter - 1) * 3 + 1;
                        DateTime startDate = new DateTime(currentDataYear, firstMonthOfQuarter, 1);
                        DateTime endDate = startDate.AddMonths(3).AddDays(-1);

                        var dataForQuarter = await query
                            .Where(o => o.OrderDate >= startDate && o.OrderDate <= endDate)
                            .GroupBy(o => 1) // Nhóm tất cả lại để sum/count cho quý đó
                            .Select(g => new
                            {
                                Year = currentDataYear,
                                Quarter = currentDataQuarter,
                                Revenue = g.Sum(o => o.TotalPayment),
                                Orders = g.Count()
                            })
                            .FirstOrDefaultAsync();

                        if (dataForQuarter != null)
                        {
                            quarterlyDataList.Add(dataForQuarter);
                        }
                        else // Thêm quý rỗng nếu không có dữ liệu
                        {
                            quarterlyDataList.Add(new { Year = currentDataYear, Quarter = currentDataQuarter, Revenue = 0m, Orders = 0 });
                        }
                    }
                    quarterlyDataList.Reverse(); // Sắp xếp từ cũ đến mới

                    report.TotalRevenue = quarterlyDataList.Sum(q => (decimal)q.Revenue);
                    report.TotalOrders = quarterlyDataList.Sum(q => (int)q.Orders);
                    report.ChartLabels = quarterlyDataList.Select(q => $"Q{q.Quarter}/{q.Year}").ToList();
                    report.ChartRevenueData = quarterlyDataList.Select(q => (decimal)q.Revenue / 1000000).ToList();
                    report.ChartOrderData = quarterlyDataList.Select(q => (int)q.Orders).ToList();
                    break;

                case ReportInterval.Monthly:
                    if (!year.HasValue || !month.HasValue) throw new ArgumentException("Năm và tháng là bắt buộc cho báo cáo theo tháng.");
                    query = query.Where(o => o.OrderDate.Year == year.Value && o.OrderDate.Month == month.Value);

                    // Nhóm theo ngày
                    var dailyDataForMonth = await query
                        .GroupBy(o => o.OrderDate.Day)
                        .Select(g => new
                        {
                            Day = g.Key,
                            Revenue = g.Sum(o => o.TotalPayment),
                            Orders = g.Count()
                        })
                        .OrderBy(g => g.Day)
                        .ToListAsync();

                    report.TotalRevenue = dailyDataForMonth.Sum(d => d.Revenue);
                    report.TotalOrders = dailyDataForMonth.Sum(d => d.Orders);
                    int daysInMonth = DateTime.DaysInMonth(year.Value, month.Value);
                    for (int i = 1; i <= daysInMonth; i++)
                    {
                        report.ChartLabels.Add($"Ngày {i}");
                        var dataForDay = dailyDataForMonth.FirstOrDefault(d => d.Day == i);
                        report.ChartRevenueData.Add(dataForDay != null ? (dataForDay.Revenue / 1000000) : 0);
                        report.ChartOrderData.Add(dataForDay != null ? dataForDay.Orders : 0);
                    }
                    break;
            }

            // RevenueBreakdown có thể bị loại bỏ hoặc điều chỉnh nếu không cần thiết khi đã có biểu đồ
            // Hoặc bạn có thể tạo RevenueBreakdown tương ứng với interval, ví dụ:
            if (interval == ReportInterval.Yearly && year.HasValue)
            {
                report.RevenueBreakdown = report.ChartLabels.Zip(report.ChartRevenueData, (label, rev) => new { label, rev })
                                              .ToDictionary(x => x.label, x => x.rev * 1000000); // Nhân lại 1 triệu
            }


            return report;
        }
    }
}
