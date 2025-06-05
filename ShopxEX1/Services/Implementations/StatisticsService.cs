using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Statistics;
using ShopxEX1.Models;
using System;
using System.Collections.Generic;
using System.Data;
using System.Drawing;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;

namespace ShopxEX1.Services
{
    /// <summary>
    /// Triển khai dịch vụ thống kê và phân tích dữ liệu cho người bán
    /// </summary>
    public class StatisticsService : IStatisticsService
    {
        private readonly AppDbContext _context;

        public StatisticsService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<SellerDashboardDto> GetSellerDashboardStatsAsync(int sellerId)
        {
            try
            {
                Console.WriteLine($"=== GetSellerDashboardStatsAsync FIXED DATE LOGIC for sellerId: {sellerId} ===");

                // ✅ FIXED: Date calculations with proper timezone and range
                var now = DateTime.Now; // Use local time instead of UTC
                var today = now.Date;

                // ✅ FIXED: Proper month boundaries
                var firstDayOfMonth = new DateTime(now.Year, now.Month, 1);
                var lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59);

                var firstDayOfLastMonth = firstDayOfMonth.AddMonths(-1);
                var lastDayOfLastMonth = firstDayOfMonth.AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59);

                // ✅ FIXED: Week boundary (Monday to Sunday)
                var daysSinceMonday = ((int)today.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                var firstDayOfWeek = today.AddDays(-daysSinceMonday);
                var lastDayOfWeek = firstDayOfWeek.AddDays(6).AddHours(23).AddMinutes(59).AddSeconds(59);

                Console.WriteLine($"Date ranges:");
                Console.WriteLine($"  Today: {today:yyyy-MM-dd}");
                Console.WriteLine($"  This month: {firstDayOfMonth:yyyy-MM-dd} to {lastDayOfMonth:yyyy-MM-dd}");
                Console.WriteLine($"  Last month: {firstDayOfLastMonth:yyyy-MM-dd} to {lastDayOfLastMonth:yyyy-MM-dd}");
                Console.WriteLine($"  This week: {firstDayOfWeek:yyyy-MM-dd} to {lastDayOfWeek:yyyy-MM-dd}");

                // Product counts (unchanged)
                var productStats = await _context.Products
                    .Where(p => p.SellerID == sellerId)
                    .GroupBy(p => 1)
                    .Select(g => new
                    {
                        Total = g.Count(),
                        Available = g.Count(p => p.StockQuantity > 0)
                    })
                    .FirstOrDefaultAsync();

                var totalProductCount = productStats?.Total ?? 0;
                var availableProductCount = productStats?.Available ?? 0;

                // ✅ FIXED: Load orders with proper date filtering
                var orders = await _context.Orders
                    .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId))
                    .Include(o => o.User)
                    .Include(o => o.OrderDetails)
                        .ThenInclude(od => od.Product)
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Found {orders.Count} total orders for seller {sellerId}");

                // Order status counts (unchanged - already correct)
                var orderStatusCounts = new
                {
                    Pending = orders.Count(o => string.Equals(o.Status, OrderStatuses.PENDING, StringComparison.OrdinalIgnoreCase)),
                    Processing = orders.Count(o => string.Equals(o.Status, OrderStatuses.PROCESSING, StringComparison.OrdinalIgnoreCase)),
                    Shipping = orders.Count(o => string.Equals(o.Status, OrderStatuses.SHIPPING, StringComparison.OrdinalIgnoreCase)),
                    Delivered = orders.Count(o => string.Equals(o.Status, OrderStatuses.DELIVERED, StringComparison.OrdinalIgnoreCase)),
                    RefundRequested = orders.Count(o => string.Equals(o.Status, OrderStatuses.REFUND_REQUESTED, StringComparison.OrdinalIgnoreCase)),
                    Cancelled = orders.Count(o => string.Equals(o.Status, OrderStatuses.CANCELLED, StringComparison.OrdinalIgnoreCase)),
                    Refunded = orders.Count(o => string.Equals(o.Status, OrderStatuses.REFUNDED, StringComparison.OrdinalIgnoreCase)),
                    RefundRejected = orders.Count(o => string.Equals(o.Status, OrderStatuses.REFUND_REJECTED, StringComparison.OrdinalIgnoreCase))
                };

                // ✅ FIXED: Revenue calculation with correct date filtering
                var revenueCountableOrderDetails = orders
                    .Where(o => OrderStatuses.IsRevenueCountable(o.Status))
                    .SelectMany(o => o.OrderDetails)
                    .Where(od => od.Product.SellerID == sellerId)
                    .ToList();

                Console.WriteLine($"Found {revenueCountableOrderDetails.Count} revenue-countable order details");

                // ✅ FIXED: Revenue calculations with proper date ranges
                var totalRevenue = revenueCountableOrderDetails.Sum(od => od.UnitPrice * od.Quantity);

                var revenueToday = revenueCountableOrderDetails
                    .Where(od => od.Order.OrderDate.Date == today)
                    .Sum(od => od.UnitPrice * od.Quantity);

                var revenueThisWeek = revenueCountableOrderDetails
                    .Where(od => od.Order.OrderDate >= firstDayOfWeek && od.Order.OrderDate <= lastDayOfWeek)
                    .Sum(od => od.UnitPrice * od.Quantity);

                var revenueThisMonth = revenueCountableOrderDetails
                    .Where(od => od.Order.OrderDate >= firstDayOfMonth && od.Order.OrderDate <= lastDayOfMonth)
                    .Sum(od => od.UnitPrice * od.Quantity);

                var revenueLastMonth = revenueCountableOrderDetails
                    .Where(od => od.Order.OrderDate >= firstDayOfLastMonth && od.Order.OrderDate <= lastDayOfLastMonth)
                    .Sum(od => od.UnitPrice * od.Quantity);

                Console.WriteLine($"Revenue breakdown:");
                Console.WriteLine($"  Total: {totalRevenue:C}");
                Console.WriteLine($"  Today: {revenueToday:C}");
                Console.WriteLine($"  This week: {revenueThisWeek:C}");
                Console.WriteLine($"  This month: {revenueThisMonth:C}");
                Console.WriteLine($"  Last month: {revenueLastMonth:C}");

                // ✅ FIXED: Growth calculation with safety checks
                decimal revenueTrendPercentage = 0;

