using ShopxEX1.Dtos.Categories;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services
{
    public interface ICategoryService
    {
        /// <summary>
        /// Lấy danh sách danh mục có phân trang và lọc.
        /// </summary>
        /// <param name="filter">Đối tượng chứa các tiêu chí lọc.</param>
        /// <param name="pageNumber">Số trang hiện tại.</param>
        /// <param name="pageSize">Số lượng mục trên mỗi trang.</param>
        /// <returns>Kết quả phân trang chứa danh sách CategoryDto.</returns>
        Task<PagedResult<CategoryDto>> GetCategorysAsync(CategoryFilterDto? filter, int pageNumber, int pageSize);
        /// <summary>
        /// Lấy tất cả các danh mục không phân trang.
        /// </summary>
        /// <returns>Danh sách tất cả CategoryDto.</returns>
        Task<List<CategoryDto>> GetAllCategoriesAsync();

        /// <summary>
        /// Lấy thông tin chi tiết của một danh mục theo ID.
        /// </summary>
        /// <param name="CategoryId">ID của danh mục.</param>
        /// <returns>CategoryDto nếu tìm thấy, ngược lại trả về null hoặc ném NotFoundException.</returns>
        Task<CategoryDto?> GetCategoryByIdAsync(int CategoryId); // Hoặc Task<CategoryDto> và ném exception

        /// <summary>
        /// Tạo một danh mục mới cho một người bán cụ thể.
        /// </summary>
        /// <param name="sellerId">ID của người bán tạo danh mục.</param>
        /// <param name="createDto">DTO chứa thông tin danh mục cần tạo.</param>
        /// <returns>CategoryDto của danh mục vừa được tạo.</returns>
        Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto createDto);

        /// <summary>
        /// Cập nhật thông tin của một danh mục hiện có.
        /// </summary>
        /// <param name="CategoryId">ID của danh mục cần cập nhật.</param>
        /// <param name="sellerId">ID của người bán (để kiểm tra quyền sở hữu).</param>
        /// <param name="updateDto">DTO chứa thông tin cập nhật.</param>
        /// <returns>True nếu cập nhật thành công, False nếu không tìm thấy hoặc không có quyền.</returns>
        Task<bool> UpdateCategoryAsync(int CategoryId, CategoryUpdateDto updateDto); // Dùng void và ném exception

        /// <summary>
        /// Xóa (hoặc đánh dấu là không hoạt động) một danh mục.
        /// </summary>
        /// <param name="CategoryId">ID của danh mục cần xóa.</param>
        /// <param name="sellerId">ID của người bán (để kiểm tra quyền sở hữu).</param>
        /// <returns>True nếu xóa thành công, False nếu không tìm thấy hoặc không có quyền.</returns>
        Task<bool> DeleteCategoryAsync(int CategoryId); // Dùng void và ném exception
    }
}
