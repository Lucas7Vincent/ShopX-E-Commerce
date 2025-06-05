using ShopxEX1.Dtos.Products;
using ShopxEX1.Dtos.SellerCategory;

namespace ShopxEX1.Dtos.Sellers
{
    /// <summary>
    /// DTO for public seller profile view (for customers)
    /// Extends existing SellerProfileDto with additional public fields
    /// </summary>
    public class SellerPublicProfileDto
    {
        // ✅ BASIC INFO (từ Seller table)
        public int SellerID { get; set; }
        public string ShopName { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        // ✅ CONTACT INFO (từ User table - FIXED)
        public string? Phone { get; set; }    // User.Phone
        public string? Email { get; set; }    // User.Email
        public string? Avatar { get; set; }   // User.Avatar
        
        // ✅ USER INFO (từ User table)
        public string? UserFullName { get; set; }  // User.FullName
        public string? UserAddress { get; set; }   // User.Address
        
        // ✅ PUBLIC STATISTICS (mới thêm)
        public int TotalProducts { get; set; }
        public int TotalOrders { get; set; }
        public double AverageRating { get; set; }
        public int TotalReviews { get; set; }
        public double ResponseRate { get; set; }
        public DateTime JoinDate { get; set; }
        
        // ✅ FEATURED PRODUCTS (sử dụng ProductDto có sẵn)
        public List<ProductDto> FeaturedProducts { get; set; } = new();
        
        // ✅ CATEGORIES (sử dụng SellerCategoryDto có sẵn)
        public List<SellerCategoryWithCountDto> Categories { get; set; } = new();
    }
    
    /// <summary>
    /// Extension of SellerCategoryDto with product count
    /// </summary>
    public class SellerCategoryWithCountDto : SellerCategoryDto
    {
        public int ProductCount { get; set; }
        public string? Icon { get; set; }
    }
}