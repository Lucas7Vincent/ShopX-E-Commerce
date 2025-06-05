using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Categories;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using System.Linq.Expressions;

namespace ShopxEX1.Services.Implementations
{
    public class CategoryService : ICategoryService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<CategoryService> _logger; // Inject Logger

        public CategoryService(AppDbContext context, IMapper mapper, ILogger<CategoryService> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<PagedResult<CategoryDto>> GetCategorysAsync(CategoryFilterDto? filter, int pageNumber, int pageSize)
        {
            var query = _context.Categories.AsNoTracking(); // AsNoTracking vì chỉ đọc

            // 1. Lọc (Filtering) - Chỉ lọc theo SearchTerm vì filter DTO không có trường khác hợp lý
            if (filter != null && !string.IsNullOrWhiteSpace(filter.SearchTerm))
            {
                var searchTermLower = filter.SearchTerm.ToLower(); // Tìm kiếm không phân biệt hoa thường
                query = query.Where(c => c.CategoryName.ToLower().Contains(searchTermLower));
            }

            // 2. Sắp xếp (Sorting) - Giả định SortBy là tên trường CategoryName
            Expression<Func<Category, object>> orderByExpression = c => c.CategoryID; // Mặc định
            bool ascending = true;

            if (filter != null && !string.IsNullOrWhiteSpace(filter.SortBy))
            {
                switch (filter.SortBy.ToLowerInvariant())
                {
                    case "nameasc":
                        orderByExpression = c => c.CategoryName;
                        ascending = true;
                        break;
                    case "namedesc":
                        orderByExpression = c => c.CategoryName;
                        ascending = false;
                        break;
                }
            }
            query = ascending ? query.OrderBy(orderByExpression) : query.OrderByDescending(orderByExpression);

            // 3. Phân trang (Pagination)
            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();

            // 4. Map sang DTO
            var categoryDtos = _mapper.Map<IEnumerable<CategoryDto>>(items);

            // 5. Trả về kết quả
            return new PagedResult<CategoryDto>(categoryDtos, pageNumber, pageSize, totalCount);
        }

        public async Task<List<CategoryDto>> GetAllCategoriesAsync()
        {
            _logger.LogInformation("Đang lấy tất cả danh mục từ cơ sở dữ liệu.");
            try
            {
                var categories = await _context.Categories
                                             .AsNoTracking() // Hiệu suất tốt hơn vì chỉ đọc
                                             .OrderBy(c => c.CategoryName) // Sắp xếp cơ bản nếu muốn (ví dụ theo tên)
                                             .ToListAsync();

                _logger.LogInformation("Đã lấy thành công {Count} danh mục.", categories.Count);

                // Map sang DTO
                var categoryDtos = _mapper.Map<List<CategoryDto>>(categories);
                return categoryDtos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy tất cả danh mục.");
                throw; // Ném lại lỗi để controller xử lý
            }
        }
        public async Task<CategoryDto?> GetCategoryByIdAsync(int categoryId)
        {
            var category = await _context.Categories
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(c => c.CategoryID == categoryId);

            if (category == null)
            {
                _logger.LogWarning("Không tìm thấy danh mục với ID: {CategoryId}", categoryId);
                return null;
            }

            return _mapper.Map<CategoryDto>(category);
        }

        public async Task<CategoryDto> CreateCategoryAsync(CategoryCreateDto createDto)
        {
            // Kiểm tra tên danh mục đã tồn tại chưa (không phân biệt hoa thường)
            var existingCategory = await _context.Categories
                                        .FirstOrDefaultAsync(c => c.CategoryName.ToLower() == createDto.CategoryName.ToLower());

            if (existingCategory != null)
            {
                _logger.LogWarning("Cố gắng tạo danh mục đã tồn tại: {CategoryName}", createDto.CategoryName);
                throw new ArgumentException($"Tên danh mục '{createDto.CategoryName}' đã tồn tại.");
            }

            var category = _mapper.Map<Category>(createDto);
            // Có thể gán giá trị mặc định khác nếu cần ở đây

            _context.Categories.Add(category);

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã tạo danh mục mới ID: {CategoryId}, Tên: {CategoryName}", category.CategoryID, category.CategoryName);
                // Map lại sang DTO để trả về (đã có ID)
                return _mapper.Map<CategoryDto>(category);
            }
            catch (DbUpdateException ex)
            {
                _logger.LogError(ex, "Lỗi DB khi tạo danh mục: {CategoryName}", createDto.CategoryName);
                // Ném lại hoặc xử lý lỗi cụ thể hơn
                throw new Exception("Đã xảy ra lỗi khi lưu danh mục vào cơ sở dữ liệu.", ex);
            }
        }

        public async Task<bool> UpdateCategoryAsync(int categoryId, CategoryUpdateDto updateDto)
        {
            var existingCategory = await _context.Categories.FindAsync(categoryId);

            if (existingCategory == null)
            {
                _logger.LogWarning("Không tìm thấy danh mục ID {CategoryId} để cập nhật.", categoryId);
                return false; // Không tìm thấy
            }

            // Kiểm tra nếu tên mới trùng với một danh mục *khác* đã tồn tại
            if (existingCategory.CategoryName.ToLower() != updateDto.CategoryName.ToLower()) // Chỉ kiểm tra nếu tên thay đổi
            {
                var nameExists = await _context.Categories
                                      .AnyAsync(c => c.CategoryName.ToLower() == updateDto.CategoryName.ToLower() && c.CategoryID != categoryId);
                if (nameExists)
                {
                    _logger.LogWarning("Cố gắng cập nhật danh mục ID {CategoryId} thành tên đã tồn tại: {CategoryName}", categoryId, updateDto.CategoryName);
                    // Ném exception vì đây là lỗi dữ liệu vào không hợp lệ
                    throw new ArgumentException($"Tên danh mục '{updateDto.CategoryName}' đã được sử dụng bởi một danh mục khác.");
                }
            }


            // Map các thay đổi từ DTO vào entity đã tồn tại
            _mapper.Map(updateDto, existingCategory);

            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã cập nhật danh mục ID: {CategoryId}", categoryId);
                return true; // Cập nhật thành công
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật danh mục ID: {CategoryId}", categoryId);
                return false; // Cập nhật thất bại do concurrency
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi không mong muốn khi cập nhật danh mục ID: {CategoryId}", categoryId);
                return false; // Cập nhật thất bại
            }
        }

        public async Task<bool> DeleteCategoryAsync(int categoryId) 
        {
            if (categoryId == 1)
            {
                _logger.LogWarning("Danh mục này là mặc định không thể xóa danh mục này");
                return false;
            }
            var categoryToDelete = await _context.Categories.FindAsync(categoryId);

            if (categoryToDelete == null)
            {
                _logger.LogWarning("Không tìm thấy danh mục ID {CategoryId} để xóa.", categoryId);
                return false; // Không tìm thấy
            }

            try
            {
                int affectedProducts = await _context.Products
                                                    .Where(p => p.CategoryID == categoryId) // Tìm các sản phẩm thuộc danh mục cần xóa
                                                    .ExecuteUpdateAsync(setters => setters
                                                    .SetProperty(p => p.CategoryID, 1));

                _context.Categories.Remove(categoryToDelete);
                var result = await _context.SaveChangesAsync() > 0;
                if (result)
                {
                    _logger.LogInformation("Đã xóa (hard delete) danh mục ID: {CategoryId}", categoryId);
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa (hard delete) danh mục ID: {CategoryId}", categoryId);
                return false;
            }
        }
    }
}
