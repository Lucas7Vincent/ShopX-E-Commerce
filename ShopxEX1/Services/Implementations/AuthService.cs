using AutoMapper;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services.Implementations
{
    public class AuthService : IAuthService // Đảm bảo IAuthService cũng được cập nhật tương ứng
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthService> _logger;
        private readonly IEmailService _emailService; // Thêm IEmailService để gửi email
        public AuthService(AppDbContext context, IMapper mapper, IConfiguration configuration, IEmailService emailService,ILogger<AuthService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        }

        // Đăng nhập
        public async Task<AuthResultDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _context.Users
                                    .Include(u => u.SellerProfile) // Nếu cần SellerProfile
                                     .AsNoTracking() // Có thể dùng AsNoTracking vì chỉ đọc để tạo token
                                     .FirstOrDefaultAsync(u => u.Email == loginDto.Email);

            // Nên kiểm tra user != null trước khi truy cập user.IsActive
            if (user == null || !user.IsActive || string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash))
            {
                // _logger?.LogWarning("Login failed for email {Email}: Invalid credentials or inactive account.", loginDto.Email);
                return new AuthResultDto { Success = false, Message = "Email hoặc mật khẩu không chính xác, hoặc tài khoản đã bị khóa." };
            }

            // Tạo Access Token
            var accessTokenResult = GenerateJwtToken(user);

            // Không còn Refresh Token
            // Không cần SaveChanges ở đây nếu không cập nhật gì khác trên User

            // _logger?.LogInformation("User {UserId} logged in successfully.", user.UserID);
            // Tạo DTO để trả về
            var userDto = _mapper.Map<UserDto>(user);
            if (user.Role == "Seller" && user.SellerProfile != null)
            {
                userDto.SellerID = user.SellerProfile.SellerID;
                userDto.ShopName = user.SellerProfile.ShopName;
                Console.WriteLine($"Updated DTO with seller info: {JsonSerializer.Serialize(userDto)}");
            }
            var result = new AuthResultDto
            {
                Success = true,
                Token = accessTokenResult.Token,
                Expiration = accessTokenResult.Expiration,
                User = userDto,
                Message = "Đăng nhập thành công."
            };


            return result;
        }

        public async Task<AuthResultDto> SocialLoginAsync(SocialLoginRequestDto socialLoginDto)
        {
            // Kiểm tra email trước
            var user = await _context.Users
                                     .Include(u => u.SellerProfile)
                                     .FirstOrDefaultAsync(u => u.Email == socialLoginDto.Email);

            bool isNewUser = false;

            if (user == null)
            {
                // Không tìm thấy user với email này -> tạo mới
                isNewUser = true;
                user = _mapper.Map<User>(socialLoginDto);
                user.PasswordHash = $"SOCIAL_LOGIN_{Guid.NewGuid()}"; // Placeholder
                user.IsActive = true;
                user.CreatedAt = DateTime.UtcNow;
                _context.Users.Add(user);
            }
            else
            {
                // Tìm thấy user với email này -> kiểm tra và cập nhật thông tin social
                if (string.IsNullOrEmpty(user.SocialProvider) || string.IsNullOrEmpty(user.SocialID))
                {
                    // User chưa có social account -> liên kết
                    user.SocialProvider = socialLoginDto.Provider;
                    user.SocialID = socialLoginDto.UserId;
                    _context.Users.Update(user);
                }
                else if (user.SocialProvider != socialLoginDto.Provider || user.SocialID != socialLoginDto.UserId)
                {
                    // User đã có social account khác -> báo lỗi
                    return new AuthResultDto
                    {
                        Success = false,
                        Message = $"Email {socialLoginDto.Email} đã được liên kết với một tài khoản {user.SocialProvider} khác."
                    };
                }
            }

            if (!user.IsActive)
            {
                return new AuthResultDto { Success = false, Message = "Tài khoản của bạn đang bị khóa." };
            }

            try
            {
                await _context.SaveChangesAsync();
                var accessTokenResult = GenerateJwtToken(user);

                return new AuthResultDto
                {
                    Success = true,
                    Token = accessTokenResult.Token,
                    Expiration = accessTokenResult.Expiration,
                    User = _mapper.Map<UserDto>(user),
                    Message = isNewUser ? "Đăng ký bằng mạng xã hội thành công." : "Đăng nhập bằng mạng xã hội thành công."
                };
            }
            catch (Exception ex)
            {
                throw new Exception("Đã xảy ra lỗi trong quá trình đăng nhập bằng mạng xã hội.", ex);
            }
        }

        // Đăng kí - **SỬA ĐỔI:** Trả về token để tự động đăng nhập
        public async Task<AuthResultDto> RegisterAsync(RegisterDto registerDto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == registerDto.Email))
            {
                // _logger?.LogWarning("Registration attempt with existing email: {Email}", registerDto.Email);
                return new AuthResultDto { Success = false, Message = $"Email '{registerDto.Email}' đã được sử dụng." };
            }
            if(await _context.Users.AnyAsync(u => u.Phone == registerDto.Phone)){
                return new AuthResultDto { Success = false, Message = $"Phone '{registerDto.Phone}' đã được sử dụng." };
            }
            if (registerDto.Password != registerDto.ConfirmPassword)
            {
                return new AuthResultDto { Success = false, Message = "Mật khẩu và xác nhận mật khẩu không khớp." };
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password);
            string a = Function.PasswordHash(registerDto.Password);
            var newUser = _mapper.Map<User>(registerDto);
            newUser.PasswordHash = passwordHash;
            newUser.Role = "Customer";
            newUser.IsActive = true;
            newUser.CreatedAt = DateTime.UtcNow; // Sử dụng UtcNow cho nhất quán

            _context.Users.Add(newUser);

            // Không cần transaction phức tạp nếu không tạo Cart ở đây
            try
            {
                await _context.SaveChangesAsync(); // Lưu User để có ID

                // TẠO TOKEN NGAY SAU KHI ĐĂNG KÝ
                var accessTokenResult = GenerateJwtToken(newUser);

                // _logger?.LogInformation("User registered successfully: {UserId} ({Email})", newUser.UserID, newUser.Email);
                return new AuthResultDto
                {
                    Success = true,
                    Token = accessTokenResult.Token, // Trả về token
                    Expiration = accessTokenResult.Expiration,
                    User = _mapper.Map<UserDto>(newUser),
                    Message = "Đăng ký thành công và đã đăng nhập."
                };
            }
            catch (Exception ex)
            {
                // _logger?.LogError(ex, "Error during user registration for email {Email}", registerDto.Email);
                return new AuthResultDto { Success = false, Message = $"Đã xảy ra lỗi trong quá trình đăng ký: {ex.Message}" };
            }
        }

        // Đăng xuất - **SỬA ĐỔI:** Không còn gì để làm ở server
        public Task LogoutAsync(int userId, string? jti, DateTime? accessTokenExpiry)
        {
            // Không còn blacklist hay refresh token để thu hồi.
            // Logout là việc của client (xóa token đã lưu).
            // _logger?.LogInformation("Logout requested for user {UserId}. No server-side action taken (stateless).", userId);
            return Task.CompletedTask; // Trả về một Task đã hoàn thành
        }

        // Đổi mật khẩu - **SỬA ĐỔI:** Bỏ thu hồi refresh token
        public async Task<bool> ChangePasswordAsync(int userId, ChangePasswordDto changePasswordDto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) throw new KeyNotFoundException($"Không tìm thấy người dùng.");

            // Kiểm tra trạng thái active trước khi cho đổi pass
            if (!user.IsActive)
            {
                // _logger?.LogWarning("Change password attempt for inactive user {UserId}", userId);
                throw new InvalidOperationException("Tài khoản này hiện đang bị khóa.");
            }

            if (string.IsNullOrEmpty(user.PasswordHash) || !BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.PasswordHash))
            {
                // _logger?.LogWarning("Change password failed for user {UserId}: Incorrect current password.", userId);
                throw new UnauthorizedAccessException("Mật khẩu hiện tại không chính xác.");
            }

            if (changePasswordDto.NewPassword != changePasswordDto.ConfirmNewPassword)
            {
                throw new ArgumentException("Mật khẩu mới và xác nhận mật khẩu không khớp.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
            _context.Users.Update(user);

            // Không cần thu hồi refresh token nữa

            try
            {
                var result = await _context.SaveChangesAsync() > 0;
                // if(result) _logger?.LogInformation("Password changed successfully for user {UserId}", userId);
                return result;
            }
            catch (Exception ex)
            {
                // _logger?.LogError(ex, "Error changing password for user {UserId}", userId);
                throw new Exception("Đã xảy ra lỗi khi cập nhật mật khẩu.", ex);
            }
        }
        //updateProfileAsync


        // --- RequestPasswordResetAsync và ResetPasswordAsync không thay đổi nhiều ---
        // Chúng vẫn dùng bảng PasswordResetToken riêng, không liên quan refresh token


        // --- Hàm Tạo Token JWT (Giữ nguyên) ---
        public (string Token, DateTime Expiration) GenerateJwtToken(User user)
        {
            // Luôn truy vấn trực tiếp để đảm bảo dữ liệu mới nhất
            string roleFromDb = "";
            int? sellerIdFromDb = null;
            bool isSellerActive = false;

            // Truy vấn SQL trực tiếp để lấy thông tin mới nhất
            using (var connection = _context.Database.GetDbConnection())
            {
                try
                {
                    connection.Open();
                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = @"
                    SELECT u.UserID, u.Email, u.FullName, u.Role, 
                           s.SellerID, s.IsActive as SellerIsActive 
                    FROM Users u
                    LEFT JOIN Sellers s ON u.UserID = s.UserID
                    WHERE u.UserID = @UserId";

                        var parameter = command.CreateParameter();
                        parameter.ParameterName = "@UserId";
                        parameter.Value = user.UserID;
                        command.Parameters.Add(parameter);

                        using (var reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                // Lấy dữ liệu mới nhất từ database
                                roleFromDb = reader["Role"].ToString();

                                // Kiểm tra SellerProfile
                                bool hasSellerProfile = !reader.IsDBNull(reader.GetOrdinal("SellerID"));

                                if (hasSellerProfile)
                                {
                                    sellerIdFromDb = Convert.ToInt32(reader["SellerID"]);
                                    isSellerActive = Convert.ToBoolean(reader["SellerIsActive"]);
                                }

                                Console.WriteLine($"[GenerateJwtToken] Dữ liệu từ DB: UserID={user.UserID}, Role={roleFromDb}, " +
                                    $"HasSellerProfile={hasSellerProfile}, SellerId={sellerIdFromDb}, IsActive={isSellerActive}");
                            }
                            else
                            {
                                // Không tìm thấy user trong DB - lỗi nghiêm trọng
                                throw new InvalidOperationException($"Không tìm thấy user với ID {user.UserID} trong database");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Lỗi khi truy vấn database trong GenerateJwtToken: {ex.Message}");
                    // KHÔNG fallback - buộc phải lấy được dữ liệu mới nhất
                    throw;
                }
            }

            // Tạo claims sử dụng CHẮC CHẮN thông tin từ database
            var claims = new List<Claim> {
        new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),
        new Claim(ClaimTypes.NameIdentifier, user.UserID.ToString()),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(ClaimTypes.Role, roleFromDb) // Sử dụng role từ database
    };

            // Thêm SellerId vào claims nếu là seller active
            if (roleFromDb == "Seller" && sellerIdFromDb.HasValue && isSellerActive)
            {
                claims.Add(new Claim("SellerId", sellerIdFromDb.ToString()));
                Console.WriteLine($"[GenerateJwtToken] Đã thêm claim SellerId={sellerIdFromDb} vào token");
            }

            var jwtSettings = _configuration.GetSection("Jwt");
            var jwtKey = jwtSettings["SecretKey"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expiryInMinutes = jwtSettings.GetValue<int>("ExpiryInMinutes", 1200);

            if (string.IsNullOrEmpty(jwtKey))
                throw new InvalidOperationException("JWT Key chưa được cấu hình.");

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddMinutes(expiryInMinutes);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = expires,
                Issuer = issuer,
                Audience = audience,
                SigningCredentials = credentials
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            Console.WriteLine($"[GenerateJwtToken] Token đã được tạo với role={roleFromDb} (100% từ database)");
            return (tokenString, expires);
        }

/// <summary>
        /// 🔥 IMPLEMENT REQUEST PASSWORD RESET
        /// Xử lý yêu cầu đặt lại mật khẩu với JWT token
        /// </summary>
        public async Task<PasswordResetResultDto> RequestPasswordResetAsync(RequestPasswordResetDto requestDto)
        {
            try
            {
                _logger.LogInformation("Processing password reset request for email: {Email}", requestDto.Email);

                // 🔥 BƯỚC 1: TÌM USER TRONG DATABASE
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == requestDto.Email && u.IsActive);

                if (user == null)
                {
                    // 🔥 SECURITY: Không tiết lộ thông tin user có tồn tại hay không
                    _logger.LogWarning("Password reset requested for non-existent email: {Email}", requestDto.Email);
                    
                    return new PasswordResetResultDto
                    {
                        Success = true, // Luôn return success để không leak thông tin
                        Message = "Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu."
                    };
                }

                // 🔥 BƯỚC 2: TẠO JWT RESET TOKEN
                var resetToken = GeneratePasswordResetJwtToken(user);
                _logger.LogInformation("Generated reset token for user: {UserId}", user.UserID);

                // 🔥 BƯỚC 3: TẠO RESET URL
                 var isDevelopment = _configuration.GetValue<bool>("AppSettings:IsDevelopment", false);
        string resetUrl;
        
        if (isDevelopment)
        {
            // 🔥 DEV MODE: Dùng Live Server URL (port 5500)
            resetUrl = $"https://127.0.0.1:5500/Customer/templates/login.html?action=reset&token={resetToken}&email={Uri.EscapeDataString(user.Email)}";
        }
        else
        {
            // 🔥 PRODUCTION: Dùng domain thật
            var baseUrl = _configuration.GetValue<string>("AppSettings:ClientUrl") ?? "https://your-domain.com";
            resetUrl = $"{baseUrl}/Customer/templates/login.html?action=reset&token={resetToken}&email={Uri.EscapeDataString(user.Email)}";
        }


                // 🔥 BƯỚC 4: GỬI EMAIL
                var emailSent = await _emailService.SendPasswordResetEmailAsync(
                    user.Email, 
                    user.FullName ?? "User", 
                    resetUrl);

                if (!emailSent)
                {
                    _logger.LogError("Failed to send password reset email to: {Email}", user.Email);
                    
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Không thể gửi email xác nhận. Vui lòng thử lại sau.",
                        ErrorCode = "EMAIL_SEND_FAILED"
                    };
                }

                // 🔥 BƯỚC 5: LOG SUCCESS CHO DEV (DEVELOPMENT ONLY)
                if (_configuration.GetValue<bool>("AppSettings:IsDevelopment", false))
                {
                    Console.WriteLine("=".PadRight(50, '='));
                    Console.WriteLine("🔥 DEV MODE: PASSWORD RESET DEBUG INFO");
                    Console.WriteLine($"📧 Email: {user.Email}");
                    Console.WriteLine($"🔗 Reset URL: {resetUrl}");
                    Console.WriteLine($"🎫 Token: {resetToken}");
                    Console.WriteLine($"⏰ Expires: {DateTime.UtcNow.AddMinutes(15):yyyy-MM-dd HH:mm:ss} UTC");
                    Console.WriteLine("=".PadRight(50, '='));
                }

                _logger.LogInformation("Password reset email sent successfully to: {Email}", user.Email);

                return new PasswordResetResultDto
                {
                    Success = true,
                    Message = "Hướng dẫn đặt lại mật khẩu đã được gửi qua email. Vui lòng kiểm tra hộp thư (kể cả thư mục spam)."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing password reset request for email: {Email}", requestDto.Email);
                
                return new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.",
                    ErrorCode = "INTERNAL_ERROR"
                };
            }
        }

        /// <summary>
        /// 🔥 IMPLEMENT RESET PASSWORD
        /// Validate token và cập nhật mật khẩu mới
        /// </summary>
        public async Task<PasswordResetResultDto> ResetPasswordAsync(PasswordResetDto resetDto)
        {
            try
            {
                _logger.LogInformation("Processing password reset for email: {Email}", resetDto.Email);

                // 🔥 BƯỚC 1: VALIDATE JWT TOKEN
                var tokenValidation = ValidatePasswordResetJwtToken(resetDto.Token);
                
                if (!tokenValidation.IsValid)
                {
                    _logger.LogWarning("Invalid reset token for email: {Email}, Error: {Error}", 
                        resetDto.Email, tokenValidation.ErrorMessage);
                    
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = tokenValidation.ErrorMessage,
                        ErrorCode = "INVALID_TOKEN"
                    };
                }

                // 🔥 BƯỚC 2: VALIDATE EMAIL CONSISTENCY
                if (tokenValidation.Email != resetDto.Email)
                {
                    _logger.LogWarning("Email mismatch in reset token. Token email: {TokenEmail}, Request email: {RequestEmail}",
                        tokenValidation.Email, resetDto.Email);
                    
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Email không khớp với token.",
                        ErrorCode = "EMAIL_MISMATCH"
                    };
                }

                // 🔥 BƯỚC 3: TÌM USER VÀ VALIDATE
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserID == tokenValidation.UserId && u.Email == resetDto.Email);

                if (user == null)
                {
                    _logger.LogWarning("User not found for password reset. UserId: {UserId}, Email: {Email}",
                        tokenValidation.UserId, resetDto.Email);
                    
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Không tìm thấy tài khoản.",
                        ErrorCode = "USER_NOT_FOUND"
                    };
                }

                if (!user.IsActive)
                {
                    _logger.LogWarning("Inactive user attempted password reset: {Email}", resetDto.Email);
                    
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Tài khoản này đã bị khóa.",
                        ErrorCode = "ACCOUNT_INACTIVE"
                    };
                }

                // 🔥 BƯỚC 4: VALIDATE PASSWORD STRENGTH
                if (!IsPasswordStrong(resetDto.NewPassword))
                {
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số.",
                        ErrorCode = "WEAK_PASSWORD"
                    };
                }

                // 🔥 BƯỚC 5: VALIDATE PASSWORD CONFIRMATION
                if (resetDto.NewPassword != resetDto.ConfirmNewPassword)
                {
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Mật khẩu mới và xác nhận mật khẩu không khớp.",
                        ErrorCode = "PASSWORD_MISMATCH"
                    };
                }

                // 🔥 BƯỚC 6: KIỂM TRA KHÔNG ĐƯỢC DÙNG MẬT KHẨU CŨ
                if (BCrypt.Net.BCrypt.Verify(resetDto.NewPassword, user.PasswordHash))
                {
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Mật khẩu mới không được giống mật khẩu cũ.",
                        ErrorCode = "SAME_PASSWORD"
                    };
                }

                // 🔥 BƯỚC 7: CẬP NHẬT MẬT KHẨU
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(resetDto.NewPassword);
                user.CreatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Password reset successful for user: {UserId}, Email: {Email}", 
                    user.UserID, user.Email);

                return new PasswordResetResultDto
                {
                    Success = true,
                    Message = "Mật khẩu đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password for email: {Email}", resetDto.Email);
                
                return new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Đã xảy ra lỗi khi đặt lại mật khẩu.",
                    ErrorCode = "INTERNAL_ERROR"
                };
            }
        }

        /// <summary>
        /// 🔥 IMPLEMENT VALIDATE RESET TOKENSendPasswordResetEmailAsync
        /// Kiểm tra tính hợp lệ của token
        /// </summary>
        public async Task<PasswordResetResultDto> ValidateResetTokenAsync(string token, string email)
        {
            try
            {
                var validation = ValidatePasswordResetJwtToken(token);
                
                if (!validation.IsValid)
                {
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = validation.ErrorMessage,
                        ErrorCode = "INVALID_TOKEN"
                    };
                }

                if (validation.Email != email)
                {
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Email không khớp với token.",
                        ErrorCode = "EMAIL_MISMATCH"
                    };
                }

                // Kiểm tra user vẫn tồn tại và active
                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.UserID == validation.UserId && u.IsActive);

                if (user == null)
                {
                    return new PasswordResetResultDto
                    {
                        Success = false,
                        Message = "Tài khoản không tồn tại hoặc đã bị khóa.",
                        ErrorCode = "USER_NOT_FOUND"
                    };
                }

                return new PasswordResetResultDto
                {
                    Success = true,
                    Message = "Token hợp lệ."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating reset token for email: {Email}", email);
                
                return new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Không thể xác thực token.",
                    ErrorCode = "VALIDATION_ERROR"
                };
            }
        }



        /// <summary>
        /// 🔥 IMPLEMENT CANCEL PASSWORD RESET (OPTIONAL)
        /// </summary>
        public async Task<PasswordResetResultDto> CancelPasswordResetAsync(string token, string email)
        {
            // Implementation for token blacklisting if needed
            // For JWT tokens, we can't really "cancel" them, but we can log the cancellation

            _logger.LogInformation("Password reset cancellation requested for email: {Email}", email);

            return new PasswordResetResultDto
            {
                Success = true,
                Message = "Yêu cầu đặt lại mật khẩu đã được hủy."
            };
        }

        // 🔥 HELPER METHODS

        /// <summary>
        /// Tạo JWT token cho password reset
        /// </summary>
      private string GeneratePasswordResetJwtToken(User user)
{
    try
    {
        // 🔥 KIỂM TRA USER DATA TRƯỚC KHI TẠO TOKEN
        if (string.IsNullOrEmpty(user.Email))
        {
            throw new InvalidOperationException($"User email is null or empty for UserID: {user.UserID}");
        }

        var secretKey = _configuration["Jwt:SecretKey"] 
                     ?? _configuration["Jwt:Key"] 
                     ?? throw new InvalidOperationException("JWT SecretKey not found in configuration");

        if (string.IsNullOrEmpty(secretKey) || secretKey.Length < 32)
        {
            throw new InvalidOperationException("JWT SecretKey is invalid");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        
        var issuer = _configuration["Jwt:Issuer"] ?? "ShopX";
        var audience = _configuration["Jwt:Audience"] ?? "ShopXUsers";

        // DÙNG STANDARD JWT CLAIMS + CUSTOM CLAIMS
        var claims = new[]
        {
            // Standard JWT claims
            new Claim(JwtRegisteredClaimNames.Sub, user.UserID.ToString()),           // Subject (User ID)
            new Claim(JwtRegisteredClaimNames.Email, user.Email),                     // Standard email claim
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            
            // Custom claims
            new Claim("userId", user.UserID.ToString()),                             // Backup user ID
            new Claim("email", user.Email),                                          // Backup email
            new Claim("type", "password_reset"),                                     // Token type
            new Claim("userName", user.FullName ?? "User")                           // User name for display
        };
        
        _logger?.LogDebug("🔑 Creating token with claims: UserId={UserId}, Email={Email}", user.UserID, user.Email);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(15),
            signingCredentials: credentials
        );
        
        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        
        _logger?.LogDebug("✅ JWT token generated successfully for user {UserId}", user.UserID);
        
        return tokenString;
    }
    catch (Exception ex)
    {
        _logger?.LogError(ex, "❌ Error generating JWT token for user {UserId}: {Message}", user.UserID, ex.Message);
        throw;
    }
}
        /// <summary>
        /// Validate JWT token cho password reset
        /// </summary>
        private (bool IsValid, string ErrorMessage, int UserId, string Email, DateTime IssuedAt) ValidatePasswordResetJwtToken(string token)
{
    try
    {
        var secretKey = _configuration["Jwt:SecretKey"] 
                     ?? _configuration["Jwt:Key"] 
                     ?? throw new InvalidOperationException("JWT SecretKey not found in configuration");

        if (string.IsNullOrEmpty(secretKey))
        {
            _logger?.LogError("❌ JWT SecretKey is null or empty");
            return (false, "Lỗi cấu hình JWT SecretKey.", 0, "", DateTime.MinValue);
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var tokenHandler = new JwtSecurityTokenHandler();
        
        var validationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ValidateIssuer = true,
            ValidIssuer = _configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = _configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        
        var principal = tokenHandler.ValidateToken(token, validationParameters, out SecurityToken validatedToken);
        
        // 🔥 DEBUG: LOG ALL CLAIMS
        if (_configuration.GetValue<bool>("AppSettings:IsDevelopment", false))
        {
            _logger?.LogDebug("🔍 All token claims:");
            foreach (var claim in principal.Claims)
            {
                _logger?.LogDebug("  - {Type}: {Value}", claim.Type, claim.Value);
            }
        }
        
        // Validate token type
        var tokenType = principal.FindFirst("type")?.Value;
        if (tokenType != "password_reset")
        {
            _logger?.LogWarning("❌ Token type mismatch. Expected: password_reset, Got: {TokenType}", tokenType);
            return (false, "Token không phải là reset token.", 0, "", DateTime.MinValue);
        }
        
        // 🔥 SỬA: TÌM CLAIMS VỚI MULTIPLE SOURCES
        var userIdClaim = principal.FindFirst("userId")?.Value 
                       ?? principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value
                       ?? principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        var emailClaim = principal.FindFirst("email")?.Value 
                      ?? principal.FindFirst(JwtRegisteredClaimNames.Email)?.Value
                      ?? principal.FindFirst(ClaimTypes.Email)?.Value;

        var iatClaim = principal.FindFirst(JwtRegisteredClaimNames.Iat)?.Value;
        
        // 🔥 DETAILED LOGGING CHO DEBUG
        _logger?.LogDebug("🔍 Claim extraction results:");
        _logger?.LogDebug("  - UserId from claims: {UserId}", userIdClaim);
        _logger?.LogDebug("  - Email from claims: {Email}", emailClaim);
        _logger?.LogDebug("  - Iat from claims: {Iat}", iatClaim);
        
        if (!int.TryParse(userIdClaim, out int userId))
        {
            _logger?.LogWarning("❌ Invalid or missing userId claim: {UserIdClaim}", userIdClaim);
            return (false, "Token không chứa thông tin user hợp lệ.", 0, "", DateTime.MinValue);
        }
        
        if (string.IsNullOrEmpty(emailClaim))
        {
            _logger?.LogWarning("❌ Missing email claim in token for userId: {UserId}", userId);
            return (false, "Token không chứa thông tin email.", 0, "", DateTime.MinValue);
        }
        
        if (string.IsNullOrEmpty(iatClaim))
        {
            _logger?.LogWarning("❌ Missing iat claim in token");
            return (false, "Token không hợp lệ (thiếu thông tin thời gian).", 0, "", DateTime.MinValue);
        }
        
        var issuedAt = DateTimeOffset.FromUnixTimeSeconds(long.Parse(iatClaim)).DateTime;
        
        _logger?.LogDebug("✅ Token validation successful. UserId: {UserId}, Email: {Email}", userId, emailClaim);
        return (true, "", userId, emailClaim, issuedAt);
    }
    catch (SecurityTokenExpiredException ex)
    {
        _logger?.LogWarning("❌ Token expired: {Message}", ex.Message);
        return (false, "Token đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.", 0, "", DateTime.MinValue);
    }
    catch (SecurityTokenInvalidSignatureException ex)
    {
        _logger?.LogWarning("❌ Token signature invalid: {Message}", ex.Message);
        return (false, "Token không hợp lệ (chữ ký sai).", 0, "", DateTime.MinValue);
    }
    catch (Exception ex)
    {
        _logger?.LogError(ex, "❌ Token validation error: {Message}", ex.Message);
        return (false, "Token không hợp lệ.", 0, "", DateTime.MinValue);
    }
}
        /// <summary>
        /// Kiểm tra độ mạnh của mật khẩu
        /// </summary>
        private bool IsPasswordStrong(string password)
        {
            if (string.IsNullOrEmpty(password) || password.Length < 8)
                return false;

            bool hasUpper = password.Any(char.IsUpper);
            bool hasLower = password.Any(char.IsLower);
            bool hasDigit = password.Any(char.IsDigit);

            return hasUpper && hasLower && hasDigit;
        }

        public Task<bool> CheckRefreshTokenValidityAsync(int userId)
        {
            throw new NotImplementedException();
        }


public async Task<AuthResultDto> UpdateProfileAsync(int userId, UpdateProfileDto updateDto)
{
    try
    {
        Console.WriteLine($"Bắt đầu cập nhật thông tin cho user {userId}");

        var user = await _context.Users
            .Include(u => u.SellerProfile)
            .AsTracking()
            .FirstOrDefaultAsync(u => u.UserID == userId);

        if (user == null)
        {
            Console.WriteLine($"Không tìm thấy user với ID {userId}");
            return new AuthResultDto { Success = false, Message = "Không tìm thấy người dùng" };
        }

        // ✅ CRITICAL: Check if this is a social account
        bool isSocialAccount = !string.IsNullOrEmpty(user.SocialProvider) && !string.IsNullOrEmpty(user.SocialID);
        Console.WriteLine($"User {userId} is social account: {isSocialAccount} (Provider: {user.SocialProvider})");

        // Configure JsonSerializerOptions to handle circular references
        var jsonOptions = new JsonSerializerOptions
        {
            ReferenceHandler = ReferenceHandler.Preserve,
            WriteIndented = true
        };

        Console.WriteLine($"Thông tin user trước khi cập nhật: {JsonSerializer.Serialize(user, jsonOptions)}");

        // ✅ FIXED: Email validation cho social accounts
        if (!string.IsNullOrEmpty(updateDto.Email) && updateDto.Email != user.Email)
        {
            Console.WriteLine($"Kiểm tra email mới: {updateDto.Email}");
            if (!IsValidEmail(updateDto.Email))
            {
                return new AuthResultDto { Success = false, Message = "Định dạng email không hợp lệ" };
            }
            
            // ✅ SPECIAL: Cho phép social accounts thay đổi email dễ dàng hơn
            if (isSocialAccount)
            {
                Console.WriteLine("Social account - allowing email change with relaxed validation");
                var existingUser = await _context.Users
                    .Where(u => u.Email == updateDto.Email && u.UserID != userId)
                    .FirstOrDefaultAsync();
                    
                if (existingUser != null)
                {
                    Console.WriteLine($"Email {updateDto.Email} đã tồn tại cho user khác");
                    return new AuthResultDto { Success = false, Message = "Email đã tồn tại" };
                }
            }
            else
            {
                // Regular account validation
                var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == updateDto.Email);
                if (existingUser != null)
                {
                    Console.WriteLine($"Email {updateDto.Email} đã tồn tại");
                    return new AuthResultDto { Success = false, Message = "Email đã tồn tại" };
                }
            }
            user.Email = updateDto.Email;
        }

        // ✅ Cập nhật thông tin cá nhân
        Console.WriteLine($"Cập nhật thông tin: {JsonSerializer.Serialize(updateDto, jsonOptions)}");
        
        if (!string.IsNullOrEmpty(updateDto.FullName)) user.FullName = updateDto.FullName;
        if (!string.IsNullOrEmpty(updateDto.Phone)) user.Phone = updateDto.Phone;
        
        if (!string.IsNullOrEmpty(updateDto.Birthday))
        {
            if (DateTime.TryParse(updateDto.Birthday, out DateTime birthday))
            {
                if (birthday > DateTime.UtcNow)
                {
                    return new AuthResultDto { Success = false, Message = "Ngày sinh không được là ngày trong tương lai" };
                }
                user.Birthday = birthday;
                Console.WriteLine($"Đã cập nhật ngày sinh: {birthday}");
            }
            else
            {
                Console.WriteLine($"Không thể parse ngày sinh: {updateDto.Birthday}");
                return new AuthResultDto { Success = false, Message = "Định dạng ngày sinh không hợp lệ" };
            }
        }
        
        if (updateDto.Gender.HasValue) user.Gender = updateDto.Gender.Value;
        if (!string.IsNullOrEmpty(updateDto.Address)) user.Address = updateDto.Address;
        if (!string.IsNullOrEmpty(updateDto.Avatar))
        {
            user.Avatar = updateDto.Avatar;
            Console.WriteLine($"Đã cập nhật avatar: {updateDto.Avatar}");
        }

        // ✅ ENHANCED: Role handling cho social accounts
        if (!string.IsNullOrEmpty(updateDto.Role))
        {
            // Chuẩn hóa role
            updateDto.Role = char.ToUpper(updateDto.Role[0]) + updateDto.Role.Substring(1).ToLower();
            Console.WriteLine($"Role sau khi chuẩn hóa: {updateDto.Role} (Social account: {isSocialAccount})");

            string oldRole = user.Role;

            if (updateDto.Role == "Seller")
            {
                if (user.Role != "Seller")
                {
                    // Cập nhật role thành Seller
                    user.Role = "Seller";
                    _context.Entry(user).Property(u => u.Role).IsModified = true;
                    _context.Entry(user).State = EntityState.Modified;

                    Console.WriteLine($"Đã cập nhật vai trò thành Seller cho user {userId} (Social: {isSocialAccount})");

                    // ✅ ENHANCED: Handle Seller profile creation for social accounts
                    var existingSellerProfile = await _context.Sellers
                        .FirstOrDefaultAsync(s => s.UserID == userId);

                    if (existingSellerProfile != null)
                    {
                        Console.WriteLine($"Kích hoạt lại SellerProfile với ID: {existingSellerProfile.SellerID}");
                        existingSellerProfile.IsActive = true;
                        _context.Entry(existingSellerProfile).Property(s => s.IsActive).IsModified = true;

                        if (!string.IsNullOrEmpty(updateDto.ShopName))
                        {
                            existingSellerProfile.ShopName = updateDto.ShopName;
                            _context.Entry(existingSellerProfile).Property(s => s.ShopName).IsModified = true;
                        }

                        // ✅ Direct SQL update for reliability
                        string updateSellerSql = "UPDATE Sellers SET IsActive = 1";
                        var parameters = new List<SqlParameter> { new SqlParameter("@UserId", userId) };

                        if (!string.IsNullOrEmpty(updateDto.ShopName))
                        {
                            updateSellerSql += ", ShopName = @ShopName";
                            parameters.Add(new SqlParameter("@ShopName", updateDto.ShopName));
                        }

                        updateSellerSql += " WHERE UserID = @UserId";
                        await _context.Database.ExecuteSqlRawAsync(updateSellerSql, parameters.ToArray());
                        Console.WriteLine($"Đã cập nhật IsActive = 1 cho SellerProfile hiện có (Social account)");
                    }
                    else
                    {
                        // ✅ Create new SellerProfile for social accounts
                        Console.WriteLine($"Tạo mới SellerProfile cho social user {userId}");
                        var shopName = !string.IsNullOrEmpty(updateDto.ShopName) ? updateDto.ShopName : $"{user.FullName}'s Shop";
                        
                        string sql = "INSERT INTO Sellers (UserID, ShopName, CreatedAt, IsActive) VALUES (@UserId, @ShopName, @CreatedAt, 1)";
                        var parameters = new[] {
                            new SqlParameter("@UserId", userId),
                            new SqlParameter("@ShopName", shopName ?? (object)DBNull.Value),
                            new SqlParameter("@CreatedAt", DateTime.UtcNow)
                        };
                        
                        await _context.Database.ExecuteSqlRawAsync(sql, parameters);
                        Console.WriteLine($"Đã tạo mới SellerProfile cho social account, ShopName: {shopName}");

                        // Refresh entity
                        await _context.Entry(user).ReloadAsync();
                    }
                }
                else if (!string.IsNullOrEmpty(updateDto.ShopName))
                {
                    // Update existing Seller's shop name
                    var existingSellerProfile = await _context.Sellers
                        .FirstOrDefaultAsync(s => s.UserID == userId);

                    if (existingSellerProfile != null)
                    {
                        existingSellerProfile.ShopName = updateDto.ShopName;
                        existingSellerProfile.IsActive = true;

                        _context.Entry(existingSellerProfile).Property(s => s.ShopName).IsModified = true;
                        _context.Entry(existingSellerProfile).Property(s => s.IsActive).IsModified = true;

                        string updateShopNameSql = "UPDATE Sellers SET ShopName = @ShopName, IsActive = 1 WHERE UserID = @UserId";
                        await _context.Database.ExecuteSqlRawAsync(updateShopNameSql,
                            new SqlParameter("@ShopName", updateDto.ShopName),
                            new SqlParameter("@UserId", userId));

                        Console.WriteLine($"Đã cập nhật ShopName: {updateDto.ShopName} cho social account");
                    }
                }
            }
            else if (updateDto.Role == "Customer")
            {
                user.Role = "Customer";
                _context.Entry(user).Property(u => u.Role).IsModified = true;
                _context.Entry(user).State = EntityState.Modified;
                Console.WriteLine($"Đã cập nhật vai trò thành Customer cho social user {userId}");

                // Deactivate seller profile if exists
                var existingSellerProfile = await _context.Sellers
                    .FirstOrDefaultAsync(s => s.UserID == userId);

                if (existingSellerProfile != null)
                {
                    Console.WriteLine($"Tìm thấy SellerProfile với ID {existingSellerProfile.SellerID}, đặt IsActive = 0");
                    existingSellerProfile.IsActive = false;
                    _context.Entry(existingSellerProfile).Property(s => s.IsActive).IsModified = true;

                    string deactivateSellerSql = "UPDATE Sellers SET IsActive = 0 WHERE UserID = @UserId";
                    await _context.Database.ExecuteSqlRawAsync(deactivateSellerSql, new SqlParameter("@UserId", userId));
                    Console.WriteLine($"Đã cập nhật IsActive = 0 cho SellerProfile của social account");
                }
            }
        }

        // ✅ SAVE CHANGES
        await _context.SaveChangesAsync();
        Console.WriteLine($"Đã lưu thay đổi vào database cho social user {userId}");

        // ✅ GENERATE NEW TOKEN with fresh data
        var freshUser = await _context.Users
            .Include(u => u.SellerProfile)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.UserID == userId);

        if (freshUser == null)
        {
            throw new Exception("Không thể tải lại thông tin user sau khi cập nhật");
        }

        // ✅ Generate new token with updated information
        var tokenResult = GenerateJwtToken(freshUser);
        var userDto = _mapper.Map<UserDto>(freshUser);

        // ✅ ENSURE SellerID and ShopName are included for social accounts
        if (freshUser.Role == "Seller" && freshUser.SellerProfile != null && freshUser.SellerProfile.IsActive)
        {
            userDto.SellerID = freshUser.SellerProfile.SellerID;
            userDto.ShopName = freshUser.SellerProfile.ShopName;
            
        }

        Console.WriteLine($"Cập nhật thông tin thành công cho social user {userId}");

        return new AuthResultDto
        {
            Success = true,
            Message = "Cập nhật thông tin thành công",
            Token = tokenResult.Token,
            Expiration = tokenResult.Expiration,
            User = userDto
        };
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Lỗi khi cập nhật thông tin social user {userId}: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return new AuthResultDto { Success = false, Message = $"Có lỗi xảy ra: {ex.Message}" };
    }
}
        // Hàm helper để kiểm tra định dạng email
        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
            }
        }
    }
}
