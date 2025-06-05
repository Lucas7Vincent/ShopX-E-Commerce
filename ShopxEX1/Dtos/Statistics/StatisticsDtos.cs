using System;
using System.Collections.Generic;

namespace ShopxEX1.Dtos.Statistics
{
    /// <summary>
    /// DTO chứa dữ liệu tổng quan cho dashboard của người bán
    /// </summary>
    public class SellerDashboardDto
    {
        // ✅ Revenue metrics - CHỈ từ "Đã giao"
        public decimal TotalRevenue { get; set; }        
        public decimal RevenueToday { get; set; }
        public decimal RevenueThisWeek { get; set; }
        public decimal RevenueThisMonth { get; set; }
        public decimal RevenueLastMonth { get; set; }
        public decimal RevenueTrendPercentage { get; set; }

        // ✅ Order counts - ĐỒNG BỘ với OrderService ValidOrderStatuses
        public int TotalOrderCount { get; set; }
        public int PendingOrdersCount { get; set; }      // "Chờ xác nhận"
        public int ProcessingOrdersCount { get; set; }   // "Đang xử lý"
        public int ShippingOrdersCount { get; set; }     // "Đang giao"
        public int DeliveredOrdersCount { get; set; }    // ✅ "Đã giao" - FINAL SUCCESS STATE
        public int RefundRequestedCount { get; set; }    // "Yêu cầu trả hàng/ hoàn tiền"
        public int CancelledOrdersCount { get; set; }    // "Đã hủy" + "Đã hoàn tiền"
        public int RefundRejectedCount { get; set; }      // "Từ chối hoàn tiền"

        // ✅ Product metrics
        public int TotalProductCount { get; set; }
        public int AvailableProductCount { get; set; }
        public int OutOfStockProductCount => TotalProductCount - AvailableProductCount;

        // ✅ Business metrics - Updated logic
        public decimal OrderCompletionRate => TotalOrderCount > 0 ? 
            ((decimal)(DeliveredOrdersCount + RefundRejectedCount) / TotalOrderCount) * 100 : 0; // ✅ Based on "Đã giao"

        public decimal OrderCancellationRate => TotalOrderCount > 0 ? 
            ((decimal)CancelledOrdersCount / TotalOrderCount) * 100 : 0;

        public int OrdersNeedingAttention => PendingOrdersCount + RefundRequestedCount;
    }
    /// <summary>
    /// DTO chứa dữ liệu doanh thu theo khoảng thời gian
    /// </summary>
    public class RevenueStatDto
    {
        // Kỳ thời gian định dạng hiển thị (ngày/tháng/năm)
        public string Period { get; set; }

        // Ngày thống kê
        public DateTime Date { get; set; }

        // Doanh thu trong kỳ
        public decimal Revenue { get; set; }

        // Số lượng đơn hàng trong kỳ
        public int OrdersCount { get; set; }

        // Số lượng sản phẩm đã bán trong kỳ
        public int ProductsSold { get; set; }
    }

    /// <summary>
    /// DTO chứa dữ liệu sản phẩm bán chạy
    /// </summary>
    public class TopSellingProductDto
    {
        // ID sản phẩm
        public int ProductID { get; set; }

        // Tên sản phẩm
        public string ProductName { get; set; }

        // URL hình ảnh sản phẩm
        public string ImageURL { get; set; }

        // Số lượng đã bán
        public int QuantitySold { get; set; }

        // Doanh thu từ sản phẩm
        public decimal Revenue { get; set; }

        // Giá bán hiện tại
        public decimal UnitPrice { get; set; }

        // Số lượng tồn kho
        public int RemainingStock { get; set; }
    }

    /// <summary>
    /// DTO chứa số liệu đơn hàng theo trạng thái
    /// </summary>
    public class OrderStatusStatsDto
    {
        public int Pending { get; set; }                // "Chờ xác nhận"
        public int Processing { get; set; }             // "Đang xử lý" 
        public int Shipping { get; set; }               // "Đang giao"
        public int Delivered { get; set; }              // "Đã giao"
        public int RefundRequested { get; set; }        // "Yêu cầu trả hàng/ hoàn tiền"
        public int Cancelled { get; set; }              // "Đã hủy"
        public int Refunded { get; set; }               // "Đã hoàn tiền
        public int RefundRejected { get; set; }         // "Từ chối hoàn tiền"
        
