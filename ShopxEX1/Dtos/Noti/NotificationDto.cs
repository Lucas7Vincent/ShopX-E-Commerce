using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Notifications
{
    public class NotificationDto
    {
        public int NotificationID { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string Type { get; set; }
        public string Icon { get; set; }
        public string? ActionText { get; set; }
        public string? ActionUrl { get; set; }
        public string TargetAudience { get; set; }
        public string Status { get; set; }
        public DateTime? ScheduledAt { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public int? CreatedBy { get; set; }
        public int TotalSent { get; set; }
        public int TotalRead { get; set; }
    }

    public class CreateNotificationDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }

        public string Type { get; set; } = "general";
        public string Icon { get; set; } = "fa-bell";
        public string? ActionText { get; set; }
        public string? ActionUrl { get; set; }
        public string TargetAudience { get; set; } = "both";
        public DateTime? ScheduledAt { get; set; }
        public List<int>? SpecificUserIds { get; set; }
         public bool IncludeInactiveUsers { get; set; } = false;
    public decimal? MinSpentAmount { get; set; }
    public int? MinOrderCount { get; set; }
    public DateTime? RegisteredAfter { get; set; }
    public DateTime? LastActiveAfter { get; set; }
    
    }

    public class UpdateNotificationDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }

        public string Type { get; set; }
        public string Icon { get; set; }
        public string? ActionText { get; set; }
        public string? ActionUrl { get; set; }
        public string TargetAudience { get; set; }
        public DateTime? ScheduledAt { get; set; }
    }

    public class UserNotificationDto
    {
        public int UserNotificationID { get; set; }
        public int NotificationID { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string Type { get; set; }
        public string Icon { get; set; }
        public string? ActionText { get; set; }
        public string? ActionUrl { get; set; }
        public bool IsRead { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime ReceivedAt { get; set; }
    }
public class CustomerStatsResult
{
    public int TotalOrders { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime? LastOrderDate { get; set; }
}
}