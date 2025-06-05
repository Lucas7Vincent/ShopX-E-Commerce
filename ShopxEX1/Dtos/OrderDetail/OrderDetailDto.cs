namespace ShopxEX1.Dtos.OrderDetail
{
    // <summary>
    /// Đại diện cho một mục (dòng) chi tiết trong đơn hàng, bao gồm thông tin sản phẩm cơ bản.
    /// Công dụng: Được sử dụng bên trong OrderDto để hiển thị danh sách các sản phẩm đã được mua trong một đơn hàng.
    /// </summary>
    public class OrderDetailDto
    {
        public int OrderDetailID { get; set; } // ID của chi tiết đơn hàng
        public int ProductID { get; set; } // ID của sản phẩm
        public string ProductName { get; set; } = string.Empty; // Tên sản phẩm (cần thiết để hiển thị)
        public string? ProductImageURL { get; set; } // Ảnh sản phẩm (thường hữu ích)
        public int Quantity { get; set; } // Số lượng
        public decimal UnitPrice { get; set; } // Đơn giá tại thời điểm mua

        // Thuộc tính tính toán, hữu ích cho việc hiển thị
        public decimal LineTotal => Quantity * UnitPrice; // Tổng tiền cho mục này
    }
}
