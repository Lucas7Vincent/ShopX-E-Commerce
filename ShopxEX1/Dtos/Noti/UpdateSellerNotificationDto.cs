using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Notifications
{
    public class UpdateSellerNotificationDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Content { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = string.Empty;

        public string? Icon { get; set; }
        public string? ActionText { get; set; }
        public string? ActionUrl { get; set; }

        [Required]
        public string TargetCustomers { get; set; } = "all";

        public List<int>? SpecificCustomerIds { get; set; }
        public DateTime? ScheduledAt { get; set; }
    }

    public class NotificationRecipientDto
    {
        public int UserID { get; set; }
        
        public string CustomerName { get; set; } = string.Empty;
        
        public string? Email { get; set; }
        
        public string? Phone { get; set; }
        
        public string? Avatar { get; set; }
        
        public bool IsRead { get; set; }
        
        public DateTime SentAt { get; set; }
        
        public DateTime? ReadAt { get; set; }
        
        // Enhanced customer info
        public int TotalOrders { get; set; }
        
        public decimal TotalSpent { get; set; }
        
        public string CustomerType { get; set; } = "Regular"; // Regular, Frequent, VIP
        
        public DateTime? LastOrderDate { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime JoinedDate { get; set; }
        
        // Notification specific
        public int UserNotificationID { get; set; }
        
        public bool IsDeleted { get; set; }
        
        public DateTime? DeletedAt { get; set; }
        
        // Calculated fields
        public string ReadStatus => IsRead ? "Đã đọc" : "Chưa đọc";
        
        public string CustomerTypeText => CustomerType switch
        {
            "VIP" => "Khách VIP",
            "Frequent" => "Khách quen",
            "Regular" => "Khách thường",
            _ => "Không xác định"
        };
        
        public string TimeAgoText
        {
            get
            {
                var timeSpan = DateTime.UtcNow - SentAt;
                return timeSpan.TotalDays switch
                {
                    >= 1 => $"{(int)timeSpan.TotalDays} ngày trước",
                    >= 1.0/24 => $"{(int)timeSpan.TotalHours} giờ trước",
                    >= 1.0/(24*60) => $"{(int)timeSpan.TotalMinutes} phút trước",
                    _ => "Vừa xong"
                };
            }
        }
    }
public class ResendNotificationResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? NewUserNotificationId { get; set; }
    public DateTime? SentAt { get; set; }
}
}