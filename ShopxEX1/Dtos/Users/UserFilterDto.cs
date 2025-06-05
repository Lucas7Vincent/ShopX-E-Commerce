namespace ShopxEX1.Dtos.Users
{
    // Tham số để lọc danh sách người dùng (Admin view)
    public class UserFilterDto
    {
        public bool? IsActive { get; set; }
        public string? SearchTerm { get; set; } // Tìm kiếm theo fullname,email, phone
        public string? Role { get; set; }
        public string? SortBy { get; set; }
    }
}
