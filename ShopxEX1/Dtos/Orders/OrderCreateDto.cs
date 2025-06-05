using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Orders
{
    // Input: Tạo đơn hàng từ client (checkout)
    public class OrderCreateDto
    {
        [Required][StringLength(255)] public string ShippingAddress { get; set; } = string.Empty;

        public string? DiscountCode { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn ít nhất một sản phẩm để đặt hàng.")]
        [MinLength(1, ErrorMessage = "Vui lòng chọn ít nhất một sản phẩm để đặt hàng.")]
        public List<int> SelectedCartItemIds { get; set; } = new List<int>();
        
    }

}
