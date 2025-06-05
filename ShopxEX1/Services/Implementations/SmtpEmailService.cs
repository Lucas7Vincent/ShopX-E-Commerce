using System.Net.Mail;
using System.Net;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ShopxEX1.Services;

namespace ShopxEX1.Services.Implementations
{
    public class SmtpEmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<SmtpEmailService> _logger;
        
        // 🔥 SMTP CONFIG FIELDS
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _smtpUser;
        private readonly string _smtpPass;
        private readonly string _senderEmail;
        private readonly string _senderName;
        private readonly bool _enableSsl;

        public SmtpEmailService(IConfiguration configuration, ILogger<SmtpEmailService> logger)
        {
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            // 🔥 ĐỌC CẤU HÌNH SMTP TỪ APPSETTINGS
            _smtpHost = _configuration["EmailSettings:SmtpHost"] ?? "";
            _smtpPort = _configuration.GetValue<int>("EmailSettings:SmtpPort", 587);
            _smtpUser = _configuration["EmailSettings:SmtpUser"] ?? "";
            _smtpPass = _configuration["EmailSettings:SmtpPass"] ?? "";
            _senderEmail = _configuration["EmailSettings:SenderEmail"] ?? "";
            _senderName = _configuration["EmailSettings:SenderName"] ?? "ShopX Team";
            _enableSsl = _configuration.GetValue<bool>("EmailSettings:EnableSsl", true);

            // 🔥 LOG CẤU HÌNH KHI KHỞI TẠO
            _logger.LogInformation("🔧 SmtpEmailService initialized with Host: {Host}, Port: {Port}, User: {User}", 
                _smtpHost, _smtpPort, _smtpUser);
        }

        /// <summary>
        /// 🔥 METHOD CHÍNH: GỬI EMAIL CHUNG
        /// </summary>
        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            try
            {
                _logger.LogInformation("📧 Starting SendEmailAsync to {Email}", toEmail);

                // 🔥 KIỂM TRA CẤU HÌNH SMTP
                if (string.IsNullOrEmpty(_smtpHost) || string.IsNullOrEmpty(_smtpUser))
                {
                    _logger.LogWarning("⚠️ SMTP not configured, simulating email send");
                    await SimulateEmailSend(toEmail, subject, htmlMessage);
                    return;
                }

                // 📧 GỬI EMAIL THẬT
                await SendRealEmailAsync(toEmail, subject, htmlMessage);
                _logger.LogInformation("✅ Email sent successfully to {Email}", toEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in SendEmailAsync to {Email}: {Message}", toEmail, ex.Message);
                throw; // Re-throw để AuthService có thể handle
            }
        }