         // ✅ Computed properties - Updated logic
        public int Total => Pending + Processing + Shipping + Delivered + 
                                  RefundRequested + Cancelled + Refunded + RefundRejected;


        public int ActiveOrders => Pending + Processing + Shipping + RefundRequested; // Cần action

        public int SuccessfulOrders => Delivered + RefundRejected; // ✅ CHỈ "Đã giao" là success

        public int ProblematicOrders => Cancelled + Refunded;

        // ✅ Business metrics
        public decimal CompletionRate => Total > 0 ? 
            ((decimal)SuccessfulOrders / Total) * 100 : 0;

        public decimal CancellationRate => Total > 0 ? 
            ((decimal)ProblematicOrders / Total) * 100 : 0;

        public decimal PendingProcessingRate => Total > 0 ? 
            ((decimal)ActiveOrders / Total) * 100 : 0;
    }

    /// <summary>
    /// DTO chứa dữ liệu thống kê theo ngày
    /// </summary>
    public class DailyStatsDto
    {
        // Ngày thống kê
        public DateTime Date { get; set; }

        // Hiển thị tên thứ trong tuần
        public string DayOfWeek { get; set; }

        // Doanh thu trong ngày
        public decimal Revenue { get; set; }

        // Số đơn hàng trong ngày
        public int OrdersCount { get; set; }

        // Số sản phẩm bán được trong ngày
        public int ProductsSold { get; set; }
    }

