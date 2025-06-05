using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using ShopxEX1.Services.Interfaces;

namespace ShopxEX1.Services.Implementations
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private static DateTime VietnamNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));


        public NotificationService(
            AppDbContext context,
            IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
        }

        #region Admin Operations

        public async Task<PagedResult<NotificationDto>> GetAdminNotificationsAsync(
    int pageNumber, int pageSize, string? search, string? type,
    DateTime? dateFrom, DateTime? dateTo)
        {
            Console.WriteLine($"🔍 [SERVICE] === START DEBUG ===");
            Console.WriteLine($"🔍 [SERVICE] Input Parameters:");
            Console.WriteLine($"  - pageNumber: {pageNumber}");
            Console.WriteLine($"  - pageSize: {pageSize}");
            Console.WriteLine($"  - search: {search ?? "null"}");
            Console.WriteLine($"  - type: {type ?? "null"}");

            var query = _context.Notifications.AsQueryable();

            // Apply filters (giữ nguyên logic)
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
                Console.WriteLine($"🔍 [SERVICE] Applied search filter");
            }

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(n => n.Type == type);
                Console.WriteLine($"🔍 [SERVICE] Applied type filter");
            }

            if (dateFrom.HasValue)
            {
                query = query.Where(n => n.CreatedAt >= dateFrom.Value);
                Console.WriteLine($"🔍 [SERVICE] Applied dateFrom filter");
            }

            if (dateTo.HasValue)
            {
                query = query.Where(n => n.CreatedAt <= dateTo.Value);
                Console.WriteLine($"🔍 [SERVICE] Applied dateTo filter");
            }

            var totalCount = await query.CountAsync();
            Console.WriteLine($"🔍 [SERVICE] Total count after filters: {totalCount}");

            var skipCount = (pageNumber - 1) * pageSize;
            Console.WriteLine($"🔍 [SERVICE] Pagination calculation:");
            Console.WriteLine($"  - Skip: ({pageNumber} - 1) * {pageSize} = {skipCount}");
            Console.WriteLine($"  - Take: {pageSize}");

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip(skipCount)
                .Take(pageSize)
                .ToListAsync();


            // Manual mapping
            var dtos = notifications.Select(n => new NotificationDto
            {
                NotificationID = n.NotificationID,
                Title = n.Title,
                Content = n.Content,
                Type = n.Type,
                Icon = n.Icon,
                ActionText = n.ActionText,
                ActionUrl = n.ActionUrl,
                TargetAudience = n.TargetAudience,
                Status = n.Status,
                ScheduledAt = n.ScheduledAt,
                SentAt = n.SentAt,
                CreatedAt = n.CreatedAt,
                CreatedBy = n.CreatedBy,
                TotalSent = n.TotalSent,
                TotalRead = n.TotalRead
            }).ToList();



            var result = new PagedResult<NotificationDto>(
                dtos,
                pageNumber,
                pageSize,
                totalCount
            );



            return result;
        }
        public async Task<NotificationDto?> GetNotificationByIdAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            return notification != null ? _mapper.Map<NotificationDto>(notification) : null;
        }

        public async Task<NotificationDto> CreateNotificationAsync(CreateNotificationDto dto, int createdBy)
        {
            var notification = _mapper.Map<Notification>(dto);
            notification.CreatedBy = createdBy;
            notification.CreatedAt = VietnamNow; // Use Vietnam timezone for createdAt
            notification.Status = "draft"; // Set default status

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<NotificationDto> UpdateNotificationAsync(int id, UpdateNotificationDto dto)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null)
                throw new ArgumentException("Notification not found");

            if (notification.Status == "sent")
                throw new InvalidOperationException("Cannot update sent notification");

            // Map only the updatable fields
            notification.Title = dto.Title;
            notification.Content = dto.Content;
            notification.Type = dto.Type;
            notification.Icon = dto.Icon;
            notification.ActionText = dto.ActionText;
            notification.ActionUrl = dto.ActionUrl;
            notification.TargetAudience = dto.TargetAudience;
            notification.ScheduledAt = dto.ScheduledAt;

            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<bool> DeleteNotificationAsync(int id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return false;

            // Check if notification has been sent
            if (notification.Status == "sent")
            {
                throw new InvalidOperationException("Cannot delete sent notification");
            }

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> SendNotificationAsync(int notificationId)
{
    try
    {
        Console.WriteLine($"🚀 [SEND] Starting send process for notification {notificationId}");

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationID == notificationId);

        if (notification == null)
        {
            Console.WriteLine($"❌ [SEND] Notification {notificationId} not found");
            return false;
        }

        if (notification.Status == "sent")
        {
            Console.WriteLine($"⚠️ [SEND] Notification {notificationId} already sent");
            return false;
        }

        // ✅ GET TARGET USER IDS WITH FIXED LINQ APPROACH
        var targetUserIds = await GetTargetUserIds(notification.TargetAudience);

        if (!targetUserIds.Any())
        {
            Console.WriteLine($"⚠️ [SEND] No target users found for audience: {notification.TargetAudience}");
            return false;
        }

        Console.WriteLine($"📋 [SEND] Found {targetUserIds.Count} target users");

        // ✅ CREATE USER NOTIFICATIONS USING LINQ
        var userNotifications = targetUserIds.Select(userId => new UserNotification
        {
            NotificationID = notificationId,
            UserID = userId,
            UserType = GetUserTypeForUserId(userId), // Helper method
            ReceivedAt = VietnamNow,
            IsRead = false,
            IsDeleted = false
        }).ToList();

        // ✅ BATCH INSERT USER NOTIFICATIONS
        await _context.UserNotifications.AddRangeAsync(userNotifications);

        // ✅ UPDATE NOTIFICATION STATUS
        notification.Status = "sent";
        notification.SentAt = VietnamNow;
        notification.TotalSent = targetUserIds.Count;

        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync();

        Console.WriteLine($"✅ [SEND] Successfully sent notification {notificationId} to {targetUserIds.Count} users");
        return true;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [SEND ERROR] {ex.Message}");
        Console.WriteLine($"❌ [SEND STACK] {ex.StackTrace}");
        throw;
    }
}
       
       
        public async Task<object> GetNotificationStatsAsync(int notificationId)
        {
            var notification = await _context.Notifications.FindAsync(notificationId);
            if (notification == null)
                return null;

            // Lấy thống kê từ UserNotifications
            var userNotifications = await _context.UserNotifications
                .Where(un => un.NotificationID == notificationId && !un.IsDeleted)
                .ToListAsync();

            var totalSent = notification.TotalSent;
            var totalRead = notification.TotalRead;
            var totalDeleted = await _context.UserNotifications
                .CountAsync(un => un.NotificationID == notificationId && un.IsDeleted);

            // Tính tỷ lệ đọc
            var readRate = totalSent > 0 ? (double)totalRead / totalSent * 100 : 0;

            // Thống kê chi tiết theo đối tượng
            var customerStats = userNotifications.Where(un => un.UserType == "Customer");
            var sellerStats = userNotifications.Where(un => un.UserType == "Seller");

            return new
            {
                NotificationId = notificationId,
                Title = notification.Title,
                Content = notification.Content,
                Type = notification.Type,
                TargetAudience = notification.TargetAudience,
                Status = notification.Status,

                // Thống kê tổng quan
                TotalSent = totalSent,
                TotalRead = totalRead,
                TotalDeleted = totalDeleted,
                ReadRate = Math.Round(readRate, 2),

                // Thống kê theo đối tượng
                CustomerStats = new
                {
                    Sent = customerStats.Count(),
                    Read = customerStats.Count(un => un.IsRead),
                    Deleted = customerStats.Count(un => un.IsDeleted),
                    ReadRate = customerStats.Any() ?
                        Math.Round((double)customerStats.Count(un => un.IsRead) / customerStats.Count() * 100, 2) : 0
                },

                SellerStats = new
                {
                    Sent = sellerStats.Count(),
                    Read = sellerStats.Count(un => un.IsRead),
                    Deleted = sellerStats.Count(un => un.IsDeleted),
                    ReadRate = sellerStats.Any() ?
                        Math.Round((double)sellerStats.Count(un => un.IsRead) / sellerStats.Count() * 100, 2) : 0
                },

                // Thời gian
                CreatedAt = notification.CreatedAt,
                SentAt = notification.SentAt,

                // Action info (nếu có)
                ActionText = notification.ActionText,
                ActionUrl = notification.ActionUrl,

                // Top 5 người đọc sớm nhất
                TopReaders = userNotifications
                    .Where(un => un.IsRead && un.ReadAt.HasValue)
                    .OrderBy(un => un.ReadAt)
                    .Take(5)
                    .Select(un => new
                    {
                        UserId = un.UserID,
                        UserType = un.UserType,
                        ReadAt = un.ReadAt
                    })
                    .ToList(),

                // Phân phối thời gian đọc (theo giờ trong ngày)
                ReadDistribution = userNotifications
                    .Where(un => un.IsRead && un.ReadAt.HasValue)
                    .GroupBy(un => un.ReadAt.Value.Hour)
                    .Select(g => new
                    {
                        Hour = g.Key,
                        Count = g.Count()
                    })
                    .OrderBy(x => x.Hour)
                    .ToList()
            };
        }
        #endregion

        #region User Operations

        public async Task<PagedResult<UserNotificationDto>> GetUserNotificationsAsync(
            int userId, string userType, int pageNumber, int pageSize, bool unreadOnly)
        {
            var query = _context.UserNotifications
                .Include(un => un.Notification)
                .Where(un => un.UserID == userId && un.UserType == userType && !un.IsDeleted);

            if (unreadOnly)
            {
                query = query.Where(un => !un.IsRead);
            }

            var totalCount = await query.CountAsync();

            var notifications = await query
                .OrderByDescending(un => un.ReceivedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = notifications.Select(un => new UserNotificationDto
            {
                UserNotificationID = un.UserNotificationID,
                NotificationID = un.NotificationID,
                Title = un.Notification.Title,
                Content = un.Notification.Content,
                Type = un.Notification.Type,
                Icon = un.Notification.Icon,
                ActionText = un.Notification.ActionText,
                ActionUrl = un.Notification.ActionUrl,
                IsRead = un.IsRead,
                ReadAt = un.ReadAt,
                ReceivedAt = un.ReceivedAt
            }).ToList();

            return new PagedResult<UserNotificationDto>(
                dtos,
                pageNumber,
                pageSize,
                totalCount
            );
        }

        public async Task<bool> MarkAsReadAsync(int userNotificationId, int userId)
        {
            var userNotification = await _context.UserNotifications
                .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && un.UserID == userId);

            if (userNotification == null || userNotification.IsDeleted)
                return false;

            if (!userNotification.IsRead)
            {
                userNotification.IsRead = true;
                userNotification.ReadAt = VietnamNow;

                // Update total read count in notification
                var notification = await _context.Notifications.FindAsync(userNotification.NotificationID);
                if (notification != null)
                {
                    notification.TotalRead++;
                    _context.Notifications.Update(notification);
                }

                await _context.SaveChangesAsync();
            }

            return true;
        }

        public async Task<bool> DeleteUserNotificationAsync(int userNotificationId, int userId)
        {
            var userNotification = await _context.UserNotifications
                .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && un.UserID == userId);

            if (userNotification == null || userNotification.IsDeleted)
                return false;

            // Soft delete
            userNotification.IsDeleted = true;
            userNotification.DeletedAt = VietnamNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<int> GetUnreadCountAsync(int userId, string userType)
        {
            return await _context.UserNotifications
                .CountAsync(un => un.UserID == userId && un.UserType == userType && !un.IsRead && !un.IsDeleted);
        }

        #endregion

        #region Helper Methods

       public async Task<List<int>> GetTargetUserIds(string targetAudience)
{
    try
    {
        Console.WriteLine($"🎯 [TARGET] === PROCESSING TARGET AUDIENCE ===");
        Console.WriteLine($"🎯 [TARGET] Input: '{targetAudience}'");
        Console.WriteLine($"🎯 [TARGET] Type: {targetAudience?.GetType()?.Name}");
        Console.WriteLine($"🎯 [TARGET] Length: {targetAudience?.Length}");
        
        if (string.IsNullOrWhiteSpace(targetAudience))
        {
            Console.WriteLine($"❌ [TARGET] Empty or null target audience");
            return new List<int>();
        }

        // ✅ ENHANCED SPECIFIC USER HANDLING - SUPPORT BOTH FORMATS
        if (targetAudience.StartsWith("specific:", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine($"🎯 [TARGET] Processing 'specific:IDs' format");
            return await ProcessSpecificTargeting(targetAudience);
        }
        
        // ✅ NEW: HANDLE PLAIN "specific" (legacy support)
        if (targetAudience.Equals("specific", StringComparison.OrdinalIgnoreCase))
        {
            Console.WriteLine($"❌ [TARGET] Plain 'specific' format detected - this is invalid!");
            Console.WriteLine($"❌ [TARGET] Expected format: 'specific:1,2,3,4'");
            Console.WriteLine($"❌ [TARGET] This indicates a frontend bug!");
            
            // ✅ RETURN EMPTY BUT LOG THE ISSUE
            return new List<int>();
        }

        // ✅ HANDLE ROLE-SPECIFIC TARGETING
        if (targetAudience.Contains(":"))
        {
            return await ProcessSpecificTargeting(targetAudience);
        }

        // ✅ GENERAL TARGETING WITH ENHANCED LOGGING
        Console.WriteLine($"🎯 [TARGET] Processing general targeting: '{targetAudience.ToLower()}'");
        
        var result = targetAudience.ToLower() switch
        {
            "customers" => await GetCustomersAsync(),
            "sellers" => await GetSellersAsync(),
            "admins" => await GetAdminsAsync(),
            "both" => await GetBothCustomersAndSellersAsync(),
            "all" => await GetAllUsersAsync(),
            "vip_customers" => await GetVipCustomersAsync(),
            "recent_customers" => await GetRecentCustomersAsync(),
            "inactive_customers" => await GetInactiveCustomersAsync(),
            "high_value_customers" => await GetHighValueCustomersAsync(),
            "active_sellers" => await GetActiveSellerssAsync(),
            "new_sellers" => await GetNewSellersAsync(),
            "top_sellers" => await GetTopSellersAsync(),
        };

        Console.WriteLine($"✅ [TARGET] Final result: {result.Count} users for '{targetAudience}'");
        return result;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [TARGET ERROR] {ex.Message}");
        Console.WriteLine($"❌ [TARGET STACK] {ex.StackTrace}");
        return new List<int>();
    }
}

public async Task<List<int>> ProcessSpecificTargeting(string targetAudience)
{
    Console.WriteLine($"🎯 [SPECIFIC] Processing specific user targeting");
    
    var idsString = targetAudience.Substring("specific:".Length);
    Console.WriteLine($"🎯 [SPECIFIC] Extracted IDs string: '{idsString}'");
    
    if (string.IsNullOrWhiteSpace(idsString))
    {
        Console.WriteLine($"❌ [SPECIFIC] Empty IDs string after 'specific:'");
        return new List<int>();
    }

    // ✅ PARSE USER IDs WITH DETAILED LOGGING
    var idParts = idsString.Split(',', StringSplitOptions.RemoveEmptyEntries);
    Console.WriteLine($"🎯 [SPECIFIC] Split into {idParts.Length} parts: [{string.Join(", ", idParts)}]");

    var userIds = new List<int>();
    foreach (var idPart in idParts)
    {
        var trimmed = idPart.Trim();
        if (int.TryParse(trimmed, out int userId) && userId > 0)
        {
            userIds.Add(userId);
            Console.WriteLine($"✅ [SPECIFIC] Valid ID: {userId}");
        }
        else
        {
            Console.WriteLine($"❌ [SPECIFIC] Invalid ID: '{trimmed}'");
        }
    }

    Console.WriteLine($"🎯 [SPECIFIC] Parsed {userIds.Count} valid IDs: [{string.Join(", ", userIds)}]");

    if (!userIds.Any())
    {
        Console.WriteLine($"❌ [SPECIFIC] No valid user IDs found");
        return new List<int>();
    }

    // ✅ VALIDATE USERS EXIST AND ARE ACTIVE
    Console.WriteLine($"🔍 [SPECIFIC] Validating users in database...");
    
    var validUsers = new List<int>();
    foreach (var userId in userIds)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserID == userId);
        if (user == null)
        {
            Console.WriteLine($"❌ [SPECIFIC] User {userId}: Not found in database");
        }
        else if (!user.IsActive)
        {
            Console.WriteLine($"⚠️ [SPECIFIC] User {userId}: Found but IsActive=false (Name: {user.FullName})");
        }
        else
        {
            Console.WriteLine($"✅ [SPECIFIC] User {userId}: Valid (Name: {user.FullName}, Role: {user.Role})");
            validUsers.Add(userId);
        }
    }

    Console.WriteLine($"✅ [SPECIFIC] Final result: {validUsers.Count}/{userIds.Count} valid users");
    return validUsers;
}
private async Task<List<int>> GetCustomersAsync()
        {
            try
            {
                var customers = await _context.Users
                    .Where(u => u.Role == "Customer" && u.IsActive)
                    .Select(u => u.UserID)
                    .ToListAsync();

                Console.WriteLine($"📊 [CUSTOMERS] Found {customers.Count} active customers");
                return customers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [CUSTOMERS ERROR] {ex.Message}");
                return new List<int>();
            }
        }

