using OfficeOpenXml.Style;
using OfficeOpenXml;
using ShopxEX1.Dtos.Reporting;
using System.ComponentModel;
using System.Drawing;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace ShopxEX1.Helpers
{
    public static class Function
    {
        private static readonly Regex EmojiRegex = new Regex(
            @"(\p{Cs}|" +                          // Surrogate pair (emoji chuẩn)
            @"[\u203C-\u3299]|" +                  // Các biểu tượng thông thường
            @"[\uD83C-\uDBFF\uDC00-\uDFFF]+|" +    // Emoji nằm trong các block D83C - DFFF
            @"[\u2600-\u27BF])",                   // Biểu tượng mặt trời, thời tiết, ký hiệu...
            RegexOptions.Compiled
        );
        public static string PasswordHash(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }

        public static bool IsEmoji(string input)
        {
            if (string.IsNullOrEmpty(input))
                return false;

            return EmojiRegex.IsMatch(input);
        }
        public static byte[] CreateMonthlyRevenueExcel(Dictionary<int, List<decimal>> data, int year)
        {
            // Với EPPlus 4.x, không cần dòng LicenseContext.
            // Nếu dùng bản 5+, phải có: ExcelPackage.LicenseContext = LicenseContext.NonCommercial (hoặc Commercial);

            using (var package = new ExcelPackage())
            {
                var worksheet = package.Workbook.Worksheets.Add($"DoanhThuThang_Nam{year}");

                // --- Định nghĩa Styles Chung cho Sheet này ---
                var headerStyleName = "MonthlyHeaderStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == headerStyleName)) // Tránh tạo lại nếu đã có
                {
                    var namedStyle = package.Workbook.Styles.CreateNamedStyle(headerStyleName);
                    namedStyle.Style.Font.Bold = true;
                    namedStyle.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    namedStyle.Style.Fill.BackgroundColor.SetColor(ColorTranslator.FromHtml("#DDEBF7")); // Màu xanh nhạt dễ chịu
                    namedStyle.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    namedStyle.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    namedStyle.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                }

                var monthNameCellStyleName = "MonthNameCellStyle";
                 if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == monthNameCellStyleName))
                {
                    var namedStyle = package.Workbook.Styles.CreateNamedStyle(monthNameCellStyleName);
                    namedStyle.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
                    namedStyle.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                }


                var revenueCellStyleName = "MonthlyRevenueCellStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == revenueCellStyleName))
                {
                    var namedStyle = package.Workbook.Styles.CreateNamedStyle(revenueCellStyleName);
                    namedStyle.Style.Numberformat.Format = "#,##0.00"; // Định dạng số cho doanh thu (triệu)
                    namedStyle.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                    namedStyle.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    namedStyle.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                }
                // --- Kết thúc định nghĩa Styles ---

                // Headers
                worksheet.Cells[1, 1].Value = "Tháng";
                worksheet.Cells[1, 2].Value = "Doanh Thu (triệu VND)";
                worksheet.Cells[1, 1, 1, 2].StyleName = headerStyleName; // Áp dụng style đã đặt tên

                var culture = new CultureInfo("vi-VN");
                var months = culture.DateTimeFormat.MonthNames; // Mảng này có 13 phần tử, phần tử cuối rỗng
                List<decimal> revenueData = data.ContainsKey(year) ? data[year] : new List<decimal>(new decimal[12]);

                for (int i = 0; i < 12; i++)
                {
                    int currentRow = i + 2;
                    worksheet.Cells[currentRow, 1].Value = months[i]; // months[0] là "Tháng một", ...
                    worksheet.Cells[currentRow, 1].StyleName = monthNameCellStyleName;


                    worksheet.Cells[currentRow, 2].Value = revenueData[i];
                    worksheet.Cells[currentRow, 2].StyleName = revenueCellStyleName;
                }

                // AutoFitColumns nên được gọi cuối cùng, sau khi tất cả dữ liệu và style đã được áp dụng.
                worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
                // Hoặc chỉ định rõ hơn
                // worksheet.Column(1).AutoFit();
                // worksheet.Column(2).AutoFit();

                return package.GetAsByteArray();
            }
        }

        public static byte[] CreateOverallRevenueExcel(AdminRevenueReportDto report, string reportTitle)
        {
            using (var package = new ExcelPackage())
            {
                var worksheet = package.Workbook.Worksheets.Add("BaoCaoTongQuan"); // Tên sheet đơn giản

                // --- Định nghĩa Styles Chung ---
                // (Sử dụng lại tên style nếu có thể, hoặc tạo mới nếu cần sự khác biệt)
                var mainTitleStyleName = "OverallMainTitleStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == mainTitleStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(mainTitleStyleName);
                    style.Style.Font.Bold = true;
                    style.Style.Font.Size = 14; // Giảm một chút cho dễ nhìn hơn
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    style.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                }

                var summaryLabelStyleName = "OverallSummaryLabelStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == summaryLabelStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(summaryLabelStyleName);
                    style.Style.Font.Bold = true;
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Left;
                }

                var summaryValueCurrencyStyleName = "OverallSummaryValueCurrencyStyle";
                 if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == summaryValueCurrencyStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(summaryValueCurrencyStyleName);
                    style.Style.Numberformat.Format = "#,##0 [$đ-42A];-#,##0 [$đ-42A];0"; // Định dạng tiền tệ VND, hiển thị "đ"
                    style.Style.Font.Bold = true;
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                }


                var summaryValueNumberStyleName = "OverallSummaryValueNumberStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == summaryValueNumberStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(summaryValueNumberStyleName);
                    style.Style.Numberformat.Format = "#,##0";
                    style.Style.Font.Bold = true;
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                }

                var sectionHeaderStyleName = "OverallSectionHeaderStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == sectionHeaderStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(sectionHeaderStyleName);
                    style.Style.Font.Bold = true;
                    style.Style.Font.Size = 12;
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    style.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    style.Style.Fill.BackgroundColor.SetColor(ColorTranslator.FromHtml("#F0F0F0")); // Xám rất nhạt
                    style.Style.Border.Bottom.Style = ExcelBorderStyle.Medium;
                    style.Style.Border.Bottom.Color.SetColor(Color.Black);
                }

                var tableHeaderStyleName = "OverallTableHeaderStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == tableHeaderStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(tableHeaderStyleName);
                    style.Style.Font.Bold = true;
                    style.Style.Fill.PatternType = ExcelFillStyle.Solid;
                    style.Style.Fill.BackgroundColor.SetColor(ColorTranslator.FromHtml("#DDEBF7")); // Xanh nhạt
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Center;
                    style.Style.VerticalAlignment = ExcelVerticalAlignment.Center;
                    style.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                }
                
                var dataTextCellStyleName = "OverallDataTextCellStyle";
                if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == dataTextCellStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(dataTextCellStyleName);
                    style.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                }


                var dataCurrencyCellStyleName = "OverallDataCurrencyCellStyle"; // Cho triệu VND
                 if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == dataCurrencyCellStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(dataCurrencyCellStyleName);
                    style.Style.Numberformat.Format = "#,##0.00";
                    style.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                }

                var dataNumberCellStyleName = "OverallDataNumberCellStyle";
                 if (!package.Workbook.Styles.NamedStyles.Any(s => s.Name == dataNumberCellStyleName))
                {
                    var style = package.Workbook.Styles.CreateNamedStyle(dataNumberCellStyleName);
                    style.Style.Numberformat.Format = "#,##0";
                    style.Style.Border.Top.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Bottom.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Left.Style = ExcelBorderStyle.Thin;
                    style.Style.Border.Right.Style = ExcelBorderStyle.Thin;
                    style.Style.HorizontalAlignment = ExcelHorizontalAlignment.Right;
                }
                // --- Kết thúc định nghĩa Styles ---

                int currentRow = 1;
                // Mặc định là 3 cột cho bảng chi tiết kỳ, nếu có breakdown thì có thể là 2
                int mainTableColumns = (report.ChartLabels != null && report.ChartLabels.Any()) ? 3 : 2;
                int breakdownColumns = (report.RevenueBreakdown != null && report.RevenueBreakdown.Any()) ? 2 : 0;
                int maxColumnsForTitle = Math.Max(mainTableColumns, breakdownColumns);
                if (maxColumnsForTitle == 0) maxColumnsForTitle = 2; // Tối thiểu merge 2 cột cho tiêu đề chính


                // Tiêu đề báo cáo
                worksheet.Cells[currentRow, 1, currentRow, maxColumnsForTitle].Merge = true;
                worksheet.Cells[currentRow, 1].Value = reportTitle;
                worksheet.Cells[currentRow, 1].StyleName = mainTitleStyleName;
                currentRow += 2;

                // Thông tin tổng quan
                worksheet.Cells[currentRow, 1].Value = "Tổng Doanh Thu:";
                worksheet.Cells[currentRow, 1].StyleName = summaryLabelStyleName;
                worksheet.Cells[currentRow, 2].Value = report.TotalRevenue;
                worksheet.Cells[currentRow, 2].StyleName = summaryValueCurrencyStyleName;
                currentRow++;

                worksheet.Cells[currentRow, 1].Value = "Tổng Số Đơn Hàng:";
                worksheet.Cells[currentRow, 1].StyleName = summaryLabelStyleName;
                worksheet.Cells[currentRow, 2].Value = report.TotalOrders;
                worksheet.Cells[currentRow, 2].StyleName = summaryValueNumberStyleName;
                currentRow += 2;

                // Dữ liệu chi tiết theo kỳ
                if (report.ChartLabels != null && report.ChartLabels.Any())
                {
                    worksheet.Cells[currentRow, 1, currentRow, 3].Merge = true; // Bảng này luôn 3 cột
                    worksheet.Cells[currentRow, 1].Value = "Chi Tiết Theo Kỳ";
                    worksheet.Cells[currentRow, 1].StyleName = sectionHeaderStyleName;
                    currentRow++;

                    worksheet.Cells[currentRow, 1].Value = "Kỳ";
                    worksheet.Cells[currentRow, 2].Value = "Doanh Thu (triệu VND)";
                    worksheet.Cells[currentRow, 3].Value = "Số Đơn Hàng";
                    worksheet.Cells[currentRow, 1, currentRow, 3].StyleName = tableHeaderStyleName;
                    currentRow++;

                    for (int i = 0; i < report.ChartLabels.Count; i++)
                    {
                        worksheet.Cells[currentRow + i, 1].Value = report.ChartLabels[i];
                        worksheet.Cells[currentRow + i, 1].StyleName = dataTextCellStyleName;

                        worksheet.Cells[currentRow + i, 2].Value = (report.ChartRevenueData != null && report.ChartRevenueData.Count > i) ? report.ChartRevenueData[i] : 0m;
                        worksheet.Cells[currentRow + i, 2].StyleName = dataCurrencyCellStyleName;

                        worksheet.Cells[currentRow + i, 3].Value = (report.ChartOrderData != null && report.ChartOrderData.Count > i) ? report.ChartOrderData[i] : 0;
                        worksheet.Cells[currentRow + i, 3].StyleName = dataNumberCellStyleName;
                    }
                    // Đặt viền dưới dày cho dòng dữ liệu cuối cùng của bảng này
                    if (report.ChartLabels.Count > 0)
                    {
                        worksheet.Cells[currentRow + report.ChartLabels.Count -1, 1, currentRow + report.ChartLabels.Count -1, 3].Style.Border.Bottom.Style = ExcelBorderStyle.Medium;

                    }
                    currentRow += report.ChartLabels.Count;
                    currentRow += 2; // Khoảng cách
                }

                // Breakdown Doanh Thu Chi Tiết (nếu có)
                if (report.RevenueBreakdown != null && report.RevenueBreakdown.Any())
                {
                    worksheet.Cells[currentRow, 1, currentRow, 2].Merge = true; // Breakdown có 2 cột
                    worksheet.Cells[currentRow, 1].Value = "Breakdown Doanh Thu Chi Tiết";
                    worksheet.Cells[currentRow, 1].StyleName = sectionHeaderStyleName;
                    currentRow++;

                    worksheet.Cells[currentRow, 1].Value = "Mục";
                    worksheet.Cells[currentRow, 2].Value = "Doanh Thu (VND)";
                    worksheet.Cells[currentRow, 1, currentRow, 2].StyleName = tableHeaderStyleName;
                    // Có thể thay đổi màu nền cho header của bảng breakdown nếu muốn
                    // worksheet.Cells[currentRow, 1, currentRow, 2].Style.Fill.BackgroundColor.SetColor(ColorTranslator.FromHtml("#FFFACD"));
                    currentRow++;

                    foreach (var item in report.RevenueBreakdown)
                    {
                        worksheet.Cells[currentRow, 1].Value = item.Key;
                        worksheet.Cells[currentRow, 1].StyleName = dataTextCellStyleName;

                        worksheet.Cells[currentRow, 2].Value = item.Value;
                        worksheet.Cells[currentRow, 2].StyleName = summaryValueCurrencyStyleName; // Dùng style của tiền tệ VND
                        // worksheet.Cells[currentRow, 2].Style.Numberformat.Format = "#,##0 đ"; // Đã có trong style
                        currentRow++;
                    }
                     if (report.RevenueBreakdown.Count > 0)
                    {
                        worksheet.Cells[currentRow -1, 1, currentRow -1, 2].Style.Border.Bottom.Style = ExcelBorderStyle.Medium;
                    }
                }

                // AutoFit cho các cột có dữ liệu
                if (worksheet.Dimension != null) // Đảm bảo sheet có dữ liệu
                {
                    worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
                }


                return package.GetAsByteArray();
            }
        }
    }
}
