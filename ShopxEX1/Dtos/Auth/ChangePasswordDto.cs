using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Input: Đổi mật khẩu (khi đã đăng nhập)
    public class ChangePasswordDto
    {
        [Required][DataType(DataType.Password)] public string CurrentPassword { get; set; } = string.Empty;
        [Required][DataType(DataType.Password)][StringLength(100, MinimumLength = 6)] public string NewPassword { get; set; } = string.Empty;
        [DataType(DataType.Password)][Compare("NewPassword")] public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
