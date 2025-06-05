using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Sellers;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Services.Interfaces;
using ShopxEX1.Helpers;

namespace ShopxEX1.Services.Implementations
{
    public class SellerPublicService : ISellerPublicService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SellerPublicService> _logger;

        public SellerPublicService(AppDbContext context, ILogger<SellerPublicService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// 🔥 GET SELLER PUBLIC PROFILE - CORRECTED BASED ON APPDBCONTEXT
        /// </summary>
        public async Task<SellerPublicProfileDto?> GetSellerPublicProfileAsync(int sellerId)
        {
            try
            {
                _logger.LogInformation("Getting public profile for seller {SellerId}", sellerId);

                // ✅ CORRECTED: Lấy seller với thông tin user đầy đủ
                var seller = await _context.Sellers
                    .Include(s => s.User) // User chứa Phone, Email, Avatar, FullName, Address
                    .Include(s => s.Products.Where(p => p.IsActive))
                    .ThenInclude(p => p.Category)
                    .Where(s => s.SellerID == sellerId && s.IsActive == true)
                    .FirstOrDefaultAsync();

                if (seller == null)
                {
                    _logger.LogWarning("Seller {SellerId} not found or inactive", sellerId);
                    return null;
                }

                // ✅ CORRECTED: Calculate statistics - FIX OrderItems -> OrderDetails
                var totalOrders = await _context.OrderDetails
                    .Where(od => od.Product.SellerID == sellerId)
                    .Select(od => od.OrderID)
                    .Distinct()
                    .CountAsync();

                // ✅ GET FEATURED PRODUCTS (6 latest) - CORRECTED FIELD MAPPING
                var featuredProducts = await _context.Products
                    .Include(p => p.Category)
                    .Where(p => p.SellerID == sellerId && p.IsActive)
                    .OrderByDescending(p => p.CreatedAt)
                    .Take(6)
                    .Select(p => new ProductDto
                    {
                        ProductID = p.ProductID,
                        ProductName = p.ProductName, 
                        Description = p.Description,
                        Price = p.Price,
                        StockQuantity = p.StockQuantity, 
                        ImageURL = p.ImageURL, 
                        IsActive = p.IsActive,
                        CategoryName = p.Category.CategoryName, 
                        SellerID = p.SellerID,
                        SellerStoreName = seller.ShopName,
                        SellerCategoryID = p.SellerCategoryID 
                    })
                    .ToListAsync();

                // ✅ GET CATEGORIES WITH PRODUCT COUNT
                var categories = await _context.Products
                    .Include(p => p.Category)
                    .Where(p => p.SellerID == sellerId && p.IsActive)
                    .GroupBy(p => p.Category)
                    .Select(g => new SellerCategoryWithCountDto
                    {
                        SellerCategoryID = g.Key.CategoryID,
                        CategoryName = g.Key.CategoryName, 
                        IsActive = true,
                        SellerID = sellerId,
                        SellerShopName = seller.ShopName,
                        ProductCount = g.Count(),
                        Icon = "fas fa-box" // Default icon since Icon not in Category table
                    })
                    .ToListAsync();

                // ✅ MAP TO SellerPublicProfileDto - CORRECTED FIELD MAPPING
                var publicProfile = new SellerPublicProfileDto
                {
                    // Basic info từ Seller table
                    SellerID = seller.SellerID,
                    ShopName = seller.ShopName,
                    CreatedAt = seller.CreatedAt,
                    
                    // ✅ CORRECT: Lấy Phone, Email, Avatar từ User table
                    Phone = seller.User.Phone, // User.Phone
                    Email = seller.User.Email, // User.Email  
                    Avatar = seller.User.Avatar, // User.Avatar
                    
                    // User info từ User table
                    UserFullName = seller.User.FullName,
                    UserAddress = seller.User.Address,
                    
                    // Statistics
                    TotalProducts = seller.Products.Count(p => p.IsActive),
                    ResponseRate = 98.0, 
                    JoinDate = seller.CreatedAt,
                    
                    // Related data
                    FeaturedProducts = featuredProducts,
                    Categories = categories
                };

                _logger.LogInformation("Successfully retrieved public profile for seller {SellerId}", sellerId);
                return publicProfile;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting public profile for seller {SellerId}", sellerId);
                throw;
            }
        }

        /// <summary>
        /// 🔥 GET SELLER PRODUCTS WITH PAGINATION & FILTERS - CORRECTED
        /// </summary>
        public async Task<PagedResult<ProductDto>> GetSellerProductsAsync(
            int sellerId, 
            int pageNumber, 
            int pageSize, 
            string? search, 
            int? categoryId, 
            string? sortBy, 
            decimal? minPrice, 
            decimal? maxPrice)
        {
            try
            {
                _logger.LogInformation("Getting products for seller {SellerId}, page {PageNumber}", sellerId, pageNumber);

                // Validate pagination
                pageNumber = Math.Max(1, pageNumber);
                pageSize = Math.Min(Math.Max(1, pageSize), 50);

                var query = _context.Products
                    .Include(p => p.Category)
                    .Include(p => p.Seller)
                    .Where(p => p.SellerID == sellerId && p.IsActive);

                // ✅ APPLY FILTERS - CORRECTED FIELD NAMES
                if (!string.IsNullOrEmpty(search))
                {
                    var searchLower = search.ToLower();
                    query = query.Where(p => 
                        p.ProductName.ToLower().Contains(searchLower) || 
                        p.Description.ToLower().Contains(searchLower));
                }

                if (categoryId.HasValue)
                {
                    query = query.Where(p => p.CategoryID == categoryId.Value);
                }

                if (minPrice.HasValue)
                {
                    query = query.Where(p => p.Price >= minPrice.Value);
                }

                if (maxPrice.HasValue)
                {
                    query = query.Where(p => p.Price <= maxPrice.Value);
                }

                // ✅ APPLY SORTING - CORRECTED FIELD NAMES
                query = sortBy?.ToLower() switch
                {
                    "price_asc" => query.OrderBy(p => p.Price),
                    "price_desc" => query.OrderByDescending(p => p.Price),
                    "name" => query.OrderBy(p => p.ProductName), // ✅ CORRECT: ProductName
                    "oldest" => query.OrderBy(p => p.CreatedAt),
                    "bestseller" => query.OrderByDescending(p => _context.OrderDetails // ✅ CORRECT: OrderDetails not OrderItems
                        .Where(od => od.ProductID == p.ProductID)
                        .Sum(od => od.Quantity)),
                    // ✅ Skip rating sort since Reviews table doesn't exist
                    _ => query.OrderByDescending(p => p.CreatedAt) // newest (default)
                };

                var totalCount = await query.CountAsync();
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                // ✅ GET PRODUCTS WITH ADDITIONAL DATA - CORRECTED FIELD MAPPING
                var products = await query
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .Select(p => new ProductDto
                    {
                        ProductID = p.ProductID,
                        ProductName = p.ProductName, // ✅ CORRECT: ProductName
                        Description = p.Description,
                        Price = p.Price,
                        StockQuantity = p.StockQuantity, // ✅ CORRECT: StockQuantity
                        ImageURL = p.ImageURL, // ✅ CORRECT: ImageURL
                        IsActive = p.IsActive,
                        CategoryName = p.Category.CategoryName, // ✅ CORRECT: CategoryName
                        CategoryID = p.CategoryID,
                        SellerID = p.SellerID,
                        SellerStoreName = p.Seller.ShopName,
                        SellerCategoryID = p.SellerCategoryID // ✅ CORRECT: Use actual SellerCategoryID
                    })
                    .ToListAsync();

                var result = new PagedResult<ProductDto>(products, pageNumber, pageSize, totalCount);

                _logger.LogInformation("Retrieved {Count} products for seller {SellerId}", products.Count, sellerId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting products for seller {SellerId}", sellerId);
                throw;
            }
        }

        /// <summary>
        /// 🔥 GET SELLER PUBLIC STATISTICS - CORRECTED
        /// </summary>
        public async Task<SellerPublicStatsDto> GetSellerPublicStatsAsync(int sellerId)
        {
            try
            {
                _logger.LogInformation("Getting public stats for seller {SellerId}", sellerId);

                var seller = await _context.Sellers
                    .Where(s => s.SellerID == sellerId && s.IsActive == true)
                    .FirstOrDefaultAsync();

                if (seller == null)
                {
                    throw new ArgumentException($"Seller {sellerId} not found or inactive");
                }

                // ✅ CALCULATE STATS - CORRECTED TABLE NAMES
                var totalProducts = await _context.Products
                    .Where(p => p.SellerID == sellerId && p.IsActive)
                    .CountAsync();

                var totalSold = await _context.OrderDetails // ✅ CORRECT: OrderDetails not OrderItems
                    .Where(od => od.Product.SellerID == sellerId)
                    .SumAsync(od => od.Quantity);

                var totalRevenue = await _context.OrderDetails // ✅ CORRECT: OrderDetails not OrderItems
                    .Where(od => od.Product.SellerID == sellerId)
                    .SumAsync(od => od.UnitPrice * od.Quantity); // ✅ CORRECT: UnitPrice not Price

        

                var categories = await GetSellerCategoriesAsync(sellerId);

                var stats = new SellerPublicStatsDto
                {
                    SellerID = sellerId,
                    TotalProducts = totalProducts,
                    TotalSold = totalSold,
                    TotalRevenue = totalRevenue,
                    ResponseRate = 98.0, // TODO: Calculate from actual data
                    JoinDate = seller.CreatedAt,
                    Categories = categories
                };

                _logger.LogInformation("Successfully retrieved stats for seller {SellerId}", sellerId);
                return stats;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting stats for seller {SellerId}", sellerId);
                throw;
            }
        }

        /// <summary>
        /// 🔥 GET SELLER CATEGORIES WITH PRODUCT COUNT - CORRECTED
        /// </summary>
        public async Task<List<SellerCategoryWithCountDto>> GetSellerCategoriesAsync(int sellerId)
        {
            try
            {
                var seller = await _context.Sellers
                    .Where(s => s.SellerID == sellerId && s.IsActive == true)
                    .FirstOrDefaultAsync();

                if (seller == null)
                {
                    return new List<SellerCategoryWithCountDto>();
                }

                var categories = await _context.Products
                    .Include(p => p.Category)
                    .Where(p => p.SellerID == sellerId && p.IsActive)
                    .GroupBy(p => p.Category)
                    .Select(g => new SellerCategoryWithCountDto
                    {
                        SellerCategoryID = g.Key.CategoryID,
                        CategoryName = g.Key.CategoryName, 
                        IsActive = true,
                        SellerID = sellerId,
                        SellerShopName = seller.ShopName,
                        ProductCount = g.Count(),
                        Icon = "fas fa-box" // Default icon since Icon not defined in Category table in AppDbContext
                    })
                    .OrderByDescending(c => c.ProductCount)
                    .ToListAsync();

                return categories;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting categories for seller {SellerId}", sellerId);
                throw;
            }
        }

        /// <summary>
        /// 🔥 CHECK IF SELLER IS ACTIVE
        /// </summary>
        public async Task<bool> IsSellerActiveAsync(int sellerId)
        {
            try
            {
                return await _context.Sellers
                    .AnyAsync(s => s.SellerID == sellerId && s.IsActive == true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if seller {SellerId} is active", sellerId);
                return false;
            }
        }
    }
}