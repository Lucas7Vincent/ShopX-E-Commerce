namespace ShopxEX1.Dtos
{
    public class ApiResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public object? Data { get; set; }

        public ApiResponse()
        {
            Success = true;
            Message = string.Empty;
            Data = null;
        }

        public ApiResponse(bool success, string message, object? data = null)
        {
            Success = success;
            Message = message;
            Data = data;
        }
    }
} 