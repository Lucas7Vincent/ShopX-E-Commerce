using AutoMapper;
using Microsoft.EntityFrameworkCore;
using ShopxEX1.Data;
using ShopxEX1.Dtos.Contacts;
using ShopxEX1.Helpers;
using ShopxEX1.Models;

namespace ShopxEX1.Services.Implementations
{
    public class ContactService : IContactService
    {
        private readonly AppDbContext _context;
        private readonly IMapper _mapper;
        private readonly ILogger<ContactService> _logger; // Thêm logger

        // Các hằng số cho trạng thái mặc định
        private const string DefaultNewStatus = "Đang chờ xử lý";
        private const string StatusResponded = "Đang xử lý";
        private const string StatusClosed = "Đã phản hồi";


        public ContactService(AppDbContext context, IMapper mapper, ILogger<ContactService> logger)
        {
            _context = context;
            _mapper = mapper;
            _logger = logger;
        }

        public async Task<ContactDto> CreateContactAsync(ContactCreateDto createDto, int userId)
        {
            _logger.LogInformation("Bắt đầu tạo liên hệ mới cho UserID: {UserId}", userId);
            try
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserID == userId);
                if (!userExists)
                {
                    _logger.LogWarning("Không tìm thấy UserID: {UserId} khi tạo liên hệ.", userId);
                    throw new ArgumentException($"Người dùng không tồn tại.");
                }

                var contact = _mapper.Map<Contact>(createDto);
                contact.UserID = userId;
                contact.Status = DefaultNewStatus; // Trạng thái mặc định khi mới tạo
                contact.CreatedAt = DateTime.UtcNow;

                await _context.Contacts.AddAsync(contact);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Đã tạo thành công liên hệ ID: {ContactID} cho UserID: {UserId}", contact.ContactID, userId);

                // Lấy lại contact với thông tin User để map sang ContactDto
                var createdContactWithUser = await _context.Contacts
                                                    .Include(c => c.User)
                                                    .AsNoTracking()
                                                    .FirstOrDefaultAsync(c => c.ContactID == contact.ContactID);

