using System.ComponentModel.DataAnnotations;

namespace ShopxEX1.Dtos.Carts
{
    // Input: Cập nhật số lượng item
    public class CartItemUpdateDto
    {
        [Required][Range(1, 100)] public int Quantity { get; set; }
    }
}
