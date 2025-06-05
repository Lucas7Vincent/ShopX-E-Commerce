using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Users
{
    // Input: User tự cập nhật thông tin profile
    public class UserProfileUpdateDto
    {
        [StringLength(100)] public string? FullName { get; set; }
        [StringLength(20)] public string? Phone { get; set; }
        [StringLength(255)] public string? Address { get; set; }
        public string Role { get; set; } // Thêm Role
        public string ShopName { get; set; } // Thêm ShopName
    }
}
