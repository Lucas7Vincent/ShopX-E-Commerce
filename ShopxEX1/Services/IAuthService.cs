using ShopxEX1.Dtos.Auth;
using ShopxEX1.Models;

namespace ShopxEX1.Services
{
    public interface IAuthService
    {
        // Xử lý đăng nhập người dùng bằng email và mật khẩu.
        Task<AuthResultDto> LoginAsync(LoginDto loginDto);
        // Xử lý đăng nhập hoặc đăng ký bằng thông tin từ nhà cung cấp mạng xã hội
        Task<AuthResultDto> SocialLoginAsync(SocialLoginRequestDto socialLoginDto);
        // Đăng ký tài khoản người dùng mới (vai trò Customer)
        Task<AuthResultDto> RegisterAsync(RegisterDto registerDto);
        // Xử lý đăng xuất (hiện tại không cần logic phía server nếu dùng JWT không trạng thái
        Task LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiry);
        // Cho phép người dùng đã đăng nhập thay đổi mật khẩu của họ
        Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto);
        // Bắt đầu quy trình yêu cầu đặt lại mật khẩu (tạo token, gửi email)
        Task<PasswordResetResultDto> RequestPasswordResetAsync(RequestPasswordResetDto resetRequestDto);
        Task<AuthResultDto> UpdateProfileAsync(int userId, UpdateProfileDto updateDto);
        // Thêm phương thức public để tạo JWT token
        (string Token, DateTime Expiration) GenerateJwtToken(User user);

         /// <summary>
        /// 🔥 ĐẶT LẠI MẬT KHẨU
        /// Validate token và cập nhật mật khẩu mới
        /// </summary>
        /// <param name="resetDto">Thông tin reset password</param>
        /// <returns>Kết quả đặt lại mật khẩu</returns>
        Task<PasswordResetResultDto> ResetPasswordAsync(PasswordResetDto resetDto);

        /// <summary>
        /// 🔥 VALIDATE RESET TOKEN
        /// Kiểm tra tính hợp lệ của token trước khi reset
        /// </summary>
        /// <param name="token">JWT token</param>
        /// <param name="email">Email tương ứng</param>
        /// <returns>Kết quả validation</returns>
        Task<PasswordResetResultDto> ValidateResetTokenAsync(string token, string email);

        /// <summary>
        /// 🔥 HỦY RESET TOKEN (OPTIONAL)
        /// Blacklist token nếu cần
        /// </summary>
        /// <param name="token">Token cần hủy</param>
        /// <param name="email">Email tương ứng</param>
        /// <returns>Kết quả hủy</returns>
        Task<PasswordResetResultDto> CancelPasswordResetAsync(string token, string email);


    }
}
