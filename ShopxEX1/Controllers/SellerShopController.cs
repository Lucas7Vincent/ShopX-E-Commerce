using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ShopxEX1.Data;
using ShopxEX1.Models;
using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Controllers
{
    [Route("api/sellers")]
    [ApiController]
    [Authorize]
    public class SellerShopController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SellerShopController> _logger;

        public SellerShopController(AppDbContext context, ILogger<SellerShopController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// GET CURRENT SELLER INFO - ENDPOINT BỊ THIẾU
        /// GET /api/Seller/current
        /// </summary>
        [HttpGet("current")]
        public async Task<IActionResult> GetCurrentSeller()
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                if (userId == 0)
                {
                    return Unauthorized(new { message = "Token không hợp lệ" });
                }

                // Lấy thông tin seller và user
                var seller = await _context.Sellers
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.UserID == userId);

                if (seller == null)
                {
                    return NotFound(new { message = "Không tìm thấy thông tin cửa hàng" });
                }

                // ✅ TRẢ VỀ THEO ĐỊNH DẠNG SellerDto
                return Ok(new
                {
                    sellerID = seller.SellerID,
                    shopName = seller.ShopName,
                    isActive = seller.IsActive,
                    userID = seller.UserID,
                    userFullName = seller.User.FullName,
                    userEmail = seller.User.Email,
                    createdAt = seller.CreatedAt,
                   
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current seller info for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "Lỗi hệ thống khi lấy thông tin cửa hàng" });
            }
        }

        /// <summary>
        /// UPDATE SHOP INFO - CHỈ CẬP NHẬT THEO SellerDto
        /// PUT /api/Seller/update-shop
        /// </summary>
        [HttpPut("update-shop")]
        public async Task<IActionResult> UpdateShopInfo([FromBody] SellerDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                if (userId == 0)
                {
                    return Unauthorized(new { message = "Token không hợp lệ" });
                }

                // Tìm seller profile của user
                var seller = await _context.Sellers
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.UserID == userId);

                if (seller == null)
                {
                    return NotFound(new { message = "Không tìm thấy thông tin cửa hàng" });
                }

                // ✅ CHỈ CẬP NHẬT CÁC TRƯỜNG TRONG SellerDto
                if (!string.IsNullOrEmpty(dto.ShopName))
                {
                    seller.ShopName = dto.ShopName.Trim();
                }

                seller.IsActive = dto.IsActive;

                // ✅ CẬP NHẬT THÔNG TIN USER (nếu có trong DTO)
                if (!string.IsNullOrEmpty(dto.UserFullName))
                {
                    seller.User.FullName = dto.UserFullName.Trim();
                }

                if (!string.IsNullOrEmpty(dto.UserEmail))
                {
                    seller.User.Email = dto.UserEmail.Trim();
                }

                
                await _context.SaveChangesAsync();

                // ✅ TRẢ VỀ THEO ĐỊNH DẠNG SellerDto
                return Ok(new
                {
                    success = true,
                    message = "Cập nhật thông tin cửa hàng thành công",
                    seller = new
                    {
                        sellerID = seller.SellerID,
                        shopName = seller.ShopName,
                        isActive = seller.IsActive,
                        userID = seller.UserID,
                        userFullName = seller.User.FullName,
                        userEmail = seller.User.Email
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating shop info for user {UserId}", User.FindFirst(ClaimTypes.NameIdentifier)?.Value);
                return StatusCode(500, new { message = "Lỗi hệ thống khi cập nhật thông tin cửa hàng" });
            }
        }

        /// <summary>
        /// CONVERT TO SELLER - ENDPOINT ĐÃ CÓ
        /// POST /api/Seller/convert-to-seller
        /// </summary>
        [HttpPost("convert-to-seller")]
        public async Task<IActionResult> ConvertToSeller([FromBody] ConvertToSellerDto dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
                if (userId == 0)
                {
                    return Unauthorized(new { message = "Token không hợp lệ" });
                }

                // Validation
                if (string.IsNullOrWhiteSpace(dto.ShopName))
                {
                    return BadRequest(new { message = "Tên cửa hàng là bắt buộc" });
                }

                // Kiểm tra user tồn tại
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    return NotFound(new { message = "Không tìm thấy người dùng" });
                }

                // Kiểm tra đã có SellerProfile chưa
                var existingSeller = await _context.Sellers
                    .FirstOrDefaultAsync(s => s.UserID == userId);

                if (existingSeller != null)
                {
                    // Kích hoạt lại
                    existingSeller.IsActive = true;
                    if (!string.IsNullOrEmpty(dto.ShopName))
                    {
                        existingSeller.ShopName = dto.ShopName;
                    }
                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        success = true,
                        SellerId = existingSeller.SellerID,
                        message = "Seller profile activated"
                    });
                }

                // Tạo mới SellerProfile
                var newSeller = new Seller
                {
                    UserID = userId,
                    ShopName = dto.ShopName ?? $"{user.FullName}'s Shop",
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.Sellers.Add(newSeller);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    SellerId = newSeller.SellerID,
                    message = "Seller profile created"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error converting to seller");
                return StatusCode(500, new { message = "Lỗi hệ thống" });
            }
        }
    }

    // ✅ DTO CHO CONVERT
    public class ConvertToSellerDto
    {
        public int UserId { get; set; }
        public string ShopName { get; set; } = string.Empty;
    }
}