                if (revenueLastMonth > 0)
                {
                    revenueTrendPercentage = Math.Round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100, 2);
                }
                else if (revenueThisMonth > 0)
                {
                    revenueTrendPercentage = 100; // New revenue, 100% growth
                }
                else
                {
                    revenueTrendPercentage = 0; // No data, neutral
                }

                Console.WriteLine($"Revenue trend calculation:");
                Console.WriteLine($"  This month: {revenueThisMonth:C}");
                Console.WriteLine($"  Last month: {revenueLastMonth:C}");
                Console.WriteLine($"  Trend: {revenueTrendPercentage:F2}%");

                return new SellerDashboardDto
                {
                    // Revenue metrics
                    TotalRevenue = totalRevenue,
                    RevenueToday = revenueToday,
                    RevenueThisWeek = revenueThisWeek,
                    RevenueThisMonth = revenueThisMonth,
                    RevenueLastMonth = revenueLastMonth,
                    RevenueTrendPercentage = revenueTrendPercentage,

                    // Order counts
                    TotalOrderCount = orders.Count,
                    PendingOrdersCount = orderStatusCounts.Pending,
                    ProcessingOrdersCount = orderStatusCounts.Processing,
                    ShippingOrdersCount = orderStatusCounts.Shipping,
                    DeliveredOrdersCount = orderStatusCounts.Delivered,
                    RefundRequestedCount = orderStatusCounts.RefundRequested,
                    CancelledOrdersCount = orderStatusCounts.Cancelled + orderStatusCounts.Refunded,
                    RefundRejectedCount = orderStatusCounts.RefundRejected,

                    // Product metrics
                    TotalProductCount = totalProductCount,
                    AvailableProductCount = availableProductCount
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetSellerDashboardStatsAsync: {ex.Message}");
                throw new ApplicationException($"Failed to get dashboard stats for seller {sellerId}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Lấy doanh thu theo khoảng thời gian
        /// </summary>
        public async Task<List<RevenueStatDto>> GetRevenueStatsAsync(int sellerId, DateTime startDate, DateTime endDate, string groupBy = "day")
        {
            try
            {
                Console.WriteLine($"=== GetRevenueStatsAsync for sellerId: {sellerId}, {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd} ===");

                endDate = endDate.AddHours(23).AddMinutes(59).AddSeconds(59);

                var orderDetails = await _context.OrderDetails
            .Include(od => od.Order)
            .Include(od => od.Product)
            .Where(od => od.Product.SellerID == sellerId &&
                   od.Order.OrderDate >= startDate &&
                   od.Order.OrderDate <= endDate &&
                   (od.Order.Status == OrderStatuses.DELIVERED ||
                    od.Order.Status == OrderStatuses.REFUND_REJECTED))
            .AsNoTracking()
            .ToListAsync()
            .ConfigureAwait(false);

                Console.WriteLine($"Found {orderDetails.Count} order details from delivered orders");

                // Rest of grouping logic remains the same...
                var result = new List<RevenueStatDto>();

                switch (groupBy.ToLower())
                {
                    case "week":
                        var weeklyStats = orderDetails
                            .GroupBy(od =>
                            {
                                var date = od.Order.OrderDate.Date;
                                int diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
                                return date.AddDays(-diff);
                            })
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = $"Tuần {CultureInfo.CurrentCulture.Calendar.GetWeekOfYear(g.Key, CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday)}",
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = weeklyStats;
                        break;

                    case "month":
                        var monthlyStats = orderDetails
                            .GroupBy(od => new DateTime(od.Order.OrderDate.Year, od.Order.OrderDate.Month, 1))
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = g.Key.ToString("MM/yyyy"),
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = monthlyStats;
                        break;

                    default: // "day"
                        var dailyStats = orderDetails
                            .GroupBy(od => od.Order.OrderDate.Date)
                            .Select(g => new RevenueStatDto
                            {
                                Date = g.Key,
                                Period = g.Key.ToString("dd/MM/yyyy"),
                                Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                                OrdersCount = g.Select(od => od.OrderID).Distinct().Count(),
                                ProductsSold = g.Sum(od => od.Quantity)
                            })
                            .OrderBy(s => s.Date)
                            .ToList();
                        result = dailyStats;
                        break;
                }

                Console.WriteLine($"✅ Returning {result.Count} revenue statistics records");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRevenueStatsAsync: {ex.Message}");
                throw new ApplicationException($"Failed to get revenue stats for seller {sellerId}: {ex.Message}", ex);
            }
        }
        /// <summary>
        /// Lấy danh sách sản phẩm bán chạy
        /// </summary>
        public async Task<List<TopSellingProductDto>> GetTopSellingProductsAsync(
    int sellerId,
    DateTime startDate,
    DateTime endDate,
    int count = 10,
    int? categoryId = null)
        {
            try
            {
                endDate = endDate.AddHours(23).AddMinutes(59).AddSeconds(59);

                // ✅ FIXED: từ "Đã giao" VÀ "Từ chối hoàn tiền"
                var query = _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                           od.Order.OrderDate >= startDate &&
                           od.Order.OrderDate <= endDate &&
                           (od.Order.Status == OrderStatuses.DELIVERED ||
                            od.Order.Status == OrderStatuses.REFUND_REJECTED)); // ✅ CẢ 2 TRẠNG THÁI

                if (categoryId.HasValue)
                {
                    query = query.Where(od => od.Product.CategoryID == categoryId.Value);
                }

                var orderDetailsList = await query.AsNoTracking().ToListAsync();

                var topProducts = orderDetailsList
                    .GroupBy(od => new
                    {
                        od.ProductID,
                        Name = od.Product.ProductName,
                        ImageUrl = od.Product.ImageURL,
                        CurrentPrice = od.Product.Price,
                        Stock = od.Product.StockQuantity
                    })
                    .Select(g => new TopSellingProductDto
                    {
                        ProductID = g.Key.ProductID,
                        ProductName = g.Key.Name,
                        ImageURL = g.Key.ImageUrl,
                        QuantitySold = g.Sum(od => od.Quantity),
                        Revenue = g.Sum(od => od.UnitPrice * od.Quantity),
                        UnitPrice = g.Key.CurrentPrice,
                        RemainingStock = g.Key.Stock
                    })
                    .OrderByDescending(p => p.QuantitySold)
                    .Take(count)
                    .ToList();

                Console.WriteLine($"✅ Top selling products: {topProducts.Count} items (from revenue-countable orders)");
                return topProducts;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetTopSellingProductsAsync: {ex.Message}");
                throw new ApplicationException($"Failed to get top selling products for seller {sellerId}: {ex.Message}", ex);
            }
        }


        /// <summary>
        /// Lấy số liệu đơn hàng theo trạng thái - FIXED: Mapping đúng trạng thái database
        /// </summary>
        public async Task<OrderStatusStatsDto> GetOrderStatusStatsAsync(int sellerId)
        {
            try
            {
                Console.WriteLine($"=== GetOrderStatusStatsAsync FIXED for sellerId: {sellerId} ===");

                // ✅ Load tất cả orders trước
                var orders = await _context.Orders
                    .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId))
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Found {orders.Count} total orders for seller {sellerId}");

                // ✅ FIXED: Client-side evaluation với OrderStatuses constants
                var stats = new OrderStatusStatsDto
                {
                    Pending = orders.Count(o => string.Equals(o.Status, OrderStatuses.PENDING, StringComparison.OrdinalIgnoreCase)),
                    Processing = orders.Count(o => string.Equals(o.Status, OrderStatuses.PROCESSING, StringComparison.OrdinalIgnoreCase)),
                    Shipping = orders.Count(o => string.Equals(o.Status, OrderStatuses.SHIPPING, StringComparison.OrdinalIgnoreCase)),
                    Delivered = orders.Count(o => string.Equals(o.Status, OrderStatuses.DELIVERED, StringComparison.OrdinalIgnoreCase)),
                    RefundRequested = orders.Count(o => string.Equals(o.Status, OrderStatuses.REFUND_REQUESTED, StringComparison.OrdinalIgnoreCase)),
                    Cancelled = orders.Count(o => string.Equals(o.Status, OrderStatuses.CANCELLED, StringComparison.OrdinalIgnoreCase)),
                    Refunded = orders.Count(o => string.Equals(o.Status, OrderStatuses.REFUNDED, StringComparison.OrdinalIgnoreCase)),
                    RefundRejected = orders.Count(o => string.Equals(o.Status, OrderStatuses.REFUND_REJECTED, StringComparison.OrdinalIgnoreCase)) // ✅ THÊM MỚI

                };

                Console.WriteLine($"Order Status Stats: Pending={stats.Pending}, Processing={stats.Processing}, Shipping={stats.Shipping}, Delivered={stats.Delivered}, RefundRequested={stats.RefundRequested}, Cancelled={stats.Cancelled}, Refunded={stats.Refunded}");
                Console.WriteLine($"Computed Stats: Total={stats.Total}, Active={stats.ActiveOrders}, Successful={stats.SuccessfulOrders}, Problematic={stats.ProblematicOrders}");

                return stats;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetOrderStatusStatsAsync: {ex.Message}");
                throw new ApplicationException($"Failed to get order status stats for seller {sellerId}: {ex.Message}", ex);
            }
        }
        /// <summary>
        /// Lấy danh sách đơn hàng theo trạng thái 
        /// </summary>
        public async Task<List<OrderByStatusDto>> GetOrdersByStatusAsync(int sellerId, List<string> statuses)
        {
            try
            {
                Console.WriteLine($"=== GetOrdersByStatusAsync FIXED SQL TRANSLATION for sellerId: {sellerId}, statuses: [{string.Join(", ", statuses)}] ===");

                if (!statuses.Any())
                {
                    Console.WriteLine("No statuses provided");
                    return new List<OrderByStatusDto>();
                }

                // ✅ FIXED: Load tất cả orders trước, KHÔNG dùng .Contains() với List<string>
                var allOrders = await _context.Orders
                    .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId))
                    .Include(o => o.User)
                    .Include(o => o.OrderDetails)
                        .ThenInclude(od => od.Product)
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Loaded {allOrders.Count} total orders for seller {sellerId}");

                // ✅ FIXED: Client-side filtering với string comparison
                var filteredOrders = allOrders
                    .Where(o => statuses.Any(s =>
                        string.Equals(o.Status, s, StringComparison.OrdinalIgnoreCase)))
                    .OrderByDescending(o => o.OrderDate)
                    .ToList();

                Console.WriteLine($"Filtered to {filteredOrders.Count} orders matching statuses: [{string.Join(", ", statuses)}]");

                // ✅ Map to DTO
                var result = filteredOrders.Select(o => new OrderByStatusDto
                {
                    OrderID = o.OrderID,
                    Status = o.Status,
                    OrderDate = o.OrderDate,
                    TotalAmount = o.OrderDetails
                        .Where(od => od.Product.SellerID == sellerId)
                        .Sum(od => od.UnitPrice * od.Quantity),
                    CustomerName = o.User?.FullName ?? "Khách hàng",
                    CustomerEmail = o.User?.Email ?? "",
                    CustomerPhone = o.User?.Phone ?? "",
                    ShippingAddress = o.ShippingAddress ?? "",
                    TotalItems = o.OrderDetails
                        .Where(od => od.Product.SellerID == sellerId)
                        .Sum(od => od.Quantity),
                    CreatedToday = o.OrderDate.Date == DateTime.Today
                }).ToList();

                Console.WriteLine($"✅ Returning {result.Count} orders by status");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetOrdersByStatusAsync: {ex.Message}");
                throw new ApplicationException($"Failed to get orders by status for seller {sellerId}: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Lấy dữ liệu biểu đồ doanh thu với multiple metrics - THAY THẾ GetLast7DaysStatsAsync
        /// </summary>
        public async Task<ChartAnalyticsDto> GetRevenueChartAnalyticsAsync(int sellerId, int days = 7)
        {
            try
            {
                Console.WriteLine($"=== GetRevenueChartAnalyticsAsync for sellerId: {sellerId}, days: {days} ===");

                // Tính toán khoảng thời gian
                var endDate = DateTime.Today;
                var startDate = endDate.AddDays(-days + 1);

                Console.WriteLine($"Date range: {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");

                // Lấy dữ liệu orders với cùng logic như các method khác
                var orderDetails = await _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                        od.Order.OrderDate.Date >= startDate &&
                        od.Order.OrderDate.Date <= endDate &&
                        (od.Order.Status == OrderStatuses.DELIVERED ||
                            od.Order.Status == OrderStatuses.REFUND_REJECTED)) // ✅ CẢ 2 TRẠNG THÁI
                    .AsNoTracking()
                    .ToListAsync();

                Console.WriteLine($"Found {orderDetails.Count} valid order details");

                // Tạo dữ liệu đầy đủ cho mỗi ngày (bao gồm cả ngày không có dữ liệu)
                var dailyData = new List<DailyChartDataDto>();
                // Dữ liệu kỳ hiện tại
                for (int i = 0; i < days; i++)
                {
                    var currentDate = startDate.AddDays(i);
                    var dayData = orderDetails.Where(od => od.Order.OrderDate.Date == currentDate.Date).ToList();

                    var uniqueCustomers = dayData.Select(od => od.Order.UserID).Distinct().Count();
                    var ordersCount = dayData.Select(od => od.OrderID).Distinct().Count();
                    var revenue = dayData.Sum(od => od.UnitPrice * od.Quantity);

                    dailyData.Add(new DailyChartDataDto
                    {
                        Date = currentDate,
                        DayLabel = currentDate.ToString("dd/MM"),
                        DayName = GetVietnameseDayName(currentDate.DayOfWeek),
                        Revenue = revenue,
                        OrdersCount = ordersCount,
                        ProductsSold = dayData.Sum(od => od.Quantity),
                        UniqueCustomers = uniqueCustomers,
                        AverageOrderValue = ordersCount > 0 ? revenue / ordersCount : 0
                    });
                }
                // Dữ liệu kỳ trước để so sánh (cùng số ngày, nhưng trước đó)
                var prevStartDate = startDate.AddDays(-days);
                var prevEndDate = startDate.AddDays(-1);

                var prevOrderDetails = await _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                        od.Order.OrderDate.Date >= prevStartDate &&
                        od.Order.OrderDate.Date <= prevEndDate &&
                        (od.Order.Status == OrderStatuses.DELIVERED ||
                            od.Order.Status == OrderStatuses.REFUND_REJECTED)) // ✅ CONSISTENT
                    .AsNoTracking()
                    .ToListAsync();

                var previousPeriodData = new List<DailyChartDataDto>();
                for (int i = 0; i < days; i++)
                {
                    var currentDate = prevStartDate.AddDays(i);
                    var dayData = prevOrderDetails.Where(od => od.Order.OrderDate.Date == currentDate.Date).ToList();

                    var uniqueCustomers = dayData.Select(od => od.Order.UserID).Distinct().Count();
                    var ordersCount = dayData.Select(od => od.OrderID).Distinct().Count();
                    var revenue = dayData.Sum(od => od.UnitPrice * od.Quantity);

                    previousPeriodData.Add(new DailyChartDataDto
                    {
                        Date = currentDate,
                        DayLabel = currentDate.ToString("dd/MM"),
                        DayName = GetVietnameseDayName(currentDate.DayOfWeek),
                        Revenue = revenue,
                        OrdersCount = ordersCount,
                        ProductsSold = dayData.Sum(od => od.Quantity),
                        UniqueCustomers = uniqueCustomers,
                        AverageOrderValue = ordersCount > 0 ? revenue / ordersCount : 0
                    });
                }
                // Tính toán các metrics tổng hợp
                var currentMetrics = CalculatePeriodMetrics(dailyData, "Kỳ hiện tại");
                var previousMetrics = CalculatePeriodMetrics(previousPeriodData, "Kỳ trước");

                // Tính toán growth rates
                var growthMetrics = CalculateGrowthMetrics(currentMetrics, previousMetrics);

                // Phân tích trend
                var trendAnalysis = AnalyzeTrend(dailyData);

                return new ChartAnalyticsDto
                {
                    Period = $"{days} ngày gần đây",
                    StartDate = startDate,
                    EndDate = endDate,
                    DailyData = dailyData,
                    CurrentPeriodMetrics = currentMetrics,
                    PreviousPeriodMetrics = previousMetrics,
                    GrowthMetrics = growthMetrics,
                    TrendAnalysis = trendAnalysis,
                    Summary = GenerateSummary(currentMetrics, growthMetrics, trendAnalysis, days)
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetRevenueChartAnalyticsAsync: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Tính toán metrics cho một kỳ
        /// </summary>
        private PeriodMetricsDto CalculatePeriodMetrics(List<DailyChartDataDto> data, string periodName)
        {
            var daysWithData = data.Where(d => d.Revenue > 0).ToList();

            return new PeriodMetricsDto
            {
                PeriodName = periodName,
                TotalRevenue = data.Sum(d => d.Revenue),
                TotalOrders = data.Sum(d => d.OrdersCount),
                TotalProductsSold = data.Sum(d => d.ProductsSold),
                TotalUniqueCustomers = data.Where(d => d.UniqueCustomers > 0).Sum(d => d.UniqueCustomers),
                AverageOrderValue = daysWithData.Any() ? daysWithData.Average(d => d.AverageOrderValue) : 0,
                AverageDailyRevenue = data.Count > 0 ? data.Average(d => d.Revenue) : 0,
                DaysWithSales = daysWithData.Count,
                TotalDays = data.Count,
                PeakDay = data.OrderByDescending(d => d.Revenue).FirstOrDefault(),
                LowestDay = data.OrderBy(d => d.Revenue).FirstOrDefault()
            };
        }

        /// <summary>
        /// Tính toán growth rates so với kỳ trước
        /// </summary>
        private GrowthMetricsDto CalculateGrowthMetrics(PeriodMetricsDto current, PeriodMetricsDto previous)
        {
            return new GrowthMetricsDto
            {
                RevenueGrowth = CalculatePercentageGrowth(current.TotalRevenue, previous.TotalRevenue),
                OrdersGrowth = CalculatePercentageGrowth(current.TotalOrders, previous.TotalOrders),
                ProductsGrowth = CalculatePercentageGrowth(current.TotalProductsSold, previous.TotalProductsSold),
                CustomersGrowth = CalculatePercentageGrowth(current.TotalUniqueCustomers, previous.TotalUniqueCustomers),
                AOVGrowth = CalculatePercentageGrowth(current.AverageOrderValue, previous.AverageOrderValue),
                DailyRevenueGrowth = CalculatePercentageGrowth(current.AverageDailyRevenue, previous.AverageDailyRevenue)
            };
        }

        /// <summary>
        /// Phân tích trend của dữ liệu
        /// </summary>
        private TrendAnalysisDto AnalyzeTrend(List<DailyChartDataDto> data)
        {
            if (data.Count < 3) return new TrendAnalysisDto { Direction = "STABLE", Strength = 0 };

            var revenues = data.Select(d => (double)d.Revenue).ToList();
            var trend = CalculateLinearTrend(revenues);

            var recentDays = data.TakeLast(3).ToList();
            var isAccelerating = recentDays.Count >= 3 &&
                                recentDays[2].Revenue > recentDays[1].Revenue &&
                                recentDays[1].Revenue > recentDays[0].Revenue;

            return new TrendAnalysisDto
            {
                Direction = trend > 0.1 ? "INCREASING" : trend < -0.1 ? "DECREASING" : "STABLE",
                Strength = Math.Abs(trend),
                IsAccelerating = isAccelerating,
                Volatility = CalculateVolatility(revenues),
                Recommendation = GenerateTrendRecommendation(trend, isAccelerating)
            };
        }

        /// <summary>
        /// Helper methods
        /// </summary>
        private decimal CalculatePercentageGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return Math.Round(((current - previous) / previous) * 100, 2);
        }

        private double CalculateLinearTrend(List<double> values)
        {
            if (values.Count < 2) return 0;

            var n = values.Count;
            var sumX = n * (n - 1) / 2;
            var sumY = values.Sum();
            var sumXY = values.Select((y, x) => x * y).Sum();
            var sumX2 = Enumerable.Range(0, n).Sum(x => x * x);

            return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        }

        private double CalculateVolatility(List<double> values)
        {
            if (values.Count < 2) return 0;

            var mean = values.Average();
            var variance = values.Sum(v => Math.Pow(v - mean, 2)) / values.Count;
            return Math.Sqrt(variance) / mean * 100; // CV%
        }

        private string GetVietnameseDayName(DayOfWeek dayOfWeek)
        {
            return dayOfWeek switch
            {
                DayOfWeek.Monday => "Thứ 2",
                DayOfWeek.Tuesday => "Thứ 3",
                DayOfWeek.Wednesday => "Thứ 4",
                DayOfWeek.Thursday => "Thứ 5",
                DayOfWeek.Friday => "Thứ 6",
                DayOfWeek.Saturday => "Thứ 7",
                DayOfWeek.Sunday => "Chủ nhật",
                _ => dayOfWeek.ToString()
            };
        }

        private string GenerateTrendRecommendation(double trend, bool isAccelerating)
        {
            if (trend > 0.2)
            {
                return isAccelerating ? "Xu hướng tăng mạnh và đang tăng tốc! Hãy tăng cường marketing."
                                      : "Xu hướng tích cực, duy trì chiến lược hiện tại.";
            }
            if (trend < -0.2)
            {
                return "Xu hướng giảm, cần xem xét lại chiến lược bán hàng và marketing.";
            }
            return "Doanh thu ổn định, có thể cân nhắc các chiến lược mới để tăng trưởng.";
        }

        private string GenerateSummary(PeriodMetricsDto current, GrowthMetricsDto growth, TrendAnalysisDto trend, int days)
        {
            var summary = $"Trong {days} ngày gần đây: ";
            summary += $"Doanh thu {current.TotalRevenue:N0}đ ({(growth.RevenueGrowth >= 0 ? "+" : "")}{growth.RevenueGrowth}%), ";
            summary += $"{current.TotalOrders} đơn hàng ({(growth.OrdersGrowth >= 0 ? "+" : "")}{growth.OrdersGrowth}%). ";
            summary += $"Xu hướng: {trend.Direction.ToLower()}.";

            return summary;
        }

        /// <summary>
        /// Lấy danh sách top khách hàng của seller
        /// </summary>
        public async Task<List<TopCustomerDto>> GetTopCustomersAsync(int sellerId, DateTime? startDate = null, DateTime? endDate = null, int count = 10)
        {
            try
            {
                var end = endDate ?? DateTime.Today;
                var start = startDate ?? end.AddDays(-90);
                end = end.AddHours(23).AddMinutes(59).AddSeconds(59);

                Console.WriteLine($"=== GetTopCustomersAsync for sellerId: {sellerId}, {start:yyyy-MM-dd} to {end:yyyy-MM-dd} ===");

                var orders = await _context.Orders
                    .Where(o => _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId) &&
                           o.OrderDate >= start && o.OrderDate <= end &&
                           (o.Status == OrderStatuses.DELIVERED ||
                            o.Status == OrderStatuses.REFUND_REJECTED)) // ✅ FIXED: Revenue-countable orders only
                    .Include(o => o.User)
                    .Include(o => o.OrderDetails)
                        .ThenInclude(od => od.Product)
                    .AsNoTracking()
                    .ToListAsync();

                var topCustomers = orders
                    .GroupBy(o => new { o.UserID, o.User.FullName, o.User.Email })
                    .Select(g => new TopCustomerDto
                    {
                        CustomerID = g.Key.UserID,
                        CustomerName = g.Key.FullName ?? "Khách hàng",
                        Email = g.Key.Email ?? "",
                        TotalOrders = g.Count(),
                        TotalSpent = g.Sum(o => o.OrderDetails
                            .Where(od => od.Product.SellerID == sellerId)
                            .Sum(od => od.UnitPrice * od.Quantity)),
                        AverageOrderValue = g.Average(o => o.OrderDetails
                            .Where(od => od.Product.SellerID == sellerId)
                            .Sum(od => od.UnitPrice * od.Quantity)),
                        FirstOrderDate = g.Min(o => o.OrderDate),
                        LastOrderDate = g.Max(o => o.OrderDate),
                        CustomerLifetimeValue = 0,
                        IsVIP = false
                    })
                    .OrderByDescending(c => c.TotalSpent)
                    .Take(count)
                    .ToList();

                if (topCustomers.Any())
                {
                    var vipThreshold = topCustomers.Take(Math.Max(1, topCustomers.Count / 5)).Min(c => c.TotalSpent);
                    topCustomers.ForEach(c =>
                    {
                        c.IsVIP = c.TotalSpent >= vipThreshold;
                        c.CustomerLifetimeValue = c.TotalSpent;
                    });
                }

                Console.WriteLine($"Found {topCustomers.Count} top customers (from revenue-countable orders)");
                return topCustomers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetTopCustomersAsync: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Lấy thống kê lợi nhuận thực tế đơn giản
        /// </summary>
        public async Task<ProfitAnalysisDto> GetProfitAnalysisAsync(int sellerId, DateTime? startDate = null, DateTime? endDate = null)
        {
            try
            {
                var end = endDate ?? DateTime.Today;
                var start = startDate ?? new DateTime(end.Year, end.Month, 1);
                end = end.AddHours(23).AddMinutes(59).AddSeconds(59);

                Console.WriteLine($"=== FIXED Profit Analysis for sellerId: {sellerId}, {start:yyyy-MM-dd} to {end:yyyy-MM-dd} ===");

                // ✅ FIXED: CHỈ từ "Đã giao" VÀ "Từ chối hoàn tiền" cho profit analysis
                var revenueCountableOrderDetails = await _context.OrderDetails
                    .Include(od => od.Order)
                    .Include(od => od.Product)
                    .Where(od => od.Product.SellerID == sellerId &&
                           od.Order.OrderDate >= start &&
                           od.Order.OrderDate <= end &&
                           (od.Order.Status == OrderStatuses.DELIVERED ||
                            od.Order.Status == OrderStatuses.REFUND_REJECTED)) // ✅ CẢ 2 TRẠNG THÁI
                    .AsNoTracking()
                    .ToListAsync();

                if (!revenueCountableOrderDetails.Any())
                {
                    return new ProfitAnalysisDto
                    {
                        AnalysisPeriod = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy}",
                        Notes = "Không có đơn hàng hoàn thành nào trong kỳ này để phân tích lợi nhuận."
                    };
                }

                var totalRevenue = revenueCountableOrderDetails.Sum(od => od.UnitPrice * od.Quantity);
                var totalOrders = revenueCountableOrderDetails.Select(od => od.OrderID).Distinct().Count();
                var totalQuantitySold = revenueCountableOrderDetails.Sum(od => od.Quantity);

                Console.WriteLine($"Base metrics: Revenue={totalRevenue:C}, Orders={totalOrders}, Quantity={totalQuantitySold} (from Delivered + RefundRejected)");

                decimal totalCOGS = 0;
                var productProfitDetails = new List<ProductProfitDto>();

                var productGroups = revenueCountableOrderDetails
                    .GroupBy(od => new { od.ProductID, od.Product.ProductName, od.Product.CategoryID })
                    .ToList();

                foreach (var productGroup in productGroups)
                {
                    var productQuantity = productGroup.Sum(od => od.Quantity);
                    var avgPrice = productGroup.Average(od => od.UnitPrice);
                    var productRevenue = productGroup.Sum(od => od.UnitPrice * od.Quantity);

                    var cogsPercentage = EstimateCOGSPercentage(productGroup.Key.CategoryID, avgPrice);
                    var productCOGS = productRevenue * (cogsPercentage / 100);

                    totalCOGS += productCOGS;

                    productProfitDetails.Add(new ProductProfitDto
                    {
                        ProductID = productGroup.Key.ProductID,
                        ProductName = productGroup.Key.ProductName,
                        Revenue = productRevenue,
                        EstimatedCOGS = productCOGS,
                        GrossProfit = productRevenue - productCOGS,
                        QuantitySold = productQuantity,
                        ProfitMargin = productRevenue > 0 ? ((productRevenue - productCOGS) / productRevenue) * 100 : 0
                    });
                }

                decimal estimatedOperatingExpenses = CalculateOperatingExpenses(totalRevenue, totalOrders, sellerId);

                var grossProfit = totalRevenue - totalCOGS;
                var grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
                var netProfit = grossProfit - estimatedOperatingExpenses;
                var netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
                var avgOrderProfit = totalOrders > 0 ? netProfit / totalOrders : 0;

                var topProfitableProducts = productProfitDetails
                    .OrderByDescending(p => p.GrossProfit)
                    .Take(10)
                    .ToList();

                Console.WriteLine($"Profit Analysis: Gross={grossProfit:C} ({grossProfitMargin:F1}%), Net={netProfit:C} ({netProfitMargin:F1}%) from revenue-countable orders");

                return new ProfitAnalysisDto
                {
                    AnalysisPeriod = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy}",
                    TotalRevenue = totalRevenue,
                    EstimatedCOGS = totalCOGS,
                    GrossProfit = grossProfit,
                    GrossProfitMargin = grossProfitMargin,
                    EstimatedOperatingExpenses = estimatedOperatingExpenses,
                    NetProfit = netProfit,
                    NetProfitMargin = netProfitMargin,
                    TotalOrders = totalOrders,
                    TotalQuantitySold = totalQuantitySold,
                    AverageOrderProfit = avgOrderProfit,
                    TopProfitableProducts = topProfitableProducts,
                    Notes = GenerateProfitAnalysisNotes(grossProfitMargin, netProfitMargin, totalRevenue) +
                           " | Phân tích từ đơn hàng 'Đã giao' và 'Từ chối hoàn tiền'."
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR in GetProfitAnalysisAsync: {ex.Message}");
                return new ProfitAnalysisDto
                {
                    AnalysisPeriod = $"{startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}",
                    Notes = $"Lỗi phân tích lợi nhuận: {ex.Message}"
                };
            }
        }
        // ✅ HELPER: Ước tính COGS percentage dựa trên category và price range
        private decimal EstimateCOGSPercentage(int categoryId, decimal avgPrice)
        {
            // ✅ REALISTIC: Industry-based COGS estimates
            var categoryCogsEstimates = new Dictionary<int, decimal>
    {
        // Electronics: 65-75%
        { 1, 70 }, // Điện tử
        { 2, 68 }, // Máy tính
        
        // Fashion: 40-60%
        { 3, 50 }, // Thời trang nam
        { 4, 52 }, // Thời trang nữ
        { 5, 45 }, // Phụ kiện
        
        // Home & Garden: 50-65%
        { 6, 55 }, // Nội thất
        { 7, 60 }, // Đồ gia dụng
        
        // Books & Media: 60-70%
        { 8, 65 }, // Sách
        { 9, 62 }, // Media
        
        // Sports: 45-55%
        { 10, 50 }, // Thể thao
        
        // Beauty & Health: 30-50%
        { 11, 40 }, // Mỹ phẩm
        { 12, 45 }, // Sức khỏe
    };

            var baseCOGS = categoryCogsEstimates.GetValueOrDefault(categoryId, 55); // Default 55%

            // ✅ Adjust based on price range (higher price = potentially lower COGS%)
            if (avgPrice > 1000000) // > 1M VND - luxury/premium
                baseCOGS -= 5;
            else if (avgPrice < 100000) // < 100K VND - budget
                baseCOGS += 5;

            return Math.Min(Math.Max(baseCOGS, 25), 80); // Clamp between 25-80%
        }

        // ✅ HELPER: Tính toán operating expenses
        private decimal CalculateOperatingExpenses(decimal revenue, int orderCount, int sellerId)
        {
            // ✅ REALISTIC: Operating expense components

            // 1. Platform fees (2-5% of revenue)
            decimal platformFees = revenue * 0.03m; // 3% platform fee

            // 2. Payment processing (2-3% of revenue)
            decimal paymentFees = revenue * 0.025m; // 2.5% payment processing

            // 3. Shipping costs (estimated per order)
            decimal avgShippingCost = 30000m; // 30K VND per order average
            decimal totalShippingCosts = orderCount * avgShippingCost;

            // 4. Marketing expenses (5-10% of revenue for active sellers)
            decimal marketingExpenses = revenue * 0.07m; // 7% marketing

            // 5. Packaging & handling (1-2% of revenue)
            decimal packagingCosts = revenue * 0.015m; // 1.5% packaging

            // 6. Customer service & returns (1-3% of revenue)
            decimal customerServiceCosts = revenue * 0.02m; // 2% customer service

            var totalOpex = platformFees + paymentFees + totalShippingCosts +
                           marketingExpenses + packagingCosts + customerServiceCosts;

            Console.WriteLine($"Operating Expenses Breakdown: Platform={platformFees:C}, Payment={paymentFees:C}, Shipping={totalShippingCosts:C}, Marketing={marketingExpenses:C}, Packaging={packagingCosts:C}, Service={customerServiceCosts:C}");

            return totalOpex;
        }

        // ✅ HELPER: Generate analysis notes
        private string GenerateProfitAnalysisNotes(decimal grossMargin, decimal netMargin, decimal revenue)
        {
            var notes = new List<string>();

            // Revenue assessment
            if (revenue < 1000000) // < 1M
                notes.Add("💡 Doanh thu còn thấp - cần tăng cường marketing và mở rộng sản phẩm");
            else if (revenue > 10000000) // > 10M
                notes.Add("✅ Doanh thu tốt - duy trì và tối ưu hóa hiệu quả");

            // Gross margin assessment
            if (grossMargin < 20)
                notes.Add("⚠️ Biên lợi nhuận gộp thấp - cần xem xét lại giá bán hoặc chi phí nhập hàng");
            else if (grossMargin > 40)
                notes.Add("✅ Biên lợi nhuận gộp tốt - có thể cân nhắc giảm giá để tăng volume");

            // Net margin assessment  
            if (netMargin < 5)
                notes.Add("🔴 Lợi nhuận ròng thấp - cần tối ưu chi phí vận hành");
            else if (netMargin > 15)
                notes.Add("🎯 Lợi nhuận ròng xuất sắc - có thể đầu tư mở rộng");

            // General recommendations
            notes.Add("📊 Số liệu dựa trên ước tính thị trường - để có phân tích chính xác hơn, hãy cập nhật chi phí thực tế của sản phẩm");

            return string.Join(" | ", notes);
        }




        /// <summary>
        /// Xuất báo cáo thống kê dashboard seller ra Excel
        /// </summary>
        public static byte[] CreateSellerDashboardExcel(SellerDashboardDto dashboard, string sellerName, int sellerId)
        {
            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Dashboard Thống Kê");

            // ✅ HEADER SECTION
            worksheet.Cells["A1"].Value = "BÁO CÁO THỐNG KÊ DASHBOARD SELLER";
            worksheet.Cells["A1:G1"].Merge = true;
            worksheet.Cells["A1"].Style.Font.Size = 16;
            worksheet.Cells["A1"].Style.Font.Bold = true;
            worksheet.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;

            worksheet.Cells["A2"].Value = $"Seller: {sellerName} (ID: {sellerId})";
            worksheet.Cells["A2:G2"].Merge = true;
            worksheet.Cells["A2"].Style.Font.Size = 12;

            worksheet.Cells["A3"].Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
            worksheet.Cells["A3:G3"].Merge = true;

            // ✅ REVENUE METRICS
            int row = 5;
            worksheet.Cells[$"A{row}"].Value = "THỐNG KÊ DOANH THU";
            worksheet.Cells[$"A{row}:B{row}"].Merge = true;
            SetHeaderStyle(worksheet.Cells[$"A{row}:B{row}"]);

            var revenueData = new[]
            {
        new { Label = "Tổng doanh thu", Value = dashboard.TotalRevenue },
        new { Label = "Doanh thu hôm nay", Value = dashboard.RevenueToday },
        new { Label = "Doanh thu tuần này", Value = dashboard.RevenueThisWeek },
        new { Label = "Doanh thu tháng này", Value = dashboard.RevenueThisMonth },
        new { Label = "Doanh thu tháng trước", Value = dashboard.RevenueLastMonth },
        new { Label = "Tăng trưởng (%)", Value = dashboard.RevenueTrendPercentage }
    };

            row++;
            foreach (var item in revenueData)
            {
                worksheet.Cells[$"A{row}"].Value = item.Label;
                worksheet.Cells[$"B{row}"].Value = item.Value;

                if (item.Label.Contains("Tăng trưởng"))
                {
                    worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "0.00\"%\"";
                    SetGrowthStyle(worksheet.Cells[$"B{row}"], (decimal)item.Value);
                }
                else
                {
                    worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0\" đ\"";
                }
                row++;
            }

            // ✅ ORDER METRICS
            row += 2;
            worksheet.Cells[$"A{row}"].Value = "THỐNG KÊ ĐỖN HÀNG";
            worksheet.Cells[$"A{row}:B{row}"].Merge = true;
            SetHeaderStyle(worksheet.Cells[$"A{row}:B{row}"]);

            var orderData = new[]
            {
        new { Label = "Tổng đơn hàng", Value = (decimal)dashboard.TotalOrderCount },
        new { Label = "Đang chờ xử lý", Value = (decimal)dashboard.PendingOrdersCount },
        new { Label = "Đang xử lý", Value = (decimal)dashboard.ProcessingOrdersCount },
        new { Label = "Đang giao", Value = (decimal)dashboard.ShippingOrdersCount },
        new { Label = "Đã giao", Value = (decimal)dashboard.DeliveredOrdersCount },
        new { Label = "Đã hủy", Value = (decimal)dashboard.CancelledOrdersCount },
        new { Label = "Tỷ lệ hoàn thành (%)", Value = dashboard.OrderCompletionRate }
    };

            row++;
            foreach (var item in orderData)
            {
                worksheet.Cells[$"A{row}"].Value = item.Label;
                worksheet.Cells[$"B{row}"].Value = item.Value;

                if (item.Label.Contains("Tỷ lệ"))
                {
                    worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "0.00\"%\"";
                }
                else
                {
                    worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0";
                }
                row++;
            }

            // ✅ PRODUCT METRICS
            row += 2;
            worksheet.Cells[$"A{row}"].Value = "THỐNG KÊ SẢN PHẨM";
            worksheet.Cells[$"A{row}:B{row}"].Merge = true;
            SetHeaderStyle(worksheet.Cells[$"A{row}:B{row}"]);

            row++;
            worksheet.Cells[$"A{row}"].Value = "Tổng sản phẩm";
            worksheet.Cells[$"B{row}"].Value = dashboard.TotalProductCount;
            worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0";

            row++;
            worksheet.Cells[$"A{row}"].Value = "Sản phẩm còn hàng";
            worksheet.Cells[$"B{row}"].Value = dashboard.AvailableProductCount;
            worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0";

            // ✅ STYLING
            worksheet.Cells.AutoFitColumns();
            worksheet.Column(1).Width = 25;
            worksheet.Column(2).Width = 20;

            return package.GetAsByteArray();
        }

/// <summary>
/// Xuất báo cáo doanh thu chi tiết ra Excel
/// </summary>
public static byte[] CreateRevenueStatsExcel(List<RevenueStatDto> stats, string period, string sellerName, int sellerId)
{
    using var package = new ExcelPackage();
    var worksheet = package.Workbook.Worksheets.Add("Báo Cáo Doanh Thu");
    
    // ✅ HEADER
    worksheet.Cells["A1"].Value = "BÁO CÁO DOANH THU CHI TIẾT";
    worksheet.Cells["A1:F1"].Merge = true;
    worksheet.Cells["A1"].Style.Font.Size = 16;
    worksheet.Cells["A1"].Style.Font.Bold = true;
    worksheet.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName} (ID: {sellerId})";
    worksheet.Cells["A3"].Value = $"Kỳ báo cáo: {period}";
    worksheet.Cells["A4"].Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
    
    // ✅ DATA HEADERS
    int headerRow = 6;
    var headers = new[] { "STT", "Ngày", "Kỳ", "Doanh thu (VNĐ)", "Số đơn hàng", "Sản phẩm bán" };
    for (int i = 0; i < headers.Length; i++)
    {
        worksheet.Cells[headerRow, i + 1].Value = headers[i];
    }
    SetHeaderStyle(worksheet.Cells[$"A{headerRow}:F{headerRow}"]);
    
    // ✅ DATA ROWS
    int dataRow = headerRow + 1;
    for (int i = 0; i < stats.Count; i++)
    {
        var stat = stats[i];
        worksheet.Cells[dataRow, 1].Value = i + 1;
        worksheet.Cells[dataRow, 2].Value = stat.Date;
        worksheet.Cells[dataRow, 2].Style.Numberformat.Format = "dd/mm/yyyy";
        worksheet.Cells[dataRow, 3].Value = stat.Period;
        worksheet.Cells[dataRow, 4].Value = stat.Revenue;
        worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 5].Value = stat.OrdersCount;
        worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 6].Value = stat.ProductsSold;
        worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0";
        dataRow++;
    }
    
    // ✅ SUMMARY ROW
    dataRow++;
    worksheet.Cells[dataRow, 1].Value = "TỔNG CỘNG";
    worksheet.Cells[$"A{dataRow}:C{dataRow}"].Merge = true;
    SetHeaderStyle(worksheet.Cells[$"A{dataRow}:C{dataRow}"]);
    
    worksheet.Cells[dataRow, 4].Value = stats.Sum(s => s.Revenue);
    worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0\" đ\"";
    worksheet.Cells[dataRow, 5].Value = stats.Sum(s => s.OrdersCount);
    worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0";
    worksheet.Cells[dataRow, 6].Value = stats.Sum(s => s.ProductsSold);
    worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0";
    
    SetHeaderStyle(worksheet.Cells[$"D{dataRow}:F{dataRow}"]);
    
    // ✅ STYLING
    worksheet.Cells.AutoFitColumns();
    
    return package.GetAsByteArray();
}

