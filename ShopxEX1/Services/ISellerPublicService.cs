using ShopxEX1.Dtos.Sellers;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Models;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services.Interfaces
{
    public interface ISellerPublicService
    {
        Task<SellerPublicProfileDto?> GetSellerPublicProfileAsync(int sellerId);
        Task<PagedResult<ProductDto>> GetSellerProductsAsync(int sellerId, int pageNumber, int pageSize, string? search, int? categoryId, string? sortBy, decimal? minPrice, decimal? maxPrice);
        Task<SellerPublicStatsDto> GetSellerPublicStatsAsync(int sellerId);
        Task<List<SellerCategoryWithCountDto>> GetSellerCategoriesAsync(int sellerId);
        Task<bool> IsSellerActiveAsync(int sellerId);
    }

    public class SellerPublicStatsDto
    {
        public int SellerID { get; set; }
        public int TotalProducts { get; set; }
        public int TotalSold { get; set; }
        public decimal TotalRevenue { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public double ResponseRate { get; set; }
        public DateTime JoinDate { get; set; }
        public List<SellerCategoryWithCountDto> Categories { get; set; } = new();
    }

}