private async Task<List<int>> GetSellersAsync()
{
    try
    {
        var sellers = await _context.Users
            .Where(u => u.Role == "Seller" && u.IsActive)
            .Select(u => u.UserID)
            .ToListAsync();
        
        Console.WriteLine($"📊 [SELLERS] Found {sellers.Count} active sellers");
        return sellers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [SELLERS ERROR] {ex.Message}");
        return new List<int>();
    }
}

private async Task<List<int>> GetAdminsAsync()
{
    try
    {
        var admins = await _context.Users
            .Where(u => u.Role == "Admin" && u.IsActive)
            .Select(u => u.UserID)
            .ToListAsync();
        
        Console.WriteLine($"📊 [ADMINS] Found {admins.Count} active admins");
        return admins;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [ADMINS ERROR] {ex.Message}");
        return new List<int>();
    }
}

private async Task<List<int>> GetBothCustomersAndSellersAsync()
{
    try
    {
        var both = await _context.Users
            .Where(u => (u.Role == "Customer" || u.Role == "Seller") && u.IsActive)
            .Select(u => u.UserID)
            .ToListAsync();
        
        Console.WriteLine($"📊 [BOTH] Found {both.Count} active customers + sellers");
        return both;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [BOTH ERROR] {ex.Message}");
        return new List<int>();
    }
}

