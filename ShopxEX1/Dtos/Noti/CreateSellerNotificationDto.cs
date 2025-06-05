using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Notifications
{

    public class CreateSellerNotificationDto
    {
        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(1000)]
        public string Content { get; set; } = string.Empty;

        [Required]
        public string Type { get; set; } = "promotion"; // promotion, announcement, reminder, etc.

        public string? Icon { get; set; } = "fa-store";

        public string? ActionText { get; set; }

        public string? ActionUrl { get; set; }

        [Required]
        public string TargetCustomers { get; set; } = "all"; // all, recent, frequent, specific

        public List<int>? SpecificCustomerIds { get; set; }

        public DateTime? ScheduledAt { get; set; }
    }
public class CustomerInfoDto
{
    public int UserID { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int TotalOrders { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime LastOrderDate { get; set; }
    public string CustomerType { get; set; } = "Regular"; // Regular, Frequent, VIP
}
    public class NotificationTemplateDto
{
    public string Type { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string TitleTemplate { get; set; } = string.Empty;
    public string ContentTemplate { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}
}