using ShopxEX1.Dtos.Statistics;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ShopxEX1.Services
{
    /// <summary>
    /// Interface định nghĩa các phương thức phục vụ thống kê và phân tích dữ liệu cho người bán
    /// </summary>
    public interface IStatisticsService
    {
        /// <summary>
        /// Lấy tổng quan thống kê cho bảng điều khiển người bán
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <returns>Dữ liệu thống kê tổng quan</returns>
        Task<SellerDashboardDto> GetSellerDashboardStatsAsync(int sellerId);

        /// <summary>
        /// Lấy doanh thu theo khoảng thời gian
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <param name="startDate">Ngày bắt đầu</param>
        /// <param name="endDate">Ngày kết thúc</param>
        /// <param name="groupBy">Nhóm theo (day, week, month, year)</param>
        /// <returns>Danh sách doanh thu theo thời gian</returns>
        Task<List<RevenueStatDto>> GetRevenueStatsAsync(int sellerId, DateTime startDate, DateTime endDate, string groupBy = "day");

        /// <summary>
        /// Lấy danh sách sản phẩm bán chạy
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <param name="startDate">Ngày bắt đầu</param>
        /// <param name="endDate">Ngày kết thúc</param>
        /// <param name="count">Số lượng sản phẩm muốn lấy</param>
        /// <param name="categoryId">ID của danh mục (nếu muốn lọc theo danh mục)</param>
        /// <returns>Danh sách sản phẩm bán chạy</returns>
        Task<List<TopSellingProductDto>> GetTopSellingProductsAsync(
            int sellerId,
            DateTime startDate,
            DateTime endDate,
            int count = 10,
            int? categoryId = null);

        /// <summary>
        /// Lấy số liệu đơn hàng theo trạng thái
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <returns>Thống kê số lượng đơn hàng theo trạng thái</returns>
        Task<OrderStatusStatsDto> GetOrderStatusStatsAsync(int sellerId);

        /// <summary>
        /// Lấy doanh thu và đơn hàng theo từng ngày trong 7 ngày gần đây
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <returns>Danh sách thống kê theo ngày</returns>
        Task<ChartAnalyticsDto> GetRevenueChartAnalyticsAsync(int sellerId, int days = 7);

        /// <summary>
        /// Lấy danh sách khách hàng VIP và thống kê chi tiêu
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <param name="startDate">Ngày bắt đầu (mặc định 3 tháng trước)</param>
        /// <param name="endDate">Ngày kết thúc (mặc định hôm nay)</param>
        /// <param name="count">Số lượng khách hàng muốn lấy (mặc định 10)</param>
        /// <returns>Danh sách top khách hàng theo tổng chi tiêu</returns>
        Task<List<TopCustomerDto>> GetTopCustomersAsync(int sellerId, DateTime? startDate = null, DateTime? endDate = null, int count = 10);

        /// <summary>
        /// Phân tích lợi nhuận thực tế của seller
        /// </summary>
        /// <param name="sellerId">ID của người bán</param>
        /// <param name="startDate">Ngày bắt đầu (mặc định đầu tháng hiện tại)</param>
        /// <param name="endDate">Ngày kết thúc (mặc định hôm nay)</param>
        /// <returns>Thống kê lợi nhuận chi tiết bao gồm sản phẩm có lời nhất</returns>
        Task<ProfitAnalysisDto> GetProfitAnalysisAsync(int sellerId, DateTime? startDate = null, DateTime? endDate = null);
// THÊM VÀO CUỐI INTERFACE (trước dấu đóng ngoặc)

/// <summary>
/// Lấy danh sách đơn hàng theo trạng thái
/// </summary>
/// <param name="sellerId">ID của người bán</param>
/// <param name="statuses">Danh sách trạng thái cần lọc</param>
/// <returns>Danh sách đơn hàng theo trạng thái</returns>
Task<List<OrderByStatusDto>> GetOrdersByStatusAsync(int sellerId, List<string> statuses);

    }
}