using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using System.Security.Claims;

namespace ShopxEX1.Helpers
{
    public class GetID
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppDbContext _context;
        private readonly ILogger<GetID> _logger;

        public GetID(IHttpContextAccessor httpContextAccessor, AppDbContext context ,ILogger<GetID> logger)
        {
            _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
            _context = context;
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }
        // Lấy UserID lưu trong claim
        public bool IsAdmin()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            return user?.IsInRole("Admin") ?? false;
        }
        private int CurrentUserId
        {
            get
            {
                var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (int.TryParse(userIdClaim, out int userId))
                {
                    return userId;
                }
                _logger.LogError("Không thể tìm thấy hoặc phân tích claim User ID (NameIdentifier) cho người dùng hiện tại.");
                throw new UnauthorizedAccessException("Không thể xác định người dùng hiện tại.");
            }
        }
        // Trả về UserID đã được lấy
        public int GetCurrentUserId()
        {
            return CurrentUserId;
        }

        public int? GetSellerId()
        {
            int userId = GetCurrentUserId();
            var seller = _context.Sellers
                .FirstOrDefault(s => s.UserID == userId);

            if (seller == null)
            {
                _logger.LogError($"User {userId} không phải Seller");
                return null;
            }

            return seller.SellerID;
        }
    }
}