private async Task<List<int>> GetAllUsersAsync()
{
    try
    {
        var allUsers = await _context.Users
            .Where(u => u.IsActive)
            .Select(u => u.UserID)
            .ToListAsync();
        
        Console.WriteLine($"📊 [ALL] Found {allUsers.Count} active users");
        return allUsers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [ALL ERROR] {ex.Message}");
        return new List<int>();
    }
}
        private string GetUserTypeForUserId(int userId)
{
    try
    {
        var user = _context.Users.FirstOrDefault(u => u.UserID == userId);
        return user?.Role ?? "Customer"; // Default to Customer if not found
    }
    catch
    {
        return "Customer"; // Safe fallback
    }
}

public async Task<List<int>> GetVipCustomersAsync()
{
    try
    {
        // ✅ Use LINQ instead of raw SQL to avoid EF Core 9.0 issues
        var vipCustomers = await _context.Orders
            .Join(_context.Users, o => o.UserID, u => u.UserID, (o, u) => new { o, u })
            .Where(x => x.u.Role == "Customer" && x.u.IsActive)
            .GroupBy(x => new { x.u.UserID })
            .Where(g => g.Select(x => x.o.OrderID).Distinct().Count() >= 5 ||
                               g.Sum(x => x.o.TotalPayment) >= 5000000)
                    .Select(g => g.Key.UserID)
                    .ToListAsync();

                Console.WriteLine($"✅ [VIP CUSTOMERS] Found {vipCustomers.Count} VIP customers");
                return vipCustomers;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [VIP CUSTOMERS ERROR] {ex.Message}");
                return new List<int>();
            }
        }

