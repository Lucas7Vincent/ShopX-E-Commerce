using Microsoft.EntityFrameworkCore;
using ShopxEX1.Models;

namespace ShopxEX1.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Contact> Contacts { get; set; } = null!;
        public DbSet<Seller> Sellers { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;
        public DbSet<Product> Products { get; set; } = null!;
        public DbSet<Cart> Carts { get; set; } = null!;
        public DbSet<CartItem> CartItems { get; set; } = null!;
        public DbSet<Order> Orders { get; set; } = null!;
        public DbSet<OrderDetail> OrderDetails { get; set; } = null!;
        public DbSet<Discount> Discounts { get; set; } = null!;
        public DbSet<SellerCategory> SellerCategories { get; set; } = null!;
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<UserNotification> UserNotifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder); // Khuyến nghị gọi phương thức của lớp cơ sở

            // --- Cấu hình User ---
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserID); // Khóa Chính (Primary Key)

                entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
                entity.HasIndex(e => e.Email).IsUnique(); // Đảm bảo Email là duy nhất

                entity.Property(e => e.PasswordHash).HasMaxLength(255); // Điều chỉnh độ dài nếu cần
                entity.Property(e => e.FullName).HasMaxLength(100);
                entity.Property(e => e.Phone).HasMaxLength(20);
                entity.Property(e => e.Address).HasMaxLength(500);
                entity.Property(e => e.Avatar).HasMaxLength(1024); // Độ dài tối đa cho URL/đường dẫn
                // Birthday (DateTime?) và Gender (bool?) mặc định cho phép null
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()"); // Giá trị mặc định cho SQL Server
                entity.Property(e => e.IsActive).HasDefaultValue(true); // Giá trị mặc định là true
                entity.Property(e => e.SocialProvider).HasMaxLength(50);
                entity.Property(e => e.SocialID).HasMaxLength(255);
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50).ValueGeneratedNever();
                // HasDefaultValue("Customer"); // Giá trị mặc định là "Customer"

                // Các mối quan hệ được định nghĩa qua các thuộc tính điều hướng (navigation properties) bên dưới
            });

            // --- Cấu hình Contact ---
            modelBuilder.Entity<Contact>(entity =>
            {
                entity.HasKey(e => e.ContactID); // Khóa Chính (Primary Key)
                entity.HasOne(c => c.User) // Thuộc tính điều hướng đến User trong Contact
                      .WithMany(u => u.Contacts) // Thuộc tính collection Contacts trong User
                      .HasForeignKey(c => c.UserID) // Khóa ngoại trong bảng Contacts
                      .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.Message).HasColumnType("nvarchar(MAX)"); // Khớp với sơ đồ

                entity.Property(e => e.Status).HasMaxLength(50); // Khớp với sơ đồ

                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()"); // Giá trị mặc định nếu là SQL Server
                                                                                   // Hoặc .HasDefaultValue(DateTime.UtcNow) nếu muốn EF Core quản lý
            });

            // --- Cấu hình Seller ---
            modelBuilder.Entity<Seller>(entity =>
            {
                entity.HasKey(e => e.SellerID); // Khóa Chính

                // Cấu hình mối quan hệ Một-Một (One-to-One) với User
                entity.HasOne(s => s.User) // Thuộc tính điều hướng đến User
                      .WithOne(u => u.SellerProfile) // Thuộc tính điều hướng trong User
                      .HasForeignKey<Seller>(s => s.UserID) // Thuộc tính khóa ngoại (Foreign Key) trong Seller
                      .OnDelete(DeleteBehavior.Cascade); // Nếu User bị xóa, xóa cả hồ sơ Seller tương ứng

                entity.Property(e => e.ShopName).IsRequired().HasMaxLength(150);
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.IsActive).HasDefaultValue(true);
            });

            // --- Cấu hình SellerCategory ---
            modelBuilder.Entity<SellerCategory>(entity =>
            {
                entity.HasKey(e => e.SellerCategoryID); // Khóa Chính

                entity.HasOne(sc => sc.Seller) // Thuộc tính điều hướng đến Seller
                      .WithMany(s => s.SellerCategories) // Collection (Danh sách) trong Seller
                      .HasForeignKey(sc => sc.SellerID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Cascade); // Nếu Seller bị xóa, xóa các category của họ

                entity.Property(e => e.CategoryName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500); // Cho phép null
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.IsActive).HasDefaultValue(true);
            });

            // --- Cấu hình Category ---
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(e => e.CategoryID); // Khóa Chính
                entity.Property(e => e.CategoryName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Description).HasMaxLength(500); // Cho phép null
            });

            // --- Cấu hình Product ---
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(e => e.ProductID); // Khóa Chính

                entity.HasOne(p => p.Category) // Thuộc tính điều hướng đến Category
                      .WithMany(c => c.Products) // Collection trong Category
                      .HasForeignKey(p => p.CategoryID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Restrict); // Ngăn chặn xóa Category nếu có Product liên quan

                entity.HasOne(p => p.SellerCategory) // Thuộc tính điều hướng đến SellerCategory
                      .WithMany(sc => sc.Products) // Collection trong SellerCategory
                      .HasForeignKey(p => p.SellerCategoryID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Restrict); // Ngăn chặn xóa SellerCategory nếu có Product liên quan
                entity.HasOne(p => p.Seller) // Thuộc tính điều hướng đến Seller
                      .WithMany(sc => sc.Products) // Collection trong Seller
                      .HasForeignKey(p => p.SellerID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Cascade); // Ngăn chặn xóa Seller nếu có Product liên quan
                 // Notification configurations
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.HasKey(e => e.NotificationID);
                entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Content).IsRequired();
                entity.Property(e => e.Type).HasMaxLength(50).HasDefaultValue("general");
                entity.Property(e => e.Icon).HasMaxLength(50).HasDefaultValue("fa-bell");
                entity.Property(e => e.TargetAudience).HasMaxLength(20).HasDefaultValue("both");
                entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("draft");
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
                
                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // UserNotification configurations
            modelBuilder.Entity<UserNotification>(entity =>
            {
                entity.HasKey(e => e.UserNotificationID);
                entity.Property(e => e.UserType).IsRequired().HasMaxLength(10);
                entity.Property(e => e.ReceivedAt).HasDefaultValueSql("GETDATE()");
                
                entity.HasOne(e => e.Notification)
                    .WithMany(n => n.UserNotifications)
                    .HasForeignKey(e => e.NotificationID)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserID)
                    .OnDelete(DeleteBehavior.Cascade);

                // Indexes for performance
                entity.HasIndex(e => new { e.UserID, e.UserType });
                entity.HasIndex(e => e.NotificationID);
                entity.HasIndex(e => e.IsRead);
            });

                entity.Property(e => e.ProductName).IsRequired().HasMaxLength(255);
                entity.Property(e => e.ImageURL).HasMaxLength(1024); // Cho phép null
                entity.Property(e => e.Description).HasMaxLength(2000); // Cho phép null, độ dài lớn hơn
                entity.Property(e => e.Price).HasColumnType("decimal(18, 2)").IsRequired(); // Chỉ định độ chính xác (precision và scale)
                entity.Property(e => e.StockQuantity).IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.IsActive).HasDefaultValue(true);
            });

            // --- Cấu hình Cart ---
            modelBuilder.Entity<Cart>(entity =>
            {
                entity.HasKey(e => e.CartID); // Khóa Chính

                entity.HasOne(c => c.User) // Thuộc tính điều hướng đến User
                      .WithMany(u => u.Carts) // Collection trong User
                      .HasForeignKey(c => c.UserID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Cascade); // Nếu User bị xóa, xóa các Cart của họ

                entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETDATE()");
            });

            // --- Cấu hình CartItem ---
            modelBuilder.Entity<CartItem>(entity =>
            {
                entity.HasKey(e => e.CartItemID); // Khóa Chính

                entity.HasOne(ci => ci.Cart) // Thuộc tính điều hướng đến Cart
                      .WithMany(c => c.CartItems) // Collection trong Cart
                      .HasForeignKey(ci => ci.CartID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Cascade); // Nếu Cart bị xóa, xóa các Item của nó

                entity.HasOne(ci => ci.Product) // Thuộc tính điều hướng đến Product
                      .WithMany(p => p.CartItems) // Collection trong Product
                      .HasForeignKey(ci => ci.ProductID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Cascade); // Nếu Product bị xóa, xóa khỏi các giỏ hàng

                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.AddedAt).HasDefaultValueSql("GETDATE()");
            });

            // --- Cấu hình Discount ---
            modelBuilder.Entity<Discount>(entity =>
            {
                entity.HasKey(e => e.DiscountID); // Khóa Chính

                entity.Property(e => e.DiscountCode).IsRequired().HasMaxLength(50);
                entity.HasIndex(e => e.DiscountCode).IsUnique(); // Đảm bảo DiscountCode là duy nhất

                entity.Property(e => e.DiscountPercent).HasColumnType("decimal(18, 2)").IsRequired(); // Ví dụ về độ chính xác
                entity.Property(e => e.Budget).IsRequired(); // Ví dụ về độ chính xác
                entity.Property(e => e.MaxDiscountPercent).IsRequired(); // Ví dụ về độ chính xác
                entity.Property(e => e.RemainingBudget).HasColumnType("decimal(18, 2)").IsRequired(); // Ví dụ về độ chính xác
                entity.Property(e => e.StartDate).IsRequired();
                entity.Property(e => e.EndDate).IsRequired();
                entity.Property(e => e.IsActive).IsRequired();
            });

            // --- Cấu hình Order ---
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(e => e.OrderID); // Khóa Chính

                entity.HasOne(o => o.User) // Thuộc tính điều hướng đến User
                      .WithMany(u => u.Orders) // Collection trong User
                      .HasForeignKey(o => o.UserID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Restrict); // Ngăn chặn xóa User nếu họ có Order liên quan

                entity.HasOne(o => o.Discount) // Thuộc tính điều hướng đến Discount
                      .WithMany(d => d.Orders) // Collection trong Discount
                      .HasForeignKey(o => o.DiscountID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Restrict); // Ngăn chặn xóa Discount nếu đã được sử dụng trong Order
                                                          // Chú ý: DiscountID là kiểu int (bắt buộc). Nếu việc áp dụng giảm giá là tùy chọn (có thể không có),
                                                          // thuộc tính DiscountID trong Order nên là kiểu int? (cho phép null)
                                                          // và cấu hình khóa ngoại (FK) cần phản ánh điều đó (ví dụ dùng .IsRequired(false))

                entity.Property(e => e.OrderDate).HasDefaultValueSql("GETDATE()");
                entity.Property(e => e.TotalAmount).HasColumnType("decimal(18, 2)").IsRequired();
                entity.Property(e => e.TotalPayment).HasColumnType("decimal(18, 2)").IsRequired();
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
                entity.Property(e => e.DiscountCode).HasMaxLength(50); // Cho phép null
                entity.Property(e => e.ShippingAddress).IsRequired().HasMaxLength(500);
            });

            // --- Cấu hình OrderDetail ---
            modelBuilder.Entity<OrderDetail>(entity =>
            {
                entity.HasKey(e => e.OrderDetailID); // Khóa Chính

                entity.HasOne(od => od.Order) // Thuộc tính điều hướng đến Order
                      .WithMany(o => o.OrderDetails) // Collection trong Order
                      .HasForeignKey(od => od.OrderID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Cascade); // Nếu Order bị xóa, xóa các OrderDetail liên quan

                entity.HasOne(od => od.Product) // Thuộc tính điều hướng đến Product
                      .WithMany(p => p.OrderDetails) // Collection trong Product
                      .HasForeignKey(od => od.ProductID) // Khóa Ngoại
                      .OnDelete(DeleteBehavior.Restrict); // Ngăn chặn xóa Product nếu nó là một phần của OrderDetail

                entity.Property(e => e.Quantity).IsRequired();
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)").IsRequired();
            });
        }
    }
}
