using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Users
{
    // Dữ liệu cần thiết để Admin tạo một người dùng mới.
    public class UserCreateDto
    {
        // Email dùng làm định danh đăng nhập và là duy nhất
        [Required(ErrorMessage = "Email không được để trống.")]
        [EmailAddress(ErrorMessage = "Địa chỉ email không hợp lệ.")]
        [StringLength(100)]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty; // Sẽ được hash trong service

        [Required(ErrorMessage = "Vai trò không được để trống.")]
        [StringLength(50)]
        public string Role { get; set; } = string.Empty; // Admin chỉ định Role (Customer, Seller, Admin?)

        [StringLength(100)]
        public string FullName { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(255)]
        public string? Address { get; set; }

        [StringLength(150, ErrorMessage = "Tên cửa hàng không được vượt quá 150 ký tự.")]
        public string? ShopName { get; set; }

        // Admin có thể quyết định trạng thái active khi tạo
        public bool IsActive { get; set; } = true;
    }
}
