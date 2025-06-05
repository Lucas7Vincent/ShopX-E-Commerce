using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopxEX1.Models
{
    [Table("Notifications")]
    public class Notification
    {
        [Key]
        public int NotificationID { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        public string Content { get; set; }

        [StringLength(50)]
        public string Type { get; set; } = "general";

        [StringLength(50)]
        public string Icon { get; set; } = "fa-bell";

        [StringLength(100)]
        public string? ActionText { get; set; }

        [StringLength(500)]
        public string? ActionUrl { get; set; }

        [StringLength(20)]
        public string TargetAudience { get; set; } = "both";

        [StringLength(20)]
        public string Status { get; set; } = "draft";

        public DateTime? ScheduledAt { get; set; }
        public DateTime? SentAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public int? CreatedBy { get; set; }

        public int TotalSent { get; set; } = 0;
        public int TotalRead { get; set; } = 0;

        // Navigation properties
        [ForeignKey("CreatedBy")]
        public virtual User? Creator { get; set; }
        public virtual ICollection<UserNotification> UserNotifications { get; set; }
    }
}