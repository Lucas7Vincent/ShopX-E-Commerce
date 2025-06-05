using System.ComponentModel.DataAnnotations;
using ShopxEX1.Dtos.Users;

namespace ShopxEX1.Dtos.Orders
{
    // Output: Chi tiết đơn hàng (cho Seller xem hoặc User xem lịch sử chi tiết)
    public class OrderDto
    {
        public int OrderID { get; set; }
        public DateTime? OrderDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPayment { get; set; }
        public string Status { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string? DiscountCode { get; set; }

        public string OrderDateDisplay => Status == "Đã giao" ? "Ngày giao" : "Ngày đặt";
        public bool CanRequestRefund => Status == "Đã giao" && OrderDate.HasValue &&
            (DateTime.UtcNow - OrderDate.Value).TotalDays <= 3;
        public int DaysLeftForRefund => Status == "Đã giao" && OrderDate.HasValue ?
            Math.Max(0, 3 - (int)(DateTime.UtcNow - OrderDate.Value).TotalDays) : 0;

        // ✅ NEW: Status check properties
        public bool IsDelivered => Status == "Đã giao";
        public bool IsCompleted => Status == "Hoàn thành";
        public bool IsRefunded => Status == "Đã hoàn tiền";
        public bool IsCancelled => Status == "Đã hủy";
        public bool IsRefundRequested => Status == "Yêu cầu trả hàng/ hoàn tiền";
        public bool IsFinalStatus => IsCompleted || IsRefunded || IsCancelled;

        // ✅ NEW: Business logic helpers
        public bool CanSellerAcceptRefund => IsRefundRequested;
        public bool CanSellerRejectRefund => IsRefundRequested;
        public bool WillAutoComplete => IsDelivered && DaysLeftForRefund <= 0;
        public List<OrderDetailDto> Items { get; set; } = new List<OrderDetailDto>();
        public List<OrderDetailDto> OrderDetails => Items;

        public UserDto? CustomerInfo { get; set; }
public bool CanRebuy => Items.Any(); // Cho phép mua lại nếu có sản phẩm
    public bool IsRebuyEligible => CanRebuy;
    
    public string RebuyStatusMessage => Status switch
    {
        "Chờ xác nhận" => "Có thể mua lại",
        "Đang xử lý" => "Có thể mua lại", 
        "Đang giao" => "Có thể mua lại",
        "Đã giao" => "Có thể mua lại",
        "Đã hủy" => "Có thể mua lại",
        "Đã hoàn tiền" => "Có thể mua lại",
        "Yêu cầu trả hàng/ hoàn tiền" => "Có thể mua lại",
        "Từ chối hoàn tiền" => "Có thể mua lại",
        _ => "Có thể mua lại"
    };
    
    // ✅ Remove time restrictions
    public bool IsWithinRebuyTimeLimit => true; // Không giới hạn thời gian
    public int DaysLeftForRebuy => 999; // Không giới hạn

    }

     /// <summary>
    /// DTO cho request thêm sản phẩm rebuy vào giỏ hàng
    /// </summary>
    public class RebuyItemRequest
    {
        [Required(ErrorMessage = "ProductId là bắt buộc")]
        [Range(1, int.MaxValue, ErrorMessage = "ProductId phải lớn hơn 0")]
        public int ProductId { get; set; }
        
        [Required(ErrorMessage = "Quantity là bắt buộc")]
        [Range(1, 999, ErrorMessage = "Số lượng phải từ 1 đến 999")]
        public int Quantity { get; set; }
    }
    
    /// <summary>
    /// DTO cho sản phẩm có thể mua lại
    /// </summary>
    public class RebuyAvailableItemDto
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string ImageURL { get; set; } = string.Empty;
        public int OriginalQuantity { get; set; }
        public decimal CurrentPrice { get; set; }
        public decimal OriginalPrice { get; set; }
        public int AvailableStock { get; set; }
        public int SellerID { get; set; }
        public string SellerName { get; set; } = string.Empty;
        public bool PriceChanged => CurrentPrice != OriginalPrice;
        public decimal PriceDifference => CurrentPrice - OriginalPrice;
        public string CategoryName { get; set; } = string.Empty;
    }
    
    /// <summary>
    /// DTO cho sản phẩm không thể mua lại
    /// </summary>
    public class RebuyUnavailableItemDto
    {
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int RequestedQuantity { get; set; }
        public int AvailableQuantity { get; set; }
        public string Reason { get; set; } = string.Empty;
        public bool IsOutOfStock => AvailableQuantity == 0;
        public bool IsInsufficientStock => AvailableQuantity > 0 && AvailableQuantity < RequestedQuantity;
        public bool IsDiscontinued { get; set; }
    }
    
    /// <summary>
    /// DTO cho kết quả validation rebuy
    /// </summary>
    public class RebuyValidationResultDto
    {
        public List<RebuyAvailableItemDto> AvailableItems { get; set; } = new();
        public List<RebuyUnavailableItemDto> UnavailableItems { get; set; } = new();
        public int TotalRequestedItems { get; set; }
        public int AvailableItemsCount => AvailableItems?.Count ?? 0;
        public int UnavailableItemsCount => UnavailableItems?.Count ?? 0;
        public bool HasAvailableItems => AvailableItemsCount > 0;
        public bool AllItemsAvailable => TotalRequestedItems > 0 && UnavailableItemsCount == 0;
        public decimal EstimatedTotal => AvailableItems?.Sum(item => item.CurrentPrice * item.OriginalQuantity) ?? 0;
    }
    
    /// <summary>
    /// DTO cho kết quả thêm vào giỏ hàng
    /// </summary>
    public class AddToCartResultDto
    {
        public List<AddedCartItemDto> AddedItems { get; set; } = new();
        public List<FailedCartItemDto> FailedItems { get; set; } = new();
        public int SuccessCount => AddedItems?.Count ?? 0;
        public int FailureCount => FailedItems?.Count ?? 0;
        public bool HasFailures => FailureCount > 0;
        public string Summary => $"Thành công: {SuccessCount}, Thất bại: {FailureCount}";
    }
    
    /// <summary>
    /// DTO cho sản phẩm đã thêm thành công vào giỏ hàng
    /// </summary>
    public class AddedCartItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int QuantityAdded { get; set; }
        public int TotalQuantityInCart { get; set; }
        public decimal UnitPrice { get; set; }
        public bool WasUpdated { get; set; } // true nếu cập nhật quantity của item đã có, false nếu tạo mới
    }
    
    /// <summary>
    /// DTO cho sản phẩm không thể thêm vào giỏ hàng
    /// </summary>
    public class FailedCartItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int RequestedQuantity { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string ErrorCode { get; set; } = string.Empty; // Để frontend có thể handle differently
    }
}

