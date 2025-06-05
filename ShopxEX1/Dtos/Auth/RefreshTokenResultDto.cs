namespace ShopxEX1.Dtos.Auth
{
    // Kết quả trả về sau khi làm mới token thành công
    public class RefreshTokenResultDto
    {
        public bool Success { get; set; }
        public string? NewAccessToken { get; set; }
        public DateTime? NewAccessTokenExpiration { get; set; }
        public string? Message { get; set; }
    }
}
