using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ShopxEX1.Models
{
    public class User
    {
        public int UserID { get; set; }
        public string Email { get; set; } = string.Empty;
        public string? PasswordHash { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public DateTime? Birthday { get; set; }
        public bool? Gender { get; set; }
        public string? Address { get; set; }
        public string? Avatar { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        public string? SocialProvider { get; set; }
        public string? SocialID { get; set; }
        public string Role { get; set; } = "Customer"; // Customer, Seller, Admin

        // Navigation Properties
        public virtual Seller? SellerProfile { get; set; }
        public virtual ICollection<Cart> Carts { get; set; } = new List<Cart>();
        public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
        public virtual ICollection<Contact> Contacts { get; set; } = new List<Contact>();
    }
}
