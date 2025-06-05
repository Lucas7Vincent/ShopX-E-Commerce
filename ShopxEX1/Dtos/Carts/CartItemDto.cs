namespace ShopxEX1.Dtos.Carts
{
    // Output: Chi tiết item trong giỏ
    public class CartItemDto
    {
        public int CartItemID { get; set; }
        public int ProductID { get; set; }
        public string ProductName { get; set; } = string.Empty; // Cần map từ Product
        public string ShopName { get; set; } = string.Empty; // Cần map từ Product.Seller
        public string ShopIsActive { get; set; } = string.Empty; // Cần map từ Product.Seller
        public decimal Price { get; set; } // Cần map từ Product
        public string? ImageURL { get; set; } // Cần map từ Product
        public int Quantity { get; set; }
        public int AvailableStock { get; set; } // Cần map từ Product.StockQuantity
        public bool IsActive { get; set; } // Map từ Product.Isactive
    }
}
