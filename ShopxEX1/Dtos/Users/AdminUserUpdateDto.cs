using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Users
{
    // Dữ liệu Admin gửi lên để cập nhật thông tin người dùng
    public class AdminUserUpdateDto
    {
        [StringLength(100)]
        public string? FullName { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(255)]
        public string? Address { get; set; }

        // Admin có thể thay đổi các trường này
        [Required(ErrorMessage = "Vai trò không được để trống.")]
        [StringLength(50)]
        public string Role { get; set; } = string.Empty; // Admin có thể set Role

        [StringLength(150, ErrorMessage = "Tên cửa hàng không được vượt quá 150 ký tự.")]
        public string? ShopName { get; set; }

        [Required(ErrorMessage = "Trạng thái hoạt động là bắt buộc.")]
        public bool IsActive { get; set; } // Admin có thể kích hoạt/vô hiệu hóa
    }
}
