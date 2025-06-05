using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;

namespace ShopxEX1.Services.BackgroundServices
{
    public class OrderAutoCompleteService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<OrderAutoCompleteService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(6); // Check mỗi 6 giờ

        public OrderAutoCompleteService(IServiceProvider serviceProvider, ILogger<OrderAutoCompleteService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 OrderAutoCompleteService started - checking every {Interval}", _checkInterval);

            // Chờ một chút khi start để tránh conflict với việc khởi tạo DB
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessAutoCompleteOrders();
                    await Task.Delay(_checkInterval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("🛑 OrderAutoCompleteService is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ Error in OrderAutoCompleteService");
                    await Task.Delay(TimeSpan.FromMinutes(10), stoppingToken); // Retry sau 10 phút
                }
            }
        }

        private async Task ProcessAutoCompleteOrders()
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            
            try
            {
                // ✅ Tìm các đơn hàng "Đã giao" quá 3 ngày (dùng OrderDate đã được cập nhật khi giao)
                var threeDaysAgo = DateTime.UtcNow.AddDays(-3);
                
                var ordersToComplete = await context.Orders
                    .Where(o => o.Status == "Đã giao" && o.OrderDate <= threeDaysAgo)
                    .ToListAsync();

                if (ordersToComplete.Any())
                {
                    _logger.LogInformation($"🔍 Found {ordersToComplete.Count} orders to auto-complete after 3 days");

                    foreach (var order in ordersToComplete)
                    {
                        try
                        {
                            var oldStatus = order.Status;
                            order.Status = "Hoàn thành";
                            
                            _logger.LogInformation($"✅ Auto-completed order #{order.OrderID} from '{oldStatus}' to 'Hoàn thành' (delivered: {order.OrderDate:yyyy-MM-dd HH:mm})");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"❌ Error auto-completing order #{order.OrderID}");
                        }
                    }

                    await context.SaveChangesAsync();
                    _logger.LogInformation($"💾 Successfully auto-completed {ordersToComplete.Count} orders");
                }
                else
                {
                    _logger.LogDebug("✅ No orders found for auto-completion");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error in ProcessAutoCompleteOrders");
                throw;
            }
        }
    }
}