/// <summary>
/// Xuất báo cáo sản phẩm bán chạy ra Excel
/// </summary>
public static byte[] CreateTopProductsExcel(List<TopSellingProductDto> products, string period, string sellerName, int sellerId)
{
    using var package = new ExcelPackage();
    var worksheet = package.Workbook.Worksheets.Add("Sản Phẩm Bán Chạy");
    
    // ✅ HEADER
    worksheet.Cells["A1"].Value = "BÁO CÁO SẢN PHẨM BÁN CHẠY";
    worksheet.Cells["A1:G1"].Merge = true;
    worksheet.Cells["A1"].Style.Font.Size = 16;
    worksheet.Cells["A1"].Style.Font.Bold = true;
    worksheet.Cells["A1"].Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName} (ID: {sellerId})";
    worksheet.Cells["A3"].Value = $"Kỳ báo cáo: {period}";
    worksheet.Cells["A4"].Value = $"Ngày xuất: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
    
    // ✅ DATA HEADERS
    int headerRow = 6;
    var headers = new[] { "STT", "Mã SP", "Tên sản phẩm", "Số lượng bán", "Doanh thu (VNĐ)", "Giá hiện tại", "Tồn kho" };
    for (int i = 0; i < headers.Length; i++)
    {
        worksheet.Cells[headerRow, i + 1].Value = headers[i];
    }
    SetHeaderStyle(worksheet.Cells[$"A{headerRow}:G{headerRow}"]);
    
    // ✅ DATA ROWS
    int dataRow = headerRow + 1;
    for (int i = 0; i < products.Count; i++)
    {
        var product = products[i];
        worksheet.Cells[dataRow, 1].Value = i + 1;
        worksheet.Cells[dataRow, 2].Value = product.ProductID;
        worksheet.Cells[dataRow, 3].Value = product.ProductName;
        worksheet.Cells[dataRow, 4].Value = product.QuantitySold;
        worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 5].Value = product.Revenue;
        worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 6].Value = product.UnitPrice;
        worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 7].Value = product.RemainingStock;
        worksheet.Cells[dataRow, 7].Style.Numberformat.Format = "#,##0";
        
        // ✅ WARNING for low stock
        if (product.RemainingStock < 10)
        {
            worksheet.Cells[dataRow, 7].Style.Font.Color.SetColor(Color.Red);
            worksheet.Cells[dataRow, 7].Style.Font.Bold = true;
        }
        
        dataRow++;
    }
    
    // ✅ STYLING
    worksheet.Cells.AutoFitColumns();
    worksheet.Column(3).Width = 30; // Product name column wider
    
    return package.GetAsByteArray();
}

