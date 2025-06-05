namespace ShopxEX1.Dtos.Discounts
{
    public class DiscountValidationResultDto
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public DiscountDto? DiscountDetails { get; set; } // Thông tin chi tiết nếu mã hợp lệ
        public decimal DiscountAmount { get; set; } // Số tiền được giảm (nếu tính toán được ở đây)

        public DiscountValidationResultDto(bool isValid, string message, DiscountDto? discountDetails = null, decimal discountAmount = 0)
        {
            IsValid = isValid;
            Message = message;
            DiscountDetails = discountDetails;
            DiscountAmount = discountAmount;
        }
    }
}
