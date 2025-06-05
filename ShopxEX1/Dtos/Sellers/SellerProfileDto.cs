namespace ShopxEX1.Dtos.Sellers
{
    // Thông tin chi tiết profile của người bán (Seller tự xem/quản lý).
    public class SellerProfileDto
    {
        public int SellerID { get; set; }
        public int UserID { get; set; } // ID của User liên kết
        public string ShopName { get; set; } = string.Empty;
        public string? StoreDescription { get; set; }
        public string? ContactPhone { get; set; } // Phone liên hệ của cửa hàng (từ bảng Seller)
        public string? ContactEmail { get; set; } // Email liên hệ của cửa hàng (từ bảng Seller)
        public string? BusinessLicense { get; set; }
        public string? ApprovalStatus { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool? IsActive { get; set; } // Trạng thái hoạt động của cửa hàng
        public DateTime CreatedAt { get; set; } // Ngày tạo tài khoản Seller

        // Thông tin lấy từ User
        public string UserEmail { get; set; } = string.Empty; // Email đăng nhập
        public string? UserFullName { get; set; } // Tên người dùng
        public string? UserPhone { get; set; } // Phone đăng ký của User
        public string? UserAddress { get; set; } // Address đăng ký của User
    }
}
