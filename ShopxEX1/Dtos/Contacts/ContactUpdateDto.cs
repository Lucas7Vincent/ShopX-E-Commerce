using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Contacts
{
    // Dùng khi Admin cập nhật trạng thái liên hệ
    public class ContactUpdateDto
    {
        [Required(ErrorMessage = "Trạng thái không được để trống.")]
        [StringLength(50, ErrorMessage = "Trạng thái không được vượt quá 50 ký tự.")]
        public string Status { get; set; } = string.Empty; // Ví dụ: "Mới", "Đã xem", "Đã phản hồi", "Đã giải quyết"
    }
}
