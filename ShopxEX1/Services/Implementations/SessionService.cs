using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Services;

namespace ShopxEX1.Services.Implementations
{
    public class SessionService : ISessionService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;

        public SessionService(
            IHttpContextAccessor httpContextAccessor,
            AppDbContext context,
            IMapper mapper)
        {
            _httpContextAccessor = httpContextAccessor;
            _context = context;
            _mapper = mapper;
        }

        public async Task<UserDto?> GetCurrentUserAsync()
        {
            var userId = await GetCurrentUserIdAsync();
            if (!userId.HasValue) return null;

            var user = await _context.Users
                .Include(u => u.SellerProfile)
                .FirstOrDefaultAsync(u => u.UserID == userId);

            return user != null ? _mapper.Map<UserDto>(user) : null;
        }

        public Task<bool> IsAuthenticatedAsync()
        {
            return Task.FromResult(_httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false);
        }

        public Task<bool> IsInRoleAsync(string role)
        {
            return Task.FromResult(_httpContextAccessor.HttpContext?.User.IsInRole(role) ?? false);
        }

        public Task<int?> GetCurrentUserIdAsync()
        {
            var userId = _httpContextAccessor.HttpContext?.Items["UserId"] as int?;
            return Task.FromResult(userId);
        }

        public Task<int?> GetCurrentSellerIdAsync()
        {
            var sellerId = _httpContextAccessor.HttpContext?.Items["SellerId"] as int?;
            return Task.FromResult(sellerId);
        }
    }
} 