                return _mapper.Map<ContactDto>(createdContactWithUser);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi tạo liên hệ cho UserID: {UserId}", userId);
                throw; // Ném lại lỗi để controller xử lý
            }
        }

        public async Task<PagedResult<ContactDto>> GetAllContactsAsync(ContactFilterDto filter, int pageNumber, int pageSize)
        {
            _logger.LogInformation("Bắt đầu lấy danh sách liên hệ (Admin) - Trang: {PageNumber}, Kích thước: {PageSize}", pageNumber, pageSize);
            try
            {
                var query = _context.Contacts
                                .Include(c => c.User) // Include User để lấy UserFullName, UserEmail
                                .AsNoTracking();

                // Áp dụng bộ lọc
                if (filter.UserId.HasValue)
                {
                    query = query.Where(c => c.UserID == filter.UserId.Value);
                }
                if (!string.IsNullOrWhiteSpace(filter.Status))
                {
                    query = query.Where(c => c.Status.ToLower() == filter.Status.ToLower());
                }
                if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
                {
                    var searchTermLower = filter.SearchTerm.ToLower();
                    query = query.Where(c => c.Message.ToLower().Contains(searchTermLower) ||
                                             (c.User != null && (c.User.FullName != null && c.User.FullName.ToLower().Contains(searchTermLower))) ||
                                             (c.User != null && c.User.Email.ToLower().Contains(searchTermLower)));
                }
                if (filter.StartDate.HasValue)
                {
                    query = query.Where(c => c.CreatedAt.Date >= filter.StartDate.Value.Date);
                }
                if (filter.EndDate.HasValue)
                {
                    query = query.Where(c => c.CreatedAt.Date <= filter.EndDate.Value.Date);
                }

                // Sắp xếp (ví dụ: mặc định theo ngày tạo mới nhất)
                query = query
         .OrderBy(c => c.Status == DefaultNewStatus ? 0
                     : c.Status == StatusResponded ? 1
                     : c.Status == StatusClosed ? 2
                     : 3)
         .ThenBy(c => c.CreatedAt);
                // if (!string.IsNullOrWhiteSpace(filter.SortBy)) { /* Thêm logic sắp xếp nếu cần */ }


                var totalCount = await query.CountAsync();
                var items = await query.Skip((pageNumber - 1) * pageSize)
                                       .Take(pageSize)
                                       .ToListAsync();

                var mappedItems = _mapper.Map<IEnumerable<ContactDto>>(items);
                _logger.LogInformation("Đã lấy thành công {ItemCount}/{TotalCount} liên hệ (Admin).", items.Count, totalCount);
                return new PagedResult<ContactDto>(mappedItems, pageNumber, pageSize, totalCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy danh sách liên hệ (Admin).");
                throw;
            }
        }

        public async Task<ContactDto?> GetContactByIdAsync(int contactId)
        {
            _logger.LogInformation("Bắt đầu lấy chi tiết liên hệ ID: {ContactId}", contactId);
            try
            {
                var contact = await _context.Contacts
                                        .Include(c => c.User)
                                        .AsNoTracking()
                                        .FirstOrDefaultAsync(c => c.ContactID == contactId);

                if (contact == null)
                {
                    _logger.LogWarning("Không tìm thấy liên hệ với ID: {ContactId}", contactId);
                    return null;
                }
                _logger.LogInformation("Đã tìm thấy liên hệ ID: {ContactId}", contactId);
                return _mapper.Map<ContactDto>(contact);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi lấy chi tiết liên hệ ID: {ContactId}", contactId);
                throw;
            }
        }

        public async Task<ContactDto?> UpdateContactStatusAsync(int contactId, ContactUpdateDto updateDto)
        {
            _logger.LogInformation("Bắt đầu cập nhật trạng thái cho liên hệ ID: {ContactId} thành '{NewStatus}'", contactId, updateDto.Status);
            try
            {
                var contact = await _context.Contacts
                                        .Include(c => c.User) // Include User để trả về DTO đầy đủ
                                        .FirstOrDefaultAsync(c => c.ContactID == contactId);

                if (contact == null)
                {
                    _logger.LogWarning("Không tìm thấy liên hệ ID: {ContactId} để cập nhật trạng thái.", contactId);
                    return null;
                }

                // Kiểm tra xem trạng thái mới có hợp lệ không (tùy chọn, có thể thêm danh sách trạng thái hợp lệ)
                if (updateDto.Status != DefaultNewStatus && updateDto.Status != StatusResponded && updateDto.Status != StatusClosed)
                {
                    _logger.LogWarning($"Trạng thái cập nhật '{contact.Status}' không hợp lệ");
                    throw new ArgumentException("Trạng thái cập nhật không hợp lệ");
                }

                if (updateDto.Status != StatusClosed)
                {
                    _logger.LogWarning("Không thể thay đổi trạng thái khi đã phản hồi");
                    throw new ArgumentException("Không thể thay đổi trạng thái khi đã phản hồi");
                }

                contact.Status = updateDto.Status;
                if (contact.Status == StatusClosed) contact.CreatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã cập nhật thành công trạng thái cho liên hệ ID: {ContactId}", contactId);
                return _mapper.Map<ContactDto>(contact); // Trả về DTO với thông tin User
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi cập nhật trạng thái cho liên hệ ID: {ContactId}", contactId);
                throw;
            }
        }

        public async Task<bool> DeleteContactAsync(int contactId)
        {
            _logger.LogInformation("Bắt đầu xóa liên hệ ID: {ContactId}", contactId);
            try
            {
                var contact = await _context.Contacts.FindAsync(contactId);
                if (contact == null)
                {
                    _logger.LogWarning("Không tìm thấy liên hệ ID: {ContactId} để xóa.", contactId);
                    return false;
                }

                _context.Contacts.Remove(contact);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Đã xóa thành công liên hệ ID: {ContactId}", contactId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi xóa liên hệ ID: {ContactId}", contactId);
                throw;
            }
        }
    }
}
