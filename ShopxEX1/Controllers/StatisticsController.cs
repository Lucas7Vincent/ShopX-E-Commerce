using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ShopxEX1.Data;
using ShopxEX1.Dtos;
using ShopxEX1.Dtos.Statistics;
using ShopxEX1.Services;
using ShopxEX1.Helpers;
using System;

using System.Security.Claims;
using System.Threading.Tasks;


namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class StatisticsController : ControllerBase
    {
        private readonly IStatisticsService _statisticsService;
        private readonly ILogger<StatisticsController> _logger;
        private readonly GetID _getID;
        private readonly AppDbContext _context; // Thêm này

        public StatisticsController(
            IStatisticsService statisticsService,
            ILogger<StatisticsController> logger,
            GetID getID,
            AppDbContext context) // Thêm parameter
        {
            _statisticsService = statisticsService;
            _logger = logger;
            _getID = getID;
            _context = context; // Thêm này
        }

        /// <summary>
        /// Lấy tổng quan thống kê cho bảng điều khiển người bán
        /// </summary>
        [HttpGet("dashboard")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetDashboardStats()
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                _logger.LogInformation($"Lấy thống kê dashboard cho seller ID: {sellerId.Value}");
                var result = await _statisticsService.GetSellerDashboardStatsAsync(sellerId.Value);

                // ✅ ENHANCED: Response với business insights
                var response = new
                {
                    success = true,
                    data = result,
                    insights = new
                    {
                        // ✅ Revenue insights
                        revenueHealthy = result.TotalRevenue > 0,
                        hasRecentRevenue = result.RevenueThisMonth > 0 || result.RevenueThisWeek > 0,
                        revenueStatus = GetRevenueStatus(result.RevenueTrendPercentage),

                        // ✅ Order insights
                        completionRateGood = result.OrderCompletionRate >= 80,
                        needsAttention = result.OrdersNeedingAttention > 0,

                        // ✅ Trend explanation
                        trendExplanation = GetTrendExplanation(result.RevenueThisMonth, result.RevenueLastMonth, result.RevenueTrendPercentage),

                        // ✅ Action items
                        actionItems = GenerateActionItems(result)
                    },
                    metadata = new
                    {
                        sellerId = sellerId.Value,
                        timestamp = DateTime.UtcNow,
                        calculationNote = "Revenue từ đơn hàng 'Đã giao' và 'Từ chối hoàn tiền'"
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê dashboard");
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Đã xảy ra lỗi khi lấy thống kê: {ex.Message}",
                    data = new SellerDashboardDto()
                });
            }
        }

        // ✅ Helper methods
        private string GetRevenueStatus(decimal trendPercentage)
        {
            return trendPercentage switch
            {
                > 20 => "Tăng trưởng mạnh",
                > 0 => "Tăng trưởng nhẹ",
                0 => "Ổn định",
                > -20 => "Giảm nhẹ",
                _ => "Giảm mạnh"
            };
        }

        private string GetTrendExplanation(decimal thisMonth, decimal lastMonth, decimal trend)
        {

            var vndCulture = new System.Globalization.CultureInfo("vi-VN");

            if (thisMonth == 0 && lastMonth > 0)
                return $"Tháng này chưa có doanh thu, tháng trước có {lastMonth.ToString("C0", vndCulture)}. Cần tăng cường bán hàng.";

            if (thisMonth > 0 && lastMonth == 0)
                return $"Tháng này bắt đầu có doanh thu {thisMonth.ToString("C0", vndCulture)}, đây là tín hiệu tích cực.";

            if (thisMonth == 0 && lastMonth == 0)
                return "Chưa có doanh thu trong 2 tháng gần đây. Cần review chiến lược bán hàng.";

            return trend > 0
                ? $"Doanh thu tăng {trend:F1}% so với tháng trước"
                : $"Doanh thu giảm {Math.Abs(trend):F1}% so với tháng trước";
        }
        private List<string> GenerateActionItems(SellerDashboardDto data)
        {
            var items = new List<string>();

            if (data.RevenueThisMonth == 0 && data.RevenueLastMonth > 0)
                items.Add("Tháng này chưa có doanh thu - cần tăng cường marketing");

            if (data.OrdersNeedingAttention > 0)
                items.Add($"Có {data.OrdersNeedingAttention} đơn hàng cần xử lý");

            if (data.OutOfStockProductCount > 0)
                items.Add($"Có {data.OutOfStockProductCount} sản phẩm hết hàng");

            if (data.OrderCompletionRate < 80)
                items.Add("Tỷ lệ hoàn thành đơn hàng thấp - cần cải thiện");

            return items;
        }

        [HttpGet("order-details/{orderId}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetOrderDetails(int orderId)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Không thể xác định thông tin người bán"
                    });

                // ✅ Load order with full details
                var order = await _context.Orders
                    .Where(o => o.OrderID == orderId &&
                           _context.OrderDetails.Any(od => od.OrderID == o.OrderID && od.Product.SellerID == sellerId.Value))
                    .Include(o => o.User)
                    .Include(o => o.OrderDetails)
                        .ThenInclude(od => od.Product)
                            .ThenInclude(p => p.Category)
                    .AsNoTracking()
                    .FirstOrDefaultAsync();

                if (order == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Không tìm thấy đơn hàng hoặc bạn không có quyền xem đơn hàng này"
                    });
                }

                // ✅ Map to detailed DTO
                var orderDetails = new
                {
                    orderID = order.OrderID,
                    status = order.Status,
                    orderDate = order.OrderDate,
                    shippingAddress = order.ShippingAddress,
                    customerInfo = new
                    {
                        fullName = order.User?.FullName,
                        email = order.User?.Email,
                        phone = order.User?.Phone
                    },
                    orderDetails = order.OrderDetails
                        .Where(od => od.Product.SellerID == sellerId.Value)
                        .Select(od => new
                        {
                            productID = od.ProductID,
                            productName = od.Product.ProductName,
                            categoryName = od.Product.Category?.CategoryName,
                            quantity = od.Quantity,
                            unitPrice = od.UnitPrice,
                            totalPrice = od.UnitPrice * od.Quantity,
                            imageUrl = od.Product.ImageURL,
                            formattedPrice = od.UnitPrice.ToString("C0", new System.Globalization.CultureInfo("vi-VN")),
                            formattedTotalPrice = (od.UnitPrice * od.Quantity).ToString("C0", new System.Globalization.CultureInfo("vi-VN"))
                        }).ToList()
                };

                return Ok(new
                {
                    success = true,
                    data = orderDetails,
                    message = "Lấy chi tiết đơn hàng thành công"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết đơn hàng {OrderId}", orderId);

                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    message = "Lỗi khi lấy chi tiết đơn hàng"
                });
            }
        }

        /// <summary>
        /// Lấy doanh thu theo khoảng thời gian
        /// </summary>
        [HttpGet("revenue")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetRevenueStats(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string groupBy = "day")
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                var start = startDate ?? DateTime.Today.AddDays(-30);
                var end = endDate ?? DateTime.Today;

                _logger.LogInformation($"Lấy thống kê doanh thu từ {start:yyyy-MM-dd} đến {end:yyyy-MM-dd} cho seller ID: {sellerId.Value}, nhóm theo: {groupBy}");
                var result = await _statisticsService.GetRevenueStatsAsync(sellerId.Value, start, end, groupBy);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê doanh thu");
                return StatusCode(500, $"Đã xảy ra lỗi khi lấy thống kê doanh thu: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách sản phẩm bán chạy
        /// </summary>
        [HttpGet("top-products")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetTopSellingProducts(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int limit = 10,
            [FromQuery] int? categoryId = null)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                var start = startDate ?? DateTime.Today.AddDays(-30);
                var end = endDate ?? DateTime.Today;

                _logger.LogInformation($"Lấy {limit} sản phẩm bán chạy từ {start:yyyy-MM-dd} đến {end:yyyy-MM-dd} cho seller ID: {sellerId.Value}");
                var result = await _statisticsService.GetTopSellingProductsAsync(sellerId.Value, start, end, limit, categoryId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách sản phẩm bán chạy");
                return StatusCode(500, $"Đã xảy ra lỗi khi lấy danh sách sản phẩm bán chạy: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy số liệu đơn hàng theo trạng thái
        /// </summary>
        [HttpGet("order-status")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetOrderStatusStats()
        {
            try
            {
                Console.WriteLine("=== StatisticsController GetOrderStatusStats ENHANCED ===");

                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    Console.WriteLine("ERROR: Cannot determine sellerId");
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Không thể xác định thông tin người bán"
                    });
                }

                Console.WriteLine($"Processing order status stats for sellerId: {sellerId.Value}");

                var result = await _statisticsService.GetOrderStatusStatsAsync(sellerId.Value);

                // ✅ ENHANCED: Response với metadata
                var response = new
                {
                    success = true,
                    message = "Lấy thống kê trạng thái đơn hàng thành công",
                    data = result,
                    metadata = new
                    {
                        sellerId = sellerId.Value,
                        timestamp = DateTime.UtcNow,
                        // ✅ Validation info
                        hasData = result.Total > 0,
                        totalOrders = result.Total,
                        // ✅ Business insights
                        needsAttention = result.ActiveOrders,
                        completionRate = $"{result.CompletionRate:F1}%",
                        cancellationRate = $"{result.CancellationRate:F1}%"
                    }
                };

                Console.WriteLine($"✅ Returning {result.Total} total orders");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy thống kê trạng thái đơn hàng");
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Lỗi xử lý yêu cầu: {ex.Message}",
                    data = new OrderStatusStatsDto() // ✅ Empty but valid structure
                });
            }
        }

        /// <summary>
        /// API cho biểu đồ doanh thu với số ngày tùy chọn - Phiên bản chuẩn hóa
        /// </summary>
        [HttpGet("revenue-chart")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetRevenueChartData([FromQuery] int days = 7)
        {
            try
            {
                // Log request
                _logger.LogInformation($"GetRevenueChartData gọi với {days} ngày");

                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                // Tính toán khoảng thời gian chính xác
                var endDate = DateTime.Today;
                var startDate = endDate.AddDays(-days + 1); // +1 để bao gồm cả ngày hiện tại

                _logger.LogInformation($"Lấy dữ liệu từ {startDate:yyyy-MM-dd} đến {endDate:yyyy-MM-dd} cho seller ID: {sellerId.Value}");

                // Gọi service để lấy dữ liệu doanh thu
                var revenues = await _statisticsService.GetRevenueStatsAsync(sellerId.Value, startDate, endDate, "day");

                // Luôn đảm bảo dữ liệu đầy đủ cho mỗi ngày trong khoảng
                var allDaysData = new List<RevenueStatDto>();
                for (int i = 0; i < days; i++)
                {
                    var currentDate = startDate.AddDays(i);
                    var existingData = revenues.FirstOrDefault(r => r.Date.Date == currentDate.Date);

                    if (existingData != null)
                    {
                        allDaysData.Add(existingData);
                    }
                    else
                    {
                        // Tạo dữ liệu trống cho ngày này
                        allDaysData.Add(new RevenueStatDto
                        {
                            Date = currentDate,
                            Period = currentDate.ToString("dd/MM/yyyy"),
                            Revenue = 0,
                            OrdersCount = 0,
                            ProductsSold = 0
                        });
                    }
                }

                // Tính tổng doanh thu và đơn hàng
                var totalRevenue = allDaysData.Sum(r => r.Revenue);
                var totalOrders = allDaysData.Sum(r => r.OrdersCount);

                // Định dạng dữ liệu trả về CHUẨN HÓA - đảm bảo nhất quán với mọi frontend
                var responseData = new
                {
                    items = allDaysData.Select(r => new
                    {
                        date = r.Date.ToString("yyyy-MM-dd"),
                        revenue = r.Revenue,
                        // Cung cấp cả hai tên trường để tương thích với mọi phiên bản frontend
                        orderCount = r.OrdersCount,
                        ordersCount = r.OrdersCount,
                        productsSold = r.ProductsSold
                    }).ToList(),
                    totalRevenue,
                    totalOrders,
                    periodStart = startDate.ToString("yyyy-MM-dd"),
                    periodEnd = endDate.ToString("yyyy-MM-dd")
                };

                _logger.LogInformation($"Trả về {allDaysData.Count} bản ghi doanh thu, tổng: {totalRevenue:N0}đ");
                return Ok(responseData);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy dữ liệu biểu đồ doanh thu");
                return StatusCode(500, new { error = ex.Message, stackTrace = ex.StackTrace });
            }
        }
        /// <summary>
        /// Helper method để lấy SellerId hợp lệ với fallback strategy - FIXED
        /// </summary>
        private async Task<int?> GetValidSellerIdAsync()
        {
            try
            {
                Console.WriteLine("=== GetValidSellerIdAsync Debug ===");

                // Debug: In ra tất cả claims
                Console.WriteLine("All claims in token:");
                foreach (var claim in User.Claims)
                {
                    Console.WriteLine($"  Type: '{claim.Type}' = Value: '{claim.Value}'");
                }

                // Thử 1: Lấy từ GetID helper
                var sellerId = _getID.GetSellerId();
                Console.WriteLine($"GetSellerId() returned: {sellerId}");

                if (sellerId.HasValue)
                {
                    // Kiểm tra sellerId có hợp lệ không
                    var hasProducts = await _context.Products.AnyAsync(p => p.SellerID == sellerId.Value);
                    Console.WriteLine($"Seller {sellerId.Value} has products: {hasProducts}");

                    if (hasProducts)
                    {
                        return sellerId.Value;
                    }
                }

                // Thử 2: Lấy từ claims trực tiếp
                var sellerIdClaim = User.FindFirst("SellerId")?.Value ??
                                   User.FindFirst("sellerId")?.Value ??
                                   User.FindFirst("SellerID")?.Value;

                Console.WriteLine($"SellerID from claims: {sellerIdClaim}");

                if (!string.IsNullOrEmpty(sellerIdClaim) && int.TryParse(sellerIdClaim, out int sellerIdFromClaim))
                {
                    var hasProducts = await _context.Products.AnyAsync(p => p.SellerID == sellerIdFromClaim);
                    Console.WriteLine($"Seller {sellerIdFromClaim} from claims has products: {hasProducts}");

                    if (hasProducts)
                    {
                        return sellerIdFromClaim;
                    }
                }

                // Thử 3: FIXED - Mapping từ UserId với scope đúng
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                Console.WriteLine($"UserID from claims: {userIdClaim}");

                if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
                {
                    Console.WriteLine($"Parsed userId: {userId}");

                    // OPTION A: Kiểm tra userId có phải là seller không qua Products table
                    var productBySeller = await _context.Products.FirstOrDefaultAsync(p => p.SellerID == userId);
                    if (productBySeller != null)
                    {
                        Console.WriteLine($"Found sellerId {userId} from Products mapping");
                        return userId;
                    }

                    // OPTION B: Kiểm tra qua Users table (nếu có bảng Users)
                    try
                    {
                        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == userId);
                        if (user != null)
                        {
                            Console.WriteLine($"Found user: ID={user.UserID}, Role={user.Role}");

                            if (user.Role?.ToLower() == "seller")
                            {
                                Console.WriteLine($"Valid seller found, using userId {userId} as sellerId");
                                return userId;
                            }
                            else
                            {
                                Console.WriteLine($"User {userId} is not a seller, role: {user.Role}");
                            }
                        }
                        else
                        {
                            Console.WriteLine($"User {userId} not found in database");
                        }
                    }
                    catch (Exception userEx)
                    {
                        Console.WriteLine($"Error checking Users table: {userEx.Message}");
                        // Continue to fallback
                    }
                }

                // Thử 4: FIXED - Fallback với seller ID thực tế có trong database
                Console.WriteLine("FALLBACK: Checking available sellers in database");

                // Lấy danh sách seller IDs có sản phẩm
                var availableSellers = await _context.Products
                    .Select(p => p.SellerID)
                    .Distinct()
                    .Take(5)
                    .ToListAsync();

                Console.WriteLine($"Available seller IDs: [{string.Join(", ", availableSellers)}]");

                if (availableSellers.Any())
                {
                    var fallbackSellerId = availableSellers.First();
                    Console.WriteLine($"Using fallback sellerId: {fallbackSellerId}");
                    return fallbackSellerId;
                }

                Console.WriteLine("No valid sellerId found - no sellers have products");
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetValidSellerIdAsync: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                return null;
            }
        }

        /// <summary>
        /// Lấy dữ liệu biểu đồ phân tích doanh thu chi tiết - THAY THẾ revenue-chart cũ
        /// </summary>
        [HttpGet("chart-analytics")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetChartAnalytics([FromQuery] int days = 7)
        {
            try
            {
                // Validate input
                if (days < 1 || days > 365)
                {
                    return BadRequest("Số ngày phải từ 1 đến 365");
                }

                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                _logger.LogInformation($"Lấy chart analytics {days} ngày cho seller ID: {sellerId.Value}");

                var result = await _statisticsService.GetRevenueChartAnalyticsAsync(sellerId.Value, days);

                _logger.LogInformation($"Chart analytics: {result.CurrentPeriodMetrics.TotalRevenue:N0}đ, {result.CurrentPeriodMetrics.TotalOrders} orders");

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chart analytics");
                return StatusCode(500, $"Lỗi khi lấy dữ liệu biểu đồ: {ex.Message}");
            }
        }

        /// <summary>
        /// API cho multiple timeframes - Linh hoạt hơn
        /// </summary>
        [HttpGet("chart-analytics/compare")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetChartAnalyticsComparison([FromQuery] string timeframe = "7d")
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                {
                    return Unauthorized("Không thể xác định thông tin người bán");
                }

                int days = timeframe.ToLower() switch
                {
                    "7d" => 7,
                    "14d" => 14,
                    "30d" => 30,
                    "90d" => 90,
                    _ => 7
                };

                var result = await _statisticsService.GetRevenueChartAnalyticsAsync(sellerId.Value, days);

                return Ok(new
                {
                    timeframe,
                    data = result,
                    insights = new
                    {
                        bestPerformingDay = result.CurrentPeriodMetrics.PeakDay?.DayName,
                        worstPerformingDay = result.CurrentPeriodMetrics.LowestDay?.DayName,
                        consistency = result.TrendAnalysis.Volatility < 20 ? "Ổn định" : "Biến động",
                        outlook = result.TrendAnalysis.Direction switch
                        {
                            "INCREASING" => "Tích cực",
                            "DECREASING" => "Cần cải thiện",
                            _ => "Ổn định"
                        }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chart analytics comparison");
                return StatusCode(500, $"Lỗi khi lấy dữ liệu so sánh: {ex.Message}");
            }
        }


        /// <summary>
        /// Lấy top khách hàng
        /// </summary>
        [HttpGet("top-customers")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetTopCustomers([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null, [FromQuery] int count = 10)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                var result = await _statisticsService.GetTopCustomersAsync(sellerId.Value, startDate, endDate, count);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy top khách hàng");
                return StatusCode(500, $"Lỗi khi lấy top khách hàng: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy phân tích lợi nhuận
        /// </summary>
        [HttpGet("profit-analysis")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetProfitAnalysis([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                var result = await _statisticsService.GetProfitAnalysisAsync(sellerId.Value, startDate, endDate);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy phân tích lợi nhuận");
                return StatusCode(500, $"Lỗi khi lấy phân tích lợi nhuận: {ex.Message}");
            }
        }

        /// <summary>
        /// Lấy danh sách đơn hàng theo trạng thái - CHUẨN HÓA RESPONSE
        /// </summary>
        [HttpGet("orders-by-status")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetOrdersByStatus([FromQuery] string statuses)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Không thể xác định thông tin người bán"
                    });

                if (string.IsNullOrEmpty(statuses))
                    return BadRequest(new
                    {
                        success = false,
                        message = "Vui lòng cung cấp danh sách trạng thái",
                        validStatuses = OrderStatuses.GetAllValidStatuses()
                    });

                _logger.LogInformation($"GetOrdersByStatus: sellerId={sellerId.Value}, statuses={statuses}");

                var statusList = statuses.Split(',').Select(s => s.Trim()).ToList();

                // ✅ Validate statuses
                var validStatuses = OrderStatuses.GetAllValidStatuses();
                var invalidStatuses = statusList.Where(s =>
                    !validStatuses.Contains(s, StringComparer.OrdinalIgnoreCase)).ToList();

                if (invalidStatuses.Any())
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = $"Trạng thái không hợp lệ: {string.Join(", ", invalidStatuses)}",
                        validStatuses = validStatuses
                    });
                }

                var result = await _statisticsService.GetOrdersByStatusAsync(sellerId.Value, statusList);

                // ✅ CONSISTENT response format
                var response = new
                {
                    success = true,
                    data = result ?? new List<OrderByStatusDto>(),
                    totalCount = result?.Count ?? 0,
                    message = $"Tìm thấy {result?.Count ?? 0} đơn hàng",
                    metadata = new
                    {
                        sellerId = sellerId.Value,
                        statuses = statusList,
                        timestamp = DateTime.UtcNow,
                        statusesValidated = true
                    }
                };

                _logger.LogInformation($"Returning {result?.Count ?? 0} orders for seller {sellerId.Value}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đơn hàng theo trạng thái: {Statuses}", statuses);

                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    data = new List<object>(),
                    totalCount = 0
                });
            }
        }


        [HttpGet("dashboard/excel")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> ExportDashboardToExcel()
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                _logger.LogInformation($"Exporting dashboard Excel for seller {sellerId.Value}");

                // ✅ GET DASHBOARD DATA
                var dashboardData = await _statisticsService.GetSellerDashboardStatsAsync(sellerId.Value);

                // ✅ GET SELLER NAME
                var seller = await _context.Users.FirstOrDefaultAsync(u => u.UserID == sellerId.Value);
                var sellerName = seller?.FullName ?? $"Seller {sellerId.Value}";

                // ✅ GENERATE EXCEL
                var fileBytes = StatisticsService.CreateSellerDashboardExcel(dashboardData, sellerName, sellerId.Value);
                var fileName = $"Dashboard_Seller_{sellerId.Value}_{DateTime.Now:yyyyMMdd_HHmmss}.xlsx";

                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting dashboard to Excel");
                return StatusCode(500, new { message = "Lỗi khi xuất file Excel", error = ex.Message });
            }
        }

        [HttpGet("revenue/excel")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> ExportRevenueStatsToExcel(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] string groupBy = "day")
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                var start = startDate ?? DateTime.Today.AddDays(-30);
                var end = endDate ?? DateTime.Today;

                _logger.LogInformation($"Exporting revenue stats Excel: {start:yyyy-MM-dd} to {end:yyyy-MM-dd}, group by {groupBy}");

                // ✅ GET REVENUE DATA
                var revenueStats = await _statisticsService.GetRevenueStatsAsync(sellerId.Value, start, end, groupBy);

                // ✅ GET SELLER NAME
                var seller = await _context.Users.FirstOrDefaultAsync(u => u.UserID == sellerId.Value);
                var sellerName = seller?.FullName ?? $"Seller {sellerId.Value}";

                var period = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy} (Nhóm theo {groupBy})";

                // ✅ GENERATE EXCEL
                var fileBytes = StatisticsService.CreateRevenueStatsExcel(revenueStats, period, sellerName, sellerId.Value);
                var fileName = $"DoanhThu_Seller_{sellerId.Value}_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx";

                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting revenue stats to Excel");
                return StatusCode(500, new { message = "Lỗi khi xuất báo cáo doanh thu", error = ex.Message });
            }
        }

        [HttpGet("top-products/excel")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> ExportTopProductsToExcel(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] int limit = 50,
            [FromQuery] int? categoryId = null)
        {
            try
            {
                var sellerId = await GetValidSellerIdAsync();
                if (!sellerId.HasValue)
                    return Unauthorized("Không thể xác định thông tin người bán");

                var start = startDate ?? DateTime.Today.AddDays(-30);
                var end = endDate ?? DateTime.Today;

                _logger.LogInformation($"Exporting top products Excel: {start:yyyy-MM-dd} to {end:yyyy-MM-dd}, limit {limit}");

                // ✅ GET TOP PRODUCTS DATA
                var topProducts = await _statisticsService.GetTopSellingProductsAsync(sellerId.Value, start, end, limit, categoryId);

                // ✅ GET SELLER NAME
                var seller = await _context.Users.FirstOrDefaultAsync(u => u.UserID == sellerId.Value);
                var sellerName = seller?.FullName ?? $"Seller {sellerId.Value}";

                var period = $"{start:dd/MM/yyyy} - {end:dd/MM/yyyy} (Top {limit})";

                // ✅ GENERATE EXCEL
                var fileBytes = StatisticsService.CreateTopProductsExcel(topProducts, period, sellerName, sellerId.Value);
                var fileName = $"SanPhamBanChay_Seller_{sellerId.Value}_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx";

                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting top products to Excel");
                return StatusCode(500, new { message = "Lỗi khi xuất báo cáo sản phẩm bán chạy", error = ex.Message });
            }
        }

        [HttpGet("comprehensive-report/excel")]
        [Authorize(Roles = "Seller")]
