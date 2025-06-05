using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Services;
using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using ShopxEX1.Models;
using ShopxEX1.Data;
using Microsoft.EntityFrameworkCore;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ISessionService _sessionService;
        private readonly ILogger<AuthController> _logger; // Inject nếu cần log chi tiết
        private readonly AppDbContext _context;
        public AuthController(IAuthService authService, ISessionService sessionService, ILogger<AuthController> logger, AppDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
            _sessionService = sessionService ?? throw new ArgumentNullException(nameof(sessionService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        }
        // --- Helper function để lấy User ID từ Claims (Được Middleware xác thực điền vào HttpContext.User) ---
        private int GetCurrentUserIdFromClaims()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("Không thể xác định ID người dùng từ thông tin xác thực.");
            }
            return userId;
        }
        // Đăng nhập người dùng bằng email và mật khẩu
        [HttpPost("login")]
        [AllowAnonymous] // Cho phép truy cập công khai
        public async Task<ActionResult<AuthResultDto>> Login([FromBody] LoginDto loginDto)
        {
            if (!ModelState.IsValid)
            {
                // Trả về lỗi validation nếu DTO không hợp lệ ngay từ đầu
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu đăng nhập không hợp lệ.", User = null });
            }

            try
            {
                // Service trả về AuthResultDto (có thể success=false nếu sai pass/user)
                var result = await _authService.LoginAsync(loginDto);

                if (result == null || !result.Success)
                {
                    // Trả về 401 Unauthorized cùng với thông báo lỗi từ service
                    return Unauthorized(result);
                }
                // Trả về 200 OK với token và thông tin user
                return Ok(result);
            }
            catch (Exception ex) // Bắt các lỗi không mong muốn khác từ service (ví dụ lỗi DB khi lưu RT/LastLogin)
            {
                // _logger.LogError(ex, "Lỗi hệ thống khi đăng nhập.");
                Console.WriteLine($"Lỗi Login: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto { Success = false, Message = "Đã xảy ra lỗi hệ thống khi đăng nhập: " + ex.Message + " *** " + ex.Source });
            }
        }
        [HttpPost("social-login")]
        [AllowAnonymous] // Cho phép truy cập công khai
        public async Task<ActionResult<AuthResultDto>> SocialLogin([FromBody] SocialLoginRequestDto socialLoginDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu social login không hợp lệ." });
            }

            try
            {
                var result = await _authService.SocialLoginAsync(socialLoginDto);

                if (!result.Success)
                {
                    // Lỗi trả về từ service (ví dụ: email đã liên kết tài khoản social khác)
                    return BadRequest(result);
                }

                // Trả về thành công với Access Token và User Info
                return Ok(result);
            }
            catch (Exception ex) // Bắt lỗi hệ thống từ service
            {
                Console.WriteLine($"Lỗi SocialLogin: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto { Success = false, Message = "Lỗi hệ thống khi xử lý đăng nhập bằng mạng xã hội." });
            }
        }
        // Đăng ký tài khoản người dùng mới (vai trò Customer)
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<ActionResult<AuthResultDto>> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new AuthResultDto { Success = false, Message = "Dữ liệu đăng ký không hợp lệ.", User = null });
            }

            try
            {
                // Service trả về AuthResultDto (có thể success=false nếu email tồn tại)
                var result = await _authService.RegisterAsync(registerDto);

                if (!result.Success)
                {
                    // Trả về 400 Bad Request với thông báo lỗi từ service
                    return BadRequest(result);
                }
                // Trả về 200 OK với thông tin user mới (không có token)
                return Ok(result);
            }
            catch (Exception ex) // Bắt lỗi không mong muốn khác (ví dụ: lỗi lưu DB)
            {
                // _logger.LogError(ex, "Lỗi hệ thống khi đăng ký.");
                Console.WriteLine($"Lỗi Register: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, new AuthResultDto { Success = false, Message = "Đã xảy ra lỗi hệ thống khi đăng ký." });
            }
        }
        // Đăng xuất người dùng hiện tại (blacklist Access Token, revoke Refresh Tokens)
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = GetCurrentUserIdFromClaims();

                // Lấy JTI và Expiry từ token hiện tại để gửi cho service blacklist
                var jti = User.FindFirstValue(JwtRegisteredClaimNames.Jti);
                var expClaim = User.FindFirstValue(JwtRegisteredClaimNames.Exp);
                DateTime? expiry = null;
                if (expClaim != null && long.TryParse(expClaim, out long expUnix))
                {
                    expiry = DateTimeOffset.FromUnixTimeSeconds(expUnix).UtcDateTime;
                }

                await _authService.LogoutAsync(userId, jti, expiry);

                return Ok(new { message = "Đăng xuất thành công." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex) // Bắt lỗi không mong muốn khác từ service (ví dụ lỗi DB khi revoke/blacklist)
            {
                // _logger.LogError(ex, "Lỗi không mong muốn khi thực hiện logout cho User ID."); // Cần userId ở đây nếu log
                Console.WriteLine($"Lỗi Logout: {ex}");
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi hệ thống khi đăng xuất.");
            }
        }
        // Đặt lại mật khẩu bằng token nhận được
        [HttpGet("check-auth")]
        [Authorize]
        public async Task<IActionResult> CheckAuth()
        {
            var user = await _sessionService.GetCurrentUserAsync();
            if (user == null)
            {
                return Unauthorized(new { message = "Phiên đăng nhập đã hết hạn" });
            }

            return Ok(new
            {
                isAuthenticated = true,
                user = user
            });
        }
        // ✅ SỬA: check-social-user endpoint

        [HttpPost("check-social-user")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckSocialUser([FromBody] CheckSocialUserRequest request)
        {
            // ✅ Validate input
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid request data" });
            }

            try
            {
                _logger.LogInformation("Checking social user: Provider={Provider}, UserId={UserId}",
                    request.Provider, request.UserId);

                // ✅ Check if user exists by provider and userId
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.SocialProvider == request.Provider &&
                                            u.SocialID == request.UserId);

                if (existingUser != null)
                {
                    _logger.LogInformation("Found existing social user: Email={Email}", existingUser.Email);

                    return Ok(new
                    {
                        success = true,
                        exists = true,
                        user = new
                        {
                            email = existingUser.Email,
                            fullName = existingUser.FullName,
                            role = existingUser.Role
                        }
                    });
                }
                else
                {
                    _logger.LogInformation("No existing social user found for Provider={Provider}, UserId={UserId}",
                        request.Provider, request.UserId);

                    return Ok(new
                    {
                        success = true,
                        exists = false
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking social user: Provider={Provider}, UserId={UserId}",
                    request.Provider, request.UserId);

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while checking social user"
                });
            }
        }

        [HttpPost("check-email-exists")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckEmailExists([FromBody] CheckEmailRequest request)
        {
            // ✅ Validate input
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "Invalid email format" });
            }

            try
            {
                _logger.LogInformation("Checking email exists: Email={Email}", request.Email);

                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());

                if (existingUser != null)
                {
                    _logger.LogInformation("Email exists: Email={Email}, Provider={Provider}",
                        request.Email, existingUser.SocialProvider ?? "regular");

                    return Ok(new
                    {
                        success = true,
                        exists = true,
                        isSocialAccount = !string.IsNullOrEmpty(existingUser.SocialProvider),
                        provider = existingUser.SocialProvider
                    });
                }
                else
                {
                    _logger.LogInformation("Email does not exist: Email={Email}", request.Email);

                    return Ok(new
                    {
                        success = true,
                        exists = false
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking email exists: Email={Email}", request.Email);

                return StatusCode(500, new
                {
                    success = false,
                    message = "An error occurred while checking email"
                });
            }
        }
        // Thay đổi mật khẩu cho người dùng đang đăng nhập.
        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePasswordDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = GetCurrentUserIdFromClaims();
                await _authService.ChangePasswordAsync(userId, changePasswordDto);
                return NoContent(); // Thành công
            }
            catch (UnauthorizedAccessException ex) { return Unauthorized(new { message = ex.Message }); } // Sai mật khẩu cũ hoặc lỗi token
            catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); } // Không tìm thấy user
            catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); } // Mật khẩu mới không khớp (nếu service check)
            catch (Exception ex) { Console.WriteLine($"Lỗi ChangePassword: {ex}"); return StatusCode(500, "Lỗi hệ thống khi đổi mật khẩu."); }
        }
        /// <summary>
        /// 🔥 ENDPOINT: YÊU CẦU ĐẶT LẠI MẬT KHẨU
        /// Nhận email từ client, validate và gửi link reset qua email
        /// </summary>
        /// <param name="requestDto">DTO chứa email người dùng</param>
        /// <returns>Kết quả xử lý yêu cầu</returns>
        [HttpPost("request-password-reset")]
        [AllowAnonymous] // 🔥 Cho phép anonymous access vì user chưa đăng nhập
        public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetDto requestDto)
        {
            // 🔥 BƯỚC 1: VALIDATE INPUT
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for password reset request: {Email}", requestDto?.Email);

                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(new PasswordResetResultDto
                {
                    Success = false,
                    Message = $"Dữ liệu không hợp lệ: {string.Join(", ", errors)}"
                });
            }

            try
            {
                // 🔥 BƯỚC 2: LOG REQUEST CHO SECURITY AUDIT
                _logger.LogInformation("Password reset requested for email: {Email} from IP: {IP}",
                    requestDto.Email,
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown");

                // 🔥 BƯỚC 3: GỌI SERVICE XỬ LÝ LOGIC NGHIỆP VỤ
                var result = await _authService.RequestPasswordResetAsync(requestDto);

                // 🔥 BƯỚC 4: LOG KẾT QUẢ
                if (result.Success)
                {
                    _logger.LogInformation("Password reset request processed successfully for email: {Email}", requestDto.Email);
                }
                else
                {
                    _logger.LogWarning("Password reset request failed for email: {Email}, Reason: {Message}",
                        requestDto.Email, result.Message);
                }

                // 🔥 BƯỚC 5: RETURN RESPONSE
                // Luôn return 200 OK để không tiết lộ thông tin user có tồn tại hay không
                return Ok(result);
            }
            catch (Exception ex)
            {
                // 🔥 BƯỚC 6: XỬ LÝ LỖI KHÔNG MONG MUỐN
                _logger.LogError(ex, "Unexpected error during password reset request for email: {Email}", requestDto?.Email);

                return StatusCode(500, new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
                });
            }
        }

        /// <summary>
        /// 🔥 ENDPOINT: ĐẶT LẠI MẬT KHẨU
        /// Nhận token và mật khẩu mới từ client, validate và cập nhật mật khẩu
        /// </summary>
        /// <param name="resetDto">DTO chứa token, email và mật khẩu mới</param>
        /// <returns>Kết quả đặt lại mật khẩu</returns>
        [HttpPost("reset-password")]
        [AllowAnonymous] // 🔥 Cho phép anonymous vì user đang reset password
        public async Task<IActionResult> ResetPassword([FromBody] PasswordResetDto resetDto)
        {
            // 🔥 BƯỚC 1: VALIDATE INPUT
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("Invalid model state for password reset: {Email}", resetDto?.Email);

                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return BadRequest(new PasswordResetResultDto
                {
                    Success = false,
                    Message = $"Dữ liệu không hợp lệ: {string.Join(", ", errors)}"
                });
            }

            try
            {
                // 🔥 BƯỚC 2: LOG ATTEMPT CHO SECURITY
                _logger.LogInformation("Password reset attempt for email: {Email} from IP: {IP}",
                    resetDto.Email,
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown");

                // 🔥 BƯỚC 3: GỌI SERVICE XỬ LÝ
                var result = await _authService.ResetPasswordAsync(resetDto);

                // 🔥 BƯỚC 4: LOG KẾT QUẢ
                if (result.Success)
                {
                    _logger.LogInformation("Password reset successful for email: {Email}", resetDto.Email);
                }
                else
                {
                    _logger.LogWarning("Password reset failed for email: {Email}, Reason: {Message}",
                        resetDto.Email, result.Message);
                }

                // 🔥 BƯỚC 5: RETURN APPROPRIATE STATUS CODE
                if (!result.Success)
                {
                    // Return 400 Bad Request cho validation errors
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                // 🔥 BƯỚC 6: XỬ LÝ LỖI
                _logger.LogError(ex, "Unexpected error during password reset for email: {Email}", resetDto?.Email);

                return StatusCode(500, new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
                });
            }
        }

        /// <summary>
        /// 🔥 ENDPOINT: VALIDATE TOKEN (OPTIONAL)
        /// Kiểm tra tính hợp lệ của reset token trước khi user nhập mật khẩu mới
        /// </summary>
        /// <param name="token">Reset token cần validate</param>
        /// <param name="email">Email tương ứng với token</param>
        /// <returns>Kết quả validation</returns>
        [HttpGet("validate-reset-token")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidateResetToken([Required] string token, [Required] string email)
        {
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(email))
            {
                return BadRequest(new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Token và email là bắt buộc."
                });
            }

            try
            {
                _logger.LogInformation("Token validation requested for email: {Email}", email);

                // 🔥 GỌI SERVICE VALIDATE TOKEN
                var result = await _authService.ValidateResetTokenAsync(token, email);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating reset token for email: {Email}", email);

                return StatusCode(500, new PasswordResetResultDto
                {
                    Success = false,
                    Message = "Không thể xác thực token."
                });
            }
        }

        /// <summary>
        /// 🔥 ENDPOINT: HỦY RESET TOKEN (OPTIONAL)
        /// Cho phép user hủy quá trình reset password
        /// </summary>
        /// <param name="token">Token cần hủy</param>
        /// <param name="email">Email tương ứng</param>
        /// <returns>Kết quả hủy token</returns>
        [HttpPost("cancel-password-reset")]
        [AllowAnonymous]
        public async Task<IActionResult> CancelPasswordReset([FromBody] CancelResetDto cancelDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Dữ liệu không hợp lệ.");
            }

            try
            {
                _logger.LogInformation("Password reset cancellation requested for email: {Email}", cancelDto.Email);

                // 🔥 LOGIC HỦY TOKEN (có thể blacklist token nếu cần)
                var result = await _authService.CancelPasswordResetAsync(cancelDto.Token, cancelDto.Email);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling password reset for email: {Email}", cancelDto.Email);
                return StatusCode(500, "Không thể hủy yêu cầu reset password.");
            }
        }

        /// <summary>
        /// 🔥 ENDPOINT: RESEND RESET EMAIL (OPTIONAL)
        /// Gửi lại email reset nếu user không nhận được
        /// </summary>
        /// <param name="email">Email cần gửi lại</param>
        /// <returns>Kết quả gửi lại email</returns>
        [HttpPost("resend-reset-email")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendResetEmail([FromBody] ResendResetEmailDto resendDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest("Email không hợp lệ.");
            }

            try
            {
                // 🔥 KIỂM TRA RATE LIMITING (tránh spam)
                var lastRequest = HttpContext.Session.GetString($"last_reset_request_{resendDto.Email}");
                if (!string.IsNullOrEmpty(lastRequest))
                {
                    var lastRequestTime = DateTime.Parse(lastRequest);
                    if (DateTime.UtcNow.Subtract(lastRequestTime).TotalMinutes < 2)
                    {
                        return BadRequest(new PasswordResetResultDto
                        {
                            Success = false,
                            Message = "Vui lòng đợi 2 phút trước khi gửi lại yêu cầu."
                        });
                    }
                }

                _logger.LogInformation("Resend reset email requested for: {Email}", resendDto.Email);

                var result = await _authService.RequestPasswordResetAsync(new RequestPasswordResetDto { Email = resendDto.Email });

                // 🔥 CẬP NHẬT THỜI GIAN YÊU CẦU CUỐI
                HttpContext.Session.SetString($"last_reset_request_{resendDto.Email}", DateTime.UtcNow.ToString());

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending reset email for: {Email}", resendDto.Email);
                return StatusCode(500, "Không thể gửi lại email.");
            }
        }


        [HttpPut("update-profile")]
