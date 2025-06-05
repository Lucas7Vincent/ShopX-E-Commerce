using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Dtos;
using ShopxEX1.Helpers;
using ShopxEX1.Models;
using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using System.Security.Claims;
using System.Reflection.Metadata.Ecma335;

namespace ShopxEX1.Services.Implementations
{
    [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
    public class ProductService : IProductService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly GetID getID;
        private readonly ILogger _logger;

        public ProductService(AppDbContext context, IMapper mapper, IHttpContextAccessor httpContextAccessor, ILogger<ProductService> logger)
        {
            _context = context;
            _mapper = mapper;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        private int GetCurrentUserId()
        {
            var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out int userId))
            {
                throw new UnauthorizedAccessException("Không thể xác định ID người dùng từ thông tin xác thực.");
            }
            return userId;
        }

        private bool IsAdmin()
        {
            var user = _httpContextAccessor.HttpContext?.User;
            return user?.IsInRole("Admin") ?? false;
        }

        public async Task<PagedResult<ProductSummaryDto>> GetProductsAsync(ProductFilterDto? filter, int pageNumber, int pageSize, bool customerPage = false)
        {
            IQueryable<Product> query = null;
            if (customerPage)
            {
                query = _context.Products
                                  .Include(p => p.Category)
                                  .Include(p => p.Seller)
                                  .Where(p => p.IsActive == true);
            }
            else
            {
                query = _context.Products
                                  .Include(p => p.Category)
                                  .Include(p => p.Seller);
            }

            if (!string.IsNullOrWhiteSpace(filter?.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm));
            }
            if (filter?.CategoryId.HasValue == true)
            {
                query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
            }
            if (filter?.SellerID.HasValue == true)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter?.SellerCategoryID.HasValue == true)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter?.MinPrice.HasValue == true)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter?.MaxPrice.HasValue == true)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            Expression<Func<Product, object>> orderByExpression = p => p.ProductID;
            bool ascending = true;

            if (!string.IsNullOrWhiteSpace(filter?.SortBy))
            {
                switch (filter.SortBy.ToLowerInvariant())
                {
                    case "priceasc":
                        orderByExpression = p => p.Price;
                        ascending = true;
                        break;
                    case "pricedesc":
                        orderByExpression = p => p.Price;
                        ascending = false;
                        break;
                    case "nameasc":
                        orderByExpression = p => p.ProductName;
                        ascending = true;
                        break;
                    case "createdatdesc":
                        orderByExpression = p => p.CreatedAt;
                        ascending = false;
                        break;
                }
            }

            if (ascending)
            {
                query = query.OrderBy(orderByExpression);
            }
            else
            {
                query = query.OrderByDescending(orderByExpression);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();

            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }
        // Cập nhật method signature để hỗ trợ tham số includeInactive (thêm overload mới)
       // ✅ SECURED: GetProductByIdAsync with strict permission check
