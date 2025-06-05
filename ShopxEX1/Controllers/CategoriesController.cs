using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ShopxEX1.Dtos.Categories;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using ShopxEX1.Services;

namespace ShopxEX1.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _categoryService;
        private readonly ILogger<CategoriesController> _logger;

        public CategoriesController(ICategoryService categoryService, ILogger<CategoriesController> logger)
        {
            _categoryService = categoryService;
            _logger = logger;
        }
        /// <summary>
        /// Lấy danh sách danh mục có phân trang và lọc.
        /// </summary>
        /// <param name="filter">Tiêu chí lọc danh mục.</param>
        /// <param name="pageNumber">Số trang (mặc định 1).</param>
        /// <param name="pageSize">Số lượng mục trên trang (mặc định 10).</param>
        /// <returns>Danh sách danh mục tóm tắt có phân trang.</returns>
        [HttpGet]
        public async Task<ActionResult<PagedResult<CategoryDto>>> GetCategories([FromQuery] CategoryFilterDto filter, [FromQuery] int pageNumber = 1, [FromQuery] string pageSizeInput = "10")
        {
            const int MaxPageSize = 100;
            int pageSize;

            if (!int.TryParse(pageSizeInput, out pageSize))
            {
                pageSize = MaxPageSize; // Đặt về mặc định
            }

            // Đảm bảo pageNumber và pageSize hợp lệ
            if (pageNumber < 1) pageNumber = 1;
            if (pageSize < 1 || pageSize > MaxPageSize) pageSize = MaxPageSize;

            try
            {
                var result = await _categoryService.GetCategorysAsync(filter, pageNumber, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách danh mục.");
                return StatusCode(statusCode: 500, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu");
            }
        }
        /// <summary>
        /// Lấy tất cả danh mục
        /// </summary>
        /// <returns></returns>
        [HttpGet("all")] // Route: api/categories/all
        public async Task<ActionResult<List<CategoryDto>>> GetAllCategories()
        {
            _logger.LogInformation("Đang xử lý yêu cầu lấy tất cả danh mục.");
            try
            {
                var categories = await _categoryService.GetAllCategoriesAsync();
                _logger.LogInformation("Đã lấy thành công {Count} danh mục.", categories.Count());
                return Ok(categories);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn xảy ra khi lấy tất cả danh mục.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi máy chủ nội bộ.");
            }
        }
        /// <summary>
        /// Lấy thông tin chi tiết của 1 danh mục theo ID
        /// </summary>
        /// <param name="categoryId">ID danh mục muốn lấy</param>
        /// <returns>Chi tiết danh mục</returns>
        [HttpGet("{categoryId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<CategoryDto>> GetCategoryById(int categoryId)
        {
            try
            {
                var category = await _categoryService.GetCategoryByIdAsync(categoryId);

                if (category == null)
                {
                    return NotFound("Không tìm thấy danh mục");
                }
                return Ok(category);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy chi tiết danh mục.");
                return StatusCode(statusCode: 500, "Đã xảy ra lỗi trong quá trình xử lý yêu cầu.");
            }
        }
        /// <summary>
        /// Tạo một danh mục mới
        /// </summary>
        /// <param name="createDto">Thông tin danh mục cần tạo</param>
        /// <returns>Danh mục vừa được tạo</returns>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<CategoryDto>> CreateCategory([FromBody] CategoryCreateDto createDto)
        {
            try
            {
                var createdCategory = await _categoryService.CreateCategoryAsync(createDto);
                return CreatedAtAction(nameof(GetCategoryById), new { categoryId = createdCategory.CategoryID}, createdCategory);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi tạo danh mục.");
                return StatusCode(statusCode: 500, "Đã xảy ra lỗi trong quá trình tạo danh mục.");
            }
        }
        /// <summary>
        /// Cập nhật thông tin danh mục (Admin)
        /// </summary>
        /// <param name="categoryId">ID danh mục</param>
        /// <param name="updateDto">Thông tin cập nhật danh mục</param>
        /// <returns>Không có nội dung thành công</returns>
        [HttpPut("{categoryId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> UpdateCategory(int categoryId, [FromBody] CategoryUpdateDto updateDto)
        {
            try
            {
                bool success = await _categoryService.UpdateCategoryAsync(categoryId, updateDto);
                if (!success)
                {
                    _logger.LogWarning("Cập nhật danh mục thất bại (không tìm thấy hoặc không có quyền).");
                    return NotFound($"Không thể cập nhật danh mục. Danh mục không tồn tại hoặc bạn không có quyền.");
                }
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi tạo danh mục.");
                return StatusCode(statusCode: 500, "Đã xảy ra lỗi trong quá trình tạo danh mục.");
            }
        }
        /// <summary>
        /// Xóa danh mục
        /// </summary>
        /// <param name="categoryId">ID danh mục muốn xóa</param>
        /// <returns>true/false or error</returns>
        [HttpDelete]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<bool>> DeleteCategory(int categoryId)
        {
            if (categoryId == 1) return NotFound($"Không thể xóa danh mục. Đây là danh mục mặc định không thể xóa.");
            try
            {
                bool success = await _categoryService.DeleteCategoryAsync(categoryId);
                if (!success)
                {
                    _logger.LogWarning("Xóa danh mục thất bại.");
                    return NotFound($"Không thể xóa danh mục. Danh mục không tồn tại hoặc bạn không có quyền.");
                }
                return NoContent(); // Trả về 204 No Content khi thành công
            }
            catch (Exception ex) // Các lỗi khác
            {
                _logger.LogError(ex, "Lỗi xảy ra khi xóa danh mục.");
                return StatusCode(StatusCodes.Status500InternalServerError, "Đã xảy ra lỗi trong quá trình xóa danh mục.");
            }
        }
    }
}