/// <summary>
/// Xuất báo cáo tổng hợp seller ra Excel với nhiều sheet
/// </summary>
public static byte[] CreateComprehensiveSellerReport(
    SellerDashboardDto dashboard, 
    List<RevenueStatDto> revenueStats, 
    List<TopSellingProductDto> topProducts, 
    List<TopCustomerDto> topCustomers,
    string sellerName, 
    int sellerId, 
    DateTime startDate, 
    DateTime endDate)
{
    using var package = new ExcelPackage();
    
    // ✅ SHEET 1: Dashboard Overview
    CreateDashboardSheet(package, dashboard, sellerName, sellerId);
    
    // ✅ SHEET 2: Revenue Statistics
    CreateRevenueSheet(package, revenueStats, sellerName, sellerId, startDate, endDate);
    
    // ✅ SHEET 3: Top Products
    CreateTopProductsSheet(package, topProducts, sellerName, sellerId, startDate, endDate);
    
    // ✅ SHEET 4: Top Customers
    CreateTopCustomersSheet(package, topCustomers, sellerName, sellerId, startDate, endDate);
    
    // ✅ SHEET 5: Summary & Insights
    CreateSummarySheet(package, dashboard, revenueStats, topProducts, topCustomers, sellerName, sellerId);
    
    return package.GetAsByteArray();
}



        // ✅ HELPER METHODS
