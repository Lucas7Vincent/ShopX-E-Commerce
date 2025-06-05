namespace ShopxEX1.Models
{
    public class Contact
    {
        public int ContactID { get; set; }
        public int UserID { get; set; }
        public string Message { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }

        // Navigation Properties
        public virtual User User { get; set; } = null!; // Quan hệ n-1
    }
}
