namespace ShopxEX1.Dtos.Users
{
    // Output: Hiển thị thông tin user (sau login, xem profile)
    public class UserDto
    {
        public int UserID { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string Role { get; set; } = string.Empty; // Cần biết Role
        public DateTime? CreatedAt { get; set; }
        public bool? IsActive { get; set; } // Cần biết trạng thái
        public DateTime? Birthday { get; set; }
        public bool? Gender { get; set; }
        public string? Avatar { get; set; }
        public int? SellerID { get; set; } // Thêm SellerId
        public string? ShopName { get; set; } // Thêm ShopName
    }
}