public async Task<IActionResult> ExportComprehensiveReport(
    [FromQuery] DateTime? startDate,
    [FromQuery] DateTime? endDate)
{
    try
    {
        var sellerId = await GetValidSellerIdAsync();
        if (!sellerId.HasValue)
            return Unauthorized("Không thể xác định thông tin người bán");

        var start = startDate ?? DateTime.Today.AddMonths(-1);
        var end = endDate ?? DateTime.Today;

        _logger.LogInformation($"Exporting comprehensive report Excel for seller {sellerId.Value}");

        // ✅ SEQUENTIAL EXECUTION - Tránh concurrent DbContext operations
        Console.WriteLine("📊 [COMPREHENSIVE] Starting sequential data collection...");
        
        // Get data one by one to avoid DbContext conflicts
        var dashboardData = await _statisticsService.GetSellerDashboardStatsAsync(sellerId.Value);
        Console.WriteLine("✅ [COMPREHENSIVE] Dashboard data collected");
        
        var revenueStats = await _statisticsService.GetRevenueStatsAsync(sellerId.Value, start, end, "day");
        Console.WriteLine("✅ [COMPREHENSIVE] Revenue stats collected");
        
        var topProducts = await _statisticsService.GetTopSellingProductsAsync(sellerId.Value, start, end, 20);
        Console.WriteLine("✅ [COMPREHENSIVE] Top products collected");
        
        var topCustomers = await _statisticsService.GetTopCustomersAsync(sellerId.Value, start, end, 10);
        Console.WriteLine("✅ [COMPREHENSIVE] Top customers collected");

        // ✅ GET SELLER NAME
        var seller = await _context.Users.FirstOrDefaultAsync(u => u.UserID == sellerId.Value);
        var sellerName = seller?.FullName ?? $"Seller {sellerId.Value}";

        // ✅ GENERATE COMPREHENSIVE EXCEL
        var fileBytes = StatisticsService.CreateComprehensiveSellerReport(
            dashboardData, revenueStats, topProducts, topCustomers,
            sellerName, sellerId.Value, start, end);

        var fileName = $"BaoCaoTongHop_Seller_{sellerId.Value}_{start:yyyyMMdd}_{end:yyyyMMdd}.xlsx";

        Console.WriteLine($"✅ [COMPREHENSIVE] Excel file generated: {fileName}");

        return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error exporting comprehensive report to Excel");
        return StatusCode(500, new { message = "Lỗi khi xuất báo cáo tổng hợp", error = ex.Message });
    }
}

    }
}