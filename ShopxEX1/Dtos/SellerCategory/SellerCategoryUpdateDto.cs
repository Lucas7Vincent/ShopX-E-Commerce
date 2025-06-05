using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.SellerCategory
{
    /// <summary>
    /// DTO chứa thông tin cần thiết để cập nhật một danh mục của người bán.
    /// Công dụng: Nhận dữ liệu khi người bán sửa thông tin danh mục.
    /// </summary>
    public class SellerCategoryUpdateDto
    {
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        [StringLength(100)]
        public string CategoryName { get; set; } = string.Empty;
        [StringLength(500)]
        public string? Description { get; set; }
        public bool? IsActive { get; set; }
    }
}