        /// <summary>
        /// 🔥 GỬI EMAIL RESET PASSWORD
        /// </summary>
        public async Task<bool> SendPasswordResetEmailAsync(string toEmail, string userName, string resetUrl)
        {
            try
            {
                _logger.LogInformation("🔑 Sending password reset email to {Email}", toEmail);

                // 🔥 TẠO SUBJECT VÀ BODY
                var subject = "🔐 ShopX - Đặt lại mật khẩu";
                var body = CreatePasswordResetEmailBody(userName, resetUrl);

                // 🔥 GỬI EMAIL
                await SendEmailAsync(toEmail, subject, body);
                
                _logger.LogInformation("✅ Password reset email sent successfully to {Email}", toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send password reset email to {Email}: {Message}", toEmail, ex.Message);
                return false; // Không throw, chỉ return false
            }
        }

        /// <summary>
        /// 🔥 GỬI EMAIL CHÀO MỪNG
        /// </summary>
        public async Task<bool> SendWelcomeEmailAsync(string toEmail, string userName)
        {
            try
            {
                var subject = "🎉 Chào mừng đến với ShopX!";
                var body = CreateWelcomeEmailBody(userName);

                await SendEmailAsync(toEmail, subject, body);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error sending welcome email to {Email}: {Message}", toEmail, ex.Message);
                return false;
            }
        }

        // 🔥 PRIVATE HELPER METHODS

        /// <summary>
        /// Gửi email thật qua SMTP
        /// </summary>
        private async Task SendRealEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            _logger.LogInformation("📤 Attempting to send real email via SMTP...");

            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = _enableSsl,
                Credentials = new NetworkCredential(_smtpUser, _smtpPass),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 30000 // 30 seconds timeout
            };

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(_senderEmail, _senderName),
                Subject = subject,
                Body = htmlMessage,
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8
            };

            mailMessage.To.Add(toEmail);

            _logger.LogInformation("📤 Sending email to {Email} via {Host}:{Port} with SSL={SSL}", 
                toEmail, _smtpHost, _smtpPort, _enableSsl);
            
            await client.SendMailAsync(mailMessage);
            _logger.LogInformation("✅ Real email sent successfully to {Email}", toEmail);
        }

        /// <summary>
        /// 🧪 SIMULATE EMAIL CHO DEV MODE
        /// </summary>
        private async Task SimulateEmailSend(string toEmail, string subject, string htmlMessage)
        {
            _logger.LogInformation("🧪 Simulating email send...");

            // 🔥 LOG EMAIL CONTENT ĐỂ DEV KIỂM TRA
            Console.WriteLine("=".PadRight(80, '='));
            Console.WriteLine("🧪 EMAIL SIMULATION MODE - SMTP NOT CONFIGURED");
            Console.WriteLine("=".PadRight(80, '='));
            Console.WriteLine($"📧 To: {toEmail}");
            Console.WriteLine($"📋 Subject: {subject}");
            Console.WriteLine($"📄 Body Preview:");
            Console.WriteLine(htmlMessage.Length > 300 ? htmlMessage.Substring(0, 300) + "..." : htmlMessage);
            Console.WriteLine("=".PadRight(80, '='));

            // Simulate delay
            await Task.Delay(1000);

            _logger.LogInformation("🧪 Email simulated for {Email}", toEmail);
        }

        /// <summary>
        /// 🔥 TẠO HTML EMAIL TEMPLATE CHO PASSWORD RESET
        /// </summary>
        private string CreatePasswordResetEmailBody(string userName, string resetUrl)
        {
            return $@"
<!DOCTYPE html>
<html lang='vi'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Đặt lại mật khẩu - ShopX</title>
</head>
<body style='margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8f9fa;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        
        <!-- HEADER -->
        <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    padding: 40px 30px; text-align: center; 
                    border-radius: 15px 15px 0 0;'>
            <h1 style='color: white; margin: 0; font-size: 36px; font-weight: bold;'>
                🔐 ShopX
            </h1>
            <p style='color: white; margin: 15px 0 0 0; font-size: 18px;'>
                Đặt lại mật khẩu
            </p>
        </div>
        
        <!-- CONTENT -->
        <div style='background: white; padding: 40px 35px; 
                    border-radius: 0 0 15px 15px; 
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>
            
            <h2 style='color: #333; margin-bottom: 25px; font-size: 26px;'>
                Xin chào {userName}! 👋
            </h2>
            
            <p style='font-size: 17px; margin-bottom: 30px; color: #555; line-height: 1.7;'>
                Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                Để hoàn tất quá trình, vui lòng nhấn vào nút bên dưới:
            </p>
            
            <!-- BUTTON -->
            <div style='text-align: center; margin: 40px 0;'>
                <a href='{resetUrl}' 
                   style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 18px 40px; 
                          text-decoration: none; 
                          border-radius: 12px; 
                          font-weight: bold; 
                          display: inline-block;
                          font-size: 18px;
                          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);'>
                    🔑 Đặt lại mật khẩu ngay
                </a>
            </div>
            
            <!-- Alternative link -->
            <div style='margin: 35px 0;'>
                <p style='font-size: 14px; color: #666; margin-bottom: 10px; text-align: center;'>
                    Hoặc copy và dán link này vào trình duyệt:
                </p>
                <div style='background: #f8f9fa; padding: 15px; border-radius: 8px; 
                           word-break: break-all; font-size: 13px; 
                           border: 1px solid #e9ecef; text-align: center;'>
                    <a href='{resetUrl}' style='color: #667eea; text-decoration: none;'>
                        {resetUrl}
                    </a>
                </div>
            </div>
            
            <!-- WARNING -->
            <div style='background: #fff3cd; border: 1px solid #ffc107; 
                        padding: 20px; border-radius: 8px; margin: 25px 0;'>
                <h4 style='margin: 0 0 10px 0; color: #856404;'>
                    ⚠️ Lưu ý bảo mật
                </h4>
                <ul style='margin: 0; color: #856404; font-size: 14px;'>
                    <li>Link này chỉ có hiệu lực trong <strong>15 phút</strong></li>
                    <li>Chỉ sử dụng được <strong>một lần duy nhất</strong></li>
                    <li>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này</li>
                </ul>
            </div>
            
            <!-- FOOTER -->
            <div style='text-align: center; padding-top: 30px; border-top: 2px solid #eee;'>
                <p style='font-size: 16px; color: #333; margin-bottom: 5px;'>
                    Trân trọng,
                </p>
                <p style='font-size: 16px; color: #667eea; font-weight: 600; margin: 0;'>
                    Đội ngũ ShopX 💙
                </p>
            </div>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// 🔥 EMAIL TEMPLATE CHÀO MỪNG
        /// </summary>
        private string CreateWelcomeEmailBody(string userName)
        {
            return $@"
<!DOCTYPE html>
<html lang='vi'>
<head>
    <meta charset='UTF-8'>
    <title>Chào mừng đến với ShopX!</title>
</head>
<body style='font-family: Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;'>
    <div style='max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>
        <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;'>
            <h1 style='color: white; margin: 0; font-size: 36px;'>🎉 Chào mừng!</h1>
        </div>
        <div style='padding: 40px;'>
            <h2 style='color: #333; margin-bottom: 20px;'>Xin chào {userName}! 👋</h2>
            <p style='color: #555; line-height: 1.6; font-size: 16px;'>
                Cảm ơn bạn đã đăng ký tài khoản tại ShopX. Chúng tôi rất vui mừng chào đón bạn!
            </p>
            <div style='text-align: center; margin: 30px 0;'>
                <a href='https://localhost:7088' style='background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;'>
                    🚀 Bắt đầu mua sắm
                </a>
            </div>
        </div>
    </div>
</body>
</html>";
        }
    }
}