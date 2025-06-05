namespace ShopxEX1.Services
{
    /// <summary>
    /// 🔥 INTERFACE CHO EMAIL SERVICE - PASSWORD RESET
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Gửi email chung
        /// </summary>
        Task SendEmailAsync(string toEmail, string subject, string htmlMessage);

        /// <summary>
        /// 🔥 GỬI EMAIL RESET PASSWORD VỚI LINK
        /// </summary>
        /// <param name="toEmail">Email người nhận</param>
        /// <param name="userName">Tên người dùng</param>
        /// <param name="resetUrl">Link đặt lại mật khẩu</param>
        /// <returns>True nếu gửi thành công</returns>
        Task<bool> SendPasswordResetEmailAsync(string toEmail, string userName, string resetUrl);

        /// <summary>
        /// Gửi email chào mừng
        /// </summary>
        Task<bool> SendWelcomeEmailAsync(string toEmail, string userName);
    }
}