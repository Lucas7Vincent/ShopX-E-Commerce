using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Carts;
using ShopxEX1.Models;

namespace ShopxEX1.Services.Implementations
{
    public class CartService : ICartService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<CartService> _logger;

        public CartService(AppDbContext context, IMapper mapper, ILogger<CartService> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<Cart> GetOrCreateCartAsync(int userId, bool includeItemsAndProduct = false)
        {
            _logger.LogInformation("Đang cố gắng lấy hoặc tạo giỏ hàng cho UserID: {UserId}", userId);
            var query = _context.Carts.AsQueryable();

            if (includeItemsAndProduct)
            {
                query = query.Include(c => c.CartItems.OrderByDescending(ci => ci.AddedAt))
                             .ThenInclude(ci => ci.Product);
            }
            else
            {
                query = query.Include(c => c.CartItems.OrderByDescending(ci => ci.AddedAt));
            }

            var cart = await query.FirstOrDefaultAsync(c => c.UserID == userId);

            if (cart == null)
            {
                _logger.LogInformation("Không tìm thấy giỏ hàng hiện có cho UserID: {UserId}. Đang kiểm tra sự tồn tại của người dùng.", userId);
                var userExists = await _context.Users.AnyAsync(u => u.UserID == userId);
                if (!userExists)
                {
                    _logger.LogWarning("Người dùng với ID: {UserId} không tồn tại. Không thể tạo giỏ hàng.", userId);
                    throw new KeyNotFoundException($"Người dùng với ID {userId} không tồn tại.");
                }

                _logger.LogInformation("Đang tạo giỏ hàng mới cho UserID: {UserId}", userId);
                cart = new Cart { UserID = userId, CreatedAt = DateTime.UtcNow };
                _context.Carts.Add(cart);
                try
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Tạo và lưu giỏ hàng mới thành công với CartID: {CartId} cho UserID: {UserId}", cart.CartID, userId);
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Lỗi khi lưu giỏ hàng mới cho UserID: {UserId}", userId);
                    throw;
                }
            }
            else
            {
                _logger.LogInformation("Tìm thấy giỏ hàng hiện có với CartID: {CartId} cho UserID: {UserId}", cart.CartID, userId);
            }
            return cart;
        }

        public async Task<Cart?> ReloadCartForDtoMapping(int cartId)
        {
            _logger.LogInformation("Đang tải lại dữ liệu giỏ hàng cho CartID: {CartId} để ánh xạ DTO.", cartId);
            return await _context.Carts
                                 .Include(c => c.CartItems)
                                    .ThenInclude(ci => ci.Product)
                                 .AsNoTracking()
                                 .FirstOrDefaultAsync(c => c.CartID == cartId);
        }
        /// <summary>
        /// Lấy thông tin chi tiết giỏ hàng của một người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <returns>DTO chứa thông tin giỏ hàng hoặc null nếu không tìm thấy.</returns>
        public async Task<CartDto?> GetCartByUserIdAsync(int userId)
        {
            _logger.LogInformation("Đang lấy chi tiết giỏ hàng cho UserID: {UserId}", userId);
            var cart = await _context.Carts
                .Include(c => c.CartItems.OrderByDescending(ci => ci.AddedAt))
                    .ThenInclude(ci => ci.Product)
                    .ThenInclude(p => p.Seller)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.UserID == userId);

            if (cart == null)
            {
                _logger.LogInformation("Không tìm thấy giỏ hàng cho UserID: {UserId}", userId);

                return null;
            }

