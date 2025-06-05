using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopxEX1.Models
{
    [Table("UserNotifications")]
    public class UserNotification
    {
        [Key]
        public int UserNotificationID { get; set; }

        [Required]
        public int NotificationID { get; set; }

        [Required]
        public int UserID { get; set; }

        [Required]
        [StringLength(10)]
        public string UserType { get; set; }

        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }
        public bool IsDeleted { get; set; } = false;
        public DateTime? DeletedAt { get; set; }
        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        [ForeignKey("NotificationID")]
        public virtual Notification Notification { get; set; }

        [ForeignKey("UserID")]
        public virtual User User { get; set; }
    }
}