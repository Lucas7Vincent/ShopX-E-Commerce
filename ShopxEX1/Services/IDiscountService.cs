using ShopxEX1.Dtos.Discounts;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services
{
    public interface IDiscountService
    {
        /// <summary>
        /// Tạo một mã giảm giá mới.
        /// </summary>
        /// <param name="createDto">Chứa thông tin thêm mã giảm giá</param>
        /// <returns>Chứa danh mục vừa được tạo</returns>
        Task<DiscountDto?> CreateDiscountAsync(DiscountCreateDto createDto);

        /// <summary>
        /// Lấy tất cả mã giảm giá với tùy chọn lọc và phân trang.
        /// </summary>
        /// <param name="filter">Đối tượng chứa các tiêu chí lọc</param>
        /// <param name="pageNumber">Số trang hiện tại</param>
        /// <param name="pageSize">Số luognjw mục trên mỗi trang</param>
        /// <returns>Kết quả phân trang chứa danh sách Discount</returns>
        Task<PagedResult<DiscountDto>> GetAllDiscountsAsync(DiscountFilterDto filter, int pageNumber, int pageSize);
        /// <summary>
        /// Lấy tất cả mã giảm giá với tùy chọn lọc và phân trang (Chỉ lấy những mã đang hoạt động).
        /// </summary>
        /// <param name="filter">Đối tượng chứa các tiêu chí lọc</param>
        /// <param name="pageNumber">Số trang hiện tại</param>
        /// <param name="pageSize">Số luognjw mục trên mỗi trang</param>
        /// <returns>Kết quả phân trang chứa danh sách Discount</returns>
        Task<List<DiscountDto>> GetAllDiscountsCustomerPageAsync();

        /// <summary>
        /// Lấy chi tiết mã giảm giá bằng ID.
        /// </summary>
        /// <param name="discountId">ID Discount</param>
        /// <returns>Discount được tìm thấy, ngược lại trả về null</returns>
        Task<DiscountDto?> GetDiscountByIdAsync(int discountId);

        /// <summary>
        /// Lấy chi tiết mã giảm giá bằng Code.
        /// Có thể kiểm tra tính hợp lệ hiện tại của mã.
        /// </summary>
        Task<DiscountDto?> GetDiscountByCodeAsync(string discountCode, bool checkCurrentValidity = false);

        /// <summary>
        /// Cập nhật thông tin mã giảm giá.
        /// </summary>
        Task<DiscountDto?> UpdateDiscountAsync(int discountId, DiscountUpdateDto updateDto);

        /// <summary>
        /// Kích hoạt hoặc vô hiệu hóa mã giảm giá.
        /// </summary>
        Task<bool> ToggleDiscountStatusAsync(int discountId, bool isActive);

        /// <summary>
        /// Xóa vĩnh viễn một mã giảm giá (cẩn thận khi sử dụng).
        /// </summary>
        Task<bool> DeleteDiscountAsync(int discountId);

        /// <summary>
        /// Kiểm tra xem một mã giảm giá có hợp lệ để áp dụng không (dành cho User/Cart).
        /// </summary>
        Task<DiscountValidationResultDto> ValidateDiscountForCheckoutAsync(string discountCode);
    }
}