[Authorize]
public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto updateDto)
{
    try
    {
        // ✅ VALIDATE ModelState first
        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();
                
            return BadRequest(new { 
                success = false, 
                message = "Dữ liệu không hợp lệ", 
                errors = errors 
            });
        }

        // ✅ CONDITIONAL VALIDATION: Check ShopName when role = Seller
        if (updateDto.Role?.ToLower() == "seller")
        {
            if (string.IsNullOrWhiteSpace(updateDto.ShopName))
            {
                return BadRequest(new { 
                    success = false, 
                    message = "Tên cửa hàng là bắt buộc khi chọn vai trò Seller",
                    field = "ShopName"
                });
            }
            
            if (updateDto.ShopName.Trim().Length < 2)
            {
                return BadRequest(new { 
                    success = false, 
                    message = "Tên cửa hàng phải có ít nhất 2 ký tự",
                    field = "ShopName"
                });
            }
        }

        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        if (userId == 0)
        {
            return Unauthorized(new { message = "Token không hợp lệ" });
        }

        var result = await _authService.UpdateProfileAsync(userId, updateDto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Message });
        }

        return Ok(result);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error in UpdateProfile");
        return StatusCode(500, new { message = "Lỗi hệ thống khi cập nhật thông tin" });
    }
}
   
    }
}