private async Task<List<int>> GetRecentCustomersAsync()
{
    // Customers with orders in last 30 days
    var cutoffDate = DateTime.UtcNow.AddDays(-30);
    
    return await _context.Orders
        .Where(o => o.OrderDate >= cutoffDate)
        .Join(_context.Users,
              o => o.UserID,
              u => u.UserID,
              (o, u) => new { u.UserID, u.Role, u.IsActive })
        .Where(x => x.Role == "Customer" && x.IsActive)
        .Select(x => x.UserID)
        .Distinct()
        .ToListAsync();
}

private async Task<List<int>> GetInactiveCustomersAsync()
{
    try
    {
        var cutoffDate = VietnamNow.AddDays(-90);
        
        // ✅ Use LINQ instead of raw SQL
        var inactiveCustomers = await _context.Users
            .Where(u => u.Role == "Customer" && u.IsActive)
            .Where(u => _context.Orders.Any(o => o.UserID == u.UserID)) // Has previous orders
            .Where(u => !_context.Orders.Any(o => o.UserID == u.UserID && o.OrderDate >= cutoffDate)) // No recent orders
            .Select(u => u.UserID)
            .ToListAsync();

        Console.WriteLine($"✅ [INACTIVE CUSTOMERS] Found {inactiveCustomers.Count} inactive customers");
        return inactiveCustomers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [INACTIVE CUSTOMERS ERROR] {ex.Message}");
        return new List<int>();
    }
}
private async Task<List<int>> GetHighValueCustomersAsync()
{
    try
    {
        // ✅ Use LINQ instead of raw SQL
        var highValueCustomers = await _context.Orders
            .Join(_context.Users, o => o.UserID, u => u.UserID, (o, u) => new { o, u })
            .Where(x => x.u.Role == "Customer" && x.u.IsActive)
            .GroupBy(x => x.u.UserID)
            .Where(g => g.Sum(x => x.o.TotalPayment) >= 2000000)
            .Select(g => g.Key)
            .ToListAsync();

        Console.WriteLine($"✅ [HIGH VALUE CUSTOMERS] Found {highValueCustomers.Count} high value customers");
        return highValueCustomers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [HIGH VALUE CUSTOMERS ERROR] {ex.Message}");
        return new List<int>();
    }
}
public async Task<List<int>> GetActiveSellerssAsync()
{
    try
    {
        var cutoffDate = VietnamNow.AddDays(-30);
        
        // ✅ Use LINQ instead of SqlQueryRaw
        var activeSellers = await _context.OrderDetails
            .Include(od => od.Product)
            .Include(od => od.Order)
            .Join(_context.Users, od => od.Product.SellerID, u => u.UserID, (od, u) => new { od, u })
            .Where(x => x.u.Role == "Seller" && x.u.IsActive && x.od.Order.OrderDate >= cutoffDate)
            .Select(x => x.u.UserID)
            .Distinct()
            .ToListAsync();

        Console.WriteLine($"✅ [ACTIVE SELLERS] Found {activeSellers.Count} active sellers");
        return activeSellers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [ACTIVE SELLERS ERROR] {ex.Message}");
        return new List<int>();
    }
}

private async Task<List<int>> GetNewSellersAsync()
{
    // Sellers registered in last 30 days
    var cutoffDate = DateTime.UtcNow.AddDays(-30);
    
    return await _context.Users
        .Where(u => u.Role == "Seller" && u.IsActive && u.CreatedAt >= cutoffDate)
        .Select(u => u.UserID)
        .ToListAsync();
}

