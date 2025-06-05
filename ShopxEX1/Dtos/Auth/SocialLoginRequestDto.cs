using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Thông tin client gửi lên khi đăng nhập bằng mạng xã hội
    public class SocialLoginRequestDto
    {
        // Email lấy từ nhà cung cấp social (Google, Facebook)
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        // Tên nhà cung cấp (vd: "google.com", "facebook.com")
        [Required]
        [StringLength(50)]
        public string Provider { get; set; } = string.Empty;
        // ID duy nhất của người dùng từ nhà cung cấp social (Firebase user.uid)
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;
    }
}
