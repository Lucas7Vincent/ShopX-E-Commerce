using ShopxEX1.Dtos.Reporting;

namespace ShopxEX1.Services
{
    public enum ReportInterval
    {
        Monthly,
        Quarterly,
        Yearly,
        AllTime
    }

    public interface IReportingService
    {
        // === Báo cáo cho Admin (toàn bộ sàn) ===
        /// <summary>
        /// Lấy dữ liệu doanh thu hàng tháng của toàn sàn cho một năm cụ thể,
        /// được định dạng để dễ dàng sử dụng cho việc vẽ biểu đồ.
        /// Kết quả là một Dictionary với key là năm và value là một List 12 phần tử decimal,
        /// mỗi phần tử tương ứng với doanh thu của một tháng (đã chia cho 1 triệu để đơn vị là triệu VND).
        /// Nếu một tháng không có doanh thu, giá trị sẽ là 0.
        /// Chỉ tính các đơn hàng đã ở trạng thái "Đã giao".
        /// </summary>
        /// <param name="year">Năm cần lấy dữ liệu báo cáo.</param>
        /// <returns>
        /// Một <see cref="Dictionary{TKey, TValue}"/> với TKey là năm (int) và TValue là <see cref="List{T}"/> của decimal.
        /// Ví dụ: { 2024: [doanhThuThang1, doanhThuThang2, ..., doanhThuThang12] }.
        /// Trả về Dictionary chứa mảng 12 số 0 nếu không có dữ liệu cho năm đó.
        /// </returns>
        Task<Dictionary<int, List<decimal>>> GetAdminMonthlyRevenueByYearAsync(int year); 
        /// <summary>
        /// Lấy báo cáo doanh thu tổng thể cho Admin dựa trên một khoảng thời gian xác định.
        /// Tính toán tổng doanh thu, tổng số đơn hàng và có thể bao gồm phân tích chi tiết (breakdown).
        /// Chỉ tính các đơn hàng đã ở trạng thái "Đã giao" hoặc trạng thái hoàn thành tương tự.
        /// </summary>
        /// <param name="interval">Khoảng thời gian báo cáo (Tháng, Quý, Năm, Tất cả).</param>
        /// <param name="year">Năm báo cáo (bắt buộc cho Monthly, Quarterly, Yearly).</param>
        /// <param name="month">Tháng báo cáo (bắt buộc cho Monthly, từ 1 đến 12).</param>
        /// <param name="quarter">Quý báo cáo (bắt buộc cho Quarterly, từ 1 đến 4).</param>
        /// <returns>
        /// Một đối tượng <see cref="AdminRevenueReportDto"/> chứa thông tin báo cáo doanh thu của toàn sàn.
        /// Ném <see cref="ArgumentException"/> nếu các tham số thời gian không hợp lệ cho 'interval' đã chọn.
        /// </returns>
        Task<AdminRevenueReportDto> GetAdminOverallRevenueAsync(ReportInterval interval, int? year, int? month, int? quarter);
    }
}
