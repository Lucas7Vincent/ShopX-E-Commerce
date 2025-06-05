using ShopxEX1.Dtos.Carts;

namespace ShopxEX1.Services
{
    // Interface định nghĩa các hoạt động quản lý giỏ hàng
    public interface ICartService
    {
        /// <summary>
        /// Lấy thông tin chi tiết giỏ hàng của một người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <returns>DTO chứa thông tin giỏ hàng hoặc null nếu không tìm thấy.</returns>
        Task<CartDto?> GetCartByUserIdAsync(int userId);

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
        Task<CartDto> AddItemToCartAsync(int userId, CartItemCreateDto itemDto);

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
        Task<CartDto> UpdateCartItemAsync(int userId, int cartItemId, CartItemUpdateDto updateDto);

        /// <summary>
        /// Xóa một sản phẩm khỏi giỏ hàng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="cartItemId">ID của mục trong giỏ hàng cần xóa.</param>
        /// <returns>DTO chứa thông tin giỏ hàng đã được cập nhật.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng hoặc mục giỏ hàng không tồn tại.</exception>
        /// <exception cref="UnauthorizedAccessException">Ném ra nếu người dùng cố gắng xóa mục từ giỏ hàng không phải của mình.</exception>
        Task<CartDto> RemoveCartItemAsync(int userId, int cartItemId);

        /// <summary>
        /// Xóa tất cả sản phẩm khỏi giỏ hàng của người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <returns>Task biểu thị hoạt động đã hoàn thành.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng không tồn tại.</exception>
        Task ClearCartAsync(int userId);
    }
}
