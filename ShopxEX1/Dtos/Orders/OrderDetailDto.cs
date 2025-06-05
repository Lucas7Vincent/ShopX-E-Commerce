namespace ShopxEX1.Dtos.Orders
{
    public class OrderDetailDto
    {
        // Output: Chi tiết 1 dòng trong đơn hàng
        public int OrderDetailID { get; set; }
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty; // Cần map từ Product
        public int CategoryID { get; set; }
        public string CategoryName { get; set; } = string.Empty; // Cần map từ Product
        public string? ProductImageURL { get; set; } // Cần map từ Product
        public int SellerID { get; set; }
        public string ShopName { get; set; } = string.Empty; // Cần map từ Product -> seller
        public string ShopIsActive { get; set; } = string.Empty; // Cần map từ Product -> seller
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; } // Giá lúc đặt hàng
        public decimal LineTotal => UnitPrice * Quantity;
        public bool IsActive { get; set; }
        public decimal CurrentPrice { get; set; }
        public int CurrentStock { get; set; }
        public bool ProductIsActive { get; set; } = true;

    }

}
