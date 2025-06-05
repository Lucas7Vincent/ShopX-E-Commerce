using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Contacts
{
    // Dùng khi người dùng gửi liên hệ mới
    public class ContactCreateDto
    {
        [Required(ErrorMessage = "Nội dung liên hệ không được để trống.")]
        [StringLength(int.MaxValue, MinimumLength = 10, ErrorMessage = "Nội dung liên hệ phải từ 10 đến 2000 ký tự.")]
        public string Message { get; set; } = string.Empty;
    }
}
