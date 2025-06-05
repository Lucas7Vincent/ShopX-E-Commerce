using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Input: Yêu cầu reset mật khẩu
    /// <summary>
    /// DTO cho việc yêu cầu đặt lại mật khẩu
    /// </summary>
    public class RequestPasswordResetDto
    {
        [Required(ErrorMessage = "Email là bắt buộc")]
        [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
        [StringLength(255, ErrorMessage = "Email không được quá 255 ký tự")]
        public string Email { get; set; } = string.Empty;
    }
 public class CancelResetDto
    {
        [Required]
        public string Token { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    public class ResendResetEmailDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

}
