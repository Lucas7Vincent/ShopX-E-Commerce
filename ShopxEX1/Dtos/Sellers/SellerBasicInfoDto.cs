namespace ShopxEX1.Dtos.Sellers
{
    // Input:  Thông tin cơ bản về người bán để hiển thị công khai.
    public class SellerBasicInfoDto
    {
        public int SellerID { get; set; }
        public string ShopName { get; set; } = string.Empty;
    }
}
