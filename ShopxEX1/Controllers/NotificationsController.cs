using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Notifications;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using ShopxEX1.Services.Interfaces;
using System.Security.Claims;

namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly AppDbContext _context;
        public NotificationsController(INotificationService notificationService,AppDbContext context)
        {
            _notificationService = notificationService;
            _context = context;
        }

        // ============================================
        // ADMIN ENDPOINTS
        // ============================================

        [HttpGet("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminNotifications(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? search = null,
            [FromQuery] string? type = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null)
        {
            try
            {
                var result = await _notificationService.GetAdminNotificationsAsync(
                    pageNumber, pageSize, search, type, dateFrom, dateTo);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetNotificationById(int id)
        {
            try
            {
                var notification = await _notificationService.GetNotificationByIdAsync(id);
                if (notification == null)
                    return NotFound(new { message = "Notification not found" });

                return Ok(notification);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("admin")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateNotification([FromBody] CreateNotificationDto dto)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    
    try
    {
        Console.WriteLine($"🔔 [ADMIN CREATE] Starting notification creation");
        
        if (!ModelState.IsValid)
        {
            Console.WriteLine("❌ [ADMIN CREATE] Model validation failed");
            return BadRequest(ModelState);
        }

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        // ✅ GET VIETNAM TIMEZONE - SAME AS SELLER
        var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vietnamTimeZone);
        
        // ✅ CHECK FOR DUPLICATES WITH VIETNAM TIME
        var duplicateCheck = await _context.Notifications
            .Where(n => n.CreatedBy == userId && 
                       n.Title == dto.Title && 
                       n.CreatedAt >= vietnamNow.AddMinutes(-1)) // Vietnam time comparison
            .FirstOrDefaultAsync();
            
        if (duplicateCheck != null)
        {
            Console.WriteLine($"❌ [ADMIN CREATE] Duplicate notification detected: {duplicateCheck.NotificationID}");
            await transaction.RollbackAsync();
            return BadRequest(new { message = "Thông báo này đã được tạo gần đây. Vui lòng chờ 1 phút trước khi tạo lại." });
        }
        
        // ✅ CONVERT SCHEDULED TIME IF PROVIDED
        DateTime? utcScheduledAt = null;
        if (dto.ScheduledAt.HasValue)
        {
            // Convert from Vietnam timezone to UTC for storage
            utcScheduledAt = TimeZoneInfo.ConvertTimeToUtc(dto.ScheduledAt.Value, vietnamTimeZone);
            
            // Validate future time
            if (utcScheduledAt <= DateTime.UtcNow)
            {
                return BadRequest(new { message = "Thời gian lên lịch phải lớn hơn thời gian hiện tại" });
            }
        }
        
        // ✅ CREATE WITH PROPER TIMEZONE
        var notification = new Notification
        {
            Title = dto.Title,
            Content = dto.Content,
            Type = dto.Type,
            Icon = dto.Icon ?? "fa-bell",
            ActionText = dto.ActionText,
            ActionUrl = dto.ActionUrl,
            TargetAudience = dto.TargetAudience,
            CreatedBy = userId,
            CreatedAt = vietnamNow, // Store Vietnam time
            ScheduledAt = utcScheduledAt, // Store UTC for scheduling
            Status = "draft",
            TotalSent = 0,
            TotalRead = 0
        };
        
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
        
        await transaction.CommitAsync();
        
        Console.WriteLine($"✅ [ADMIN CREATE] Successfully created notification {notification.NotificationID} at {vietnamNow}");
        
        // ✅ RETURN WITH VIETNAM TIME
        var result = new
        {
            notification.NotificationID,
            notification.Title,
            notification.Content,
            notification.Type,
            notification.Status,
            CreatedAt = vietnamNow,
            ScheduledAt = dto.ScheduledAt, // Return original client time
            VietnamTime = vietnamNow.ToString("dd/MM/yyyy HH:mm:ss")
        };
        
        return CreatedAtAction(
            nameof(GetNotificationById), 
            new { id = result.NotificationID }, 
            result
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [ADMIN CREATE] Exception: {ex.Message}");
        await transaction.RollbackAsync();
        return StatusCode(500, new { message = "Lỗi hệ thống khi tạo thông báo", error = ex.Message });
    }
}
        [HttpPut("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateNotification(int id, [FromBody] UpdateNotificationDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var result = await _notificationService.UpdateNotificationAsync(id, dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("admin/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            try
            {
                var result = await _notificationService.DeleteNotificationAsync(id);
                if (!result)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("admin/send/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendNotification(int id)
{
    try
    {
        Console.WriteLine($"📤 [ADMIN SEND] Sending notification {id}");
        
        // ✅ ENHANCE SEND RESULT WITH TIMEZONE
        var result = await _notificationService.SendNotificationAsync(id);

        if (!result)
        {
            return BadRequest(new { message = "Cannot send notification" });
        }
        
        // ✅ UPDATE sentAt WITH VIETNAM TIMEZONE
        var notification = await _context.Notifications.FindAsync(id);
        if (notification != null)
        {
            var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
            var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vietnamTimeZone);
            
            notification.SentAt = vietnamNow;
            notification.Status = "sent";
            
            await _context.SaveChangesAsync();
            
            Console.WriteLine($"✅ [ADMIN SEND] Notification {id} sent successfully at {vietnamNow}");

            return Ok(new { 
                message = "Notification sent successfully",
                sentAt = vietnamNow,
                vietnamTime = vietnamNow.ToString("dd/MM/yyyy HH:mm:ss"),
                totalRecipients = notification.TotalSent
            });
        }

        return Ok(new { message = "Notification sent successfully" });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [ADMIN SEND ERROR] {ex.Message}");
        return StatusCode(500, new { message = ex.Message });
    }
}
[HttpGet("admin/users")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> GetUsersForTargeting(
    [FromQuery] string? role = null,
    [FromQuery] string? search = null,
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 50)
{
    try
    {
        Console.WriteLine($"🔍 [ADMIN] Getting users for targeting - Role: {role}, Search: {search}");
        
        var query = _context.Users.Where(u => u.IsActive);
        
        // Filter by role
        if (!string.IsNullOrEmpty(role) && role != "all")
        {
            var targetRole = role.ToLower() switch
            {
                "customers" => "Customer",
                "sellers" => "Seller",
                "admins" => "Admin",
                _ => null
            };
            
            if (targetRole != null)
            {
                query = query.Where(u => u.Role == targetRole);
            }
        }
        
        // Search filter
        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(u => 
                u.FullName.Contains(search) || 
                u.Email.Contains(search) ||
                (u.Phone != null && u.Phone.Contains(search)));
        }
        
        var totalCount = await query.CountAsync();
        
        // ✅ SIMPLE VERSION: Basic user info only
        var users = await query
            .OrderBy(u => u.FullName)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.UserID,
                u.FullName,
                u.Email,
                u.Phone,
                u.Role,
                u.Avatar,
                u.CreatedAt,
                
                // ✅ SIMPLIFIED: Use static values to avoid date conversion issues
                TotalOrders = 0, // Will be calculated client-side if needed
                TotalProducts = 0, // Will be calculated client-side if needed  
                LastActivity = u.CreatedAt // Just use CreatedAt to avoid complexity
            })
            .ToListAsync();
        
        Console.WriteLine($"✅ [ADMIN] Found {users.Count} users for targeting");
        
        return Ok(new
        {
            users = users,
            totalCount = totalCount,
            totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
            currentPage = pageNumber,
            pageSize = pageSize,
            role = role,
            search = search
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [ADMIN] Error getting users: {ex.Message}");
        return StatusCode(500, new { message = "Internal server error", error = ex.Message });
    }
}


[HttpGet("admin/users/summary")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> GetUsersSummary()
{
    try
    {
        var summary = new
        {
            TotalUsers = await _context.Users.CountAsync(u => u.IsActive),
            TotalCustomers = await _context.Users.CountAsync(u => u.Role == "Customer" && u.IsActive),
            TotalSellers = await _context.Users.CountAsync(u => u.Role == "Seller" && u.IsActive),
            TotalAdmins = await _context.Users.CountAsync(u => u.Role == "Admin" && u.IsActive),
            
            // ✅ FIX: Gọi qua service thay vì trực tiếp
            VipCustomers = (await _notificationService.GetVipCustomersAsync()).Count,
            ActiveSellers = (await _notificationService.GetActiveSellerssAsync()).Count,
            NewUsersThisMonth = await _context.Users
                .CountAsync(u => u.IsActive && u.CreatedAt >= DateTime.UtcNow.AddDays(-30))
        };
        
        return Ok(summary);
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { message = ex.Message });
    }
}
        // ============================================
        // USER ENDPOINTS
        // ============================================

        [HttpGet("user")]
        public async Task<IActionResult> GetUserNotifications(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] bool unreadOnly = false)
{
    try
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        Console.WriteLine($"🔍 [USER-NOTI] Getting notifications for user {userId}, Page: {pageNumber}, UnreadOnly: {unreadOnly}");
        
        // ✅ BUILD QUERY
        var query = _context.UserNotifications
            .Include(un => un.Notification)
            .Where(un => un.UserID == userId && !un.IsDeleted);
        
        // Filter unread only
        if (unreadOnly)
        {
            query = query.Where(un => !un.IsRead);
        }
        
        // ✅ GET TOTAL COUNT
        var totalCount = await query.CountAsync();
        
        // ✅ APPLY PAGINATION
        var userNotifications = await query
            .OrderByDescending(un => un.ReceivedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        
        // ✅ MAP TO DTO - MATCH VỚI FRONTEND EXPECT
        var notifications = userNotifications.Select(un => new
        {
            userNotificationID = un.UserNotificationID,
            notificationID = un.NotificationID,
            title = un.Notification.Title,
            content = un.Notification.Content,
            type = un.Notification.Type,
            icon = un.Notification.Icon,
            actionText = un.Notification.ActionText,
            actionUrl = un.Notification.ActionUrl,
            isRead = un.IsRead,
            receivedAt = un.ReceivedAt,
            readAt = un.ReadAt,
            createdAt = un.Notification.CreatedAt
        }).ToList();
        
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
        
        Console.WriteLine($"✅ [USER-NOTI] Returning {notifications.Count} notifications, Total: {totalCount}");
        
        // ✅ RESPONSE FORMAT MATCH VỚI FRONTEND
        return Ok(new {
            notifications = notifications,
            currentPage = pageNumber,
            pageSize = pageSize,
            totalCount = totalCount,
            totalPages = totalPages,
            hasNextPage = pageNumber < totalPages,
            hasPreviousPage = pageNumber > 1
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [USER-NOTI ERROR] {ex.Message}");
        return StatusCode(500, new { message = "Internal server error", error = ex.Message });
    }
}
        [HttpPost("user/{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.MarkAsReadAsync(id, userId);

                if (!result)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification marked as read" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpDelete("user/{id}")]
        public async Task<IActionResult> DeleteUserNotification(int id)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.DeleteUserNotificationAsync(id, userId);

                if (!result)
                    return NotFound(new { message = "Notification not found" });

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("user/unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var userType = User.FindFirst(ClaimTypes.Role)?.Value ?? "Customer";

                var count = await _notificationService.GetUnreadCountAsync(userId, userType);
                return Ok(new { unreadCount = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        // Thêm endpoint này vào NotificationsController
        [HttpGet("admin/recipient-count")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetRecipientCount([FromQuery] string audience)
        {
            try
            {
                if (string.IsNullOrEmpty(audience))
                    return BadRequest(new { message = "Audience parameter is required" });

                var count = await _notificationService.GetRecipientCountAsync(audience);
                return Ok(new { count = count });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("admin/{id}/stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetNotificationStats(int id)
        {
            try
            {
                var stats = await _notificationService.GetNotificationStatsAsync(id);
                if (stats == null)
                    return NotFound(new { message = "Notification not found" });

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ============================================
        // SELLER ENDPOINTS 
        // ============================================

        [HttpGet("seller")]
[Authorize(Roles = "Seller")]
public async Task<IActionResult> GetSellerNotifications(
    [FromQuery] int pageNumber = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? search = null,
    [FromQuery] string? type = null)
{
    try
    {
        var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        Console.WriteLine($"🔍 [CONTROLLER] Getting seller notifications - Seller: {sellerId}");

        var result = await _notificationService.GetSellerNotificationsAsync(
            sellerId, pageNumber, pageSize, search, type);

        // ✅ CONVERT TIMEZONE FOR ALL DATETIME FIELDS
        var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        
        var convertedNotifications = result.Items.Select(notification => new
        {
            notification.NotificationID,
            notification.Title,
            notification.Content,
            notification.Type,
            notification.Status,
            notification.TargetAudience,
            notification.ActionText,
            notification.ActionUrl,
            notification.Icon,
            notification.TotalSent,
            notification.TotalRead,
            
            // ✅ CONVERT TO VIETNAM TIMEZONE
            CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(notification.CreatedAt, vietnamTimeZone),
            SentAt = notification.SentAt.HasValue ? 
                TimeZoneInfo.ConvertTimeFromUtc(notification.SentAt.Value, vietnamTimeZone) : 
                (DateTime?)null,
            ScheduledAt = notification.ScheduledAt.HasValue ? 
                TimeZoneInfo.ConvertTimeFromUtc(notification.ScheduledAt.Value, vietnamTimeZone) : 
                (DateTime?)null
        }).ToList();

        return Ok(new
        {
            notifications = convertedNotifications,
            currentPage = result.PageNumber,
            pageSize = result.PageSize,
            totalCount = result.TotalCount,
            totalPages = result.TotalPages,
            hasNextPage = result.HasNextPage,
            hasPreviousPage = result.HasPreviousPage,
            searchTerm = search,
            filterType = type,
            sellerId = sellerId
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [CONTROLLER ERROR] {ex.Message}");
        return StatusCode(500, new { message = "Internal server error", error = ex.Message });
    }
}
       
        [HttpPost("seller")]
[Authorize(Roles = "Seller")]
public async Task<IActionResult> CreateSellerNotification([FromBody] CreateSellerNotificationDto dto)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    
    try
    {
        Console.WriteLine($"🔔 [CREATE] Starting notification creation for seller");
        Console.WriteLine($"🔔 [CREATE] DTO received: targetCustomers='{dto.TargetCustomers}', specificIds=[{string.Join(",", dto.SpecificCustomerIds ?? new List<int>())}]");
        
        if (!ModelState.IsValid)
        {
            Console.WriteLine("❌ [CREATE] Model validation failed");
            return BadRequest(ModelState);
        }

        var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        // ✅ VIETNAM TIMEZONE
        var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vietnamTimeZone);
        
        // ✅ CHECK FOR DUPLICATES
        var duplicateCheck = await _context.Notifications
            .Where(n => n.CreatedBy == sellerId && 
                       n.Title == dto.Title && 
                       n.CreatedAt >= vietnamNow.AddMinutes(-1))
            .FirstOrDefaultAsync();
            
        if (duplicateCheck != null)
        {
            Console.WriteLine($"❌ [CREATE] Duplicate notification detected: {duplicateCheck.NotificationID}");
            await transaction.RollbackAsync();
            return BadRequest(new { message = "Thông báo này đã được tạo gần đây. Vui lòng chờ 1 phút trước khi tạo lại." });
        }
        
        // ✅ CONVERT SCHEDULED TIME IF PROVIDED
        DateTime? vietnamScheduledAt = null;
        if (dto.ScheduledAt.HasValue)
        {
            vietnamScheduledAt = TimeZoneInfo.ConvertTimeToUtc(dto.ScheduledAt.Value, vietnamTimeZone);
        }
        
        // ✅ FIX: USE SERVICE TO CREATE (DON'T CREATE MANUALLY)
        Console.WriteLine($"📞 [CREATE] Calling NotificationService.CreateSellerNotificationAsync");
        
        var result = await _notificationService.CreateSellerNotificationAsync(dto, sellerId);
        
        await transaction.CommitAsync();
        
        Console.WriteLine($"✅ [CREATE] Successfully created notification {result.NotificationID}");
        Console.WriteLine($"✅ [CREATE] Target audience created: '{result.TargetAudience}'");
        
        return CreatedAtAction(
            nameof(GetSellerNotificationById), 
            new { id = result.NotificationID }, 
            result
        );
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [CREATE] Exception: {ex.Message}");
        await transaction.RollbackAsync();
        return StatusCode(500, new { message = "Lỗi hệ thống khi tạo thông báo", error = ex.Message });
    }
}


[HttpPost("seller/{id}/send")]
[Authorize(Roles = "Seller")]
public async Task<IActionResult> SendSellerNotification(int id)
{
    try
    {
        var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        Console.WriteLine($"📤 [SEND] Sending notification {id} by seller {sellerId}");
        
        // ✅ CHECK OWNERSHIP FIRST
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationID == id && n.CreatedBy == sellerId);
            
        if (notification == null)
        {
            return NotFound(new { message = "Notification not found or access denied" });
        }
        
        // ✅ SEND NOTIFICATION
        var result = await _notificationService.SendSellerNotificationAsync(id, sellerId);

        if (!result)
        {
            return BadRequest(new { message = "Cannot send notification" });
        }
        
        // ✅ UPDATE sentAt WITH VIETNAM TIMEZONE
        var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vietnamTimeZone);
        
        notification.SentAt = vietnamNow;
        notification.Status = "sent";
        
        await _context.SaveChangesAsync();
        
        Console.WriteLine($"✅ [SEND] Notification {id} sent successfully at {vietnamNow}");

        return Ok(new { 
            message = "Notification sent successfully to customers",
            sentAt = vietnamNow,
            vietnamTime = vietnamNow.ToString("dd/MM/yyyy HH:mm")
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [SEND ERROR] {ex.Message}");
        return StatusCode(500, new { message = ex.Message });
    }
}
        [HttpGet("seller/customers")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerCustomers()
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var customers = await _notificationService.GetSellerCustomersAsync(sellerId);

                return Ok(customers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("seller/notification-templates")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationTemplates()
        {
            try
            {
                var templates = await _notificationService.GetSellerNotificationTemplatesAsync();
                return Ok(templates);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpDelete("seller/{id}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> DeleteSellerNotification(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.DeleteSellerNotificationAsync(id, sellerId);

                if (!result)
                    return NotFound(new { message = "Notification not found or access denied" });

                return Ok(new { message = "Notification deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPut("seller/{id}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> UpdateSellerNotification(int id, [FromBody] CreateSellerNotificationDto dto)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var result = await _notificationService.UpdateSellerNotificationAsync(id, dto, sellerId);

                if (result == null)
                    return NotFound(new { message = "Notification not found or access denied" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpGet("seller/{id}/stats")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationStats(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                var stats = await _notificationService.GetSellerNotificationStatsAsync(id, sellerId);

                if (stats == null)
                    return NotFound(new { message = "Notification not found or access denied" });

                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        [HttpGet("seller/{id}")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationById(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                // Lấy notification và check ownership
                var notification = await _notificationService.GetNotificationByIdAsync(id);

                if (notification == null)
                    return NotFound(new { message = "Notification not found" });

                // Check if seller owns this notification
                if (notification.CreatedBy != sellerId)
                    return NotFound(new { message = "Access denied. You can only access your own notifications." });

                return Ok(notification);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }


        [HttpGet("seller/{id}/recipients")]
        [Authorize(Roles = "Seller")]
        public async Task<IActionResult> GetSellerNotificationRecipients(int id)
        {
            try
            {
                var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

                Console.WriteLine($"🔍 [CONTROLLER] Getting recipients for notification {id}, seller {sellerId}");

                // ✅ USE SELLER-SPECIFIC METHOD WITH OWNERSHIP CHECK
                var recipients = await _notificationService.GetSellerNotificationRecipientsAsync(id, sellerId);

                if (!recipients.Any())
                {
                    return NotFound(new
                    {
                        message = "Notification not found or no recipients",
                        notificationId = id,
                        sellerId = sellerId
                    });
                }

                // ✅ GET NOTIFICATION TITLE
                var notification = await _notificationService.GetNotificationByIdAsync(id);
                string notificationTitle = notification?.Title ?? "Thông báo không xác định";

                Console.WriteLine($"✅ [CONTROLLER] Returning {recipients.Count} recipients for notification '{notificationTitle}'");

                return Ok(new
                {
                    notificationTitle = notificationTitle,
                    recipients = recipients,
                    totalRecipients = recipients.Count,
                    totalRead = recipients.Count(r => r.IsRead),
                    totalUnread = recipients.Count(r => !r.IsRead),
                    readRate = recipients.Any() ? Math.Round((double)recipients.Count(r => r.IsRead) / recipients.Count * 100, 2) : 0
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [CONTROLLER ERROR] {ex.Message}");
                return StatusCode(500, new
                {
                    message = "Internal server error",
                    error = ex.Message
                });
            }
        }

[HttpPost("user/{userNotificationId}/resend")]
[Authorize(Roles = "Seller")]
public async Task<IActionResult> ResendNotificationToUser(int userNotificationId)
{
    try
    {
        var sellerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        
        Console.WriteLine($"🔄 [RESEND] Resending notification {userNotificationId} by seller {sellerId}");
        
        // ✅ CHECK OWNERSHIP
        var userNotification = await _context.UserNotifications
            .Include(un => un.Notification)
            .FirstOrDefaultAsync(un => un.UserNotificationID == userNotificationId && 
                                      un.Notification.CreatedBy == sellerId);
        
        if (userNotification == null)
        {
            return NotFound(new { message = "User notification not found or not owned by you" });
        }
        
        // ✅ CREATE NEW NOTIFICATION RECORD WITH VIETNAM TIMEZONE
        var vietnamTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        var vietnamNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, vietnamTimeZone);
        
        var newUserNotification = new UserNotification
        {
            NotificationID = userNotification.NotificationID,
            UserID = userNotification.UserID,
            UserType = userNotification.UserType,
            ReceivedAt = vietnamNow,  // ✅ VIETNAM TIME
            IsRead = false,
            IsDeleted = false
        };
        
        _context.UserNotifications.Add(newUserNotification);
        await _context.SaveChangesAsync();
        
        Console.WriteLine($"✅ [RESEND] Successfully resent to user {userNotification.UserID} at {vietnamNow}");
        
        return Ok(new { 
            message = "Đã gửi lại thông báo thành công",
            userNotificationId = newUserNotification.UserNotificationID,
            sentAt = vietnamNow,
            vietnamTime = vietnamNow.ToString("dd/MM/yyyy HH:mm:ss")
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ [RESEND ERROR] {ex.Message}");
        return StatusCode(500, new { message = "Internal server error", error = ex.Message });
    }
}
    }
}