private async Task<List<int>> GetTopSellersAsync()
{
    try
    {
        var cutoffDate = VietnamNow.AddDays(-90);
        
        // ✅ Use LINQ instead of SqlQueryRaw
        var topSellers = await _context.OrderDetails
            .Include(od => od.Product)
            .Include(od => od.Order)
            .Join(_context.Users, od => od.Product.SellerID, u => u.UserID, (od, u) => new { od, u })
            .Where(x => x.u.Role == "Seller" && x.u.IsActive && x.od.Order.OrderDate >= cutoffDate)
            .GroupBy(x => x.u.UserID)
            .Select(g => new { 
                UserID = g.Key, 
                TotalRevenue = g.Sum(x => x.od.UnitPrice * x.od.Quantity) 
            })
            .OrderByDescending(x => x.TotalRevenue)
            .Take(50)
            .Select(x => x.UserID)
            .ToListAsync();

        Console.WriteLine($"✅ [TOP SELLERS] Found {topSellers.Count} top sellers");
        return topSellers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [TOP SELLERS ERROR] {ex.Message}");
        return new List<int>();
    }
}

        private async Task<string> GetUserTypeFromUserIdAsync(int userId)
        {
            var user = await _context.Users.FindAsync(userId);
            return user?.Role?.ToLower() switch
            {
                "seller" => "Seller",
                "admin" => "Admin",
                "customer" => "Customer",
                _ => "Customer"
            };
        }

        #endregion

        #region Background/Scheduled Methods (Optional)

        // Method to process scheduled notifications (can be called by background service)
        public async Task<int> ProcessScheduledNotificationsAsync()
        {
            var scheduledNotifications = await _context.Notifications
                .Where(n => n.Status == "draft" &&
                           n.ScheduledAt.HasValue &&
                           n.ScheduledAt.Value <= DateTime.UtcNow)
                .ToListAsync();

            int processedCount = 0;

            foreach (var notification in scheduledNotifications)
            {
                try
                {
                    var success = await SendNotificationAsync(notification.NotificationID);
                    if (success) processedCount++;
                }
                catch (Exception ex)
                {
                    // Log error but continue processing other notifications
                    // You might want to inject ILogger here
                    Console.WriteLine($"Error processing scheduled notification {notification.NotificationID}: {ex.Message}");
                }
            }

            return processedCount;
        }

        // Method to get notification statistics
        public async Task<int> GetRecipientCountAsync(string targetAudience)
        {
            try
    {
        Console.WriteLine($"🔢 [COUNT] Getting count for audience: '{targetAudience}'");
        
        // ✅ HANDLE SPECIFIC USER FORMAT
        if (targetAudience.StartsWith("specific:", StringComparison.OrdinalIgnoreCase))
        {
            var idsString = targetAudience.Substring("specific:".Length);
            var userIds = idsString
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Where(id => int.TryParse(id.Trim(), out _))
                .Select(id => int.Parse(id.Trim()))
                .Distinct()
                .ToList();

            // ✅ VALIDATE ACTIVE USERS
            var validCount = await _context.Users
                .CountAsync(u => userIds.Contains(u.UserID) && u.IsActive);

            Console.WriteLine($"✅ [COUNT] Specific users: {validCount}/{userIds.Count} valid");
            return validCount;
        }

        // ✅ DELEGATE TO GetTargetUserIds FOR CONSISTENCY
        var targetUserIds = await GetTargetUserIds(targetAudience);
        var count = targetUserIds.Count;
        
        Console.WriteLine($"✅ [COUNT] Found {count} users for '{targetAudience}'");
        return count;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [COUNT ERROR] {ex.Message}");
        return 0;
    }
        }

        #endregion

        #region Seller Operations 

        public async Task<PagedResult<NotificationDto>> GetSellerNotificationsAsync(
            int sellerId, int pageNumber, int pageSize, string? search, string? type)
        {
            var query = _context.Notifications
                .Where(n => n.CreatedBy == sellerId); // Chỉ lấy notifications do seller này tạo

            // Apply filters
            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(n => n.Title.Contains(search) || n.Content.Contains(search));
            }

            if (!string.IsNullOrEmpty(type))
            {
                query = query.Where(n => n.Type == type);
            }

            var totalCount = await query.CountAsync();

            var notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = notifications.Select(n => new NotificationDto
            {
                NotificationID = n.NotificationID,
                Title = n.Title,
                Content = n.Content,
                Type = n.Type,
                Icon = n.Icon,
                ActionText = n.ActionText,
                ActionUrl = n.ActionUrl,
                TargetAudience = n.TargetAudience,
                Status = n.Status,
                ScheduledAt = n.ScheduledAt,
                SentAt = n.SentAt,
                CreatedAt = n.CreatedAt,
                CreatedBy = n.CreatedBy,
                TotalSent = n.TotalSent,
                TotalRead = n.TotalRead
            }).ToList();

            return new PagedResult<NotificationDto>(
                dtos,
                pageNumber,
                pageSize,
                totalCount
            );
        }

        public async Task<NotificationDto> CreateSellerNotificationAsync(CreateSellerNotificationDto dto, int sellerId)
{
    // ✅ FIX: Xây dựng TargetAudience đúng format
    string targetAudience;
    
    if (dto.SpecificCustomerIds?.Any() == true)
    {
        // ✅ SPECIFIC: seller_123_specific_1,2,3,4
        targetAudience = $"seller_{sellerId}_specific_{string.Join(",", dto.SpecificCustomerIds)}";
    }
    else
    {
        // ✅ GENERAL: seller_123_all, seller_123_recent, etc.
        targetAudience = $"seller_{sellerId}_{dto.TargetCustomers}";
    }

    var notification = new Notification
    {
        Title = dto.Title,
        Content = dto.Content,
        Type = dto.Type,
        Icon = dto.Icon ?? "fa-store",
        ActionText = dto.ActionText,
        ActionUrl = dto.ActionUrl,
        TargetAudience = targetAudience, 
        Status = "draft",
        ScheduledAt = dto.ScheduledAt,
        CreatedBy = sellerId,
        CreatedAt = VietnamNow,
        TotalSent = 0,
        TotalRead = 0
    };

    _context.Notifications.Add(notification);
    await _context.SaveChangesAsync();

    Console.WriteLine($"✅ [CREATE] Created notification with target: {targetAudience}");
    return _mapper.Map<NotificationDto>(notification);
}

        public async Task<bool> SendSellerNotificationAsync(int notificationId, int sellerId)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        Console.WriteLine($"📨 [SEND] Starting notification {notificationId} for seller {sellerId}");

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationID == notificationId &&
                                     n.CreatedBy == sellerId &&
                                     n.Status == "draft");

        if (notification == null) 
        {
            Console.WriteLine($"❌ [SEND] Notification not found");
            return false;
        }

        Console.WriteLine($"📨 [SEND] Target audience: '{notification.TargetAudience}'");

        var targetCustomerIds = await GetSellerTargetCustomers(sellerId, notification.TargetAudience);
        
        // ✅ CHECK IF THIS IS SPECIFIC TARGETING
        var isSpecificTargeting = notification.TargetAudience.Contains("_specific_");
        
        Console.WriteLine($"📊 [SEND] Found {targetCustomerIds.Count} target customers, IsSpecific: {isSpecificTargeting}");
        
        if (!targetCustomerIds.Any())
        {
            if (isSpecificTargeting)
            {
                // ✅ SPECIFIC TARGETING: FAIL if no valid customers found
                Console.WriteLine($"❌ [SEND] SPECIFIC targeting but no valid customers - FAILING");
                await transaction.RollbackAsync();
                throw new InvalidOperationException("Không tìm thấy khách hàng được chọn hoặc khách hàng không có quyền nhận thông báo từ shop của bạn.");
            }
            else
            {
                // ✅ GENERAL TARGETING: Use fallback logic
                Console.WriteLine($"🔄 [SEND] GENERAL targeting - trying fallback");
                
                var fallbackSql = @"
                    SELECT DISTINCT o.UserID FROM OrderDetails od
                    INNER JOIN Products p ON od.ProductID = p.ProductID
                    INNER JOIN Orders o ON od.OrderID = o.OrderID
                    INNER JOIN Users u ON o.UserID = u.UserID
                    WHERE p.SellerID = @sellerId AND u.Role = 'Customer' AND u.IsActive = 1
                ";

                targetCustomerIds = await _context.Database
                    .SqlQueryRaw<int>(fallbackSql, new SqlParameter("@sellerId", sellerId))
                    .ToListAsync();

                Console.WriteLine($"🔄 [SEND] Fallback found {targetCustomerIds.Count} customers");

                if (!targetCustomerIds.Any())
                {
                    // Mark as sent with 0 recipients (new seller case)
                    Console.WriteLine($"ℹ️ [SEND] New seller with no customers - marking as sent with 0 recipients");
                    
                    notification.Status = "sent";
                    notification.SentAt = VietnamNow;
                    notification.TotalSent = 0;
                    _context.Notifications.Update(notification);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
            }
        }

        // ✅ CREATE UserNotifications for found customers
        Console.WriteLine($"📤 [SEND] Creating UserNotifications for {targetCustomerIds.Count} customers");

        var userNotifications = targetCustomerIds.Select(customerId => new UserNotification
        {
            NotificationID = notificationId,
            UserID = customerId,
            UserType = "Customer",
            ReceivedAt = VietnamNow,
            IsRead = false,
            IsDeleted = false
        }).ToList();

        _context.UserNotifications.AddRange(userNotifications);

        // ✅ UPDATE notification status
        notification.Status = "sent";
        notification.SentAt = VietnamNow;
        notification.TotalSent = targetCustomerIds.Count;

        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        Console.WriteLine($"✅ [SEND] Successfully sent to {targetCustomerIds.Count} customers");
        return true;
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        Console.WriteLine($"❌ [SEND ERROR] {ex.Message}");
        Console.WriteLine($"❌ [SEND STACK] {ex.StackTrace}");
        throw;
    }
}
        
        public async Task<List<CustomerInfoDto>> GetSellerCustomersAsync(int sellerId)
        {
            try
    {
        Console.WriteLine($"🔍 [CUSTOMERS] Getting customers for sellerId: {sellerId}");

        // ✅ Use LINQ instead of raw SQL
        var customers = await _context.OrderDetails
            .Include(od => od.Product)
            .Include(od => od.Order)
                .ThenInclude(o => o.User)
            .Where(od => od.Product.SellerID == sellerId && 
                        od.Order.User.Role == "Customer" && 
                        od.Order.User.IsActive)
            .GroupBy(od => new
            {
                od.Order.User.UserID,
                od.Order.User.FullName,
                od.Order.User.Email
            })
            .Select(g => new CustomerInfoDto
            {
                UserID = g.Key.UserID,
                UserName = g.Key.FullName ?? "Không xác định",
                Email = g.Key.Email ?? "Không xác định",
                TotalOrders = g.Select(od => od.Order.OrderID).Distinct().Count(),
                TotalSpent = g.Sum(od => od.Order.TotalPayment),
                LastOrderDate = g.Max(od => od.Order.OrderDate),
                CustomerType = g.Select(od => od.Order.OrderID).Distinct().Count() >= 5 ? "VIP" :
                             g.Select(od => od.Order.OrderID).Distinct().Count() >= 3 ? "Frequent" : "Regular"
            })
            .OrderByDescending(c => c.TotalSpent)
            .ToListAsync();

        Console.WriteLine($"✅ [CUSTOMERS] Found {customers.Count} customers for seller {sellerId}");
        return customers;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [CUSTOMERS ERROR] {ex.Message}");
        return new List<CustomerInfoDto>();
    }
        }

        public async Task<List<NotificationTemplateDto>> GetSellerNotificationTemplatesAsync()
        {
            // Predefined templates for sellers
            var templates = new List<NotificationTemplateDto>
    {
        new()
        {
            Type = "promotion",
            Name = "Khuyến mãi sản phẩm",
            TitleTemplate = "🎉 Khuyến mãi đặc biệt từ {ShopName}!",
            ContentTemplate = "Chúng tôi có chương trình khuyến mãi hấp dẫn cho các sản phẩm của shop. Giảm giá lên đến {DiscountPercent}% cho đơn hàng từ {MinAmount}đ. Thời gian có hạn!",
            Icon = "fa-percentage",
            Category = "Marketing"
        },
        new()
        {
            Type = "new_product",
            Name = "Sản phẩm mới",
            TitleTemplate = "🆕 Sản phẩm mới từ {ShopName}",
            ContentTemplate = "Chúng tôi vừa ra mắt sản phẩm mới: {ProductName}. Đặt hàng ngay để nhận ưu đãi đặc biệt cho khách hàng thân thiết!",
            Icon = "fa-star",
            Category = "Product"
        },
        new()
        {
            Type = "restock",
            Name = "Hàng có sẵn trở lại",
            TitleTemplate = "📦 {ProductName} đã có hàng trở lại!",
            ContentTemplate = "Sản phẩm {ProductName} mà bạn quan tâm đã có hàng trở lại. Đặt hàng ngay để không bỏ lỡ cơ hội!",
            Icon = "fa-box",
            Category = "Inventory"
        },
        new()
        {
            Type = "thank_you",
            Name = "Cảm ơn khách hàng",
            TitleTemplate = "💝 Cảm ơn bạn đã tin tưởng {ShopName}",
            ContentTemplate = "Cảm ơn bạn đã mua sắm tại shop chúng tôi. Sự hài lòng của bạn là động lực để chúng tôi cải thiện dịch vụ ngày càng tốt hơn.",
            Icon = "fa-heart",
            Category = "Customer Care"
        },
        new()
        {
            Type = "seasonal",
            Name = "Khuyến mãi theo mùa",
            TitleTemplate = "🌟 Ưu đãi {Season} từ {ShopName}",
            ContentTemplate = "Nhân dịp {Season}, shop chúng tôi dành tặng bạn những ưu đãi đặc biệt. Mua ngay để nhận quà tặng hấp dẫn!",
            Icon = "fa-gift",
            Category = "Seasonal"
        }
    };

            return await Task.FromResult(templates);
        }

      private async Task<List<int>> GetSellerTargetCustomers(int sellerId, string targetAudience)
{
    try
    {
        Console.WriteLine($"🎯 [TARGET] Processing: {targetAudience}");
        
        var parts = targetAudience.Split('_');
        
        // ✅ VALIDATE FORMAT: seller_123_type hoặc seller_123_specific_ids
        if (parts.Length < 3 || parts[0] != "seller") 
        {
            Console.WriteLine($"❌ [TARGET] Invalid format: {targetAudience}");
            return new List<int>();
        }

        // ✅ VALIDATE SELLER ID
        if (!int.TryParse(parts[1], out int targetSellerId) || targetSellerId != sellerId)
        {
            Console.WriteLine($"❌ [TARGET] Seller ID mismatch: expected {sellerId}, got {parts[1]}");
            return new List<int>();
        }

        var targetType = parts[2];

        // ✅ HANDLE SPECIFIC CUSTOMERS
        if (targetType == "specific")
        {
            if (parts.Length < 4)
            {
                Console.WriteLine($"❌ [SPECIFIC] No customer IDs in: {targetAudience}");
                return new List<int>();
            }

            return await ProcessSpecificCustomers(sellerId, parts[3]);
        }

        // ✅ HANDLE GENERAL TARGETING
        return await ProcessGeneralTargeting(sellerId, targetType);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [TARGET ERROR] {ex.Message}");
        return new List<int>();
    }
}

