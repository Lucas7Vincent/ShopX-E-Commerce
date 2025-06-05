using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Helpers;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<UsersController> _logger;
        // GetID không cần thiết nữa nếu controller này chỉ dành cho Admin
        // và không có action nào cần UserID của chính Admin thực hiện request.
        // Nếu có nhu cầu đó, bạn có thể giữ lại _getId.

        public UsersController(IUserService userService, ILogger<UsersController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        /// <summary>
        /// [Admin] Lấy danh sách tất cả người dùng với tùy chọn lọc và phân trang.
        /// </summary>
        [HttpGet] // Route sẽ là GET /api/Users
        public async Task<ActionResult<PagedResult<UserSummaryDto>>> GetAllUsers(
            [FromQuery] UserFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] string pageSizeInput = "10")
        {
            const int DefaultPageSize = 10;
            const int MaxPageSize = 100;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize) || pageSize <= 0) pageSize = DefaultPageSize;
            if (pageSize > MaxPageSize) pageSize = MaxPageSize;
            if (pageNumber < 1) pageNumber = 1;

            _logger.LogInformation("Admin: Yêu cầu lấy danh sách người dùng. Trang: {Page}, Kích thước: {Size}, Filter: {@Filter}",
                pageNumber, pageSize, filter);
            try
            {
                var result = await _userService.GetAllUsersAsync(filter, pageNumber, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Admin: Lỗi khi lấy danh sách người dùng.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Đã xảy ra lỗi máy chủ khi xử lý yêu cầu của bạn." });
            }
        }

        /// <summary>
        /// [Admin] Lấy thông tin chi tiết của một người dùng bằng ID.
        /// </summary>
        [HttpGet("{id:int}", Name = "GetUserByIdForAdmin")] // Route: GET /api/Users/{id}
        public async Task<ActionResult<UserDto>> GetUserByIdForAdmin(int id)
        {
            _logger.LogInformation("Admin: Yêu cầu lấy thông tin người dùng ID: {UserId}", id);
            try
            {
                var user = await _userService.GetUserByIdAsync(id);
                if (user == null)
                {
                    _logger.LogWarning("Admin: Không tìm thấy người dùng ID: {UserId}", id);
                    return NotFound(new { message = $"Không tìm thấy người dùng với ID: {id}." });
                }
                return Ok(user);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Admin: Lỗi khi lấy thông tin người dùng ID: {UserId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi lấy thông tin người dùng." });
            }
        }

        /// <summary>
        /// [Admin] Tạo một người dùng mới.
        /// </summary>
        [HttpPost] // Route: POST /api/Users
        public async Task<ActionResult<UserDto>> CreateUser([FromBody] UserCreateDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            _logger.LogInformation("Admin: Yêu cầu tạo người dùng mới với Email: {Email}", createDto.Email);
            try
            {
                var createdUser = await _userService.CreateUserAsync(createDto);
                // Service đã trả về UserDto hoặc ném lỗi nếu có vấn đề
                return CreatedAtAction(nameof(GetUserByIdForAdmin), new { id = createdUser!.UserID }, createdUser);
            }
            catch (InvalidOperationException ex) // Bắt lỗi cụ thể từ service (ví dụ: Email đã tồn tại)
            {
                _logger.LogWarning(ex, "Admin: Lỗi logic khi tạo người dùng (Email: {Email}): {ErrorMessage}", createDto.Email, ex.Message);
                return Conflict(new { message = ex.Message }); // 409 Conflict thường phù hợp
            }
            catch (ArgumentException ex) // Bắt lỗi cụ thể từ service (ví dụ: Role không hợp lệ, ShopName thiếu)
            {
                _logger.LogWarning(ex, "Admin: Lỗi tham số khi tạo người dùng (Email: {Email}): {ErrorMessage}", createDto.Email, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Admin: Lỗi không mong muốn khi tạo người dùng (Email: {Email}).", createDto.Email);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Đã xảy ra lỗi không mong muốn trong quá trình tạo người dùng." });
            }
        }

        /// <summary>
        /// [Admin] Cập nhật thông tin người dùng.
        /// </summary>
        [HttpPut("{id:int}")] // Route: PUT /api/Users/{id}
        public async Task<ActionResult<UserDto>> UpdateUserAsAdmin(int id, [FromBody] AdminUserUpdateDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            _logger.LogInformation("Admin: Yêu cầu cập nhật người dùng ID: {UserId}", id);
            try
            {
                var updatedUser = await _userService.UpdateUserAsAdminAsync(id, updateDto);
                if (updatedUser == null)
                {
                    _logger.LogWarning("Admin: Không tìm thấy người dùng ID: {UserId} để cập nhật.", id);
                    return NotFound(new { message = $"Không tìm thấy người dùng với ID: {id} để cập nhật." });
                }
                return Ok(updatedUser);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Admin: Lỗi tham số khi cập nhật người dùng ID {UserId}: {ErrorMessage}", id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Admin: Lỗi không mong muốn khi cập nhật người dùng ID {UserId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi cập nhật thông tin người dùng." });
            }
        }

        /// <summary>
        /// [Admin] Xóa một người dùng (có thể là xóa mềm hoặc cứng tùy theo logic service).
        /// </summary>
        [HttpDelete("{id:int}")] // Route: DELETE /api/Users/{id}
        public async Task<IActionResult> DeleteUser(int id)
        {
            _logger.LogInformation("Admin: Yêu cầu xóa người dùng ID: {UserId}", id);
            try
            {
                var success = await _userService.DeleteUserAsync(id);
                if (!success)
                {
                    _logger.LogWarning("Admin: Không tìm thấy người dùng ID: {UserId} để xóa.", id);
                    return NotFound(new { message = $"Không tìm thấy người dùng với ID: {id} để xóa." });
                }
                return NoContent(); // 204 No Content khi xóa thành công
            }
            catch (InvalidOperationException ex) // Bắt lỗi nếu không thể xóa (ví dụ: có đơn hàng)
            {
                _logger.LogWarning(ex, "Admin: Không thể xóa người dùng ID {UserId} do ràng buộc: {ErrorMessage}", id, ex.Message);
                return Conflict(new { message = ex.Message }); // 409 Conflict
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Admin: Lỗi không mong muốn khi xóa người dùng ID {UserId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi xóa người dùng." });
            }
        }

        /// <summary>
        /// [Admin] Đặt hoặc thay đổi vai trò cho một người dùng.
        /// Nếu vai trò là "Seller", ShopName có thể được yêu cầu hoặc cập nhật.
        /// </summary>
        [HttpPatch("{userId:int}/set-role")] // Route: PATCH /api/Users/{userId}/set-role
        public async Task<ActionResult<UserDto>> SetUserRole(int userId, [FromBody] SetUserRoleRequestDto requestDto)
        {
            if (!ModelState.IsValid) // Kiểm tra [Required] cho NewRole
            {
                return BadRequest(ModelState);
            }
            _logger.LogInformation("Admin: Yêu cầu đặt vai trò cho UserID: {UserId} thành '{NewRole}'", userId, requestDto.NewRole);
            try
            {
                var updatedUser = await _userService.SetUserRoleAsync(userId, requestDto);
                // Service đã trả về UserDto hoặc ném lỗi
                return Ok(updatedUser);
            }
            catch (KeyNotFoundException ex) // Bắt lỗi nếu User không tồn tại từ service
            {
                _logger.LogWarning(ex, "Admin: Không tìm thấy UserID {UserId} khi đặt vai trò.", userId);
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex) // Bắt lỗi từ service (ví dụ: Role không hợp lệ, ShopName thiếu)
            {
                _logger.LogWarning(ex, "Admin: Lỗi tham số khi đặt vai trò cho UserID {UserId}: {ErrorMessage}", userId, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Admin: Lỗi không mong muốn khi đặt vai trò cho UserID {UserId}.", userId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ nội bộ khi xử lý yêu cầu." });
            }
        }
    }
}
