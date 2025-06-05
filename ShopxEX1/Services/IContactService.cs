using ShopxEX1.Dtos.Contacts;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services
{
    public interface IContactService
    {
        /// <summary>
        /// Tạo một yêu cầu liên hệ mới từ người dùng.
        /// </summary>
        /// <param name="createDto">Dữ liệu liên hệ từ người dùng.</param>
        /// <param name="userId">ID của người dùng gửi liên hệ.</param>
        /// <returns>Thông tin liên hệ đã được tạo.</returns>
        Task<ContactDto?> CreateContactAsync(ContactCreateDto createDto, int userId);

        /// <summary>
        /// [Admin] Lấy danh sách tất cả các yêu cầu liên hệ với tùy chọn lọc và phân trang.
        /// </summary>
        /// <param name="filter">Tiêu chí lọc.</param>
        /// <param name="pageNumber">Số trang.</param>
        /// <param name="pageSize">Số lượng mục trên trang.</param>
        /// <returns>Danh sách liên hệ có phân trang.</returns>
        Task<PagedResult<ContactDto>> GetAllContactsAsync(ContactFilterDto filter, int pageNumber, int pageSize);

        /// <summary>
        /// [Admin] Lấy chi tiết một yêu cầu liên hệ bằng ID.
        /// </summary>
        /// <param name="contactId">ID của liên hệ.</param>
        /// <returns>Thông tin chi tiết của liên hệ hoặc null nếu không tìm thấy.</returns>
        Task<ContactDto?> GetContactByIdAsync(int contactId);

        /// <summary>
        /// [Admin] Cập nhật trạng thái của một yêu cầu liên hệ.
        /// </summary>
        /// <param name="contactId">ID của liên hệ cần cập nhật.</param>
        /// <param name="updateDto">Dữ liệu cập nhật (chủ yếu là Status).</param>
        /// <returns>Thông tin liên hệ đã được cập nhật hoặc null nếu không tìm thấy.</returns>
        Task<ContactDto?> UpdateContactStatusAsync(int contactId, ContactUpdateDto updateDto);

        /// <summary>
        /// [Admin] Xóa một yêu cầu liên hệ.
        /// </summary>
        /// <param name="contactId">ID của liên hệ cần xóa.</param>
        /// <returns>True nếu xóa thành công, false nếu không tìm thấy liên hệ.</returns>
        Task<bool> DeleteContactAsync(int contactId);
    }
}
