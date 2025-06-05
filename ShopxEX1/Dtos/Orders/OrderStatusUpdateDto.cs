using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Orders
{
    // Input: Seller/Admin cập nhật trạng thái đơn hàng
    public class OrderStatusUpdateDto
    {
        [Required] public string NewStatus { get; set; } = string.Empty;
        // public string? TrackingNumber { get; set; } // Có thể thêm
    }
}
