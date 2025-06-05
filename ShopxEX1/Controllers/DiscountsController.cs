using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Dtos.Discounts;
using ShopxEX1.Helpers;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DiscountsController : ControllerBase
    {
        private readonly IDiscountService _discountService;
        private readonly ILogger<DiscountsController> _logger;

        public DiscountsController(IDiscountService discountService, ILogger<DiscountsController> logger)
        {
            _discountService = discountService;
            _logger = logger;
        }

        /// <summary>
        /// Lấy danh sách tất cả mã giảm giá với tùy chọn lọc và phân trang.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResult<DiscountDto>>> GetAllDiscounts(
            [FromQuery] DiscountFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] string pageSizeInput = "10")
        {
            // ... (logic xử lý pageSize và pageNumber giữ nguyên) ...
            const int DefaultPageSize = 10;
            const int MaxPageSize = 50;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize) || pageSize <= 0) pageSize = DefaultPageSize;
            if (pageSize > MaxPageSize) pageSize = MaxPageSize;
            if (pageNumber < 1) pageNumber = 1;

            try
            {
                _logger.LogInformation("Đang lấy danh sách mã giảm giá - Trang: {PageNumber}, Kích thước trang: {PageSize}, Filter: Search='{SearchTerm}', Active='{IsActive}', ValidOn='{ValidOnDate}'",
                    pageNumber, pageSize, filter.SearchTerm, filter.IsActive, filter.ValidOnDate);

                var result = await _discountService.GetAllDiscountsAsync(filter, pageNumber, pageSize);

                // Không cần kiểm tra result.Items.Any() ở đây vì service đã trả về PagedResult
                // PagedResult có thể có Items rỗng nhưng vẫn là kết quả hợp lệ.
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách mã giảm giá. Filter: Search='{SearchTerm}', Active='{IsActive}', ValidOn='{ValidOnDate}'",
                    filter.SearchTerm, filter.IsActive, filter.ValidOnDate);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Đã xảy ra lỗi máy chủ khi xử lý yêu cầu của bạn." });
            }
        }

        /// <summary>
        /// [Customer/Public] Lấy danh sách tất cả mã giảm giá còn hoạt động và còn hạn.
        /// </summary>
        [HttpGet("all")]
        [AllowAnonymous]
        public async Task<ActionResult<List<DiscountDto>>> GetAllDiscountsCustomerPage()
        {
            _logger.LogInformation("Đang xử lý yêu cầu lấy tất cả mã giảm giá cho trang khách hàng.");
            try
            {
                var result = await _discountService.GetAllDiscountsCustomerPageAsync();
                // Không cần kiểm tra result.Any() nếu service trả về danh sách rỗng là hợp lệ
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn xảy ra khi lấy tất cả mã giảm giá cho trang khách hàng.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Đã xảy ra lỗi máy chủ nội bộ." });
            }
        }

        /// <summary>
        /// Tạo một mã giảm giá mới.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<DiscountDto>> CreateDiscount([FromBody] DiscountCreateDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var discountDto = await _discountService.CreateDiscountAsync(createDto);
                // Service sẽ ném lỗi nếu không tạo được, nên không cần kiểm tra discountDto == null ở đây nữa.
                return CreatedAtAction(nameof(GetDiscountById), new { id = discountDto!.DiscountID }, discountDto);
            }
            catch (ArgumentException ex) // Bắt lỗi cụ thể từ service
            {
                _logger.LogWarning(ex, "Lỗi tham số khi tạo mã giảm giá '{DiscountCode}': {ErrorMessage}", createDto.DiscountCode, ex.Message);
                return BadRequest(new { message = ex.Message }); // Trả về message từ exception
            }
            catch (InvalidOperationException ex) // Bắt lỗi cụ thể từ service
            {
                _logger.LogWarning(ex, "Lỗi logic khi tạo mã giảm giá '{DiscountCode}' (ví dụ: mã đã tồn tại): {ErrorMessage}", createDto.DiscountCode, ex.Message);
                return Conflict(new { message = ex.Message }); // Trả về message từ exception, 409 Conflict thường phù hợp cho mã đã tồn tại
            }
            catch (DbUpdateException ex) // Bắt lỗi DB cụ thể
            {
                _logger.LogError(ex, "Lỗi DbUpdateException khi tạo mã giảm giá '{DiscountCode}'. InnerException: {InnerException}", createDto.DiscountCode, ex.InnerException?.Message);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi khi lưu vào cơ sở dữ liệu. Vui lòng kiểm tra lại thông tin hoặc thử lại sau." });
            }
            catch (Exception ex) // Bắt các lỗi chung khác từ service
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi tạo mã giảm giá '{DiscountCode}'.", createDto.DiscountCode);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Đã xảy ra lỗi không mong muốn trong quá trình tạo mã giảm giá." });
            }
        }

        /// <summary>
        /// Lấy thông tin chi tiết của một mã giảm giá bằng ID.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpGet("{id:int}", Name = "GetDiscountById")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<DiscountDto>> GetDiscountById(int id)
        {
            try
            {
                var discount = await _discountService.GetDiscountByIdAsync(id);
                if (discount == null)
                {
                    _logger.LogInformation("Không tìm thấy mã giảm giá với ID: {DiscountId}", id);
                    return NotFound(new { message = $"Không tìm thấy mã giảm giá với ID: {id}" });
                }
                return Ok(discount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy mã giảm giá ID {DiscountId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi lấy thông tin mã giảm giá." });
            }
        }

        /// <summary>
        /// Lấy thông tin mã giảm giá bằng mã code.
        /// Có thể truy cập ẩn danh (cho user kiểm tra) hoặc Admin.
        /// </summary>
        [HttpGet("code/{code}")]
        [AllowAnonymous]
        public async Task<ActionResult<DiscountDto>> GetDiscountByCode(string code, [FromQuery] bool checkCurrentValidity = false)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                return BadRequest(new { message = "Mã giảm giá không được để trống." });
            }
            try
            {
                var discount = await _discountService.GetDiscountByCodeAsync(code, checkCurrentValidity);
                if (discount == null)
                {
                    _logger.LogInformation("Mã giảm giá '{DiscountCode}' không hợp lệ hoặc không tìm thấy (checkValidity: {CheckValidity}).", code, checkCurrentValidity);
                    return NotFound(new { message = $"Mã giảm giá '{code}' không hợp lệ hoặc không tìm thấy." });
                }
                return Ok(discount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy mã giảm giá theo code '{DiscountCode}'.", code);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi lấy thông tin mã giảm giá." });
            }
        }

        /// <summary>
        /// Cập nhật thông tin mã giảm giá.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<DiscountDto>> UpdateDiscount(int id, [FromBody] DiscountUpdateDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var updatedDiscount = await _discountService.UpdateDiscountAsync(id, updateDto);
                if (updatedDiscount == null) // Service trả về null nếu không tìm thấy
                {
                    _logger.LogWarning("Không tìm thấy mã giảm giá ID {DiscountId} để cập nhật.", id);
                    return NotFound(new { message = $"Không tìm thấy mã giảm giá với ID: {id} để cập nhật." });
                }
                return Ok(updatedDiscount);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Lỗi tham số khi cập nhật mã giảm giá ID {DiscountId}: {ErrorMessage}", id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex) // Ví dụ: mã mới bị trùng
            {
                _logger.LogWarning(ex, "Lỗi logic khi cập nhật mã giảm giá ID {DiscountId}: {ErrorMessage}", id, ex.Message);
                return Conflict(new { message = ex.Message });
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Lỗi xung đột đồng thời khi cập nhật mã giảm giá ID {DiscountId}.", id);
                return Conflict(new { message = "Dữ liệu đã được thay đổi bởi người khác. Vui lòng tải lại và thử lại." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi cập nhật mã giảm giá ID {DiscountId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi cập nhật mã giảm giá." });
            }
        }

        /// <summary>
        /// Thay đổi trạng thái kích hoạt (active/inactive) của mã giảm giá.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpPatch("{id:int}/toggle-status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ToggleDiscountStatus(int id, [FromBody] ToggleStatusRequest request) // Giả sử ToggleStatusRequest có thuộc tính bool IsActive
        {
            if (request == null) return BadRequest("Dữ liệu yêu cầu không hợp lệ.");
            try
            {
                var success = await _discountService.ToggleDiscountStatusAsync(id, request.IsActive);
                if (!success) // Service trả về false nếu không tìm thấy
                {
                    _logger.LogWarning("Không tìm thấy mã giảm giá ID {DiscountId} để thay đổi trạng thái.", id);
                    return NotFound(new { message = $"Không tìm thấy mã giảm giá với ID: {id} để thay đổi trạng thái." });
                }
                return NoContent(); // Hoặc Ok(new { message = "Trạng thái đã được cập nhật." })
            }
            catch (InvalidOperationException ex) // Ví dụ: cố kích hoạt mã đã hết hạn
            {
                _logger.LogWarning(ex, "Lỗi logic khi thay đổi trạng thái mã giảm giá ID {DiscountId}: {ErrorMessage}", id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi thay đổi trạng thái mã giảm giá ID: {ID}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Xóa một mã giảm giá.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteDiscount(int id)
        {
            try
            {
                var success = await _discountService.DeleteDiscountAsync(id);
                if (!success) // Service trả về false nếu không tìm thấy
                {
                    _logger.LogWarning("Không tìm thấy mã giảm giá ID {DiscountId} để xóa.", id);
                    return NotFound(new { message = $"Không tìm thấy mã giảm giá với ID: {id} để xóa." });
                }
                return NoContent();
            }
            catch (InvalidOperationException ex) // Ví dụ: không thể xóa vì đã được sử dụng
            {
                _logger.LogWarning(ex, "Không thể xóa mã giảm giá ID {DiscountId} vì ràng buộc: {ErrorMessage}", id, ex.Message);
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi xóa mã giảm giá ID {DiscountId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi xóa mã giảm giá." });
            }
        }

        /// <summary>
        /// [User/Checkout] Kiểm tra tính hợp lệ của mã giảm giá.
        /// </summary>
        [HttpPost("validate")]
        [AllowAnonymous]
        public async Task<ActionResult<DiscountValidationResultDto>> ValidateDiscountCode([FromBody] ValidateDiscountCodeRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request?.DiscountCode)) // Thêm kiểm tra request null
            {
                return BadRequest(new { message = "Mã giảm giá không được để trống." });
            }
            try
            {
                var validationResult = await _discountService.ValidateDiscountForCheckoutAsync(request.DiscountCode);
                // Service đã trả về DTO với IsValid và Message, nên chỉ cần trả về Ok()
                return Ok(validationResult);
            }
            catch (Exception ex) // Lỗi không mong muốn trong quá trình validate
            {
                _logger.LogError(ex, "Lỗi hệ thống khi kiểm tra mã giảm giá '{DiscountCode}'.", request.DiscountCode);
                return Ok(new DiscountValidationResultDto(false, "Đã có lỗi xảy ra trong quá trình kiểm tra mã. Vui lòng thử lại."));
            }
        }
    }
}
