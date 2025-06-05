namespace ShopxEX1.Dtos.Sellers
{
    // Input: Thông tin tóm tắt yêu cầu đăng ký Seller cho Admin xem.
    public class SellerRequestDto
    {
        public int SellerID { get; set; }
        public int UserID { get; set; }
        public string ShopName { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty; // Email người đăng ký
        public string? UserFullName { get; set; } // Tên người đăng ký
        public string? UserPhone { get; set; } // Phone người đăng ký
        public string? BusinessLicense { get; set; } // Để Admin xem xét
        public string? ApprovalStatus { get; set; } // Trạng thái hiện tại
        public DateTime CreatedAt { get; set; } // Ngày yêu cầu (ngày tạo Seller record
    }
}
