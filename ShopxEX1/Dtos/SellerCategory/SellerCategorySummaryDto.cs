namespace ShopxEX1.Dtos.SellerCategory
{
    // OutPut: Thông tin tóm tắt, cơ bản của một danh mục người bán
    public class SellerCategorySummaryDto
    {
        public int SellerCategoryID { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int SellerID { get; set; }
    }
}
