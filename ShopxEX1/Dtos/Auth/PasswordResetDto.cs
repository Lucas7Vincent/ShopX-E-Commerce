using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    public class PasswordResetDto
    {
        [Required] public string Token { get; set; } = string.Empty;
        [Required][EmailAddress] public string Email { get; set; } = string.Empty;
        [Required][DataType(DataType.Password)][StringLength(100, MinimumLength = 6)] public string NewPassword { get; set; } = string.Empty;
        [DataType(DataType.Password)][Compare("NewPassword")] public string ConfirmNewPassword { get; set; } = string.Empty;
    }
}
