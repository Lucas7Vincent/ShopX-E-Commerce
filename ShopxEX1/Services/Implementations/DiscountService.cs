using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Discounts;
using ShopxEX1.Helpers;
using ShopxEX1.Models;

namespace ShopxEX1.Services.Implementations
{
    public class DiscountService : IDiscountService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<DiscountService> _logger;

        public DiscountService(AppDbContext context, IMapper mapper, ILogger<DiscountService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task<DiscountDto?> CreateDiscountAsync(DiscountCreateDto createDto)
        {
            try
            {
                _logger.LogInformation("Đang thử tạo mã giảm giá với mã: {DiscountCode}", createDto.DiscountCode);

                if (createDto.EndDate <= createDto.StartDate)
                {
                    _logger.LogWarning("Tạo mã giảm giá thất bại: Ngày kết thúc không thể trước hoặc bằng ngày bắt đầu cho mã {DiscountCode}.", createDto.DiscountCode);
                    throw new ArgumentException("Ngày kết thúc không thể trước hoặc bằng ngày bắt đầu.");
                }
                // Kiểm tra DiscountCode có bị trùng lặp hay không, không phân biệt chữ hoa và thường (ABC = abc)
                var existingDiscount = await _context.Discounts
                                            .AsNoTracking()
                                            .FirstOrDefaultAsync(d => d.DiscountCode.ToLower() == createDto.DiscountCode.ToLower());
                if (existingDiscount != null)
                {
                    _logger.LogWarning("Tạo mã giảm giá thất bại: Mã '{DiscountCode}' đã tồn tại.", createDto.DiscountCode);
                    throw new InvalidOperationException($"Mã giảm giá '{createDto.DiscountCode}' đã tồn tại.");
                }

                var discount = _mapper.Map<Discount>(createDto);
                // IsActive đã được map từ DTO (mặc định là true trong DTO)

                await _context.Discounts.AddAsync(discount);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Tạo mã giảm giá thành công với ID: {DiscountID} và Mã: {DiscountCode}", discount.DiscountID, discount.DiscountCode);
                return _mapper.Map<DiscountDto>(discount);
            }
            catch (Exception ex)
            {
                _logger.LogInformation("Lỗi khi tạo mã giảm giá");
                throw;
            }
            
        }

        public async Task<PagedResult<DiscountDto>> GetAllDiscountsAsync(DiscountFilterDto filter, int pageNumber, int pageSize)
        {
            try
            {
                _logger.LogInformation("Đang lấy danh sách mã giảm giá với bộ lọc: SearchTerm='{SearchTerm}', IsActive='{IsActive}', ValidOnDate='{ValidOnDate}', Trang {PageNumber}, Kích thước trang {PageSize}",
                    filter.SearchTerm, filter.IsActive, filter.ValidOnDate, pageNumber, pageSize);

                // Kiểm tra điều kiện lọc
                var query = _context.Discounts.AsNoTracking();

                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var searchTermLower = filter.SearchTerm.ToLower();
                    query = query.Where(d => d.DiscountCode.ToLower().Contains(searchTermLower));
                }

                if (filter.IsActive.HasValue)
                {
                    query = query.Where(d => d.IsActive == filter.IsActive.Value);
                }

                if (filter.ValidOnDate.HasValue)
                {
                    var targetDate = filter.ValidOnDate.Value.Date;
                    query = query.Where(d => d.IsActive && d.StartDate.Date <= targetDate && d.EndDate.Date >= targetDate);
                }

                // Mặc định kiểu sắp xếp theo ngày kết thúc
                query = query.OrderByDescending(d => d.EndDate);

                // Lấy mã giảm giá
                var totalCount = await query.CountAsync();
                var items = await query.Skip((pageNumber - 1) * pageSize)
                                       .Take(pageSize)
                                       .ToListAsync();

                _logger.LogInformation("Đã lấy được {ItemCount} mã giảm giá trên tổng số {TotalCount} mã.", items.Count, totalCount);
                var mappedItems = _mapper.Map<IEnumerable<DiscountDto>>(items);
                return new PagedResult<DiscountDto>(mappedItems, pageNumber, pageSize, totalCount);
            }
            catch (Exception ex) {
                throw new Exception("Có lỗi xảy ra trong quá trình lấy mã giảm giá");
            }
        }

        public async Task<List<DiscountDto>> GetAllDiscountsCustomerPageAsync()
        {
            _logger.LogInformation("Đang lấy tất cả mã giảm giá từ cơ sở dữ liệu.");
            try
            {
                var discounts = await _context.Discounts
                                                .AsNoTracking()
                                                .Where(d => d.IsActive)
                                                .OrderBy(d => d.StartDate.Date)
                                                .ToListAsync();
                _logger.LogInformation("Đã lấy thành công {Count} mã giảm giá.", discounts.Count);

                var discountDto = _mapper.Map<List<DiscountDto>>(discounts);
                return discountDto;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy tất cả mã giảm giá.");
                throw new Exception("Lỗi xảy ra khi lấy tất cả mã giảm giá"); // Ném lại lỗi để controller xử lý
            }
            
        }

