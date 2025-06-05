using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Sellers
{
    // Input: Seller gửi dữ liệu Seller lên để cập nhật thông tin cửa hàng
    public class SellerUpdateDto
    {
        [Required(ErrorMessage = "Tên cửa hàng không được để trống.")]
        [StringLength(100, ErrorMessage = "Tên cửa hàng không quá 100 ký tự.")]
        public string ShopName { get; set; } = string.Empty;

        public string? StoreDescription { get; set; } // Cho phép null hoặc chuỗi rỗng

        [StringLength(20, ErrorMessage = "Số điện thoại liên hệ không quá 20 ký tự.")]
        public string? ContactPhone { get; set; }

        [EmailAddress(ErrorMessage = "Email liên hệ không hợp lệ.")]
        [StringLength(100, ErrorMessage = "Email liên hệ không quá 100 ký tự.")]
        public string? ContactEmail { get; set; }

        [StringLength(100, ErrorMessage = "Giấy phép kinh doanh không quá 100 ký tự.")]
        public string? BusinessLicense { get; set; }

        // Các trường như UserID, ApprovalStatus, ApprovedAt, IsActive, CreatedAt
        // KHÔNG được phép cập nhật thông qua DTO này.
    }
}
