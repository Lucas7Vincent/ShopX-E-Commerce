// --- Thêm các using cần thiết ---
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models; // Cho Swagger JWT
using ShopxEX1.Data;          // Namespace Data
using ShopxEX1.Mappings;      // Namespace Mappings
using ShopxEX1.Services;      // Namespace Interfaces
using ShopxEX1.Services.BackgroundServices;
using ShopxEX1.Services.Implementations; // Namespace Implementations
using ShopxEX1.Services.Interfaces;
using System.IdentityModel.Tokens.Jwt;
using System.Reflection;
using System.Security.Claims;
using System.Text;

namespace ShopxEX1 // Namespace gốc
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Cấu hình logging
            builder.Logging.ClearProviders();
            builder.Logging.AddConsole();

            // --- Phần khởi tạo Firebase Admin SDK ---
            try
            {
                var firebaseSdkPath = builder.Configuration["FirebaseAdminSdkPath"]; // Đọc đường dẫn từ cấu hình

                if (string.IsNullOrEmpty(firebaseSdkPath))
                {
                    Console.WriteLine("ERROR: FirebaseAdminSdkPath is not configured in appsettings.json or environment variables.");
                }
                else if (!File.Exists(firebaseSdkPath))
                {
                    Console.WriteLine($"ERROR: Firebase Admin SDK key file not found at path: {firebaseSdkPath}");
                }
                else
                {
                    FirebaseApp.Create(new AppOptions()
                    {
                        Credential = GoogleCredential.FromFile(firebaseSdkPath),
                    });
                    Console.WriteLine("Firebase Admin SDK Initialized Successfully.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"FATAL ERROR: Could not initialize Firebase Admin SDK. Exception: {ex.Message}");
            }

            // 1. CORS Configuration (Đơn giản hóa)
            var MyAllowSpecificOrigins = "AllowMyAppOrigins";
            builder.Services.AddCors(options =>
            {
                options.AddPolicy(name: MyAllowSpecificOrigins,
                                  policyBuilder =>
                                  {
                                      // *** CHỈ ĐỊNH RÕ ORIGIN FRONTEND CỦA BẠN ***
                                      policyBuilder.WithOrigins(
                                            builder.Configuration.GetValue<string>("AppSettings:CorsAllowedOrigins")?.Split(',') ?? // Đọc từ appsettings
                                            new[] { "http://127.0.0.1:5500", "http://localhost:5500", "https://127.0.0.1:5500", "https://localhost:5500", "https://127.0.0.1:5501"} // Fallback nếu không có config
                                          )
                                           .AllowAnyHeader()
                                           .AllowAnyMethod();
                                      // .AllowCredentials(); // Nếu cần
                                  });
            });

            // 2. DbContext Configuration
            builder.Services.AddDbContext<AppDbContext>(options =>
            {
                options.UseSqlServer(builder.Configuration.GetConnectionString("ShopX"));
                options.EnableSensitiveDataLogging();
                options.LogTo(Console.WriteLine);

            });

            // 3. AutoMapper Configuration
            builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

            // 4. Đăng ký IHttpContextAccessor (Cần cho việc đọc Header trong một số trường hợp)
            builder.Services.AddHttpContextAccessor();
            // Đăng ký GetID
            builder.Services.AddScoped<ShopxEX1.Helpers.GetID>();

            // 5. Application Services Registration (Đăng ký TẤT CẢ)
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IProductService, ProductService>();
            builder.Services.AddScoped<ICategoryService, CategoryService>();
            builder.Services.AddScoped<IDiscountService, DiscountService>();
            builder.Services.AddScoped<ICartService, CartService>();
            builder.Services.AddScoped<IOrderService, OrderService>();
            builder.Services.AddScoped<IContactService, ContactService>();
            builder.Services.AddScoped<IReportingService, ReportingService>();
            builder.Services.AddScoped<ISessionService, SessionService>();
            builder.Services.AddScoped<IStatisticsService, StatisticsService>();
            builder.Services.AddScoped<INotificationService, NotificationService>();
            builder.Services.AddScoped<ISellerPublicService, SellerPublicService>();

            // 6. Controller Configuration
            builder.Services.AddControllers()
                 .AddJsonOptions(options =>
                 {
                     options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles; // Hoặc Preserve
                     options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
                 });


            // 7. JWT Authentication Configuration
            builder.Services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = builder.Configuration["Jwt:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = builder.Configuration["Jwt:Audience"],
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero
                };
            });

            // 8. Authorization Configuration
            builder.Services.AddAuthorization(options =>
            {
                // Định nghĩa các policies ở đây nếu cần
                // options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
                // options.AddPolicy("SellerOnly", policy => policy.RequireRole("Seller"));
            });
            //ĐĂNG KÝ SERVICES CHO PASSWORD RESET
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IEmailService, SmtpEmailService>();
            // Tự động chạy
            //builder.Services.AddHostedService<OrderAutoCompleteService>();

            // 9. Swagger/OpenAPI Configuration
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(option =>
            {
                option.SwaggerDoc("v1", new OpenApiInfo { Title = "ShopX API", Version = "v1" });

                // --- Phần cấu hình JWT Bearer ---
                // Định nghĩa Security Scheme tên là "Bearer"
                option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    In = ParameterLocation.Header, // Token được đặt trong Header
                    Description = "Vui lòng nhập JWT với tiền tố Bearer vào ô bên dưới.\n\nVí dụ: \"Bearer {your_token}\"",
                    Name = "Authorization", 
                    Type = SecuritySchemeType.Http, 
                    BearerFormat = "JWT",
                    Scheme = "bearer"              
                });

                // Yêu cầu Security Scheme "Bearer" được áp dụng cho các API
                option.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        // Tham chiếu đến Security Scheme "Bearer" đã định nghĩa ở trên
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme, // Loại tham chiếu là SecurityScheme
                                Id = "Bearer"                        // ID phải khớp với tên đã định nghĩa ("Bearer")
                            }
                        },
                        new string[]{} // Hoặc: new List<string>()
                    }
                });
            });

            // 10. Thêm các dịch vụ khác nếu cần

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI(c =>
                {
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ShopX API V1");
                });
                app.UseDeveloperExceptionPage();
            }
            else
            {
                // Middleware xử lý lỗi tập trung
                app.UseExceptionHandler(appBuilder =>
                {
                    appBuilder.Run(async context =>
                    {
                        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                        await context.Response.WriteAsync("Đã xảy ra lỗi không mong muốn."); // Thông báo chung
                    });
                });
                app.UseHsts();
            }

            app.UseHttpsRedirection();

            app.UseRouting();

            app.UseCors(MyAllowSpecificOrigins);

            app.UseAuthentication();

            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