private static void CreateDashboardSheet(ExcelPackage package, SellerDashboardDto dashboard, string sellerName, int sellerId)
{
    var worksheet = package.Workbook.Worksheets.Add("1. Dashboard");
    
    // Header
    worksheet.Cells["A1"].Value = "TỔNG QUAN DASHBOARD";
    worksheet.Cells["A1:F1"].Merge = true;
    SetHeaderStyle(worksheet.Cells["A1:F1"]);
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName} (ID: {sellerId})";
    worksheet.Cells["A3"].Value = $"Báo cáo tạo: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
    
    // Revenue Section
    int row = 5;
    var revenueData = new[]
    {
        new { Label = "Tổng doanh thu", Value = dashboard.TotalRevenue, Format = "#,##0\" đ\"" },
        new { Label = "Doanh thu hôm nay", Value = dashboard.RevenueToday, Format = "#,##0\" đ\"" },
        new { Label = "Doanh thu tuần này", Value = dashboard.RevenueThisWeek, Format = "#,##0\" đ\"" },
        new { Label = "Doanh thu tháng này", Value = dashboard.RevenueThisMonth, Format = "#,##0\" đ\"" },
        new { Label = "Doanh thu tháng trước", Value = dashboard.RevenueLastMonth, Format = "#,##0\" đ\"" },
        new { Label = "Tăng trưởng (%)", Value = dashboard.RevenueTrendPercentage, Format = "0.00\"%\"" }
    };
    
    worksheet.Cells[$"A{row}"].Value = "DOANH THU";
    SetHeaderStyle(worksheet.Cells[$"A{row}:B{row}"]);
    row++;
    
    foreach (var item in revenueData)
    {
        worksheet.Cells[$"A{row}"].Value = item.Label;
        worksheet.Cells[$"B{row}"].Value = item.Value;
        worksheet.Cells[$"B{row}"].Style.Numberformat.Format = item.Format;
        
        if (item.Label.Contains("Tăng trưởng"))
            SetGrowthStyle(worksheet.Cells[$"B{row}"], (decimal)item.Value);
        
        row++;
    }
    
    // Order Section
    row += 2;
    worksheet.Cells[$"A{row}"].Value = "ĐƠN HÀNG";
    SetHeaderStyle(worksheet.Cells[$"A{row}:B{row}"]);
    row++;
    
    var orderData = new[]
    {
        new { Label = "Tổng đơn hàng", Value = dashboard.TotalOrderCount },
        new { Label = "Đang chờ xử lý", Value = dashboard.PendingOrdersCount },
        new { Label = "Đang xử lý", Value = dashboard.ProcessingOrdersCount },
        new { Label = "Đang giao", Value = dashboard.ShippingOrdersCount },
        new { Label = "Đã giao", Value = dashboard.DeliveredOrdersCount },
        new { Label = "Đã hủy", Value = dashboard.CancelledOrdersCount }
    };
    
    foreach (var item in orderData)
    {
        worksheet.Cells[$"A{row}"].Value = item.Label;
        worksheet.Cells[$"B{row}"].Value = item.Value;
        worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0";
        row++;
    }
    
    // Product Section
    row += 2;
    worksheet.Cells[$"A{row}"].Value = "SẢN PHẨM";
    SetHeaderStyle(worksheet.Cells[$"A{row}:B{row}"]);
    row++;
    
    worksheet.Cells[$"A{row}"].Value = "Tổng sản phẩm";
    worksheet.Cells[$"B{row}"].Value = dashboard.TotalProductCount;
    worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0";
    row++;
    
    worksheet.Cells[$"A{row}"].Value = "Sản phẩm còn hàng";
    worksheet.Cells[$"B{row}"].Value = dashboard.AvailableProductCount;
    worksheet.Cells[$"B{row}"].Style.Numberformat.Format = "#,##0";
    
    worksheet.Cells.AutoFitColumns();
}

