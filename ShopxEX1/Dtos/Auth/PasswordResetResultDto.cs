namespace ShopxEX1.Dtos.Auth
{
    // Output: Kết quả yêu cầu/thực hiện reset (thông báo đơn giản)
    public class PasswordResetResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        /// <summary>
        /// 🔥 OPTIONAL: Thêm thông tin bổ sung
        /// </summary>
        public object? Data { get; set; }

        /// <summary>
        /// 🔥 OPTIONAL: Error code để frontend xử lý cụ thể
        /// </summary>
        public string? ErrorCode { get; set; }
    }
}
