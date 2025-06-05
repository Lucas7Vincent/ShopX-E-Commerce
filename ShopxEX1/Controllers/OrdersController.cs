using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Orders;
using ShopxEX1.Helpers;
using ShopxEX1.Services;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Data.SqlClient;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly GetID _getID; // Helper để lấy UserID/SellerID từ token
        private readonly ILogger<OrdersController> _logger;

        public OrdersController(IOrderService orderService, GetID getID, ILogger<OrdersController> logger)
        {
            _orderService = orderService;
            _getID = getID;
            _logger = logger;
        }

        /// <summary>
        /// Tạo một đơn hàng mới từ giỏ hàng của người dùng hiện tại.
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] OrderCreateDto createDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var userId = _getID.GetCurrentUserId();

                // Kiểm tra trạng thái của các shop trước khi tạo đơn hàng
                if (createDto.SelectedCartItemIds?.Any() == true)
                {
                    try
                    {
                        // Thử cách tiếp cận khác - lấy dữ liệu từ database theo cách an toàn hơn
                        // Thay vì gọi service, sử dụng ADO.NET trực tiếp (hoặc Dapper) để kiểm soát hoàn toàn SQL
                        using (var scope = HttpContext.RequestServices.CreateScope())
                        {
                            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            var connectionString = dbContext.Database.GetConnectionString();

                            var inactiveShops = new List<object>();
                            using (var connection = new SqlConnection(connectionString))
                            {
                                await connection.OpenAsync();

                                // Bước 1: Lấy product IDs từ cart items
                                var productIdsSql = @"
                            SELECT DISTINCT p.ProductID 
                            FROM Products p
                            JOIN CartItems ci ON p.ProductID = ci.ProductID
                            WHERE ci.CartItemID IN (SELECT value FROM STRING_SPLIT(@cartItemIds, ','))";

                                var cartItemIdsParam = string.Join(",", createDto.SelectedCartItemIds);
                                using (var command1 = new SqlCommand(productIdsSql, connection))
                                {
                                    command1.Parameters.Add(new SqlParameter("@cartItemIds", cartItemIdsParam));
                                    using (var reader1 = await command1.ExecuteReaderAsync())
                                    {
                                        var productIds = new List<int>();
                                        while (await reader1.ReadAsync())
                                        {
                                            productIds.Add(reader1.GetInt32(0));
                                        }

                                        // Đóng reader1 để có thể sử dụng connection cho câu lệnh tiếp theo
                                        reader1.Close();

                                        if (productIds.Any())
                                        {
                                            // Bước 2: Lấy seller IDs từ products
                                            var sellerIdsSql = @"
                                        SELECT DISTINCT SellerID
                                        FROM Products
                                        WHERE ProductID IN (SELECT value FROM STRING_SPLIT(@productIds, ','))";

                                            var productIdsParam = string.Join(",", productIds);
                                            using (var command2 = new SqlCommand(sellerIdsSql, connection))
                                            {
                                                command2.Parameters.Add(new SqlParameter("@productIds", productIdsParam));
                                                using (var reader2 = await command2.ExecuteReaderAsync())
                                                {
                                                    var sellerIds = new List<int>();
                                                    while (await reader2.ReadAsync())
                                                    {
                                                        sellerIds.Add(reader2.GetInt32(0));
                                                    }

                                                    reader2.Close();

                                                    if (sellerIds.Any())
                                                    {
                                                        // Bước 3: Lấy các inactive sellers
                                                        var inactiveSellersSql = @"
                                                    SELECT SellerID, ShopName
                                                    FROM Sellers
                                                    WHERE SellerID IN (SELECT value FROM STRING_SPLIT(@sellerIds, ','))
                                                    AND IsActive = 0";

                                                        var sellerIdsParam = string.Join(",", sellerIds);
                                                        using (var command3 = new SqlCommand(inactiveSellersSql, connection))
                                                        {
                                                            command3.Parameters.Add(new SqlParameter("@sellerIds", sellerIdsParam));
                                                            using (var reader3 = await command3.ExecuteReaderAsync())
                                                            {
                                                                while (await reader3.ReadAsync())
                                                                {
                                                                    inactiveShops.Add(new
                                                                    {
                                                                        SellerID = reader3.GetInt32(0),
                                                                        ShopName = reader3.GetString(1)
                                                                    });
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (inactiveShops.Any())
                            {
                                return BadRequest(new
                                {
                                    success = false,
                                    message = "Không thể đặt hàng vì một số shop đang trong chế độ bảo trì",
                                    shops = inactiveShops
                                });
                            }
                        }
                    }
                    catch (InvalidOperationException ex)
                    {
                        _logger.LogError(ex, "Lỗi khi tạo đơn hàng: Dữ liệu không hợp lệ.");
                        return BadRequest(new { message = ex.Message });
                    }
                    catch (SqlException sqlEx)
                    {
                        _logger.LogError(sqlEx, "Lỗi SQL khi kiểm tra trạng thái shop: {Message}", sqlEx.Message);
                        // Trong trường hợp khẩn cấp, bỏ qua bước kiểm tra shop bảo trì và tiếp tục tạo đơn hàng
                        // Không return error mà chỉ log lỗi
                    }
                }

                // Tiếp tục logic tạo đơn hàng hiện có
                var createdOrders = await _orderService.CreateOrderFromCartAsync(userId, createDto);

                if (createdOrders.Any())
                {
                    return Ok(createdOrders);
                }
                else
                {
                    return BadRequest("Không thể tạo đơn hàng từ giỏ hàng hiện tại.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi tạo đơn hàng.");
                return StatusCode(500, "Đã xảy ra lỗi khi xử lý yêu cầu của bạn.");
            }
        }

        /// <summary>
        /// [Customer] Lấy lịch sử đơn hàng của người dùng hiện tại.
        /// </summary>
        [HttpGet("my-orders")]
        public async Task<ActionResult<PagedResult<OrderDto>>> GetMyOrders( // Thay đổi ở đây
            [FromQuery] OrderFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10) // Giữ pageSize là int nếu API Customer không cần linh hoạt như Admin
        {
            // Đảm bảo pageSize hợp lệ cho Customer
            const int MaxCustomerPageSize = 20; // Ví dụ
            const int DefaultCustomerPageSize = 1;
            if (pageSize < 1 || pageSize > MaxCustomerPageSize) pageSize = DefaultCustomerPageSize;


            try
            {
                var userId = _getID.GetCurrentUserId();
                // Gọi hàm service đã được cập nhật
                var orders = await _orderService.GetOrdersByUserIdAsync(userId, filter, pageNumber, pageSize);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đơn hàng của tôi.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }

        /// <summary>
        /// [Admin] Lấy tất cả đơn hàng trong hệ thống.
        /// </summary>
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<PagedResult<OrderSummaryDto>>> GetAllOrders(
            [FromQuery] OrderFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] String pageSizeInput = "10")
        {
            const int MaxPageSize = 100;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize))
            {
                pageSize = MaxPageSize; // Đặt về mặc định
            }

            // Đảm bảo pageNumber và pageSize hợp lệ
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

            try
            {
                var orders = await _orderService.GetAllOrdersAsync(filter, pageNumber, pageSize);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy tất cả đơn hàng (Admin).");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }


        /// <summary>
        /// [Seller] Lấy các đơn hàng liên quan đến người bán hiện tại.
        /// </summary>
        [HttpGet("seller-orders")]
        [Authorize(Roles = "Seller")]
        public async Task<ActionResult<PagedResult<OrderSummaryDto>>> GetSellerOrders(
            [FromQuery] OrderFilterDto filter,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var sellerId = _getID.GetSellerId(); // Giả sử GetSellerId() trả về int? và đã được implement
                if (!sellerId.HasValue)
                {
                    _logger.LogWarning("Yêu cầu GetSellerOrders nhưng không tìm thấy SellerId từ token.");
                    return Unauthorized("Không thể xác định thông tin người bán.");
                }
                var orders = await _orderService.GetOrdersBySellerIdAsync(sellerId.Value, filter, pageNumber, pageSize);
                return Ok(orders);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy đơn hàng của người bán.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }


        /// <summary>
        /// Lấy chi tiết một đơn hàng theo ID.
        /// Customer chỉ xem được đơn của mình. Seller xem được đơn có sản phẩm của mình. Admin xem được tất cả.
        /// </summary>
        [HttpGet("{orderId}")]
        public async Task<ActionResult<OrderDto>> GetOrderById(int orderId)
        {
            try
            {
                var userId = _getID.GetCurrentUserId();
                var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "Customer"; // Lấy vai trò, mặc định là Customer nếu không có

                var order = await _orderService.GetOrderDetailsByIdAsync(orderId, userId, userRole);
                if (order == null)
                {
                    return NotFound($"Không tìm thấy đơn hàng với ID {orderId} hoặc bạn không có quyền xem.");
                }
                return Ok(order);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết đơn hàng ID {OrderId}.", orderId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }

        /// <summary>
        /// [Seller, Admin] Cập nhật trạng thái của một đơn hàng.
        /// </summary>
        [HttpPut("{orderId}/status")]
        [Authorize(Roles = "Seller,Admin")]
        public async Task<IActionResult> UpdateOrderStatus(int orderId, [FromBody] OrderStatusUpdateDto statusUpdateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var requestingUserId = _getID.GetCurrentUserId(); // Nếu là Admin, ID này có thể không quan trọng bằng role
                                                                  // Nếu là Seller, GetID nên có cách lấy SellerID từ UserID
                var userRole = User.FindFirstValue(ClaimTypes.Role) ?? "";

                // Nếu là Seller, cần lấy SellerID từ UserID. Giả sử GetSellerId() làm việc đó.
                int idForService = userRole == "Seller" ? (_getID.GetSellerId() ?? 0) : requestingUserId;

                if (userRole == "Seller" && idForService == 0)
                {
                    return Unauthorized("Không thể xác định thông tin người bán hợp lệ.");
                }


                var success = await _orderService.UpdateOrderStatusAsync(orderId, statusUpdateDto, idForService, userRole);
                if (success)
                {
                    var message = GetSuccessMessageForStatusChange(statusUpdateDto.NewStatus);
                    return Ok(new
                    {
                        success = true,
                        message = message,
                        orderId = orderId,
                        newStatus = statusUpdateDto.NewStatus,
                        timestamp = DateTime.UtcNow
                    });
                }
                // Trường hợp service trả về false (ví dụ: trạng thái không đổi) nhưng không ném exception
                return BadRequest("Không thể cập nhật trạng thái đơn hàng hoặc trạng thái không thay đổi.");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Không tìm thấy OrderID {OrderId}.", orderId);
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Không có quyền cho OrderID {OrderId}.", orderId);
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Thao tác không hợp lệ cho OrderID {OrderId}.", orderId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi cập nhật trạng thái đơn hàng OrderID {OrderId}.", orderId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }
        /// <summary>
        /// [Seller, Admin] Cập nhật trạng thái của một đơn hàng.
        /// </summary>
        [HttpPut("{orderId}/customer-status")]
        [Authorize]
        public async Task<IActionResult> UpdateOrderStatusForCustomer(int orderId, [FromBody] OrderStatusUpdateDto statusUpdateDto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }
            try
            {
                var requestingUserId = _getID.GetCurrentUserId();


                var success = await _orderService.UpdateOrderStatusForCustomerAsync(orderId, statusUpdateDto, requestingUserId);
                if (success)
                {
                    return Ok(new
                    {
                        message = "Yêu cầu hoàn tiền đã được gửi thành công",
                        orderId = orderId,
                        newStatus = statusUpdateDto.NewStatus,
                        note = "Shop sẽ xem xét và phản hồi trong thời gian sớm nhất"
                    });
                }
                // Trường hợp service trả về false (ví dụ: trạng thái không đổi) nhưng không ném exception
                return BadRequest("Không thể cập nhật trạng thái đơn hàng hoặc trạng thái không thay đổi.");
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Không tìm thấy OrderID {OrderId}.", orderId);
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Không có quyền cho OrderID {OrderId}.", orderId);
                return Forbid(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Lỗi cập nhật trạng thái đơn hàng: Thao tác không hợp lệ cho OrderID {OrderId}.", orderId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi cập nhật trạng thái đơn hàng OrderID {OrderId}.", orderId);
                return StatusCode(StatusCodes.Status500InternalServerError, "Lỗi xử lý yêu cầu.");
            }
        }
        private string GetSuccessMessageForStatusChange(string newStatus)
        {
            return newStatus switch
            {
                "Đang xử lý" => "Đơn hàng đã được xác nhận và đang được xử lý",
                "Đang giao" => "Đơn hàng đang được giao đến khách hàng",
                "Đã giao" => "Đơn hàng đã được giao thành công. Sẽ tự động hoàn thành sau 3 ngày.",
                "Đã hoàn tiền" => "Đã xác nhận hoàn tiền cho khách hàng",
                "Hoàn thành" => "Đã từ chối yêu cầu hoàn tiền. Đơn hàng hoàn thành.",
                "Đã hủy" => "Đơn hàng đã được hủy và hoàn trả số lượng sản phẩm",
                _ => "Cập nhật trạng thái thành công"
            };
        }



        /// <summary>
        /// [Customer] Kiểm tra khả năng mua lại đơn hàng - CHO PHÉP TẤT CẢ TRẠNG THÁI
        /// </summary>
        [HttpPost("{orderId}/rebuy")]
        [Authorize(Roles = "Customer, Seller, Admin")]
        public async Task<IActionResult> RebuyOrder(int orderId)
        {
            try
            {
                var userId = _getID.GetCurrentUserId();

                _logger.LogInformation($"🔄 Processing rebuy request for order {orderId} by user {userId}");

                // ✅ BASIC ORDER OWNERSHIP VALIDATION ONLY
                var originalOrder = await _orderService.GetOrderDetailsByIdAsync(orderId, userId, "Customer");
                if (originalOrder == null)
                {
                    _logger.LogWarning($"User {userId} attempted to rebuy non-existent or unauthorized order {orderId}");
                    return NotFound(new { message = "Không tìm thấy đơn hàng hoặc bạn không có quyền truy cập" });
                }

                // ✅ NO STATUS RESTRICTIONS - Allow all statuses
                _logger.LogInformation($"📋 [REBUY] Order {orderId} has status '{originalOrder.Status}' - allowing rebuy for all statuses");

                // ✅ PROCESS REBUY VALIDATION
                var rebuyResult = await _orderService.ValidateRebuyOrderAsync(orderId, userId);

                if (rebuyResult == null)
                {
                    return BadRequest(new { message = "Không thể xử lý yêu cầu mua lại đơn hàng" });
                }

                _logger.LogInformation($"✅ Rebuy validation completed for order {orderId}. Available items: {rebuyResult.AvailableItems?.Count ?? 0}, Unavailable: {rebuyResult.UnavailableItems?.Count ?? 0}");

                return Ok(new
                {
                    success = true,
                    orderId = orderId,
                    orderStatus = originalOrder.Status,
                    rebuyItems = rebuyResult.AvailableItems,
                    unavailableItems = rebuyResult.UnavailableItems,
                    message = rebuyResult.AvailableItems?.Count > 0
                        ? $"Có {rebuyResult.AvailableItems.Count} sản phẩm có thể mua lại từ đơn hàng #{orderId} (trạng thái: {originalOrder.Status})"
                        : $"Không có sản phẩm nào có thể mua lại từ đơn hàng #{orderId} (trạng thái: {originalOrder.Status})"
                });
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, $"Order {orderId} not found for rebuy request");
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning(ex, $"Unauthorized rebuy attempt for order {orderId}");
                return Forbid(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Unexpected error processing rebuy for order {orderId}");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Lỗi hệ thống khi xử lý yêu cầu mua lại đơn hàng" });
            }
        }

        /// <summary>
        /// [Customer] Thêm các sản phẩm từ đơn hàng cũ vào giỏ hàng
        /// </summary>
        [HttpPost("{orderId}/add-to-cart")]
        [Authorize(Roles = "Customer, Seller, Admin")]
        public async Task<IActionResult> AddRebuyItemsToCart(int orderId, [FromBody] List<RebuyItemRequest> items)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (items == null || !items.Any())
            {
                return BadRequest(new { message = "Danh sách sản phẩm không được để trống" });
            }

            try
            {
                var userId = _getID.GetCurrentUserId();

                _logger.LogInformation($"🛒 Adding {items.Count} rebuy items to cart for user {userId} from order {orderId}");

                // ✅ VALIDATE ORDER OWNERSHIP
                var originalOrder = await _orderService.GetOrderDetailsByIdAsync(orderId, userId, "Customer");
                if (originalOrder == null)
                {
                    return NotFound(new { message = "Không tìm thấy đơn hàng" });
                }

                // ✅ VALIDATE ITEMS BELONG TO THIS ORDER
                var orderProductIds = originalOrder.OrderDetails?.Select(od => od.ProductID).ToList() ?? new List<int>();
                var invalidItems = items.Where(item => !orderProductIds.Contains(item.ProductId)).ToList();

                if (invalidItems.Any())
                {
                    return BadRequest(new
                    {
                        message = "Một số sản phẩm không thuộc đơn hàng này",
                        invalidProductIds = invalidItems.Select(i => i.ProductId)
                    });
                }

                // ✅ PROCESS ADD TO CART
                var result = await _orderService.AddRebuyItemsToCartAsync(orderId, items, userId);

                if (result == null)
                {
                    return BadRequest(new { message = "Không thể thêm sản phẩm vào giỏ hàng" });
                }

                _logger.LogInformation($"✅ Successfully added {result.AddedItems?.Count ?? 0} items to cart for user {userId}");

                return Ok(new
                {
                    success = true,
                    orderId = orderId,
                    orderStatus = originalOrder.Status,
                    addedItems = result.AddedItems,
                    failedItems = result.FailedItems,
                    message = result.AddedItems?.Count > 0
                        ? $"Đã thêm {result.AddedItems.Count} sản phẩm vào giỏ hàng từ đơn hàng #{orderId}"
                        : "Không có sản phẩm nào được thêm vào giỏ hàng"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Unexpected error adding rebuy items to cart for order {orderId}");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Lỗi khi thêm sản phẩm vào giỏ hàng" });
            }
        }

        /// <summary>
        /// [Customer] Mua lại toàn bộ đơn hàng - CHO PHÉP TẤT CẢ TRẠNG THÁI
        /// </summary>
        [HttpPost("{orderId}/rebuy-all")]
        [Authorize(Roles = "Customer, Seller, Admin")]
        public async Task<IActionResult> RebuyAllItems(int orderId)
        {
            try
            {
                var userId = _getID.GetCurrentUserId();

                _logger.LogInformation($"🚀 Processing rebuy-all request for order {orderId} by user {userId}");

                // ✅ VALIDATE ORDER
                var originalOrder = await _orderService.GetOrderDetailsByIdAsync(orderId, userId, "Customer");
                if (originalOrder == null)
                {
                    return NotFound(new { message = "Không tìm thấy đơn hàng" });
                }

                // ✅ GET REBUY VALIDATION
                var rebuyResult = await _orderService.ValidateRebuyOrderAsync(orderId, userId);
                if (rebuyResult?.AvailableItems == null || !rebuyResult.AvailableItems.Any())
                {
                    return BadRequest(new
                    {
                        message = "Không có sản phẩm nào có thể mua lại",
                        unavailableItems = rebuyResult?.UnavailableItems,
                        orderStatus = originalOrder.Status
                    });
                }

                // ✅ CONVERT TO REBUY ITEMS
                var rebuyItems = rebuyResult.AvailableItems.Select(item => new RebuyItemRequest
                {
                    ProductId = item.ProductID,
                    Quantity = item.OriginalQuantity
                }).ToList();

                // ✅ ADD ALL AVAILABLE ITEMS TO CART
                var result = await _orderService.AddRebuyItemsToCartAsync(orderId, rebuyItems, userId);

                _logger.LogInformation($"✅ Rebuy-all completed for order {orderId}. Added: {result?.AddedItems?.Count ?? 0}, Failed: {result?.FailedItems?.Count ?? 0}");

                return Ok(new
                {
                    success = true,
                    orderId = orderId,
                    orderStatus = originalOrder.Status,
                    totalRequested = rebuyItems.Count,
                    addedItems = result?.AddedItems,
                    failedItems = result?.FailedItems,
                    unavailableItems = rebuyResult.UnavailableItems,
                    message = $"Đã xử lý {rebuyItems.Count} sản phẩm từ đơn hàng #{orderId} (trạng thái: {originalOrder.Status}). Thêm thành công: {result?.AddedItems?.Count ?? 0}"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Unexpected error in rebuy-all for order {orderId}");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Lỗi khi xử lý mua lại toàn bộ đơn hàng" });
            }
        }


    }
}
