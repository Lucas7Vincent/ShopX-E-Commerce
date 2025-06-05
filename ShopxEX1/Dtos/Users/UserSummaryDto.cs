namespace ShopxEX1.Dtos.Users
{
    // Thông tin tóm tắt của người dùng để hiển thị trong danh sách (Admin view).
    public class UserSummaryDto
    {
        public int UserID { get; set; }
        // Không cần Username nếu Email là định danh chính
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string Role { get; set; } = string.Empty; // Quan trọng để biết vai trò
        public bool? IsActive { get; set; } // Quan trọng để biết trạng thái
        public DateTime? CreatedAt { get; set; } // Ngày tạo có thể hữu ích
    }
}
