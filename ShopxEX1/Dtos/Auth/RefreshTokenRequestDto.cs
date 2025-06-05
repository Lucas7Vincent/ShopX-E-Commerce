using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Auth
{
    // Dữ liệu client gửi lên để yêu cầu làm mới Access Token
    public class RefreshTokenRequestDto
    {
        [Required(ErrorMessage = "Refresh token là bắt buộc.")]
        public string RefreshToken { get; set; } = string.Empty;
    }
}
