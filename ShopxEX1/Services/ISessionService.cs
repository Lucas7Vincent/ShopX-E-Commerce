using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Services
{
    public interface ISessionService
    {
        Task<UserDto?> GetCurrentUserAsync();
        Task<bool> IsAuthenticatedAsync();
        Task<bool> IsInRoleAsync(string role);
        Task<int?> GetCurrentUserIdAsync();
        Task<int?> GetCurrentSellerIdAsync();
    }
} 