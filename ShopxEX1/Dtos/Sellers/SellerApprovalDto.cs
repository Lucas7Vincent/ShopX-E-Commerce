using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Sellers
{
    // Dữ liệu Admin gửi lên để duyệt hoặc từ chối yêu cầu Seller
    public class SellerApprovalDto
    {
        [Required(ErrorMessage = "Trạng thái phê duyệt mới là bắt buộc.")]
        // Có thể thêm Enum hoặc kiểm tra giá trị cụ thể ("Approved", "Rejected", "Penđing")
        [StringLength(50)]
        public string NewStatus { get; set; } = "Pendding";

        // Lý do từ chối (tùy chọn)
        public string? RejectionReason { get; set; }
    }
}