// ✅ HELPER: Create Revenue Sheet
private static void CreateRevenueSheet(ExcelPackage package, List<RevenueStatDto> revenueStats, string sellerName, int sellerId, DateTime startDate, DateTime endDate)
{
    var worksheet = package.Workbook.Worksheets.Add("2. Doanh Thu");
    
    worksheet.Cells["A1"].Value = "BÁO CÁO DOANH THU CHI TIẾT";
    worksheet.Cells["A1:F1"].Merge = true;
    SetHeaderStyle(worksheet.Cells["A1:F1"]);
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName}";
    worksheet.Cells["A3"].Value = $"Kỳ: {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}";
    
    // Headers
    int headerRow = 5;
    var headers = new[] { "STT", "Ngày", "Doanh thu (VNĐ)", "Số đơn hàng", "Sản phẩm bán", "AOV (VNĐ)" };
    for (int i = 0; i < headers.Length; i++)
    {
        worksheet.Cells[headerRow, i + 1].Value = headers[i];
    }
    SetHeaderStyle(worksheet.Cells[$"A{headerRow}:F{headerRow}"]);
    
    // Data
    int dataRow = headerRow + 1;
    for (int i = 0; i < revenueStats.Count; i++)
    {
        var stat = revenueStats[i];
        var aov = stat.OrdersCount > 0 ? stat.Revenue / stat.OrdersCount : 0;
        
        worksheet.Cells[dataRow, 1].Value = i + 1;
        worksheet.Cells[dataRow, 2].Value = stat.Date;
        worksheet.Cells[dataRow, 2].Style.Numberformat.Format = "dd/mm/yyyy";
        worksheet.Cells[dataRow, 3].Value = stat.Revenue;
        worksheet.Cells[dataRow, 3].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 4].Value = stat.OrdersCount;
        worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 5].Value = stat.ProductsSold;
        worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 6].Value = aov;
        worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0\" đ\"";
        dataRow++;
    }
    
    // Summary
    if (revenueStats.Any())
    {
        dataRow++;
        worksheet.Cells[dataRow, 1].Value = "TỔNG CỘNG";
        worksheet.Cells[$"A{dataRow}:B{dataRow}"].Merge = true;
        SetHeaderStyle(worksheet.Cells[$"A{dataRow}:B{dataRow}"]);
        
        worksheet.Cells[dataRow, 3].Value = revenueStats.Sum(s => s.Revenue);
        worksheet.Cells[dataRow, 3].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 4].Value = revenueStats.Sum(s => s.OrdersCount);
        worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 5].Value = revenueStats.Sum(s => s.ProductsSold);
        worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0";
        
        var totalAov = revenueStats.Sum(s => s.OrdersCount) > 0 ? 
                      revenueStats.Sum(s => s.Revenue) / revenueStats.Sum(s => s.OrdersCount) : 0;
        worksheet.Cells[dataRow, 6].Value = totalAov;
        worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0\" đ\"";
        
        SetHeaderStyle(worksheet.Cells[$"C{dataRow}:F{dataRow}"]);
    }
    
    worksheet.Cells.AutoFitColumns();
}

