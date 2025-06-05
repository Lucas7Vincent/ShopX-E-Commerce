using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services
{
    public interface IProductService
    {
        /// <summary>
        /// Lấy danh sách sản phẩm có phân trang và lọc.
        /// </summary>
        /// <param name="filter">Đối tượng chứa các tiêu chí lọc.</param>
        /// <param name="pageNumber">Số trang hiện tại.</param>
        /// <param name="pageSize">Số lượng mục trên mỗi trang.</param>
        /// <returns>Kết quả phân trang chứa danh sách ProductSummaryDto.</returns>
        Task<PagedResult<ProductSummaryDto>> GetProductsAsync(ProductFilterDto? filter, int pageNumber, int pageSize, bool customerPage = false);

        /// <summary>
        /// Lấy danh sách sản phẩm theo seller có phân trang và lọc.
        /// </summary>
        /// <param name="userId">Đối tượng chứa các tiêu chí lọc.</param>
        /// <returns>Kết quả phân trang chứa danh sách ProductSummaryDto.</returns>
        Task<PagedResult<ProductSummaryDto>> GetProductsBySellerAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int userId);

        /// <summary>
        /// Lấy danh sách sản phẩm theo danh mục có phân trang và lọc.
        /// </summary>
        /// <param name="categoryId">Đối tượng chứa các tiêu chí lọc.</param>
        /// <returns>Kết quả phân trang chứa danh sách ProductSummaryDto.</returns>
        Task<PagedResult<ProductSummaryDto>> GetProductsByCategoryAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int categoryId);

        /// <summary>
        /// Lấy thông tin chi tiết của một sản phẩm theo ID.
        /// </summary>
        /// <param name="productId">ID của sản phẩm.</param>
        /// <returns>ProductDto nếu tìm thấy, ngược lại trả về null hoặc ném NotFoundException.</returns>
        Task<ProductDto?> GetProductByIdAsync(int productId, bool showInactive);

        /// <summary>
        /// Tạo một sản phẩm mới cho một người bán cụ thể.
        /// </summary>
        /// <param name="sellerId">ID của người bán tạo sản phẩm.</param>
        /// <param name="createDto">DTO chứa thông tin sản phẩm cần tạo.</param>
        /// <returns>ProductDto của sản phẩm vừa được tạo.</returns>
        Task<ProductDto> CreateProductAsync(int sellerId, ProductCreateDto createDto);

        /// <summary>
        /// Cập nhật thông tin của một sản phẩm hiện có.
        /// </summary>
        /// <param name="productId">ID của sản phẩm cần cập nhật.</param>
        /// <param name="sellerId">ID của người bán (để kiểm tra quyền sở hữu).</param>
        /// <param name="updateDto">DTO chứa thông tin cập nhật.</param>
        /// <returns>True nếu cập nhật thành công, False nếu không tìm thấy hoặc không có quyền.</returns>
        Task<bool> UpdateProductAsync(int productId, int sellerId, ProductUpdateDto updateDto); // Dùng void và ném exception

        /// <summary>
        /// Xóa (hoặc đánh dấu là không hoạt động) một sản phẩm.
        /// </summary>
        /// <param name="productId">ID của sản phẩm cần xóa.</param>
        /// <param name="sellerId">ID của người bán (để kiểm tra quyền sở hữu).</param>
        /// <returns>True nếu xóa thành công, False nếu không tìm thấy hoặc không có quyền.</returns>
        /// <exception cref="NotFoundException">Ném ra nếu không tìm thấy sản phẩm.</exception>
        /// <exception cref="UnauthorizedAccessException">Ném ra nếu người bán không sở hữu sản phẩm.</exception>
        Task<bool> DeleteProductAsync(int productId, int sellerId, string status = "notActive"); // Dùng void và ném exception
        /// <summary>
        /// Lấy ra những sản phẩm được đặt hàng nhiều nhất dựa trên số lượt đặt hàng
        /// </summary>
        /// <param name="count">Số lượng sản phẩm lấy ra</param>
        /// <returns>Những sản phẩm phù hợp yêu cầu</returns>
        Task<List<ProductSummaryDto>> GetBestSellingProductsAsync(int count = 5);
        /// <summary>
        /// Lấy ra những sản phẩm mới được thêm mới
        /// </summary>
        /// <param name="count">Số lượng sản phẩm lấy ra</param>
        /// <returns>Những sản phẩm phù hợp yêu cầu</returns>
        Task<List<ProductSummaryDto>> GetNewestProductsAsync(int count = 20);
    }
}
