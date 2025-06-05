using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Dtos.Reporting;
using ShopxEX1.Helpers;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReportsController : ControllerBase
    {
        private readonly IReportingService _reportingService;
        private readonly ILogger<ReportsController> _logger;
        private readonly GetID _getId;

        public ReportsController(IReportingService reportingService, ILogger<ReportsController> logger, GetID getId)
        {
            _reportingService = reportingService;
            _logger = logger;
            _getId = getId;
        }

        // --- ADMIN REPORTS ---
        [HttpGet("admin/revenue/monthly-by-year/{year:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Dictionary<int, List<decimal>>>> GetAdminMonthlyRevenue(int year)
        {
            if (year <= 1900 || year > DateTime.UtcNow.Year + 5) // Validation năm cơ bản
            {
                return BadRequest(new { message = "Năm không hợp lệ." });
            }
            try
            {
                var data = await _reportingService.GetAdminMonthlyRevenueByYearAsync(year);
                if (data == null || !data.Any())
                {
                    return Ok(new Dictionary<int, List<decimal>> { { year, new List<decimal>(new decimal[12]) } }); // Trả về mảng 0 nếu không có data
                }
                return Ok(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy báo cáo doanh thu hàng tháng của Admin cho năm {Year}.", year);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ." });
            }
        }

        [HttpGet("admin/revenue/overall")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<AdminRevenueReportDto>> GetAdminOverallRevenueReport(
            [FromQuery] ReportInterval interval = ReportInterval.AllTime,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null,
            [FromQuery] int? quarter = null)
        {
            try
            {
                var report = await _reportingService.GetAdminOverallRevenueAsync(interval, year, month, quarter);
                return Ok(report);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy báo cáo doanh thu tổng thể của Admin.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ." });
            }
        }

        [HttpGet("admin/revenue/monthly-by-year/{year:int}/excel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportAdminMonthlyRevenueToExcel(int year)
        {
            if (year <= 1900 || year > DateTime.UtcNow.Year + 5)
            {
                return BadRequest(new { message = "Năm không hợp lệ." });
            }
            try
            {
                var data = await _reportingService.GetAdminMonthlyRevenueByYearAsync(year);
                if (data == null || !data.Any() || !data.ContainsKey(year) || data[year] == null)
                {
                    // Vẫn tạo file excel rỗng hoặc có tiêu đề nhưng không có dữ liệu
                    _logger.LogWarning("Không có dữ liệu doanh thu tháng cho năm {Year} để xuất Excel.", year);
                    var emptyDataForExcel = new Dictionary<int, List<decimal>> { { year, new List<decimal>(new decimal[12]) } };
                    var emptyFileBytes = Function.CreateMonthlyRevenueExcel(emptyDataForExcel, year);
                    return File(emptyFileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"DoanhThuThang_Nam{year}.xlsx");
                }

                var fileBytes = Function.CreateMonthlyRevenueExcel(data, year);
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"DoanhThuThang_Nam{year}.xlsx");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xuất Excel báo cáo doanh thu hàng tháng của Admin cho năm {Year}.", year);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi tạo file Excel." });
            }
        }

        [HttpGet("admin/revenue/overall/excel")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ExportAdminOverallRevenueToExcel(
            [FromQuery] ReportInterval interval = ReportInterval.AllTime,
            [FromQuery] int? year = null,
            [FromQuery] int? month = null,
            [FromQuery] int? quarter = null)
        {
            try
            {
                var reportDto = await _reportingService.GetAdminOverallRevenueAsync(interval, year, month, quarter);
                if (reportDto == null)
                {
                    return NotFound(new { message = "Không tìm thấy dữ liệu báo cáo để xuất." });
                }

                string reportTitle = $"Báo cáo Doanh thu Tổng thể - {interval}";
                if (interval == ReportInterval.Yearly && year.HasValue) reportTitle += $" - Năm {year.Value}";
                else if (interval == ReportInterval.Quarterly && year.HasValue && quarter.HasValue) reportTitle += $" - Q{quarter.Value}/{year.Value}";
                else if (interval == ReportInterval.Monthly && year.HasValue && month.HasValue) reportTitle += $" - Tháng {month.Value}/{year.Value}";

                var fileBytes = Function.CreateOverallRevenueExcel(reportDto, reportTitle);
                string fileName = $"BaoCaoDoanhThuTongThe_{interval}{(year.HasValue ? "_" + year.Value : "")}{(month.HasValue ? "_T" + month.Value : "")}{(quarter.HasValue ? "_Q" + quarter.Value : "")}.xlsx";

                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xuất Excel báo cáo doanh thu tổng thể của Admin.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi tạo file Excel." });
            }
        }
    }
}