private async Task<List<int>> ProcessSpecificCustomers(int sellerId, string customerIdsString)
{
    var customerIds = customerIdsString
        .Split(',', StringSplitOptions.RemoveEmptyEntries)
        .Where(id => int.TryParse(id.Trim(), out _))
        .Select(id => int.Parse(id.Trim()))
        .ToList();

    Console.WriteLine($"🎯 [SPECIFIC] Parsed {customerIds.Count} customer IDs");

    // ✅ VALIDATE OWNERSHIP
    var validCustomers = new List<int>();
    
    var validationSql = @"
        SELECT DISTINCT o.UserID
        FROM OrderDetails od
        INNER JOIN Products p ON od.ProductID = p.ProductID
        INNER JOIN Orders o ON od.OrderID = o.OrderID
        INNER JOIN Users u ON o.UserID = u.UserID
        WHERE p.SellerID = @sellerId 
          AND u.Role = 'Customer' 
          AND u.IsActive = 1
          AND o.UserID IN ({0})
    ";

    var inClause = string.Join(",", customerIds);
    var sql = string.Format(validationSql, inClause);

    validCustomers = await _context.Database
        .SqlQueryRaw<int>(sql, new SqlParameter("@sellerId", sellerId))
        .ToListAsync();

    Console.WriteLine($"✅ [SPECIFIC] Validated {validCustomers.Count}/{customerIds.Count} customers");
    return validCustomers;
}