// ✅ HELPER: Create Top Products Sheet
private static void CreateTopProductsSheet(ExcelPackage package, List<TopSellingProductDto> topProducts, string sellerName, int sellerId, DateTime startDate, DateTime endDate)
{
    var worksheet = package.Workbook.Worksheets.Add("3. Sản Phẩm Hot");
    
    worksheet.Cells["A1"].Value = "TOP SẢN PHẨM BÁN CHẠY";
    worksheet.Cells["A1:H1"].Merge = true;
    SetHeaderStyle(worksheet.Cells["A1:H1"]);
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName}";
    worksheet.Cells["A3"].Value = $"Kỳ: {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}";
    
    // Headers
    int headerRow = 5;
    var headers = new[] { "Top", "Mã SP", "Tên sản phẩm", "Số lượng bán", "Doanh thu (VNĐ)", "Giá bán (VNĐ)", "Tồn kho", "Hiệu suất" };
    for (int i = 0; i < headers.Length; i++)
    {
        worksheet.Cells[headerRow, i + 1].Value = headers[i];
    }
    SetHeaderStyle(worksheet.Cells[$"A{headerRow}:H{headerRow}"]);
    
    // Data
    int dataRow = headerRow + 1;
    for (int i = 0; i < topProducts.Count; i++)
    {
        var product = topProducts[i];
        var performance = product.RemainingStock > 0 ? "🟢 Còn hàng" : 
                         product.RemainingStock == 0 ? "🟡 Hết hàng" : "🔴 Cần nhập";
        
        worksheet.Cells[dataRow, 1].Value = i + 1;
        worksheet.Cells[dataRow, 2].Value = product.ProductID;
        worksheet.Cells[dataRow, 3].Value = product.ProductName;
        worksheet.Cells[dataRow, 4].Value = product.QuantitySold;
        worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 5].Value = product.Revenue;
        worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 6].Value = product.UnitPrice;
        worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 7].Value = product.RemainingStock;
        worksheet.Cells[dataRow, 7].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 8].Value = performance;
        
        // Stock warning colors
        if (product.RemainingStock < 10)
        {
            worksheet.Cells[dataRow, 7].Style.Font.Color.SetColor(Color.Red);
            worksheet.Cells[dataRow, 7].Style.Font.Bold = true;
        }
        
        dataRow++;
    }
    
    worksheet.Cells.AutoFitColumns();
    worksheet.Column(3).Width = 35; // Product name wider
}

