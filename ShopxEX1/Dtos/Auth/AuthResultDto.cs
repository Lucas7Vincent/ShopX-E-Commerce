using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Dtos.Auth
{
    // Output: Kết quả Đăng nhập / Đăng ký thành công
    public class AuthResultDto
    {
        public bool Success { get; set; }
        public string? Token { get; set; } // JWT Token (cho duy trì đăng nhập)
        public DateTime? Expiration { get; set; }
        public UserDto? User { get; set; } // Trả về thông tin cơ bản
        public string? Message { get; set; } // Thông báo lỗi hoặc thành công
    }
}
