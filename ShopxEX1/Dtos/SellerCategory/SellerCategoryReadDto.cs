using System;

namespace ShopxEX1.Dtos.SellerCategory
{
    public class SellerCategoryReadDto
    {
        public int SellerCategoryID { get; set; }
        public int SellerID { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string ShopName { get; set; } = string.Empty;
    }
}