using AutoMapper;
using ShopxEX1.Models;
using ShopxEX1.Dtos.Products;
using ShopxEX1.Dtos.Auth;
using ShopxEX1.Dtos.Users;
using ShopxEX1.Dtos.Sellers;
using ShopxEX1.Dtos.Categories;
using ShopxEX1.Dtos.Carts;
using ShopxEX1.Dtos.Orders;
using ShopxEX1.Dtos.Discounts;
using ShopxEX1.Dtos.SellerCategory;
using ShopxEX1.Dtos.Contacts;
using ShopxEX1.Dtos.Notifications;

namespace ShopxEX1.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // === User & Auth Mappings ===

            CreateMap<User, UserDto>()
                .ForMember(dest => dest.UserID, opt => opt.MapFrom(src => src.UserID))
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.FullName))
                .ForMember(dest => dest.Phone, opt => opt.MapFrom(src => src.Phone))
                .ForMember(dest => dest.Address, opt => opt.MapFrom(src => src.Address))
                .ForMember(dest => dest.Role, opt => opt.MapFrom(src => src.Role))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(src => src.CreatedAt)) 
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.IsActive)) 
                .ForMember(dest => dest.Birthday, opt => opt.MapFrom(src => src.Birthday)) 
                .ForMember(dest => dest.Gender, opt => opt.MapFrom(src => src.Gender))   
                .ForMember(dest => dest.Avatar, opt => opt.MapFrom(src => src.Avatar))   
                .ForMember(dest => dest.SellerID,
                    opt => opt.MapFrom(src => src.SellerProfile != null ? (int?)src.SellerProfile.SellerID : null)) 
                .ForMember(dest => dest.ShopName,
                    opt => opt.MapFrom(src => src.SellerProfile != null ? src.SellerProfile.ShopName : null));

            CreateMap<User, UserSummaryDto>()
                 .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => (bool?)src.IsActive));

            CreateMap<RegisterDto, User>()
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.SellerProfile, opt => opt.Ignore())
                .ForMember(dest => dest.Carts, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore());

            CreateMap<UserCreateDto, User>()
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.SellerProfile, opt => opt.Ignore())
                .ForMember(dest => dest.Carts, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore())
                .ForMember(dest => dest.Contacts, opt => opt.Ignore());

            CreateMap<UpdateProfileDto, User>()
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.SocialProvider, opt => opt.Ignore())
                .ForMember(dest => dest.SocialID, opt => opt.Ignore())
                .ForMember(dest => dest.SellerProfile, opt => opt.Ignore())
                .ForMember(dest => dest.Carts, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore());

            CreateMap<AdminUserUpdateDto, User>()
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.Email, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.SellerProfile, opt => opt.Ignore())
                .ForMember(dest => dest.Carts, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore())
                .ForMember(dest => dest.Contacts, opt => opt.Ignore());

            CreateMap<SocialLoginRequestDto, User>()
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email))
                .ForMember(dest => dest.SocialProvider, opt => opt.MapFrom(src => src.Provider))
                .ForMember(dest => dest.SocialID, opt => opt.MapFrom(src => src.UserId))
                .ForMember(dest => dest.FullName, opt => opt.Ignore())
                .ForMember(dest => dest.Avatar, opt => opt.Ignore())
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
                .ForMember(dest => dest.Phone, opt => opt.Ignore())
                .ForMember(dest => dest.Address, opt => opt.Ignore())
                .ForMember(dest => dest.Role, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.Birthday, opt => opt.Ignore())
                .ForMember(dest => dest.Gender, opt => opt.Ignore())
                .ForMember(dest => dest.SellerProfile, opt => opt.Ignore())
                .ForMember(dest => dest.Carts, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore());

            // === Seller Mappings ===
            CreateMap<Seller, SellerProfileDto>()
                .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.User != null ? src.User.Email : null))
                .ForMember(dest => dest.UserFullName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : null))
                .ForMember(dest => dest.UserPhone, opt => opt.MapFrom(src => src.User != null ? src.User.Phone : null))
                .ForMember(dest => dest.UserAddress, opt => opt.MapFrom(src => src.User != null ? src.User.Address : null));

            CreateMap<Seller, SellerRequestDto>();

            CreateMap<SellerUpdateDto, Seller>()
                .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.IsActive, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            // === SellerCategory Mappings ===
            CreateMap<SellerCategory, SellerCategoryDto>()
                .ForMember(dest => dest.SellerShopName, opt => opt.MapFrom(src => src.Seller != null ? src.Seller.ShopName : string.Empty));

            CreateMap<SellerCategory, SellerCategorySummaryDto>();

            CreateMap<SellerCategoryCreateDto, SellerCategory>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                .ForMember(dest => dest.Seller, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            CreateMap<SellerCategoryUpdateDto, SellerCategory>()
                .ForMember(dest => dest.SellerCategoryID, opt => opt.Ignore())
                .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Seller, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            // === Contact Mappings ===
            CreateMap<Contact, ContactDto>()
                .ForMember(dest => dest.UserFullName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : null))
                .ForMember(dest => dest.UserNumberPhone, opt => opt.MapFrom(src => src.User != null ? src.User.Phone : null))
                .ForMember(dest => dest.UserEmail, opt => opt.MapFrom(src => src.User != null ? src.User.Email : null));

            CreateMap<ContactCreateDto, Contact>()
                .ForMember(dest => dest.ContactID, opt => opt.Ignore()) // Không map ID khi tạo
                .ForMember(dest => dest.UserID, opt => opt.Ignore())    // Sẽ được gán ở service
                .ForMember(dest => dest.Status, opt => opt.Ignore())    // Sẽ được gán mặc định ở service
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore()) // Sẽ được gán ở service
                .ForMember(dest => dest.User, opt => opt.Ignore());      // Không map navigation property

            CreateMap<ContactUpdateDto, Contact>()
                .ForMember(dest => dest.ContactID, opt => opt.Ignore())
                .ForMember(dest => dest.UserID, opt => opt.Ignore())
                .ForMember(dest => dest.Message, opt => opt.Ignore()) // Thường không cho sửa message
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.User, opt => opt.Ignore());

            // === Category Mappings ===
            CreateMap<Category, CategoryDto>();

            CreateMap<CategoryCreateDto, Category>()
                .ForMember(dest => dest.CategoryID, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            CreateMap<CategoryUpdateDto, Category>()
                .ForMember(dest => dest.CategoryID, opt => opt.Ignore())
                .ForMember(dest => dest.Products, opt => opt.Ignore());

            // === Product Mappings ===
            CreateMap<Product, ProductDto>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : null))
                .ForMember(dest => dest.SellerID, opt => opt.MapFrom(src => src.Seller != null ? src.Seller.SellerID : (int?)null))
                .ForMember(dest => dest.SellerStoreName, opt => opt.MapFrom(src => src.Seller != null ? src.Seller.ShopName : null));

            CreateMap<Product, ProductDto>()
                        .ForMember(dest => dest.Status,
                                   opt => opt.MapFrom(src => src.IsActive ? "active" : "inactive"));
            CreateMap<Product, ProductDto>()
                        .ForMember(dest => dest.SellerStoreName, opt => opt.Ignore()); 
            CreateMap<Product, ProductSummaryDto>()
                .ForMember(dest => dest.Status,
                           opt => opt.MapFrom(src => src.IsActive ? "active" : "inactive"));
            CreateMap<Product, ProductSummaryDto>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : null))
                .ForMember(dest => dest.ShopName, opt => opt.MapFrom(src => src.Seller != null ? src.Seller.ShopName : null));

            CreateMap<ProductCreateDto, Product>()
                 .ForMember(dest => dest.ProductID, opt => opt.Ignore())
                 .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                 .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                 .ForMember(dest => dest.Category, opt => opt.Ignore())
                 .ForMember(dest => dest.Seller, opt => opt.Ignore())
                 .ForMember(dest => dest.CartItems, opt => opt.Ignore())
                 .ForMember(dest => dest.OrderDetails, opt => opt.Ignore());

            CreateMap<ProductUpdateDto, Product>()
                 .ForMember(dest => dest.ProductID, opt => opt.Ignore())
                 .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                 .ForMember(dest => dest.SellerID, opt => opt.Ignore())
                 .ForMember(dest => dest.Category, opt => opt.Ignore())
                 .ForMember(dest => dest.Seller, opt => opt.Ignore())
                 .ForMember(dest => dest.CartItems, opt => opt.Ignore())
                 .ForMember(dest => dest.OrderDetails, opt => opt.Ignore());


            // === Cart & CartItem Mappings ===
            CreateMap<CartItem, CartItemDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : null))
                .ForMember(dest => dest.ShopName, opt => opt.MapFrom(src => src.Product != null && src.Product.Seller != null ? src.Product.Seller.ShopName : null))
                .ForMember(dest => dest.ShopIsActive, opt => opt.MapFrom(src => src.Product != null && src.Product.Seller != null ? src.Product.Seller.IsActive : false))
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.Product != null ? src.Product.IsActive : false))
                .ForMember(dest => dest.Price, opt => opt.MapFrom(src => src.Product != null ? src.Product.Price : 0))
                .ForMember(dest => dest.ImageURL, opt => opt.MapFrom(src => src.Product != null ? src.Product.ImageURL : null))
                .ForMember(dest => dest.AvailableStock, opt => opt.MapFrom(src => src.Product != null ? src.Product.StockQuantity : 0));

            CreateMap<Cart, CartDto>()
                .ForMember(dest => dest.TotalPrice, opt => opt.MapFrom(src => src.CartItems != null ? src.CartItems.Sum(ci => (ci.Product != null ? ci.Product.Price : 0) * ci.Quantity) : 0));

            CreateMap<CartItemCreateDto, CartItem>()
               .ForMember(dest => dest.CartItemID, opt => opt.Ignore())
               .ForMember(dest => dest.CartID, opt => opt.Ignore())
               .ForMember(dest => dest.AddedAt, opt => opt.Ignore())
               .ForMember(dest => dest.Product, opt => opt.Ignore())
               .ForMember(dest => dest.Cart, opt => opt.Ignore());
            CreateMap<CartItemUpdateDto, CartItem>()
                .ForMember(dest => dest.CartItemID, opt => opt.Ignore())
                .ForMember(dest => dest.CartID, opt => opt.Ignore())
                .ForMember(dest => dest.ProductID, opt => opt.Ignore())
                .ForMember(dest => dest.AddedAt, opt => opt.Ignore())
                .ForMember(dest => dest.Product, opt => opt.Ignore())
                .ForMember(dest => dest.Cart, opt => opt.Ignore());

            // === Order & OrderDetail Mappings ===
            CreateMap<OrderDetail, OrderDetailDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : "N/A"))
                .ForMember(dest => dest.ProductImageURL, opt => opt.MapFrom(src => src.Product != null ? src.Product.ImageURL : null))
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.Product != null ? src.Product.IsActive : false))
                .ForMember(dest => dest.CategoryID, opt => opt.MapFrom(src => src.Product != null && src.Product.Category != null ? src.Product.CategoryID : 0))
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Product != null && src.Product.Category != null ? src.Product.Category.CategoryName : "N/A"))
                .ForMember(dest => dest.SellerID, opt => opt.MapFrom(src => src.Product != null && src.Product.Seller != null ? src.Product.SellerID : 0))
                .ForMember(dest => dest.ShopIsActive, opt => opt.MapFrom(src => src.Product != null && src.Product.Seller != null ? src.Product.Seller.IsActive : false))
                .ForMember(dest => dest.ShopName, opt => opt.MapFrom(src => src.Product != null && src.Product.Seller != null ? src.Product.Seller.ShopName : "N/A"));

            CreateMap<Order, OrderDto>()
                 .ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.OrderDetails))
                 .ForMember(dest => dest.CustomerInfo, opt => opt.MapFrom(src => src.User));

            CreateMap<Order, OrderSummaryDto>()
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => src.User != null ? src.User.FullName : "N/A"))
                .ForMember(dest => dest.NumberOfItems, opt => opt.MapFrom(src => src.OrderDetails != null ? src.OrderDetails.Sum(od => od.Quantity) : 0));

            // === Discount Mappings ===
            CreateMap<Discount, DiscountDto>();

            CreateMap<DiscountCreateDto, Discount>()
                .ForMember(dest => dest.DiscountID, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore()) // Thêm dòng này để bỏ qua Orders
                .ForMember(dest => dest.RemainingBudget, opt => opt.MapFrom(src => src.Budget));

            CreateMap<DiscountUpdateDto, Discount>()
                .ForMember(dest => dest.DiscountID, opt => opt.Ignore())
                .ForMember(dest => dest.DiscountCode, opt => opt.Ignore())
                .ForMember(dest => dest.Orders, opt => opt.Ignore());
            // === User Notification Mappings ===
            CreateMap<Notification, NotificationDto>();
            
            CreateMap<CreateNotificationDto, Notification>()
                .ForMember(dest => dest.NotificationID, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedBy, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.SentAt, opt => opt.Ignore())
                .ForMember(dest => dest.TotalSent, opt => opt.Ignore())
                .ForMember(dest => dest.TotalRead, opt => opt.Ignore());

            CreateMap<UpdateNotificationDto, Notification>()
                .ForMember(dest => dest.NotificationID, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedBy, opt => opt.Ignore())
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.SentAt, opt => opt.Ignore())
                .ForMember(dest => dest.TotalSent, opt => opt.Ignore())
                .ForMember(dest => dest.TotalRead, opt => opt.Ignore());
        }
        }
    }
