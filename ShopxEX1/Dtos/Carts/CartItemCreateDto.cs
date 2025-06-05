using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Carts
{
    // Input: Thêm item vào giỏ
    public class CartItemCreateDto
    {
        [Required] public int ProductID { get; set; }
        [Required][Range(1, 100)] public int Quantity { get; set; } = 1;
    }
}