private async Task<List<int>> ProcessGeneralTargeting(int sellerId, string targetType)
{
    string sql = targetType switch
    {
        "all" => @"
            SELECT DISTINCT o.UserID 
            FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            INNER JOIN Users u ON o.UserID = u.UserID
            WHERE p.SellerID = @sellerId AND u.Role = 'Customer' AND u.IsActive = 1
        ",
        "recent" => @"
            SELECT DISTINCT o.UserID 
            FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            INNER JOIN Users u ON o.UserID = u.UserID
            WHERE p.SellerID = @sellerId AND u.Role = 'Customer' AND u.IsActive = 1
              AND o.OrderDate >= DATEADD(day, -30, GETUTCDATE())
        ",
        "frequent" => @"
            SELECT o.UserID FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            INNER JOIN Users u ON o.UserID = u.UserID
            WHERE p.SellerID = @sellerId AND u.Role = 'Customer' AND u.IsActive = 1
            GROUP BY o.UserID HAVING COUNT(DISTINCT o.OrderID) >= 3
        ",
        "vip" => @"
            SELECT o.UserID FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            INNER JOIN Users u ON o.UserID = u.UserID
            WHERE p.SellerID = @sellerId AND u.Role = 'Customer' AND u.IsActive = 1
            GROUP BY o.UserID HAVING SUM(ISNULL(o.TotalPayment, 0)) >= 1000000
        ",
        _ => ""
    };

    if (string.IsNullOrEmpty(sql))
    {
        Console.WriteLine($"❌ [GENERAL] Unknown target type: {targetType}");
        return new List<int>();
    }

    var customers = await _context.Database
        .SqlQueryRaw<int>(sql, new SqlParameter("@sellerId", sellerId))
        .ToListAsync();

    Console.WriteLine($"✅ [GENERAL] Found {customers.Count} customers for type '{targetType}'");
    return customers;
}
       
       
        public async Task<bool> DeleteSellerNotificationAsync(int notificationId, int sellerId)
        {
            // ⭐ TƯƠNG TỰ DeleteNotificationAsync nhưng có check sellerId
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

            if (notification == null) return false;

            // Check if notification has been sent (giống admin)
            if (notification.Status == "sent")
            {
                throw new InvalidOperationException("Cannot delete sent notification");
            }

            _context.Notifications.Remove(notification);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<NotificationDto?> UpdateSellerNotificationAsync(int notificationId, CreateSellerNotificationDto dto, int sellerId)
        {
            // ⭐ TƯƠNG TỰ UpdateNotificationAsync nhưng có check sellerId
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

            if (notification == null) return null;

            if (notification.Status == "sent")
                throw new InvalidOperationException("Cannot update sent notification");

            // Map từ CreateSellerNotificationDto (khác với admin dùng UpdateNotificationDto)
            notification.Title = dto.Title;
            notification.Content = dto.Content;
            notification.Type = dto.Type;
            notification.Icon = dto.Icon ?? "fa-store";
            notification.ActionText = dto.ActionText;
            notification.ActionUrl = dto.ActionUrl;
            notification.TargetAudience = $"seller_{sellerId}_{dto.TargetCustomers}";
            notification.ScheduledAt = dto.ScheduledAt;

            _context.Notifications.Update(notification);
            await _context.SaveChangesAsync();

            return _mapper.Map<NotificationDto>(notification);
        }

        public async Task<object> GetSellerNotificationStatsAsync(int notificationId, int sellerId)
        {
            // ⭐ TƯƠNG TỰ GetNotificationStatsAsync nhưng có check sellerId
            var notification = await _context.Notifications
                .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

            if (notification == null) return null;

            // SỬ DỤNG LẠI LOGIC CỦA GetNotificationStatsAsync
            return await GetNotificationStatsAsync(notificationId);
        }

        public async Task<List<NotificationRecipientDto>> GetSellerNotificationRecipientsAsync(int notificationId, int sellerId)
        {
            try
            {
                Console.WriteLine($"🔍 [RECIPIENTS] Getting recipients for notification {notificationId}, seller {sellerId}");

                // ✅ CHECK OWNERSHIP FIRST
                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.NotificationID == notificationId && n.CreatedBy == sellerId);

                if (notification == null)
                {
                    Console.WriteLine($"❌ [RECIPIENTS] Notification {notificationId} not found or not owned by seller {sellerId}");
                    return new List<NotificationRecipientDto>();
                }

                // ✅ GET RECIPIENTS WITH ENHANCED INFO
                var recipients = await _context.UserNotifications
                    .Include(un => un.User)
                    .Where(un => un.NotificationID == notificationId && !un.IsDeleted)
                    .Select(un => new
                    {
                        un.UserNotificationID,
                        un.UserID,
                        CustomerName = un.User.FullName ?? "Khách hàng",
                        Email = un.User.Email,
                        Phone = un.User.Phone,
                        Avatar = un.User.Avatar,
                        un.IsRead,
                        SentAt = un.ReceivedAt,
                        ReadAt = un.ReadAt,
                        un.IsDeleted,
                        un.DeletedAt,
                        IsActive = un.User.IsActive,
                        JoinedDate = un.User.CreatedAt
                    })
                    .OrderBy(un => un.CustomerName)
                    .ToListAsync();

                Console.WriteLine($"✅ [RECIPIENTS] Found {recipients.Count} recipients for notification {notificationId}");

                // ✅ ENHANCE WITH CUSTOMER STATS
                var result = new List<NotificationRecipientDto>();

                foreach (var recipient in recipients)
                {
                    // Get customer purchase stats
                    var customerStats = await GetCustomerStatsForSeller(recipient.UserID, sellerId);

                    result.Add(new NotificationRecipientDto
                    {
                        UserNotificationID = recipient.UserNotificationID,
                        UserID = recipient.UserID,
                        CustomerName = recipient.CustomerName,
                        Email = recipient.Email,
                        Phone = recipient.Phone,
                        Avatar = recipient.Avatar,
                        IsRead = recipient.IsRead,
                        SentAt = recipient.SentAt,
                        ReadAt = recipient.ReadAt,
                        IsDeleted = recipient.IsDeleted,
                        DeletedAt = recipient.DeletedAt,
                        IsActive = recipient.IsActive,
                        JoinedDate = recipient.JoinedDate,

                        // Enhanced stats
                        TotalOrders = customerStats.TotalOrders,
                        TotalSpent = customerStats.TotalSpent,
                        CustomerType = customerStats.CustomerType,
                        LastOrderDate = customerStats.LastOrderDate
                    });
                }

                Console.WriteLine($"✅ [RECIPIENTS] Enhanced {result.Count} recipients with customer stats");
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [RECIPIENTS ERROR] {ex.Message}");
                return new List<NotificationRecipientDto>();
            }
        }