        public async Task<DiscountDto?> GetDiscountByIdAsync(int discountId)
        {
            _logger.LogInformation("Đang tìm mã giảm giá với ID: {DiscountID}", discountId);
            var discount = await _context.Discounts.AsNoTracking().FirstOrDefaultAsync(d => d.DiscountID == discountId);
            if (discount == null)
            {
                _logger.LogInformation("Không tìm thấy mã giảm giá với ID {DiscountID}.", discountId);
                throw new Exception("Không tìm thấy mã giảm giá");
            }
            _logger.LogInformation("Đã tìm thấy mã giảm giá ID {DiscountID} với mã: {DiscountCode}", discountId, discount.DiscountCode);
            return _mapper.Map<DiscountDto>(discount);
        }

        public async Task<DiscountDto?> GetDiscountByCodeAsync(string discountCode, bool checkCurrentValidity = false)
        {
            _logger.LogInformation("Đang tìm mã giảm giá với mã: '{DiscountCode}', kiểm tra hiệu lực: {CheckValidity}", discountCode, checkCurrentValidity);
            var discount = await _context.Discounts
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync(d => d.DiscountCode.ToLower() == discountCode.ToLower() );

            if (discount == null)
            {
                _logger.LogInformation("Không tìm thấy mã giảm giá với mã '{DiscountCode}'.", discountCode);
                throw new Exception("Không tìm thấy mã giảm giá");
            }
            _logger.LogInformation("Đã tìm thấy mã giảm giá ID {DiscountID} với mã: {DiscountCode}", discount.DiscountID, discount.DiscountCode);
            
            // Kiểm tra tính hợp lệ của mã giảm giấ
            if (checkCurrentValidity)
            {
                var now = DateTime.UtcNow;
                if (!discount.IsActive || now < discount.StartDate || now > discount.EndDate)
                {
                    _logger.LogInformation("Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) được tìm thấy nhưng hiện không hợp lệ (Kích hoạt: {IsActive}, Bắt đầu: {StartDate}, Kết thúc: {EndDate}). Thời gian UTC hiện tại: {CurrentTime}",
                        discount.DiscountCode, discount.DiscountID, discount.IsActive, discount.StartDate, discount.EndDate, now);
                    throw new Exception("Mã giảm giá được tìm thấy nhưng hiện không hợp lệ");
                }
                _logger.LogInformation("Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) hợp lệ để sử dụng.", discountCode, discount.DiscountID);
            }
            return _mapper.Map<DiscountDto>(discount);
        }

        public async Task<DiscountValidationResultDto> ValidateDiscountForCheckoutAsync(string discountCode)
        {
            _logger.LogInformation("Đang kiểm tra mã giảm giá '{DiscountCode}' cho việc thanh toán.", discountCode);
            var discount = await _context.Discounts
                                   .AsNoTracking()
                                   .FirstOrDefaultAsync(d => d.DiscountCode.ToLower() == discountCode.ToLower());

            if (discount == null)
            {
                _logger.LogInformation("Kiểm tra thất bại: Mã giảm giá '{DiscountCode}' không tồn tại.", discountCode);
                return new DiscountValidationResultDto(false, $"Mã giảm giá '{discountCode}' không tồn tại.");
            }

            var now = DateTime.UtcNow;
            if (!discount.IsActive)
            {
                _logger.LogInformation("Kiểm tra thất bại: Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) không còn hoạt động.", discountCode, discount.DiscountID);
                return new DiscountValidationResultDto(false, $"Mã giảm giá '{discountCode}' không còn hoạt động.");
            }
            if (now < discount.StartDate)
            {
                _logger.LogInformation("Kiểm tra thất bại: Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) chưa đến ngày bắt đầu sử dụng (Bắt đầu từ: {StartDate:dd/MM/yyyy}).", discountCode, discount.DiscountID, discount.StartDate);
                return new DiscountValidationResultDto(false, $"Mã giảm giá '{discountCode}' chưa đến ngày bắt đầu sử dụng (Bắt đầu từ: {discount.StartDate:dd/MM/yyyy}).");
            }
            if (now > discount.EndDate)
            {
                _logger.LogInformation("Kiểm tra thất bại: Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) đã hết hạn (Hết hạn vào: {EndDate:dd/MM/yyyy}).", discountCode, discount.DiscountID, discount.EndDate);
                return new DiscountValidationResultDto(false, $"Mã giảm giá '{discountCode}' đã hết hạn (Hết hạn vào: {discount.EndDate:dd/MM/yyyy}).");
            }
            if (discount.RemainingBudget <= 0)
            {
                _logger.LogInformation("Kiểm tra thất bại: Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) đã hết ngân sách (RemainingBudget: {RemainingBudget}).", discountCode, discount.DiscountID, discount.RemainingBudget);
                return new DiscountValidationResultDto(false, $"Mã giảm giá '{discountCode}' đã hết ngân sách sử dụng.");
            }

            // Các logic kiểm tra nâng cao khác (số lần sử dụng, user, sản phẩm) có thể thêm ở đây.

            _logger.LogInformation("Mã giảm giá '{DiscountCode}' (ID: {DiscountID}) hợp lệ để thanh toán.", discountCode, discount.DiscountID);
            var discountDto = _mapper.Map<DiscountDto>(discount);
            // Số tiền giảm thực tế sẽ được tính dựa trên giỏ hàng/đơn hàng tại service khác.
            return new DiscountValidationResultDto(true, "Mã giảm giá hợp lệ.", discountDto);
        }   

