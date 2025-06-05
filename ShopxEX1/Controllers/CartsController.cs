using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Dtos.Carts;
using ShopxEX1.Helpers;
using ShopxEX1.Services;
using System.Security.Claims;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        private readonly ILogger<CartController> _logger;
        private readonly int CurrentUserId;

        public CartController(ICartService cartService, ILogger<CartController> logger, GetID getID)
        {
            _cartService = cartService;
            _logger = logger;
            CurrentUserId = getID.GetCurrentUserId();
        }
        
        /// <summary>
        /// Lấy thông tin chi tiết giỏ hàng của một người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <returns>DTO chứa thông tin giỏ hàng hoặc null nếu không tìm thấy.</returns>
        [HttpGet]
        public async Task<ActionResult<CartDto>> GetCart()
        {
            try
            {
                var userId = CurrentUserId;
                _logger.LogInformation("Đang thử lấy giỏ hàng cho UserID: {UserId}", userId);

                var cart = await _cartService.GetCartByUserIdAsync(userId);

                if (cart == null)
                {
                    _logger.LogInformation("Không tìm thấy giỏ hàng hoạt động nào cho UserID: {UserId}. Trả về cấu trúc giỏ hàng rỗng.", userId);
                    return Ok(new CartDto { CartID = 0, CartItems = new List<CartItemDto>(), TotalPrice = 0 });
                }

                _logger.LogInformation("Đã lấy thành công giỏ hàng CartID: {CartId} cho UserID: {UserId}", cart.CartID, userId);

                return Ok(cart);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Truy cập trái phép trong GetCart.");
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // Cố gắng log UserId nếu có thể, nhưng cẩn thận vì CurrentUserId có thể đã ném lỗi
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogError(ex, "Đã xảy ra lỗi khi lấy giỏ hàng cho UserID: {UserId}", userIdForLog);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi khi lấy giỏ hàng.");
            }
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
        [HttpPost("items")]
        public async Task<ActionResult<CartDto>> AddItemToCart([FromBody] CartItemCreateDto itemDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = CurrentUserId;
                _logger.LogInformation("Đang thử thêm sản phẩm ProductID: {ProductId}, Số lượng: {Quantity} vào giỏ hàng cho UserID: {UserId}", itemDto.ProductID, itemDto.Quantity, userId);

                var updatedCart = await _cartService.AddItemToCartAsync(userId, itemDto);

                _logger.LogInformation("Đã thêm/cập nhật thành công sản phẩm vào giỏ hàng CartID: {CartId} cho UserID: {UserId}", updatedCart.CartID, userId);
                return Ok(updatedCart);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Truy cập trái phép trong AddItemToCart.");
                return Unauthorized(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogWarning("Thêm sản phẩm thất bại cho UserID: {UserId}. Lý do: {ErrorMessage}", userIdForLog, ex.Message);
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogWarning("Thêm sản phẩm thất bại cho UserID: {UserId}. Lý do: {ErrorMessage}", userIdForLog, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogError(ex, "Đã xảy ra lỗi khi thêm sản phẩm ProductID: {ProductId} cho UserID: {UserId}", itemDto.ProductID, userIdForLog);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi khi thêm sản phẩm vào giỏ hàng.");
            }
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
        [HttpPut("items/{cartItemId}")]
        public async Task<ActionResult<CartDto>> UpdateCartItem(int cartItemId, [FromBody] CartItemUpdateDto updateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = CurrentUserId;
                _logger.LogInformation("Đang thử cập nhật CartItemID: {CartItemId} thành Số lượng: {Quantity} cho UserID: {UserId}", cartItemId, updateDto.Quantity, userId);

                var updatedCart = await _cartService.UpdateCartItemAsync(userId, cartItemId, updateDto);

                _logger.LogInformation("Đã cập nhật thành công CartItemID: {CartItemId} trong giỏ hàng CartID: {CartId} cho UserID: {UserId}", cartItemId, updatedCart.CartID, userId);
                return Ok(updatedCart);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Truy cập trái phép trong UpdateCartItem.");
                return Unauthorized(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogWarning("Cập nhật sản phẩm thất bại cho UserID: {UserId}, CartItemID: {CartItemId}. Lý do: {ErrorMessage}", userIdForLog, cartItemId, ex.Message);
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogWarning("Cập nhật sản phẩm thất bại cho UserID: {UserId}, CartItemID: {CartItemId}. Lý do: {ErrorMessage}", userIdForLog, cartItemId, ex.Message);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogError(ex, "Đã xảy ra lỗi khi cập nhật CartItemID: {CartItemId} cho UserID: {UserId}", cartItemId, userIdForLog);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi khi cập nhật sản phẩm trong giỏ hàng.");
            }
        }
        /// <summary>
        /// Xóa một sản phẩm khỏi giỏ hàng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <param name="cartItemId">ID của mục trong giỏ hàng cần xóa.</param>
        /// <returns>DTO chứa thông tin giỏ hàng đã được cập nhật.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng hoặc mục giỏ hàng không tồn tại.</exception>
        /// <exception cref="UnauthorizedAccessException">Ném ra nếu người dùng cố gắng xóa mục từ giỏ hàng không phải của mình.</exception>
        [HttpDelete("items/{cartItemId}")]
        public async Task<ActionResult<CartDto>> RemoveCartItem(int cartItemId)
        {
            try
            {
                var userId = CurrentUserId;
                _logger.LogInformation("Đang thử xóa CartItemID: {CartItemId} cho UserID: {UserId}", cartItemId, userId);

                var updatedCart = await _cartService.RemoveCartItemAsync(userId, cartItemId);

                _logger.LogInformation("Đã xóa thành công CartItemID: {CartItemId} khỏi giỏ hàng CartID: {CartId} cho UserID: {UserId}", cartItemId, updatedCart.CartID, userId);
                return Ok(updatedCart);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Truy cập trái phép trong RemoveCartItem.");
                return Unauthorized(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogWarning("Xóa sản phẩm thất bại cho UserID: {UserId}, CartItemID: {CartItemId}. Lý do: {ErrorMessage}", userIdForLog, cartItemId, ex.Message);
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogError(ex, "Đã xảy ra lỗi khi xóa CartItemID: {CartItemId} cho UserID: {UserId}", cartItemId, userIdForLog);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi khi xóa sản phẩm khỏi giỏ hàng.");
            }
        }
        /// <summary>
        /// Xóa tất cả sản phẩm khỏi giỏ hàng của người dùng.
        /// </summary>
        /// <param name="userId">ID của người dùng.</param>
        /// <returns>Task biểu thị hoạt động đã hoàn thành.</returns>
        /// <exception cref="KeyNotFoundException">Ném ra nếu giỏ hàng không tồn tại.</exception>
        [HttpDelete("clear")]
        public async Task<IActionResult> ClearCart()
        {
            try
            {
                var userId = CurrentUserId;
                _logger.LogInformation("Đang thử xóa tất cả sản phẩm trong giỏ hàng cho UserID: {UserId}", userId);

                await _cartService.ClearCartAsync(userId);

                _logger.LogInformation("Đã xóa thành công giỏ hàng cho UserID: {UserId}", userId);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Truy cập trái phép trong ClearCart.");
                return Unauthorized();
            }
            catch (Exception ex)
            {
                var userIdForLog = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown";
                _logger.LogError(ex, "Đã xảy ra lỗi khi xóa giỏ hàng cho UserID: {UserId}", userIdForLog);
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi khi xóa giỏ hàng.");
            }
        }
    }
}