private async Task<(int TotalOrders, decimal TotalSpent, string CustomerType, DateTime? LastOrderDate)> 
    GetCustomerStatsForSeller(int customerId, int sellerId)
{
    try
    {
        // ✅ SAFE SQL Query with proper parameter handling
        var sql = @"
            SELECT 
                COUNT(DISTINCT o.OrderID) as TotalOrders,
                ISNULL(SUM(o.TotalPayment), 0) as TotalSpent,
                MAX(o.OrderDate) as LastOrderDate
            FROM OrderDetails od
            INNER JOIN Products p ON od.ProductID = p.ProductID
            INNER JOIN Orders o ON od.OrderID = o.OrderID
            WHERE p.SellerID = @sellerId 
              AND o.UserID = @customerId
        ";

        // ✅ Use raw SQL with proper parameters
        using var command = _context.Database.GetDbConnection().CreateCommand();
        command.CommandText = sql;
        
        var sellerParam = command.CreateParameter();
        sellerParam.ParameterName = "@sellerId";
        sellerParam.Value = sellerId;
        command.Parameters.Add(sellerParam);
        
        var customerParam = command.CreateParameter();
        customerParam.ParameterName = "@customerId";
        customerParam.Value = customerId;
        command.Parameters.Add(customerParam);
        
        await _context.Database.OpenConnectionAsync();
        
        using var reader = await command.ExecuteReaderAsync();
        
        if (await reader.ReadAsync())
        {
            var totalOrders = reader.IsDBNull(0) ? 0 : reader.GetInt32(0);
            var totalSpent = reader.IsDBNull(1) ? 0m : reader.GetDecimal(1);
            var lastOrderDate = reader.IsDBNull(2) ? (DateTime?)null : reader.GetDateTime(2);
            
            // Determine customer type
            string customerType = totalOrders switch
            {
                >= 5 when totalSpent >= 1000000 => "VIP",
                >= 3 => "Frequent",
                _ => "Regular"
            };

            return (totalOrders, totalSpent, customerType, lastOrderDate);
        }
        
        return (0, 0, "Regular", null);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [CUSTOMER STATS ERROR] {ex.Message}");
        return (0, 0, "Regular", null);
    }
    finally
    {
        await _context.Database.CloseConnectionAsync();
    }
}
        public async Task<ResendNotificationResult> ResendNotificationToUserAsync(int userNotificationId, int sellerId)
        {
            try
            {
                Console.WriteLine($"🔄 [SERVICE] Resending notification {userNotificationId} by seller {sellerId}");

                // ✅ CHECK OWNERSHIP
                var userNotification = await _context.UserNotifications
                    .Include(un => un.Notification)
                    .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId &&
                                              un.Notification.CreatedBy == sellerId);

                if (userNotification == null)
                {
                    return new ResendNotificationResult
                    {
                        Success = false,
                        Message = "User notification not found or not owned by you"
                    };
                }

                // ✅ CREATE NEW NOTIFICATION RECORD
                var newUserNotification = new UserNotification
                {
                    NotificationID = userNotification.NotificationID,
                    UserID = userNotification.UserID,
                    UserType = userNotification.UserType,
                    ReceivedAt = VietnamNow,
                    IsRead = false,
                    IsDeleted = false
                };

                _context.UserNotifications.Add(newUserNotification);
                await _context.SaveChangesAsync();

                Console.WriteLine($"✅ [SERVICE] Successfully resent notification to user {userNotification.UserID}");

                return new ResendNotificationResult
                {
                    Success = true,
                    Message = "Đã gửi lại thông báo thành công",
                    NewUserNotificationId = newUserNotification.UserNotificationID,
                    SentAt = newUserNotification.ReceivedAt
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [SERVICE ERROR] {ex.Message}");
                throw new Exception($"Failed to resend notification: {ex.Message}", ex);
            }
        }
        #endregion
    }
}