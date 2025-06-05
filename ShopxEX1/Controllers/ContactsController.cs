using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Dtos.Contacts;
using ShopxEX1.Helpers;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ContactsController : ControllerBase
    {
        private readonly IContactService _contactService;
        private readonly ILogger<ContactsController> _logger;
        private readonly GetID _getId;

        public ContactsController(IContactService contactService, ILogger<ContactsController> logger, GetID getId)
        {
            _contactService = contactService;
            _logger = logger;
            _getId = getId;
        }

        /// <summary>
        /// [Customer] Tạo một yêu cầu liên hệ mới.
        /// Yêu cầu người dùng đã đăng nhập.
        /// </summary>
        /// <param name="createDto">Nội dung liên hệ.</param>
        [HttpPost]
        [Authorize]
        public async Task<ActionResult<ContactDto>> CreateContact([FromBody] ContactCreateDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = _getId.GetCurrentUserId(); // Lấy UserID của người dùng đang đăng nhập
                _logger.LogInformation("UserID {UserId} đang tạo một liên hệ mới.", userId);

                var createdContact = await _contactService.CreateContactAsync(createDto, userId);

                if (createdContact == null) // Trường hợp này ít khi xảy ra nếu service ném lỗi
                {
                    _logger.LogError("Không thể tạo liên hệ cho UserID {UserId} mặc dù service không ném lỗi.", userId);
                    return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Không thể tạo yêu cầu liên hệ. Vui lòng thử lại." });
                }
                // Trả về action để lấy chi tiết liên hệ vừa tạo (nếu có endpoint GetById cho user)
                // Hoặc chỉ trả về 201 Created với object.
                // Hiện tại chưa có GetById cho user, nên chỉ trả về object.
                return CreatedAtAction(nameof(GetContactByIdForAdmin), new { id = createdContact.ContactID }, createdContact);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Lỗi tham số khi tạo liên hệ: {ErrorMessage}", ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi tạo liên hệ.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại." });
            }
        }

        /// <summary>
        /// [Admin] Lấy danh sách tất cả các yêu cầu liên hệ với tùy chọn lọc và phân trang.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResult<ContactDto>>> GetAllContactsForAdmin(
            [FromQuery] ContactFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] string pageSizeInput = "20")
        {
            const int DefaultPageSize = 20;
            const int MaxPageSize = 100; // Admin có thể xem nhiều hơn
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize) || pageSize <= 0) pageSize = DefaultPageSize;
            if (pageSize > MaxPageSize) pageSize = MaxPageSize;
            if (pageNumber < 1) pageNumber = 1;

            _logger.LogInformation("Admin đang lấy danh sách liên hệ - Trang: {Page}, Kích thước: {Size}", pageNumber, pageSize);
            try
            {
                var result = await _contactService.GetAllContactsAsync(filter, pageNumber, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi Admin lấy danh sách liên hệ.");
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi lấy danh sách liên hệ." });
            }
        }

        /// <summary>
        /// [Admin] Lấy chi tiết một yêu cầu liên hệ bằng ID.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpGet("{id:int}", Name = "GetContactByIdForAdmin")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ContactDto>> GetContactByIdForAdmin(int id)
        {
            _logger.LogInformation("Admin đang lấy chi tiết liên hệ ID: {ContactId}", id);
            try
            {
                var contact = await _contactService.GetContactByIdAsync(id);
                if (contact == null)
                {
                    _logger.LogWarning("Admin không tìm thấy liên hệ ID: {ContactId}", id);
                    return NotFound(new { message = $"Không tìm thấy yêu cầu liên hệ với ID: {id}." });
                }
                return Ok(contact);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi Admin lấy chi tiết liên hệ ID: {ContactId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi lấy chi tiết liên hệ." });
            }
        }

        /// <summary>
        /// [Admin] Cập nhật trạng thái của một yêu cầu liên hệ.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpPut("status/{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ContactDto>> UpdateContactStatus(int id, [FromBody] ContactUpdateDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            _logger.LogInformation("Admin đang cập nhật trạng thái cho liên hệ ID: {ContactId} thành '{NewStatus}'", id, updateDto.Status);
            try
            {
                var updatedContact = await _contactService.UpdateContactStatusAsync(id, updateDto);
                if (updatedContact == null)
                {
                    _logger.LogWarning("Admin không tìm thấy liên hệ ID: {ContactId} để cập nhật trạng thái.", id);
                    return NotFound(new { message = $"Không tìm thấy yêu cầu liên hệ với ID: {id}." });
                }
                return Ok(updatedContact);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Lỗi tham số khi Admin cập nhật trạng thái liên hệ ID {ContactId}: {ErrorMessage}", id, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi Admin cập nhật trạng thái liên hệ ID {ContactId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi cập nhật trạng thái liên hệ." });
            }
        }

        /// <summary>
        /// [Admin] Xóa một yêu cầu liên hệ.
        /// Chỉ dành cho Admin.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteContact(int id)
        {
            _logger.LogInformation("Admin đang xóa liên hệ ID: {ContactId}", id);
            try
            {
                var success = await _contactService.DeleteContactAsync(id);
                if (!success)
                {
                    _logger.LogWarning("Admin không tìm thấy liên hệ ID: {ContactId} để xóa.", id);
                    return NotFound(new { message = $"Không tìm thấy yêu cầu liên hệ với ID: {id}." });
                }
                return NoContent(); // 204 No Content khi xóa thành công
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi Admin xóa liên hệ ID {ContactId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Lỗi máy chủ khi xóa liên hệ." });
            }
        }
    }
}
