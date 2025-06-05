using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Input: Đăng nhập
    public class LoginDto
    {
        [Required(ErrorMessage = "Vui lòng nhập email.")]
        [EmailAddress(ErrorMessage = "Email phải đúng định dạng.")]
        public string Email { get; set; } = string.Empty; // Dùng Email làm định danh đăng nhập

        [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
        //[DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;
    }

    public class CheckSocialUserRequest
    {
        [Required(ErrorMessage = "Provider là bắt buộc")]
        public string Provider { get; set; } = string.Empty;

        [Required(ErrorMessage = "UserId là bắt buộc")]
        public string UserId { get; set; } = string.Empty;
    }
    public class CheckEmailRequest
    {
        [Required(ErrorMessage = "Email là bắt buộc")]
        [EmailAddress(ErrorMessage = "Định dạng email không hợp lệ")]
        public string Email { get; set; } = string.Empty;
    }
}
