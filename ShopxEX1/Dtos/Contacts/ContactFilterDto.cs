namespace ShopxEX1.Dtos.Contacts
{
    // Dùng để lọc và tìm kiếm danh sách liên hệ
    public class ContactFilterDto
    {
        public string? SearchTerm { get; set; } // Tìm kiếm trong Message hoặc UserFullName/UserEmail
        public string? Status { get; set; } // Lọc theo trạng thái cụ thể
        public int? UserId { get; set; } // Lọc theo UserID cụ thể
        public DateTime? StartDate { get; set; } // Lọc theo ngày tạo từ
        public DateTime? EndDate { get; set; }   // Lọc theo ngày tạo đến   
    }
}