// ✅ HELPER: Create Top Customers Sheet
private static void CreateTopCustomersSheet(ExcelPackage package, List<TopCustomerDto> topCustomers, string sellerName, int sellerId, DateTime startDate, DateTime endDate)
{
    var worksheet = package.Workbook.Worksheets.Add("4. Khách Hàng VIP");
    
    worksheet.Cells["A1"].Value = "TOP KHÁCH HÀNG";
    worksheet.Cells["A1:H1"].Merge = true;
    SetHeaderStyle(worksheet.Cells["A1:H1"]);
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName}";
    worksheet.Cells["A3"].Value = $"Kỳ: {startDate:dd/MM/yyyy} - {endDate:dd/MM/yyyy}";
    
    // Headers
    int headerRow = 5;
    var headers = new[] { "Top", "Tên khách hàng", "Email", "Tổng đơn", "Tổng chi tiêu (VNĐ)", "AOV (VNĐ)", "Đơn đầu", "Đơn cuối" };
    for (int i = 0; i < headers.Length; i++)
    {
        worksheet.Cells[headerRow, i + 1].Value = headers[i];
    }
    SetHeaderStyle(worksheet.Cells[$"A{headerRow}:H{headerRow}"]);
    
    // Data
    int dataRow = headerRow + 1;
    for (int i = 0; i < topCustomers.Count; i++)
    {
        var customer = topCustomers[i];
        
        worksheet.Cells[dataRow, 1].Value = i + 1;
        worksheet.Cells[dataRow, 2].Value = customer.CustomerName;
        worksheet.Cells[dataRow, 3].Value = customer.Email;
        worksheet.Cells[dataRow, 4].Value = customer.TotalOrders;
        worksheet.Cells[dataRow, 4].Style.Numberformat.Format = "#,##0";
        worksheet.Cells[dataRow, 5].Value = customer.TotalSpent;
        worksheet.Cells[dataRow, 5].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 6].Value = customer.AverageOrderValue;
        worksheet.Cells[dataRow, 6].Style.Numberformat.Format = "#,##0\" đ\"";
        worksheet.Cells[dataRow, 7].Value = customer.FirstOrderDate;
        worksheet.Cells[dataRow, 7].Style.Numberformat.Format = "dd/mm/yyyy";
        worksheet.Cells[dataRow, 8].Value = customer.LastOrderDate;
        worksheet.Cells[dataRow, 8].Style.Numberformat.Format = "dd/mm/yyyy";
        
        // VIP highlighting
        if (customer.IsVIP)
        {
            worksheet.Cells[dataRow, 1, dataRow, 8].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[dataRow, 1, dataRow, 8].Style.Fill.BackgroundColor.SetColor(Color.LightGoldenrodYellow);
        }
        
        dataRow++;
    }
    
    worksheet.Cells.AutoFitColumns();
}

// ✅ HELPER: Create Summary Sheet
private static void CreateSummarySheet(ExcelPackage package, SellerDashboardDto dashboard, List<RevenueStatDto> revenueStats, List<TopSellingProductDto> topProducts, List<TopCustomerDto> topCustomers, string sellerName, int sellerId)
{
    var worksheet = package.Workbook.Worksheets.Add("5. Tổng Kết & Insights");
    
    worksheet.Cells["A1"].Value = "BÁO CÁO TỔNG KẾT & PHÂN TÍCH";
    worksheet.Cells["A1:F1"].Merge = true;
    SetHeaderStyle(worksheet.Cells["A1:F1"]);
    
    worksheet.Cells["A2"].Value = $"Seller: {sellerName} (ID: {sellerId})";
    worksheet.Cells["A3"].Value = $"Báo cáo tạo: {DateTime.Now:dd/MM/yyyy HH:mm:ss}";
    
    int row = 5;
    
    // Key Metrics Summary
    worksheet.Cells[$"A{row}"].Value = "📊 TỔNG KẾT CHÍNH";
    SetHeaderStyle(worksheet.Cells[$"A{row}:F{row}"]);
    row++;
    
    var keyMetrics = new[]
    {
        new { Label = "💰 Tổng doanh thu", Value = dashboard.TotalRevenue.ToString("C0", new System.Globalization.CultureInfo("vi-VN")) },
        new { Label = "📦 Tổng đơn hàng", Value = dashboard.TotalOrderCount.ToString() },
        new { Label = "📈 Tăng trưởng doanh thu", Value = $"{dashboard.RevenueTrendPercentage:F1}%" },
        new { Label = "🏆 Sản phẩm bán chạy nhất", Value = topProducts.FirstOrDefault()?.ProductName ?? "N/A" },
        new { Label = "👑 Khách hàng VIP", Value = topCustomers.FirstOrDefault()?.CustomerName ?? "N/A" },
        new { Label = "📊 Tỷ lệ hoàn thành đơn", Value = $"{dashboard.OrderCompletionRate:F1}%" }
    };
    
    foreach (var metric in keyMetrics)
    {
        worksheet.Cells[$"A{row}"].Value = metric.Label;
        worksheet.Cells[$"B{row}"].Value = metric.Value;
        worksheet.Cells[$"B{row}"].Style.Font.Bold = true;
        row++;
    }
    
    // Performance Analysis
    row += 2;
    worksheet.Cells[$"A{row}"].Value = "📈 PHÂN TÍCH HIỆU SUẤT";
    SetHeaderStyle(worksheet.Cells[$"A{row}:F{row}"]);
    row++;
    
    var totalRevenue = revenueStats.Sum(r => r.Revenue);
    var totalOrders = revenueStats.Sum(r => r.OrdersCount);
    var avgDailyRevenue = revenueStats.Any() ? totalRevenue / revenueStats.Count : 0;
    var avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    var bestDay = revenueStats.OrderByDescending(r => r.Revenue).FirstOrDefault();
    
    var performanceMetrics = new[]
    {
        new { Label = "💵 Doanh thu trung bình/ngày", Value = avgDailyRevenue.ToString("C0", new System.Globalization.CultureInfo("vi-VN")) },
        new { Label = "🛒 Giá trị đơn hàng trung bình", Value = avgOrderValue.ToString("C0", new System.Globalization.CultureInfo("vi-VN")) },
        new { Label = "🔥 Ngày bán tốt nhất", Value = bestDay != null ? $"{bestDay.Date:dd/MM/yyyy} ({bestDay.Revenue:C0})" : "N/A" },
        new { Label = "📦 Số ngày có bán hàng", Value = $"{revenueStats.Count(r => r.Revenue > 0)}/{revenueStats.Count}" },
        new { Label = "⭐ Sản phẩm có tồn kho thấp", Value = topProducts.Count(p => p.RemainingStock < 10).ToString() }
    };
    
    foreach (var metric in performanceMetrics)
    {
        worksheet.Cells[$"A{row}"].Value = metric.Label;
        worksheet.Cells[$"B{row}"].Value = metric.Value;
        row++;
    }
    
    // Recommendations
    row += 2;
    worksheet.Cells[$"A{row}"].Value = "💡 KHUYẾN NGHỊ";
    SetHeaderStyle(worksheet.Cells[$"A{row}:F{row}"]);
    row++;
    
    var recommendations = GenerateRecommendations(dashboard, revenueStats, topProducts);
    foreach (var recommendation in recommendations)
    {
        worksheet.Cells[$"A{row}"].Value = "•";
        worksheet.Cells[$"B{row}"].Value = recommendation;
        worksheet.Cells[$"B{row}:F{row}"].Merge = true;
        row++;
    }
    
    worksheet.Cells.AutoFitColumns();
    worksheet.Column(2).Width = 50; // Wider for recommendations
}

// ✅ HELPER: Generate recommendations
private static List<string> GenerateRecommendations(SellerDashboardDto dashboard, List<RevenueStatDto> revenueStats, List<TopSellingProductDto> topProducts)
{
    var recommendations = new List<string>();
    
    // Revenue recommendations
    if (dashboard.RevenueTrendPercentage < 0)
        recommendations.Add("Doanh thu giảm so với tháng trước. Cân nhắc tăng cường marketing hoặc khuyến mãi.");
    
    if (dashboard.RevenueTrendPercentage > 20)
        recommendations.Add("Tăng trưởng tốt! Hãy duy trì chất lượng sản phẩm và dịch vụ.");
    
    // Order recommendations
    if (dashboard.OrderCompletionRate < 80)
        recommendations.Add("Tỷ lệ hoàn thành đơn hàng thấp. Cần cải thiện quy trình xử lý đơn hàng.");
    
    // Product recommendations
    var lowStockCount = topProducts.Count(p => p.RemainingStock < 10);
    if (lowStockCount > 0)
        recommendations.Add($"Có {lowStockCount} sản phẩm bán chạy sắp hết hàng. Cần nhập thêm hàng.");
    
    // Customer recommendations
    var avgOrderValue = revenueStats.Sum(r => r.OrdersCount) > 0 ? 
                       revenueStats.Sum(r => r.Revenue) / revenueStats.Sum(r => r.OrdersCount) : 0;
    if (avgOrderValue < 200000) // < 200K
        recommendations.Add("Giá trị đơn hàng trung bình thấp. Cân nhắc bundle sản phẩm hoặc upselling.");
    
    // Performance recommendations
    var daysWithSales = revenueStats.Count(r => r.Revenue > 0);
    var totalDays = revenueStats.Count;
    if (totalDays > 0 && (double)daysWithSales / totalDays < 0.5)
        recommendations.Add("Nhiều ngày không có bán hàng. Cần tăng cường hoạt động marketing thường xuyên.");
    
    if (recommendations.Count == 0)
        recommendations.Add("Hiệu suất kinh doanh tốt! Tiếp tục duy trì và phát triển.");
    
    return recommendations;
}

        private static void SetHeaderStyle(ExcelRange range)
        {
            range.Style.Font.Bold = true;
            range.Style.Fill.PatternType = ExcelFillStyle.Solid;
            range.Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
            range.Style.Border.BorderAround(ExcelBorderStyle.Thin);
            range.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
        }

private static void SetGrowthStyle(ExcelRange cell, decimal value)
{
    if (value > 0)
    {
        cell.Style.Font.Color.SetColor(Color.Green);
        cell.Style.Font.Bold = true;
    }
    else if (value < 0)
    {
        cell.Style.Font.Color.SetColor(Color.Red);
        cell.Style.Font.Bold = true;
    }
}


    }
}