using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Users
{
    public class SetUserRoleRequestDto
    {
        [Required(ErrorMessage = "Vai trò mới không được để trống.")]
        [StringLength(50)]
        public string NewRole { get; set; } = string.Empty;
        [StringLength(150, ErrorMessage = "Tên cửa hàng không được vượt quá 150 ký tự.")]
        public string? ShopName { get; set; }
    }
}
