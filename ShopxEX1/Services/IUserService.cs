using ShopxEX1.Dtos.Users;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services
{
    // Interface cho các dịch vụ quản lý thông tin người dùng (Profile)
    public interface IUserService
    {
        Task<PagedResult<UserSummaryDto>> GetAllUsersAsync(UserFilterDto filter, int pageNumber, int pageSize); // Lấy tất cả user
        Task<UserDto?> GetUserByIdAsync(int userId); // Lấy thông tin usere từ idUser
        Task<UserDto?> CreateUserAsync(UserCreateDto createDto); // Admin tạo user mới
        Task<UserDto?> UpdateUserAsAdminAsync(int userId, AdminUserUpdateDto updateDto); // Admin cập nhật user
        Task<bool> DeleteUserAsync(int userId); // Admin xóa user (có thể là xóa mềm)
        Task<UserDto?> SetUserRoleAsync(int userId, SetUserRoleRequestDto requestDto); // Admin trực tiếp đặt role
    }
}