        public async Task<DiscountDto?> UpdateDiscountAsync(int discountId, DiscountUpdateDto updateDto)
        {
            _logger.LogInformation("Đang thử cập nhật mã giảm giá với ID: {DiscountID}", discountId);
            var discount = await _context.Discounts.FirstOrDefaultAsync(d => d.DiscountID == discountId);

            if (discount == null)
            {
                _logger.LogWarning("Cập nhật thất bại: Không tìm thấy mã giảm giá với ID {DiscountID}.", discountId);
                throw new Exception("Cập nhật thất bại: Không tìm thấy mã giảm giá");
            }

            if (updateDto.EndDate < updateDto.StartDate)
            {
                _logger.LogWarning("Cập nhật thất bại cho mã giảm giá ID {DiscountID}: Ngày kết thúc không thể trước ngày bắt đầu.", discountId);
                throw new ArgumentException("Ngày kết thúc không thể trước ngày bắt đầu.");
            }

            if (updateDto.IsActive && updateDto.EndDate < DateTime.UtcNow)
            {
                _logger.LogWarning("Cập nhật thất bại cho mã giảm giá ID {DiscountID}: Không thể kích hoạt mã giảm giá khi ngày hết hạn đã qua.", discountId);
                throw new ArgumentException("Ngày kết thúc đã qua.");
            }

            _mapper.Map(updateDto, discount);
            if (discount.RemainingBudget > discount.Budget)
            {
                discount.RemainingBudget = discount.Budget; // Điều chỉnh nếu cần
            }
            try
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation("Cập nhật mã giảm giá ID {DiscountID} thành công.", discountId);
                return _mapper.Map<DiscountDto>(discount);
            }
            catch (Exception ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public async Task<bool> ToggleDiscountStatusAsync(int discountId, bool isActive)
        {
            _logger.LogInformation("Đang thử thay đổi trạng thái kích hoạt cho mã giảm giá ID {DiscountID} thành {IsActive}", discountId, isActive);
            var discount = await _context.Discounts.FirstOrDefaultAsync(d => d.DiscountID == discountId);
            if (discount == null)
            {
                _logger.LogWarning("Thay đổi trạng thái thất bại: Không tìm thấy mã giảm giá với ID {DiscountID}.", discountId);
                throw new Exception("Thay đổi trạng thái thất bại: Không tìm thấy mã giảm giá");
            }

            if (discount.IsActive == isActive)
            {
                _logger.LogInformation("Trạng thái kích hoạt của mã giảm giá ID {DiscountID} đã là {IsActive}. Không có thay đổi.", discountId, isActive);
                return true;
            }

            if (isActive && discount.EndDate < DateTime.UtcNow)
            {
                _logger.LogInformation("Để có thể kích hoạt mã giảm giá ID {DiscountID} hãy đặt lại ngày hết hạn.", discountId, isActive);
                throw new InvalidOperationException("Để có thể kích hoạt mã giảm giá hãy đặt lại ngày hết hạn");
            }

            discount.IsActive = isActive;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Thay đổi trạng thái kích hoạt của mã giảm giá ID {DiscountID} thành {IsActive} thành công.", discountId, isActive);
            return true;
        }

        public async Task<bool> DeleteDiscountAsync(int discountId)
        {
            _logger.LogInformation("Đang thử xóa mã giảm giá với ID: {DiscountID}", discountId);
            var discount = await _context.Discounts
                                    .Include(d => d.Orders)
                                    .FirstOrDefaultAsync(d => d.DiscountID == discountId);
            if (discount == null)
            {
                _logger.LogWarning("Xóa thất bại: Không tìm thấy mã giảm giá với ID {DiscountID}.", discountId);
                return false;
            }

            if (discount.Orders.Any())
            {
                _logger.LogWarning("Xóa thất bại: Mã giảm giá ID {DiscountID} (Mã: '{DiscountCode}') đang được sử dụng trong {OrderCount} đơn hàng. Nên vô hiệu hóa thay vì xóa.", discountId, discount.DiscountCode, discount.Orders.Count);
                throw new InvalidOperationException("Không thể xóa mã giảm giá đã được sử dụng trong đơn hàng. Vui lòng vô hiệu hóa mã này.");
            }

            _context.Discounts.Remove(discount);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Xóa mã giảm giá ID {DiscountID} (Mã: {DiscountCode}) thành công.", discountId, discount.DiscountCode);
            return true;
        }
    }
}
