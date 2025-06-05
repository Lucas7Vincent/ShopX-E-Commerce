using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;  // Thêm using này
using ShopxEX1.Models;

namespace ShopxEX1.Services.Interfaces
{
    public interface INotificationService
    {
        // Admin operations
        Task<PagedResult<NotificationDto>> GetAdminNotificationsAsync(
            int pageNumber, int pageSize, string? search, string? type,
            DateTime? dateFrom, DateTime? dateTo);
        Task<NotificationDto?> GetNotificationByIdAsync(int id);
        Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto dto, int createdBy);
        Task<NotificationDto> UpdateNotificationAsync(int id, UpdateNotificationDto dto);
        Task<bool> DeleteNotificationAsync(int id);
        Task<bool> SendNotificationAsync(int notificationId);

        // User operations
        Task<PagedResult<UserNotificationDto>> GetUserNotificationsAsync(
            int userId, string userType, int pageNumber, int pageSize, bool unreadOnly);
        Task<bool> MarkAsReadAsync(int userNotificationId, int userId);
        Task<bool> DeleteUserNotificationAsync(int userNotificationId, int userId);
        Task<int> GetUnreadCountAsync(int userId, string userType);
        Task<int> GetRecipientCountAsync(string targetAudience);
        Task<object> GetNotificationStatsAsync(int notificationId);
        // ============================================
        // SELLER OPERATIONS 
        // ============================================
        Task<PagedResult<NotificationDto>> GetSellerNotificationsAsync(int sellerId, int pageNumber, int pageSize, string? search, string? type);
        Task<NotificationDto> CreateSellerNotificationAsync(CreateSellerNotificationDto dto, int sellerId);
        Task<bool> SendSellerNotificationAsync(int notificationId, int sellerId);
        Task<List<CustomerInfoDto>> GetSellerCustomersAsync(int sellerId);
        Task<List<NotificationTemplateDto>> GetSellerNotificationTemplatesAsync();
        Task<bool> DeleteSellerNotificationAsync(int notificationId, int sellerId);
        Task<NotificationDto?> UpdateSellerNotificationAsync(int notificationId, CreateSellerNotificationDto dto, int sellerId);
        Task<object> GetSellerNotificationStatsAsync(int notificationId, int sellerId);
        Task<List<NotificationRecipientDto>> GetSellerNotificationRecipientsAsync(int notificationId, int sellerId);
        Task<ResendNotificationResult> ResendNotificationToUserAsync(int userNotificationId, int sellerId);
    Task<List<int>> GetVipCustomersAsync();
    Task<List<int>> GetActiveSellerssAsync();
    }
}