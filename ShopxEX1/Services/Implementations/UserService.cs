using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using System.Linq.Expressions;

namespace ShopxEX1.Services.Implementations
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<UserService> _logger;

        // Danh sách các role hợp lệ (có thể lấy từ config hoặc DB nếu cần)
        private static readonly List<string> ValidRoles = new List<string> { "Customer", "Seller", "Admin" };

        public UserService(AppDbContext context, IMapper mapper, ILogger<UserService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<PagedResult<UserSummaryDto>> GetAllUsersAsync(UserFilterDto filter, int pageNumber, int pageSize)
        {
            _logger.LogInformation("Admin: Lấy danh sách người dùng - Trang: {Page}, Kích thước: {Size}, Filter: Search='{Search}', Active='{Active}'",
                pageNumber, pageSize, filter.SearchTerm, filter.IsActive);
            try
            {
                var query = _context.Users.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var searchTermLower = filter.SearchTerm.ToLower();
                    query = query.Where(u =>
                        (u.FullName != null && u.FullName.ToLower().Contains(searchTermLower)) ||
                        u.Email.ToLower().Contains(searchTermLower) ||
                        (u.Phone != null && u.Phone.Contains(searchTermLower))); // Phone thường không phân biệt hoa thường
                }

                if (filter.IsActive.HasValue)
                {
                    query = query.Where(u => u.IsActive == filter.IsActive.Value);
                }

                if (!string.IsNullOrEmpty(filter.Role))
                {
                    query = query.Where(u => u.Role.Contains(filter.Role));
                }

                if (!string.IsNullOrEmpty(filter.SearchTerm))
                {
                    query = query.Where(u => u.FullName.Contains(filter.SearchTerm) || u.Email.Contains(filter.SearchTerm) || u.Phone.Contains(filter.SearchTerm));
                }

                Expression<Func<User, object>> orderByExpression = u => u.UserID;
                bool ascending = true;

                if (!string.IsNullOrWhiteSpace(filter?.SortBy))
                {
                    switch (filter.SortBy.ToLowerInvariant())
                    {
                        case "fullnameasc":
                            orderByExpression = u => u.FullName;
                            ascending = true;
                            break;
                        case "fullnamedesc":
                            orderByExpression = u => u.FullName;
                            ascending = false;
                            break;
                        case "emailasc":
                            orderByExpression = u => u.Email;
                            ascending = true;
                            break;
                        case "emaildesc":
                            orderByExpression = u => u.Email;
                            ascending = false;
                            break;
                        case "createdatdesc":
                            orderByExpression = u => u.CreatedAt;
                            ascending = false;
                            break;
                        default:
                            orderByExpression = u => u.CreatedAt;
                            ascending = true;
                            break;
                    }
                }

                if (ascending)
                {
                    query = query.OrderBy(orderByExpression);
                }
                else
                {
                    query = query.OrderByDescending(orderByExpression);
                }
                // Sắp xếp mặc định (ví dụ: theo ngày tạo mới nhất)

                var totalCount = await query.CountAsync();
                var items = await query.Skip((pageNumber - 1) * pageSize)
                                       .Take(pageSize)
                                       .ToListAsync();

                var mappedItems = _mapper.Map<IEnumerable<UserSummaryDto>>(items);
                _logger.LogInformation("Admin: Đã lấy {ItemCount}/{TotalCount} người dùng.", items.Count, totalCount);
                return new PagedResult<UserSummaryDto>(mappedItems, pageNumber, pageSize, totalCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi Admin lấy danh sách người dùng.");
                throw; // Ném lại để controller xử lý
            }
        }

        public async Task<UserDto?> GetUserByIdAsync(int userId)
        {
            _logger.LogInformation("Admin: Lấy thông tin người dùng ID: {UserId}", userId);
            try
            {
                var user = await _context.Users
                                    .Include(u => u.SellerProfile) // Để lấy thông tin Seller nếu có
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(u => u.UserID == userId);

                if (user == null)
                {
                    _logger.LogWarning("Admin: Không tìm thấy người dùng ID: {UserId}", userId);
                    return null;
                }
                _logger.LogInformation("Admin: Tìm thấy người dùng ID: {UserId}", userId);
                var userdto = _mapper.Map<UserDto>(user);
                return userdto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi Admin lấy thông tin người dùng ID: {UserId}", userId);
                throw;
            }
        }

        public async Task<UserDto?> CreateUserAsync(UserCreateDto createDto)
        {
            _logger.LogInformation("Admin: Tạo người dùng mới với Email: {Email}, Role: {Role}", createDto.Email, createDto.Role);
            if (Function.IsEmoji(createDto.FullName)) {
                throw new ArgumentException($"Tên '{createDto.FullName}' không hợp lệ.");
            }
            if (createDto.Phone.Length > 10) 
            {
                throw new ArgumentException($"Số điện thoại '{createDto.Phone}' không hợp lệ.");
            }
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == createDto.Email.ToLower()))
            {
                throw new InvalidOperationException($"Email '{createDto.Email}' đã được sử dụng.");
            }
            if (await _context.Users.AnyAsync(u => u.Phone.ToLower() == createDto.Phone.ToLower()))
            {
                throw new InvalidOperationException($"Phone '{createDto.Phone}' đã được sử dụng.");
            }
            if (!ValidRoles.Contains(createDto.Role, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Vai trò '{createDto.Role}' không hợp lệ.");
            }

            var standardizedRole = ValidRoles.First(r => r.Equals(createDto.Role, StringComparison.OrdinalIgnoreCase));

            if (standardizedRole == "Seller" && string.IsNullOrWhiteSpace(createDto.ShopName))
            {
                throw new ArgumentException("Tên cửa hàng (ShopName) là bắt buộc khi tạo người dùng với vai trò Seller.");
            }

            var user = _mapper.Map<User>(createDto);
            user.PasswordHash = Function.PasswordHash(createDto.Password);
            user.CreatedAt = DateTime.UtcNow;
            user.Role = standardizedRole; // Gán vai trò đã chuẩn hóa

            if (user.Role == "Seller")
            {
                user.SellerProfile = new Seller
                {
                    // UserID sẽ được EF Core xử lý khi SaveChanges
                    ShopName = createDto.ShopName!, // Đã kiểm tra không null ở trên
                    IsActive = user.IsActive, // SellerProfile active theo User
                    CreatedAt = DateTime.UtcNow
                };
                // Không cần _context.Sellers.Add() nếu User.SellerProfile được gán và User được Add
            }

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Admin: Đã tạo người dùng ID: {UserId}", user.UserID);
            // Lấy lại đầy đủ thông tin để map (bao gồm cả SellerProfile nếu vừa tạo)
            var createdUserWithDetails = await _context.Users
                                                .Include(u => u.SellerProfile)
                                                .AsNoTracking()
                                                .FirstOrDefaultAsync(u => u.UserID == user.UserID);
            return _mapper.Map<UserDto>(createdUserWithDetails);
        }

        public async Task<UserDto?> UpdateUserAsAdminAsync(int userId, AdminUserUpdateDto updateDto)
        {
            _logger.LogInformation("Admin: Cập nhật người dùng ID: {UserId} với Role: {Role}", userId, updateDto.Role);
            var user = await _context.Users
                                .Include(u => u.SellerProfile)
                                .FirstOrDefaultAsync(u => u.UserID == userId);
            if (user == null)
            {
                _logger.LogWarning("Admin: Không tìm thấy UserID: {UserId} để cập nhật.", userId);
                return null;
            }

            if (!ValidRoles.Contains(updateDto.Role, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Vai trò '{updateDto.Role}' không hợp lệ.");
            }

            var standardizedNewRole = ValidRoles.First(r => r.Equals(updateDto.Role, StringComparison.OrdinalIgnoreCase));

            // Kiểm tra ShopName nếu vai trò là Seller
            if (standardizedNewRole == "Seller")
            {
                if (string.IsNullOrWhiteSpace(updateDto.ShopName))
                {
                    // Nếu user đã có SellerProfile từ trước, không ném lỗi nếu ShopName không được cung cấp trong DTO này,
                    // trừ khi bạn muốn bắt buộc phải gửi lại ShopName mỗi lần cập nhật Role Seller.
                    // Nhưng nếu user CHƯA có SellerProfile và đang được đổi thành Seller, thì ShopName là bắt buộc.
                    if (user.SellerProfile == null)
                    {
                        throw new ArgumentException("Tên cửa hàng (ShopName) là bắt buộc khi gán vai trò Seller cho người dùng chưa có thông tin cửa hàng.");
                    }
                }
            }

            // Map các trường cơ bản từ DTO
            _mapper.Map(updateDto, user); // Các trường FullName, Phone, Address, IsActive được map
            user.Role = standardizedNewRole; // Gán vai trò đã chuẩn hóa

            // Xử lý SellerProfile
            if (user.Role == "Seller")
            {
                if (user.SellerProfile == null)
                {
                    // Đã kiểm tra ShopName ở trên, nếu user.SellerProfile là null thì ShopName phải được cung cấp
                    user.SellerProfile = new Seller
                    {
                        ShopName = updateDto.ShopName!, // Đã kiểm tra
                        IsActive = user.IsActive,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Sellers.Add(user.SellerProfile);
                    _logger.LogInformation("Admin: Đã tạo SellerProfile mới cho UserID: {UserId} với ShopName: '{ShopName}'.", userId, updateDto.ShopName);
                }
                else // User đã có SellerProfile
                {
                    // Cập nhật ShopName nếu được cung cấp và khác với tên hiện tại
                    if (!string.IsNullOrWhiteSpace(updateDto.ShopName) &&
                        !user.SellerProfile.ShopName.Equals(updateDto.ShopName, StringComparison.OrdinalIgnoreCase))
                    {
                        user.SellerProfile.ShopName = updateDto.ShopName;
                        _logger.LogInformation("Admin: Đã cập nhật ShopName cho SellerProfile của UserID: {UserId} thành '{ShopName}'.", userId, updateDto.ShopName);
                    }
                    user.SellerProfile.IsActive = user.IsActive; // Đồng bộ trạng thái active
                }
            }
            else // Role không phải là Seller
            {
                if (user.SellerProfile != null)
                {
                    user.SellerProfile.IsActive = false; // Vô hiệu hóa SellerProfile
                    _logger.LogInformation("Admin: UserID {UserId} không còn là Seller, SellerProfile đã được vô hiệu hóa.", userId);
                    // Cân nhắc xóa nếu không cần giữ lại: _context.Sellers.Remove(user.SellerProfile);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin: Đã cập nhật người dùng ID: {UserId}", userId);
            var updatedUserWithDetails = await _context.Users
                                                .Include(u => u.SellerProfile)
                                                .AsNoTracking()
                                                .FirstOrDefaultAsync(u => u.UserID == user.UserID);
            return _mapper.Map<UserDto>(updatedUserWithDetails);
        }

        public async Task<bool> DeleteUserAsync(int userId)
        {
            _logger.LogInformation("Admin: Bắt đầu xóa người dùng ID: {UserId}", userId);
            try
            {
                var user = await _context.Users
                                    .Include(u => u.SellerProfile) // Để xử lý SellerProfile nếu xóa cứng
                                    .Include(u => u.Orders) // Để kiểm tra ràng buộc
                                    .Include(u => u.Contacts) // Để xử lý Contact nếu UserID là NOT NULL và ON DELETE RESTRICT
                                    .FirstOrDefaultAsync(u => u.UserID == userId);

                if (user == null)
                {
                    _logger.LogWarning("Admin: Không tìm thấy người dùng ID: {UserId} để xóa.", userId);
                    return false;
                }

                // Kiểm tra các ràng buộc trước khi xóa cứng (ví dụ: nếu có đơn hàng không cho xóa)
                if (user.Orders.Any())
                {
                    _logger.LogWarning("Admin: Không thể xóa UserID {UserId} vì có đơn hàng liên quan. Hãy xem xét vô hiệu hóa tài khoản.", userId);
                    throw new InvalidOperationException("Không thể xóa người dùng đã có đơn hàng. Vui lòng vô hiệu hóa tài khoản thay thế.");
                }


                // Quyết định xóa mềm hay xóa cứng
                // Xóa mềm:
                // user.IsActive = false;
                // if (user.SellerProfile != null) user.SellerProfile.IsActive = false;
                // _logger.LogInformation("Admin: Đã vô hiệu hóa người dùng ID: {UserId}", userId);

                // Xóa cứng (sẽ xóa cả SellerProfile và Contacts nếu cấu hình ON DELETE CASCADE):
                _context.Users.Remove(user);
                _logger.LogInformation("Admin: Đã xóa (cứng) người dùng ID: {UserId}", userId);


                await _context.SaveChangesAsync();
                return true;
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Lỗi logic khi Admin xóa người dùng ID {UserId}.", userId);
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi Admin xóa người dùng ID: {UserId}", userId);
                throw;
            }
        }

        public async Task<UserDto?> SetUserRoleAsync(int userId, SetUserRoleRequestDto requestDto)
        {
            _logger.LogInformation("Admin: Đặt vai trò '{NewRole}' cho UserID: {UserId}. ShopName (nếu có): '{ShopName}'",
               requestDto.NewRole, userId, requestDto.ShopName);
            var user = await _context.Users
                                .Include(u => u.SellerProfile)
                                .FirstOrDefaultAsync(u => u.UserID == userId);
            if (user == null)
            {
                throw new KeyNotFoundException($"Người dùng với ID {userId} không tồn tại.");
            }
            if (!ValidRoles.Contains(requestDto.NewRole, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Vai trò '{requestDto.NewRole}' không hợp lệ.");
            }

            var standardizedNewRole = ValidRoles.First(r => r.Equals(requestDto.NewRole, StringComparison.OrdinalIgnoreCase));

            // Kiểm tra ShopName nếu vai trò mới là Seller
            if (standardizedNewRole == "Seller" && user.SellerProfile == null && string.IsNullOrWhiteSpace(requestDto.ShopName))
            {
                throw new ArgumentException("Tên cửa hàng (ShopName) là bắt buộc khi gán vai trò Seller cho người dùng chưa có thông tin cửa hàng.");
            }

            bool roleChanged = !user.Role.Equals(standardizedNewRole, StringComparison.OrdinalIgnoreCase);
            user.Role = standardizedNewRole;

            if (user.Role == "Seller")
            {
                if (user.SellerProfile == null)
                {
                    // ShopName đã được kiểm tra ở trên là bắt buộc
                    user.SellerProfile = new Seller
                    {
                        ShopName = requestDto.ShopName!,
                        IsActive = user.IsActive,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.Sellers.Add(user.SellerProfile);
                    _logger.LogInformation("Admin: Đã tạo SellerProfile mới cho UserID: {UserId} với ShopName: '{ShopName}'.", userId, requestDto.ShopName);
                }
                else
                {
                    if (!string.IsNullOrWhiteSpace(requestDto.ShopName) &&
                        !user.SellerProfile.ShopName.Equals(requestDto.ShopName, StringComparison.OrdinalIgnoreCase))
                    {
                        user.SellerProfile.ShopName = requestDto.ShopName;
                        _logger.LogInformation("Admin: Đã cập nhật ShopName cho SellerProfile của UserID: {UserId} thành '{ShopName}'.", userId, requestDto.ShopName);
                    }
                    user.SellerProfile.IsActive = user.IsActive;
                }
            }
            else // Role mới không phải là Seller
            {
                if (user.SellerProfile != null)
                {
                    user.SellerProfile.IsActive = false;
                    _logger.LogInformation("Admin: UserID {UserId} không còn là Seller, SellerProfile đã được vô hiệu hóa.", userId);
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Admin: Đã cập nhật vai trò và thông tin liên quan cho UserID {UserId}", userId);
            var updatedUserWithDetails = await _context.Users
                                                .Include(u => u.SellerProfile)
                                                .AsNoTracking()
                                                .FirstOrDefaultAsync(u => u.UserID == user.UserID);
            return _mapper.Map<UserDto>(updatedUserWithDetails);
        }
    }
}
