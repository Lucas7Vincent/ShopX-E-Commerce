namespace ShopxEX1.Dtos.Contacts
{
    // Dùng để trả về thông tin liên hệ
    public class ContactDto
    {
        public int ContactID { get; set; }
        public int UserID { get; set; }
        public string? UserFullName { get; set; } // Lấy từ User liên quan
        public string? UserEmail { get; set; }    // Lấy từ User liên quan
        public string? UserNumberPhone { get; set; }    // Lấy từ User liên quan
        public string Message { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "Đang chờ xử lý", "Đang xử lý", "Đã phản hồi"
        public DateTime CreatedAt { get; set; }
    }
}
