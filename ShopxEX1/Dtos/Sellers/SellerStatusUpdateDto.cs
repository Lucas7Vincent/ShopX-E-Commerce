using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Sellers
{
    // Dữ liệu Admin gửi lên để thay đổi trạng thái Active của Seller.
    public class SellerStatusUpdateDto
    {
        [Required(ErrorMessage = "Trạng thái hoạt động là bắt buộc.")]
        public bool IsActive { get; set; }
    }
}