    /// <summary>
    /// DTO cho dữ liệu phân tích biểu đồ hoàn chỉnh
    /// </summary>
    public class ChartAnalyticsDto
    {
        public string Period { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public List<DailyChartDataDto> DailyData { get; set; } = new();
        public PeriodMetricsDto CurrentPeriodMetrics { get; set; } = new();
        public PeriodMetricsDto PreviousPeriodMetrics { get; set; } = new();
        public GrowthMetricsDto GrowthMetrics { get; set; } = new();
        public TrendAnalysisDto TrendAnalysis { get; set; } = new();
        public string Summary { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho dữ liệu hàng ngày trong biểu đồ
    /// </summary>
    public class DailyChartDataDto
    {
        public DateTime Date { get; set; }
        public string DayLabel { get; set; } = string.Empty; // "25/05"
        public string DayName { get; set; } = string.Empty;  // "Thứ 6"
        public decimal Revenue { get; set; }
        public int OrdersCount { get; set; }
        public int ProductsSold { get; set; }
        public int UniqueCustomers { get; set; }
        public decimal AverageOrderValue { get; set; }
    }

    /// <summary>
    /// DTO cho metrics của một kỳ
    /// </summary>
    public class PeriodMetricsDto
    {
        public string PeriodName { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public int TotalProductsSold { get; set; }
        public int TotalUniqueCustomers { get; set; }
        public decimal AverageOrderValue { get; set; }
        public decimal AverageDailyRevenue { get; set; }
        public int DaysWithSales { get; set; }
        public int TotalDays { get; set; }
        public DailyChartDataDto? PeakDay { get; set; }
        public DailyChartDataDto? LowestDay { get; set; }
    }

    /// <summary>
    /// DTO cho metrics tăng trưởng
    /// </summary>
    public class GrowthMetricsDto
    {
        public decimal RevenueGrowth { get; set; }
        public decimal OrdersGrowth { get; set; }
        public decimal ProductsGrowth { get; set; }
        public decimal CustomersGrowth { get; set; }
        public decimal AOVGrowth { get; set; }
        public decimal DailyRevenueGrowth { get; set; }
    }

    /// <summary>
    /// DTO cho phân tích xu hướng
    /// </summary>
    public class TrendAnalysisDto
    {
        public string Direction { get; set; } = "STABLE"; // INCREASING, DECREASING, STABLE
        public double Strength { get; set; } // 0-1, mức độ mạnh của trend
        public bool IsAccelerating { get; set; }
        public double Volatility { get; set; } // % biến động
        public string Recommendation { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho phân tích lợi nhuận đơn giản
    /// </summary>
    public class ProfitAnalysisDto
    {
        public string AnalysisPeriod { get; set; } = string.Empty;
        public decimal TotalRevenue { get; set; }
        public decimal EstimatedCOGS { get; set; }
        public decimal GrossProfit { get; set; }
        public decimal GrossProfitMargin { get; set; }
        public decimal EstimatedOperatingExpenses { get; set; }
        public decimal NetProfit { get; set; }
        public decimal NetProfitMargin { get; set; }
        public int TotalOrders { get; set; }
        public int TotalQuantitySold { get; set; }
        public decimal AverageOrderProfit { get; set; }
        public List<ProductProfitDto> TopProfitableProducts { get; set; } = new();
        public string Notes { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho lợi nhuận sản phẩm
    /// </summary>
    public class ProductProfitDto
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public decimal EstimatedCOGS { get; set; }
        public decimal GrossProfit { get; set; }
        public int QuantitySold { get; set; }
        public decimal ProfitMargin { get; set; }
    }

    /// <summary>
    /// DTO cho thông tin khách hàng VIP
    /// </summary>
    public class TopCustomerDto
    {
        public int CustomerID { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public int TotalOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public decimal AverageOrderValue { get; set; }
        public DateTime FirstOrderDate { get; set; }
        public DateTime LastOrderDate { get; set; }
        public decimal CustomerLifetimeValue { get; set; }
        public bool IsVIP { get; set; }
    }

    // THÊM VÀO CUỐI FILE (sau ProductProfitDto)

    /// <summary>
    /// DTO cho đơn hàng theo trạng thái
    /// </summary>
    public class OrderByStatusDto
    {
        public int OrderID { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhone { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public int TotalItems { get; set; }
        public bool CreatedToday { get; set; }

    }


    public static class OrderStatuses
    {
        public const string PENDING = "Chờ xác nhận";
        public const string PROCESSING = "Đang xử lý";
        public const string SHIPPING = "Đang giao";
        public const string DELIVERED = "Đã giao";
        public const string REFUND_REQUESTED = "Yêu cầu trả hàng/ hoàn tiền";
        public const string CANCELLED = "Đã hủy";
        public const string REFUNDED = "Đã hoàn tiền";
        public const string REFUND_REJECTED = "Từ chối hoàn tiền";



        public static readonly string[] PENDING_STATUSES = { PENDING, PROCESSING, SHIPPING };
        public static readonly string[] IN_PROGRESS_STATUSES = { DELIVERED }; // Đã giao nhưng chưa hoàn thành
        public static readonly string[] CANCELLED_STATUSES = { CANCELLED, REFUNDED, REFUND_REQUESTED };
        public static readonly string[] ALL_STATUSES = {
        PENDING, PROCESSING, SHIPPING, DELIVERED,
        REFUND_REQUESTED, CANCELLED, REFUNDED, REFUND_REJECTED
    };

        // ✅ Business logic helpers
        public static bool IsRevenueCountable(string status)
        {
            return string.Equals(status, DELIVERED, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(status, REFUND_REJECTED, StringComparison.OrdinalIgnoreCase);
        }
        public static bool IsActiveOrder(string status)
        {
            return status?.Equals(PENDING, StringComparison.OrdinalIgnoreCase) == true ||
                   status?.Equals(PROCESSING, StringComparison.OrdinalIgnoreCase) == true ||
                   status?.Equals(SHIPPING, StringComparison.OrdinalIgnoreCase) == true ||
                   status?.Equals(REFUND_REQUESTED, StringComparison.OrdinalIgnoreCase) == true;
        }

        public static bool IsPending(string status) =>
            PENDING_STATUSES.Contains(status, StringComparer.OrdinalIgnoreCase);

        public static bool IsCancelledOrder(string status)
        {
            return status?.Equals(CANCELLED, StringComparison.OrdinalIgnoreCase) == true ||
                   status?.Equals(REFUNDED, StringComparison.OrdinalIgnoreCase) == true;
        }
        public static bool IsCompletedOrder(string status)
    {
        return status?.Equals(DELIVERED, StringComparison.OrdinalIgnoreCase) == true ||
               status?.Equals(REFUND_REJECTED, StringComparison.OrdinalIgnoreCase) == true; // ✅ THÊM MỚI
    }
        public static bool ShouldIncludeInRevenue(string status)
        {
            return IsRevenueCountable(status); // CHỈ "Đã giao"
        }

        public static bool ShouldIncludeInStats(string status)
        {
            return !IsCancelledOrder(status); // Loại bỏ cancelled/refunded
        }


        /// <summary>
        /// ✅ Lấy tất cả trạng thái hợp lệ
        /// </summary>
        public static List<string> GetAllValidStatuses()
        {
            return new List<string>
            {
                PENDING, PROCESSING, SHIPPING, DELIVERED,
                CANCELLED, REFUNDED, REFUND_REQUESTED, REFUND_REJECTED
            };
        }
    }

}