            _logger.LogInformation("Lấy giỏ hàng thành công với CartID: {CartId} cho UserID: {UserId}", cart.CartID, userId);
            return _mapper.Map<CartDto>(cart);
        }
        /// <summary>
        /// Thêm một sản phẩm vào giỏ hàng của người dùng.
        /// Nếu sản phẩm đã tồn tại, cập nhật số lượng.
        /// Nếu giỏ hàng chưa tồn tại, tạo mới.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="itemDto">Thông tin sản phẩm và số lượng cần thêm.</param>
        /// <returns>DTO chứa thông tin giỏ hàng đã được cập nhật.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu sản phẩm không tồn tại hoặc không hoạt động.</exception>
        /// <exception cref="InvalidOperationException">Ném ra nếu không đủ hàng tồn kho.</exception>
        public async Task<CartDto> AddItemToCartAsync(int userId, CartItemCreateDto itemDto)
        {
            _logger.LogInformation("Đang cố gắng thêm sản phẩm ProductID: {ProductId}, Số lượng: {Quantity} vào giỏ hàng cho UserID: {UserId}", itemDto.ProductID, itemDto.Quantity, userId);

            var cart = await GetOrCreateCartAsync(userId, includeItemsAndProduct: true);

            var product = await _context.Products.FindAsync(itemDto.ProductID);
            if (product == null || !product.IsActive)
            {
                _logger.LogWarning("Thêm sản phẩm thất bại: ProductID: {ProductId} không tồn tại hoặc không hoạt động cho UserID: {UserId}", itemDto.ProductID, userId);
                throw new KeyNotFoundException($"Sản phẩm với ID {itemDto.ProductID} không tồn tại hoặc không hoạt động.");
            }

            _logger.LogDebug("Tìm thấy sản phẩm: Tên: {ProductName}, Số lượng tồn kho: {StockQuantity}", product.ProductName, product.StockQuantity);

            var existingItem = cart.CartItems.FirstOrDefault(ci => ci.ProductID == itemDto.ProductID);

            if (existingItem != null)
            {
                _logger.LogInformation("Sản phẩm {ProductId} đã có trong giỏ hàng {CartId}. Đang cập nhật số lượng.", itemDto.ProductID, cart.CartID);
                var totalQuantity = existingItem.Quantity + itemDto.Quantity;
                if (product.StockQuantity < totalQuantity)
                {
                    _logger.LogWarning("Thêm sản phẩm thất bại: Không đủ hàng tồn kho cho ProductID: {ProductId}. Tổng yêu cầu: {TotalQuantity}, Có sẵn: {StockQuantity}", itemDto.ProductID, totalQuantity, product.StockQuantity);
                    throw new InvalidOperationException($"Không đủ hàng tồn kho cho '{product.ProductName}'. Chỉ còn {product.StockQuantity}, bạn đã có {existingItem.Quantity} trong giỏ.");
                }
                existingItem.Quantity = totalQuantity;
                existingItem.AddedAt = DateTime.UtcNow;
                _context.CartItems.Update(existingItem);
                _logger.LogInformation("Cập nhật số lượng cho CartItemID: {CartItemId} thành {Quantity}", existingItem.CartItemID, totalQuantity);
            }
            else
            {
                _logger.LogInformation("Sản phẩm {ProductId} chưa có trong giỏ hàng {CartId}. Đang thêm mục mới.", itemDto.ProductID, cart.CartID);
                if (product.StockQuantity < itemDto.Quantity)
                {
                    _logger.LogWarning("Thêm sản phẩm thất bại: Không đủ hàng tồn kho cho ProductID: {ProductId}. Yêu cầu: {Quantity}, Có sẵn: {StockQuantity}", itemDto.ProductID, itemDto.Quantity, product.StockQuantity);
                    throw new InvalidOperationException($"Không đủ hàng tồn kho cho '{product.ProductName}'. Chỉ còn {product.StockQuantity}.");
                }
                var newItem = new CartItem
                {
                    CartID = cart.CartID,
                    ProductID = itemDto.ProductID,
                    Quantity = itemDto.Quantity,
                    AddedAt = DateTime.UtcNow
                };
                _context.CartItems.Add(newItem);
                _logger.LogInformation("Đã thêm CartItem mới với ProductID: {ProductId}, Số lượng: {Quantity}", newItem.ProductID, newItem.Quantity);
            }

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Lưu thay đổi thành công sau khi thêm/cập nhật sản phẩm cho CartID: {CartId}", cart.CartID);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu thay đổi sau khi thêm/cập nhật sản phẩm cho CartID: {CartId}, UserID: {UserId}", cart.CartID, userId);
                throw;
            }

            var updatedCartEntity = await ReloadCartForDtoMapping(cart.CartID);
            if (updatedCartEntity == null)
            {
                _logger.LogError("Không thể tải lại giỏ hàng CartID: {CartId} sau khi cập nhật. Trả về dữ liệu có thể không nhất quán.", cart.CartID);
                throw new InvalidOperationException("Không thể tải lại giỏ hàng sau khi cập nhật.");
            }

            _logger.LogInformation("Thêm/cập nhật sản phẩm thành công cho CartID: {CartId}", cart.CartID);
            return _mapper.Map<CartDto>(updatedCartEntity);
        }
        /// <summary>
        /// Cập nhật số lượng của một sản phẩm trong giỏ hàng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="cartItemId">ID của mục trong giỏ hàng cần cập nhật.</param>
        /// <param name="updateDto">Thông tin số lượng mới.</param>
        /// <returns>DTO chứa thông tin giỏ hàng đã được cập nhật.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng hoặc mục giỏ hàng không tồn tại.</exception>
        /// <exception cref="UnauthorizedAccessException">Ném ra nếu người dùng cố gắng cập nhật giỏ hàng không phải của mình.</exception>
        /// <exception cref="InvalidOperationException">Ném ra nếu không đủ hàng tồn kho cho số lượng mới.</exception>
        public async Task<CartDto> UpdateCartItemAsync(int userId, int cartItemId, CartItemUpdateDto updateDto)
        {
            _logger.LogInformation("Đang cố gắng cập nhật CartItemID: {CartItemId} với Số lượng: {Quantity} cho UserID: {UserId}", cartItemId, updateDto.Quantity, userId);

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.Product)
                .FirstOrDefaultAsync(c => c.UserID == userId);

            if (cart == null)
            {
                _logger.LogWarning("Cập nhật sản phẩm thất bại: Không tìm thấy giỏ hàng cho UserID: {UserId}", userId);
                throw new KeyNotFoundException("Không tìm thấy giỏ hàng cho người dùng này.");
            }

            var cartItem = cart.CartItems.FirstOrDefault(ci => ci.CartItemID == cartItemId);
            if (cartItem == null)
            {
                _logger.LogWarning("Cập nhật sản phẩm thất bại: CartItemID: {CartItemId} không tồn tại trong CartID: {CartId} cho UserID: {UserId}", cartItemId, cart.CartID, userId);
                throw new KeyNotFoundException($"Không tìm thấy mục giỏ hàng với ID {cartItemId} trong giỏ hàng của bạn.");
            }

            if (cartItem.Product == null)
            {
                _logger.LogError("Cập nhật sản phẩm thất bại: Dữ liệu sản phẩm là null cho CartItemID: {CartItemId}. Dữ liệu không nhất quán?", cartItemId);
                await _context.Entry(cartItem).Reference(ci => ci.Product).LoadAsync();
                if (cartItem.Product == null)
                    throw new KeyNotFoundException($"Không tìm thấy thông tin sản phẩm liên quan đến mục giỏ hàng ID {cartItemId}.");
                else
                    _logger.LogInformation("Tải lại dữ liệu sản phẩm thành công cho CartItemID: {CartItemId}", cartItemId);
            }

            _logger.LogDebug("Tìm thấy CartItem: CartItemID: {CartItemId}, ProductID: {ProductId}, Số lượng hiện tại: {CurrentQuantity}, Tồn kho sản phẩm: {StockQuantity}", cartItem.CartItemID, cartItem.ProductID, cartItem.Quantity, cartItem.Product.StockQuantity);

            if (updateDto.Quantity <= 0)
            {
                _logger.LogInformation("Số lượng cập nhật là 0 hoặc nhỏ hơn ({Quantity}) cho CartItemID: {CartItemId}. Đang xóa sản phẩm thay thế.", updateDto.Quantity, cartItemId);
                return await RemoveCartItemAsync(userId, cartItemId);
            }

            if (cartItem.Product.StockQuantity < updateDto.Quantity)
            {
                _logger.LogWarning("Cập nhật sản phẩm thất bại: Không đủ hàng tồn kho cho ProductID: {ProductId}. Yêu cầu: {Quantity}, Có sẵn: {StockQuantity}", cartItem.ProductID, updateDto.Quantity, cartItem.Product.StockQuantity);
                throw new InvalidOperationException($"Không đủ hàng tồn kho cho '{cartItem.Product.ProductName}'. Chỉ còn {cartItem.Product.StockQuantity}.");
            }

            cartItem.Quantity = updateDto.Quantity;
            _context.CartItems.Update(cartItem);
            _logger.LogInformation("Cập nhật số lượng cho CartItemID: {CartItemId} thành {Quantity}", cartItem.CartItemID, updateDto.Quantity);

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Lưu thay đổi thành công sau khi cập nhật CartItemID: {CartItemId} cho CartID: {CartId}", cartItemId, cart.CartID);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu thay đổi sau khi cập nhật CartItemID: {CartItemId} cho CartID: {CartId}, UserID: {UserId}", cartItemId, cart.CartID, userId);
                throw;
            }

            var updatedCartEntity = await ReloadCartForDtoMapping(cart.CartID);
            if (updatedCartEntity == null)
            {
                _logger.LogError("Không thể tải lại giỏ hàng CartID: {CartId} sau khi cập nhật. Trả về dữ liệu có thể không nhất quán.", cart.CartID);
                throw new InvalidOperationException("Không thể tải lại giỏ hàng sau khi cập nhật.");
            }

            _logger.LogInformation("Cập nhật CartItemID: {CartItemId} thành công cho CartID: {CartId}", cartItemId, cart.CartID);
            return _mapper.Map<CartDto>(updatedCartEntity);
        }
        /// <summary>
        /// Xóa một sản phẩm khỏi giỏ hàng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="cartItemId">ID của mục trong giỏ hàng cần xóa.</param>
        /// <returns>DTO chứa thông tin giỏ hàng đã được cập nhật.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng hoặc mục giỏ hàng không tồn tại.</exception>
        /// <exception cref="UnauthorizedAccessException">Ném ra nếu người dùng cố gắng xóa mục từ giỏ hàng không phải của mình.</exception>
        public async Task<CartDto> RemoveCartItemAsync(int userId, int cartItemId)
        {
            _logger.LogInformation("Đang cố gắng xóa CartItemID: {CartItemId} cho UserID: {UserId}", cartItemId, userId);

            var cart = await _context.Carts
               .Include(c => c.CartItems)
               .FirstOrDefaultAsync(c => c.UserID == userId);

            if (cart == null)
            {
                _logger.LogWarning("Xóa sản phẩm thất bại: Không tìm thấy giỏ hàng cho UserID: {UserId} khi cố gắng xóa CartItemID: {CartItemId}", userId, cartItemId);
                throw new KeyNotFoundException($"Không tìm thấy giỏ hàng hoặc mục giỏ hàng với ID {cartItemId}.");
            }

            var cartItem = cart.CartItems.FirstOrDefault(ci => ci.CartItemID == cartItemId);
            if (cartItem == null)
            {
                _logger.LogWarning("Xóa sản phẩm thất bại: CartItemID: {CartItemId} không tồn tại trong CartID: {CartId} cho UserID: {UserId}", cartItemId, cart.CartID, userId);
                throw new KeyNotFoundException($"Không tìm thấy mục giỏ hàng với ID {cartItemId} trong giỏ hàng của bạn.");
            }

            _logger.LogDebug("Tìm thấy CartItem để xóa: CartItemID: {CartItemId}, ProductID: {ProductId}", cartItem.CartItemID, cartItem.ProductID);

            _context.CartItems.Remove(cartItem);

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Xóa CartItemID: {CartItemId} thành công và lưu thay đổi cho CartID: {CartId}", cartItemId, cart.CartID);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Lỗi đồng bộ khi xóa CartItemID: {CartItemId} cho CartID: {CartId}. Mục có thể đã bị xóa trước đó.", cartItemId, cart.CartID);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Lỗi khi lưu thay đổi sau khi xóa CartItemID: {CartItemId} cho CartID: {CartId}, UserID: {UserId}", cartItemId, cart.CartID, userId);
                throw;
            }

            var updatedCartEntity = await ReloadCartForDtoMapping(cart.CartID);
            if (updatedCartEntity == null)
            {
                _logger.LogWarning("Không tìm thấy CartID: {CartId} sau khi xóa CartItemID: {CartItemId}. Trả về DTO giỏ hàng rỗng.", cart.CartID, cartItemId);
                return new CartDto { CartID = cart.CartID, CartItems = new List<CartItemDto>(), TotalPrice = 0 };
            }

            _logger.LogInformation("Xóa CartItemID: {CartItemId} thành công và trả về giỏ hàng đã cập nhật CartID: {CartId}", cartItemId, cart.CartID);
            return _mapper.Map<CartDto>(updatedCartEntity);
        }
        /// <summary>
        /// Xóa tất cả sản phẩm khỏi giỏ hàng của người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <returns>Task biểu thị hoạt động đã hoàn thành.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng không tồn tại.</exception>
        public async Task ClearCartAsync(int userId)
        {
            _logger.LogInformation("Đang cố gắng xóa toàn bộ giỏ hàng cho UserID: {UserId}", userId);

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.UserID == userId);

            if (cart == null)
            {
                _logger.LogInformation("Không tìm thấy giỏ hàng cho UserID: {UserId}. Không có gì để xóa.", userId);
                return;
            }

            _logger.LogInformation("Tìm thấy giỏ hàng CartID: {CartId} cho UserID: {UserId}. Số lượng mục để xóa: {ItemCount}", cart.CartID, userId, cart.CartItems.Count);

            if (cart.CartItems.Any())
            {
                _context.CartItems.RemoveRange(cart.CartItems);
                try
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Xóa toàn bộ mục khỏi CartID: {CartId} thành công và lưu thay đổi.", cart.CartID);
                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Lỗi khi lưu thay đổi sau khi xóa toàn bộ mục cho CartID: {CartId}, UserID: {UserId}", cart.CartID, userId);
                    throw;
                }
            }
            else
            {
                _logger.LogInformation("Giỏ hàng CartID: {CartId} cho UserID: {UserId} đã rỗng.", cart.CartID, userId);
            }
        }
    }
}