public async Task<ProductDto?> GetProductByIdAsync(int productId, bool includeInactive = false)
{
    try
    {
        _logger.LogInformation("Getting product {ProductId}, includeInactive: {IncludeInactive}, User: {User}", 
            productId, includeInactive, _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "Anonymous");

        // ✅ SECURITY: Validate productId
        if (productId <= 0)
        {
            _logger.LogWarning("Invalid product ID: {ProductId}", productId);
            return null;
        }

        // ✅ SECURITY: Check if user is authenticated and authorized for includeInactive
        bool canIncludeInactive = false;
        
        if (includeInactive)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            bool isAuthenticated = user?.Identity?.IsAuthenticated ?? false;
            
            if (!isAuthenticated)
            {
                _logger.LogWarning("Anonymous user attempted to access inactive products for ProductID: {ProductId}", productId);
                includeInactive = false; // ✅ Force to false for anonymous users
            }
            else
            {
                bool isAdmin = user.IsInRole("Admin");
                bool isSeller = user.IsInRole("Seller");
                
                if (isAdmin)
                {
                    canIncludeInactive = true;
                    _logger.LogInformation("Admin access granted for inactive products");
                }
                else if (isSeller)
                {
                    // ✅ Seller can only see their own inactive products - we'll verify ownership later
                    canIncludeInactive = true;
                    _logger.LogInformation("Seller checking product {ProductId}", productId);
                }
                else
                {
                    _logger.LogWarning("Customer user {User} attempted to access inactive products for ProductID: {ProductId}", 
                        user.Identity.Name, productId);
                    includeInactive = false; // ✅ Force to false for customers
                    canIncludeInactive = false;
                }
            }
        }

        // ✅ SECURITY: Build query with strict filtering
        var query = _context.Products
                            .Include(p => p.Category)
                            .Include(p => p.Seller)
                            .AsNoTracking();

        // ✅ SECURITY: Always filter by ProductID first
        query = query.Where(p => p.ProductID == productId);

        // ✅ SECURITY: Apply active filter unless specifically authorized
        if (!canIncludeInactive)
        {
            query = query.Where(p => p.IsActive == true);
            _logger.LogInformation("Applied active-only filter for product {ProductId}", productId);
        }

        var product = await query.FirstOrDefaultAsync();

        if (product == null)
        {
            _logger.LogInformation("Product {ProductId} not found or not accessible", productId);
            return null;
        }

        // ✅ SECURITY: Additional ownership check for sellers accessing inactive products
        if (!product.IsActive && canIncludeInactive)
        {
            var user = _httpContextAccessor.HttpContext?.User;
            bool isAdmin = user?.IsInRole("Admin") ?? false;
            bool isSeller = user?.IsInRole("Seller") ?? false;
            
            if (!isAdmin && isSeller)
            {
                // Verify seller ownership
                var userIdClaim = user?.FindFirst(ClaimTypes.NameIdentifier);
                if (userIdClaim != null && int.TryParse(userIdClaim.Value, out int currentUserId))
                {
                    var sellerInfo = await _context.Sellers
                        .FirstOrDefaultAsync(s => s.UserID == currentUserId);
                    
                    if (sellerInfo == null || product.SellerID != sellerInfo.SellerID)
                    {
                        _logger.LogWarning("Seller {UserId} attempted to access inactive product {ProductId} not owned by them", 
                            currentUserId, productId);
                        return null;
                    }
                }
                else
                {
                    _logger.LogWarning("Could not verify seller identity for inactive product access");
                    return null;
                }
            }
        }

        // ✅ SECURITY: Final check - customers should never see inactive products
        var currentUser = _httpContextAccessor.HttpContext?.User;
        bool isCurrentUserCustomer = currentUser?.Identity?.IsAuthenticated == true && 
                                   !currentUser.IsInRole("Admin") && 
                                   !currentUser.IsInRole("Seller");
        
        if (!product.IsActive && (currentUser?.Identity?.IsAuthenticated != true || isCurrentUserCustomer))
        {
            _logger.LogWarning("Blocked access to inactive product {ProductId} for customer/anonymous user", productId);
            return null;
        }

        var productDto = _mapper.Map<ProductDto>(product);
        productDto.Status = product.IsActive ? "active" : "inactive";
        productDto.SellerStoreName = product.Seller?.ShopName ?? "Cửa hàng";
        productDto.CategoryName = product.Category?.CategoryName ?? "Danh mục";
        
        _logger.LogInformation("Successfully returned product {ProductName} (ID: {ProductId}, Active: {IsActive}) to user {User}", 
            productDto.ProductName, productId, productDto.IsActive, currentUser?.Identity?.Name ?? "Anonymous");

        return productDto;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting product by ID: {ProductId}", productId);
        throw new Exception($"Failed to retrieve product {productId}: {ex.Message}", ex);
    }
}
        // Giữ lại phương thức cũ để tương thích ngược
        // public async Task<ProductDto?> GetProductByIdAsync(int productId)
        // {
        //     return await GetProductByIdAsync(productId, false);
        // }
        public async Task<ProductDto> CreateProductAsync(int sellerId, ProductCreateDto createDto)
        {
            var categoryExists = await _context.Categories.FindAsync(createDto.CategoryID);
            if (categoryExists == null)
            {
                throw new ArgumentException($"Danh mục chung với ID {createDto.CategoryID} không tồn tại.");
            }

            var sellerCategoryValid = await _context.SellerCategories
                                           .FirstOrDefaultAsync(sc => sc.SellerCategoryID == createDto.SellerCategoryID && sc.SellerID == sellerId);
            if (sellerCategoryValid == null)
            {
                throw new ArgumentException($"Danh mục người bán với ID {createDto.SellerCategoryID} không tồn tại hoặc không thuộc về người bán ID {sellerId}.");
            }

            var product = _mapper.Map<Product>(createDto);
            product.SellerID = sellerId;
            product.CreatedAt = DateTime.UtcNow;

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            var createdProduct = await _context.Products
                                    .Include(p => p.Category)
                                    .Include(p => p.Seller)
                                    .AsNoTracking()
                                    .FirstOrDefaultAsync(p => p.ProductID == product.ProductID);

            if (createdProduct == null)
            {
                throw new Exception("Không thể lấy lại thông tin sản phẩm vừa tạo.");
            }

            return _mapper.Map<ProductDto>(createdProduct);
        }

        public async Task<bool> UpdateProductAsync(int productId, int sellerId, ProductUpdateDto updateDto)
        {
            try
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.ProductID == productId);

                if (product == null)
                {
                    return false;
                }

                // Nếu sellerId = 0 là Admin, bỏ qua kiểm tra quyền
                if (sellerId != 0 && product.SellerID != sellerId)
                {
                    return false;
                }

                // Cập nhật các trường bắt buộc
                product.ProductName = updateDto.ProductName;
                product.Price = updateDto.Price;
                product.StockQuantity = updateDto.StockQuantity;
                product.IsActive = updateDto.IsActive;
                product.CategoryID = updateDto.CategoryID;
                product.SellerCategoryID = updateDto.SellerCategoryID;

                // Cập nhật các trường có thể null
                if (!string.IsNullOrEmpty(updateDto.Description))
                {
                    product.Description = updateDto.Description;
                }
                if (!string.IsNullOrEmpty(updateDto.ImageURL))
                {
                    product.ImageURL = updateDto.ImageURL;
                }

                product.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        public async Task<bool> DeleteProductAsync(int productId, int sellerId, string status = "notActive")
        {
            var existingProduct = await _context.Products.FindAsync(productId);

            if (existingProduct == null)
            {
                throw new KeyNotFoundException($"Không tìm thấy sản phẩm với ID {productId}.");
            }

            // kiểm tra: nếu là admin -> bỏ qua
            //           Nếu là seller -> sẽ kiểm tra sản phẩm đó có phải của seller ấy không
            if (!IsAdmin())
            {
                if (existingProduct.SellerID != sellerId)
                {
                    throw new UnauthorizedAccessException($"Người bán ID {sellerId} không có quyền xóa sản phẩm ID {productId}.");
                }
            }

            if (status == "delete")
            {
                _context.Products.Remove(existingProduct);
                return await _context.SaveChangesAsync() > 0;
            }
            else if (status == "notactive")
            {
                if (existingProduct.IsActive)
                {
                    existingProduct.IsActive = false;
                    return await _context.SaveChangesAsync() > 0;
                }
                return true;
            }
            else if (status == "active")
            {
                if (!(existingProduct.IsActive))
                {
                    existingProduct.IsActive = true;
                    return await _context.SaveChangesAsync() > 0;
                }
                return true;
            }
            return false;
        }

        public async Task<PagedResult<ProductSummaryDto>> GetProductsBySellerAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int userId)
        {
            IQueryable<Product> query = _context.Products
                              .Include(p => p.Category);

            // Lọc theo sellerId
            query = query.Where(p => p.SellerID == userId);

            // Chỉ lọc theo IsActive nếu không yêu cầu bao gồm sản phẩm không hoạt động
            if (filter?.IncludeInactive != true)
            {
                query = query.Where(p => p.IsActive);
            }

            // Các điều kiện lọc khác
            if (!string.IsNullOrWhiteSpace(filter?.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm));
            }
            if (filter?.CategoryId.HasValue == true)
            {
                query = query.Where(p => p.CategoryID == filter.CategoryId.Value);
            }
            if (filter?.SellerCategoryID.HasValue == true)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter?.MinPrice.HasValue == true)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter?.MaxPrice.HasValue == true)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();

            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }

        public async Task<PagedResult<ProductSummaryDto>> GetProductsByCategoryAsync(ProductFilterDto? filter, int pageNumber, int pageSize, int categoryId)
        {
            IQueryable<Product> query = _context.Products
                              .Include(p => p.Category)
                              .Where(p => p.IsActive == true)
                              .Where(p => p.CategoryID == categoryId);

            if (!string.IsNullOrWhiteSpace(filter?.SearchTerm))
            {
                query = query.Where(p => p.ProductName.Contains(filter.SearchTerm));
            }
            if (filter?.SellerID.HasValue == true)
            {
                query = query.Where(p => p.SellerID == filter.SellerID.Value);
            }
            if (filter?.SellerCategoryID.HasValue == true)
            {
                query = query.Where(p => p.SellerCategoryID == filter.SellerCategoryID.Value);
            }
            if (filter?.MinPrice.HasValue == true)
            {
                query = query.Where(p => p.Price >= filter.MinPrice.Value);
            }
            if (filter?.MaxPrice.HasValue == true)
            {
                query = query.Where(p => p.Price <= filter.MaxPrice.Value);
            }

            Expression<Func<Product, object>> orderByExpression = p => p.ProductID;
            bool ascending = true;

            if (!string.IsNullOrWhiteSpace(filter?.SortBy))
            {
                switch (filter.SortBy.ToLowerInvariant())
                {
                    case "priceasc":
                        orderByExpression = p => p.Price;
                        ascending = true;
                        break;
                    case "pricedesc":
                        orderByExpression = p => p.Price;
                        ascending = false;
                        break;
                    case "nameasc":
                        orderByExpression = p => p.ProductName;
                        ascending = true;
                        break;
                    case "createdatdesc":
                        orderByExpression = p => p.CreatedAt;
                        ascending = false;
                        break;
                }
            }

            if (ascending)
            {
                query = query.OrderBy(orderByExpression);
            }
            else
            {
                query = query.OrderByDescending(orderByExpression);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                                .Skip((pageNumber - 1) * pageSize)
                                .Take(pageSize)
                                .ToListAsync();

            var productDtos = _mapper.Map<IEnumerable<ProductSummaryDto>>(items);
            return new PagedResult<ProductSummaryDto>(productDtos, pageNumber, pageSize, totalCount);
        }

        public async Task<List<ProductSummaryDto>> GetBestSellingProductsAsync(int count = 5)
        {
            if (count <= 0)
            {
                _logger.LogWarning("GetBestSellingProductsAsync: Tham số count không hợp lệ ({RequestedCount}), sử dụng giá trị mặc định là 5.", count);
                count = 5;
            }

            _logger.LogInformation("Bắt đầu lấy {Count} sản phẩm bán chạy nhất (dùng foreach cho ID), ưu tiên sản phẩm active và còn hàng.", count);

            // Bước 1: Lấy thứ tự ưu tiên của TẤT CẢ các sản phẩm dựa trên số lượng bán.
            var prioritizedProductSales = await _context.OrderDetails
                .GroupBy(od => od.ProductID)
                .Select(g => new
                {
                    ProductID = g.Key,
                    TotalQuantitySold = g.Sum(od => od.Quantity)
                })
                .OrderByDescending(ps => ps.TotalQuantitySold)
                .ToListAsync();

            if (!prioritizedProductSales.Any())
            {
                _logger.LogInformation("Không tìm thấy sản phẩm nào được bán trong OrderDetails.");
                return new List<ProductSummaryDto>();
            }

            var prioritizedProductIds = prioritizedProductSales.Select(ps => ps.ProductID).ToList();
            _logger.LogDebug("Thứ tự ưu tiên của {TotalPrioritizedIds} ProductID dựa trên doanh số được xác định.", prioritizedProductIds.Count);

            // Bước 2: Xây dựng Expression Tree hoàn chỉnh
            ParameterExpression parameter = Expression.Parameter(typeof(Product), "p"); // Tham số: (Product p)
            Expression? finalCombinedFilter = null;

            // 2a. Xây dựng phần (p.ProductID == id1 || p.ProductID == id2 || ...) bằng foreach
            MemberExpression productIdProperty = Expression.Property(parameter, nameof(Product.ProductID));
            Expression? orChainExpressionForProductIds = null;

            foreach (var id in prioritizedProductIds)
            {
                ConstantExpression idConstant = Expression.Constant(id);
                BinaryExpression equalsExpression = Expression.Equal(productIdProperty, idConstant); // p.ProductID == id
                orChainExpressionForProductIds = (orChainExpressionForProductIds == null)
                    ? equalsExpression
                    : Expression.OrElse(orChainExpressionForProductIds, equalsExpression);
            }

            // Nếu prioritizedProductIds rỗng (đã được kiểm tra ở trên), orChainExpressionForProductIds sẽ là null.
            // Trong trường hợp đó, không có sản phẩm nào cần được truy vấn dựa trên ID.
            if (orChainExpressionForProductIds == null)
            {
                _logger.LogInformation("Không có ProductID nào trong danh sách ưu tiên để xây dựng bộ lọc ID.");
                // Nếu không có ID nào từ bán hàng, không thể có sản phẩm bán chạy nào
                return new List<ProductSummaryDto>();
            }

            // 2b. Xây dựng phần điều kiện tĩnh: p.IsActive == true AND p.StockQuantity > 0
            MemberExpression isActiveProperty = Expression.Property(parameter, nameof(Product.IsActive));
            ConstantExpression trueConstant = Expression.Constant(true);
            BinaryExpression isActiveCheck = Expression.Equal(isActiveProperty, trueConstant); // p.IsActive == true

            MemberExpression stockQuantityProperty = Expression.Property(parameter, nameof(Product.StockQuantity));
            ConstantExpression zeroConstant = Expression.Constant(0);
            BinaryExpression stockQuantityCheck = Expression.GreaterThan(stockQuantityProperty, zeroConstant); // p.StockQuantity > 0

            Expression staticConditions = Expression.AndAlso(isActiveCheck, stockQuantityCheck); // (p.IsActive == true) AND (p.StockQuantity > 0)

            // 2c. Kết hợp chuỗi OR của ProductID với các điều kiện tĩnh bằng AND
            // ( (p.ProductID == id1 || ...) AND (p.IsActive == true) AND (p.StockQuantity > 0) )
            finalCombinedFilter = Expression.AndAlso(orChainExpressionForProductIds, staticConditions);

            // Tạo Lambda Expression hoàn chỉnh
            Expression<Func<Product, bool>> productFilterLambda = Expression.Lambda<Func<Product, bool>>(
                finalCombinedFilter, // Biểu thức đã được kết hợp đầy đủ
                parameter
            );
            _logger.LogDebug("Expression tree filter tổng hợp được tạo: {ExpressionTree}", productFilterLambda.ToString());

            // Bước 3: Truy vấn các sản phẩm thỏa mãn toàn bộ điều kiện từ Expression Tree
            var candidateProducts = await _context.Products
                .Where(productFilterLambda) // Áp dụng bộ lọc động tổng hợp
                .Include(p => p.Category)
                .Include(p => p.Seller)
                .AsNoTracking()
                .ToListAsync();

            _logger.LogInformation("Đã truy vấn được {CandidateCount} sản phẩm ứng viên (active, còn hàng, và nằm trong danh sách bán chạy).", candidateProducts.Count);

            if (!candidateProducts.Any())
            {
                _logger.LogInformation("Không có sản phẩm nào trong danh sách bán chạy thỏa mãn điều kiện active và còn hàng.");
                return new List<ProductSummaryDto>();
            }

            // Bước 4: Sắp xếp lại các sản phẩm ứng viên này theo thứ tự ưu tiên ban đầu
            // và sau đó Take(count) để lấy đúng số lượng yêu cầu.
            var finalProducts = candidateProducts
                .OrderBy(p => prioritizedProductIds.IndexOf(p.ProductID)) // Sắp xếp theo thứ tự bán chạy gốc
                .Take(count) // Lấy đúng số lượng 'count' yêu cầu
                .ToList();

            _logger.LogInformation("Hoàn tất. Trả về {FinalProductCount} sản phẩm bán chạy nhất (tối đa {RequestedCount} nếu có đủ).", finalProducts.Count, count);
            return _mapper.Map<List<ProductSummaryDto>>(finalProducts);
        }
        public async Task<List<ProductSummaryDto>> GetNewestProductsAsync(int count = 20)
        {
            if (count <= 0)
            {
                count = 20; // Giá trị mặc định an toàn
            }

            var newestProducts = await _context.Products
                .Where(p => p.IsActive) // Chỉ lấy sản phẩm còn active
                .Where(p => p.StockQuantity > 0) // Chỉ lấy sản phẩm còn active
                .OrderByDescending(p => p.CreatedAt) // Sắp xếp theo ngày tạo giảm dần (mới nhất lên đầu)
                .Take(count) // Lấy top 'count' sản phẩm
                .Include(p => p.Category) // Include thông tin cần thiết cho ProductSummaryDto
                .Include(p => p.Seller)   // Include thông tin cần thiết cho ProductSummaryDto
                .AsNoTracking()
                .ToListAsync();

            return _mapper.Map<List<ProductSummaryDto>>(newestProducts);
        }
    }
}
