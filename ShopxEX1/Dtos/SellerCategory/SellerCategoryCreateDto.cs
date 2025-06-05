using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.SellerCategory
{
    /// <summary>
    /// Input: DTO chứa thông tin cần thiết để tạo một danh mục mới cho người bán.
    /// Công dụng: Nhận dữ liệu khi người bán thêm danh mục riêng cho shop của mình.
    /// </summary>
    public class SellerCategoryCreateDto
    {
        [Required(ErrorMessage = "Seller ID is required. This should typically be derived from the authenticated user.")]
        public int SellerID { get; set; }
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        [StringLength(100)]
        public string CategoryName { get; set; } = string.Empty;
        [StringLength(500)]
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
