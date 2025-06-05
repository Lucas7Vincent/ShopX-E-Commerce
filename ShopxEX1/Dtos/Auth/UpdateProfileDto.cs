using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    public class UpdateProfileDto
    {
        [Required(ErrorMessage = "Họ tên không được để trống")]
        [StringLength(100, ErrorMessage = "Họ tên không được vượt quá 100 ký tự")]
        public string FullName { get; set; } = string.Empty;

        [EmailAddress(ErrorMessage = "Email không hợp lệ")]
        [StringLength(100, ErrorMessage = "Email không được vượt quá 100 ký tự")]
        public string? Email { get; set; }

        [Phone(ErrorMessage = "Số điện thoại không hợp lệ")]
        [StringLength(20, ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự")]
        public string? Phone { get; set; }

        [StringLength(500, ErrorMessage = "URL avatar không được vượt quá 500 ký tự")]
        public string? Avatar { get; set; }
        public string? Birthday { get; set; }
        public bool? Gender { get; set; }
        public string? Address { get; set; }
        public string Role { get; set; }
        public string? ShopName { get; set; }
        public string? SellerID { get; set; }
    }
} 