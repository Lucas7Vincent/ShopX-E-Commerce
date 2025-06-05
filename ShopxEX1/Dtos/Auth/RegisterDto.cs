using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Input: Đăng ký (Chức năng 3. Người dùng)
    public class RegisterDto
    {
        [Required][EmailAddress][StringLength(100)] public string Email { get; set; } = string.Empty;
        [Required][StringLength(100, MinimumLength = 6)] public string Password { get; set; } = string.Empty;
        [DataType(DataType.Password)][Compare("Password")] public string ConfirmPassword { get; set; } = string.Empty;
        [StringLength(100)] public string? FullName { get; set; }
        [StringLength(20)] public string? Phone { get; set; }
        [StringLength(255)] public string? Address { get; set; }
    }
}
