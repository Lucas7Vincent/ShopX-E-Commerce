using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Models;
using ShopxEX1.Dtos.SellerCategory;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ShopxEX1.Helpers;
using System;
namespace ShopxEX1.Controllers
{
    [ApiController]
    [Route("api/sellerCategories")]
    public class SellerCategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly GetID _getID;

        public SellerCategoriesController(AppDbContext context, GetID getID)
        {
            _context = context;
            _getID = getID;
        }

        private bool IsAuthorizedToAccess(int routeSellerId)
        {
            // Placeholder: Triển khai logic xác thực
            return true;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SellerCategoryReadDto>>> GetSellerCategories()
        {
            int? sellerId = _getID.GetSellerId();
            if (sellerId == null) throw new Exception("Bạn không có quyền");

            var sellerExists = await _context.Sellers.AnyAsync(s => s.SellerID == sellerId);
            if (!sellerExists)
            {
                return NotFound(new { message = $"Seller với ID {sellerId} không tồn tại." });
            }

            var categories = await _context.SellerCategories
                                        .Where(sc => sc.SellerID == sellerId)
                                        .Select(sc => new SellerCategoryReadDto
                                        {
                                            SellerCategoryID = sc.SellerCategoryID,
                                            SellerID = sc.SellerID,
                                            CategoryName = sc.CategoryName ?? "",
                                            Description = sc.Description,
                                            IsActive = sc.IsActive,
                                            CreatedAt = sc.CreatedAt
                                        })
                                        .ToListAsync();
            return Ok(categories);
        }

        [HttpGet("{categoryId}")]
        public async Task<ActionResult<SellerCategoryReadDto>> GetSellerCategory( int categoryId)
        { int? sellerId = _getID.GetSellerId(); 
            if (sellerId == null) throw new Exception("Bạn không có quyền");
           

            var category = await _context.SellerCategories
                                        .Where(sc => sc.SellerID == sellerId && sc.SellerCategoryID == categoryId)
                                        .Select(sc => new SellerCategoryReadDto
                                        {
                                            SellerCategoryID = sc.SellerCategoryID,
                                            SellerID = sc.SellerID,
                                            CategoryName = sc.CategoryName ?? "",
                                            Description = sc.Description,
                                            IsActive = sc.IsActive,
                                            CreatedAt = sc.CreatedAt
                                        })
                                        .FirstOrDefaultAsync();

            if (category == null)
            {
                return NotFound(new { message = $"Danh mục với ID {categoryId} không tồn tại cho seller {sellerId}." });
            }
            return Ok(category);
        }

        [HttpPost]
        public async Task<ActionResult<SellerCategoryReadDto>> CreateSellerCategory([FromBody] SellerCategoryCreateDto createDto)
        {
            int? sellerId = _getID.GetSellerId();
    if (sellerId == null) throw new Exception("Bạn không có quyền");

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var seller = await _context.Sellers.FindAsync(sellerId);
            if (seller == null)
            {
                return NotFound(new { message = $"Seller với ID {sellerId} không tồn tại. Không thể tạo danh mục." });
            }

            var newCategory = new SellerCategory
            {
                SellerID = sellerId.Value,
                CategoryName = createDto.CategoryName,
                Description = createDto.Description,
                IsActive = createDto.IsActive,
                CreatedAt = DateTime.UtcNow
            };

            _context.SellerCategories.Add(newCategory);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Có lỗi xảy ra khi tạo danh mục. " + ex.InnerException?.Message });
            }

            var readDto = new SellerCategoryReadDto
            {
                SellerCategoryID = newCategory.SellerCategoryID,
                SellerID = newCategory.SellerID,
                CategoryName = newCategory.CategoryName,
                Description = newCategory.Description,
                IsActive = newCategory.IsActive,
                CreatedAt = newCategory.CreatedAt
            };

            return CreatedAtAction(nameof(GetSellerCategory), new { sellerId = sellerId, categoryId = newCategory.SellerCategoryID }, readDto);
        }

        [HttpPut("{categoryId}")]
        public async Task<IActionResult> UpdateSellerCategory( int categoryId, [FromBody] SellerCategoryUpdateDto updateDto)
        {
            int? sellerId = _getID.GetSellerId();
    if (sellerId == null) throw new Exception("Bạn không có quyền");

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var category = await _context.SellerCategories
                                        .FirstOrDefaultAsync(sc => sc.SellerID == sellerId && sc.SellerCategoryID == categoryId);

            if (category == null)
            {
                return NotFound(new { message = $"Danh mục với ID {categoryId} không tồn tại cho seller {sellerId}." });
            }

            if (updateDto.CategoryName != null)
                category.CategoryName = updateDto.CategoryName;
            if (updateDto.Description != null)
                category.Description = updateDto.Description;
            if (updateDto.IsActive.HasValue)
                category.IsActive = updateDto.IsActive.Value;

            _context.Entry(category).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                return StatusCode(500, new { message = "Lỗi đồng bộ dữ liệu xảy ra. " + ex.Message });
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật danh mục. " + ex.InnerException?.Message });
            }

            return NoContent();
        }

        [HttpDelete("{categoryId}")]
        public async Task<IActionResult> DeleteSellerCategory(int categoryId)
        {
           int? sellerId = _getID.GetSellerId();
    if (sellerId == null) throw new Exception("Bạn không có quyền");

            var category = await _context.SellerCategories
                                        .FirstOrDefaultAsync(sc => sc.SellerID == sellerId && sc.SellerCategoryID == categoryId);

            if (category == null)
            {
                return NotFound(new { message = $"Danh mục với ID {categoryId} không tồn tại cho seller {sellerId}." });
            }

            category.IsActive = false;
            _context.Entry(category).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                return StatusCode(500, new { message = "Có lỗi xảy ra khi xóa danh mục. " + ex.InnerException?.Message });
            }

            return NoContent();
        }
    }
}