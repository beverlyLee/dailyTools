#!/usr/bin/env Rscript

cat("\n")
cat("========================================\n")
cat("  新能源汽车市场趋势分析系统\n")
cat("  EV Market Trend Analysis System\n")
cat("========================================\n")
cat("\n")

start_time <- Sys.time()

cat("[1/4] 数据整理模块...\n")
source("tidy_data/tidy_data.R")
clean_data <- tidy_sales_data()
cat("      ✓ 完成，共", nrow(clean_data), "条记录\n")
cat("\n")

cat("[2/4] 指标计算模块...\n")
source("metrics/calculate_metrics.R")
metrics_data <- calculate_ev_metrics(clean_data)
yearly_summary <- calculate_yearly_summary(metrics_data)
cat("      ✓ 完成\n")
cat("\n")

cat("      年度渗透率摘要:\n")
for (i in 1:nrow(yearly_summary)) {
  cat(sprintf("        %d年: 平均渗透率 %.1f%%\n", 
              yearly_summary$year[i], 
              yearly_summary$avg_penetration[i] * 100))
}
cat("\n")

cat("[3/4] 可视化模块...\n")
source("visualization/plot_charts.R")
install.packages("htmlwidgets", quiet = TRUE)
library(htmlwidgets)

tryCatch({
  plot_penetration_trend("../output/data_with_metrics.rds", "../output")
  cat("      ✓ 渗透率趋势图\n")
}, error = function(e) {
  cat("      ✗ 渗透率趋势图失败: ", e$message, "\n")
})

tryCatch({
  plot_bev_phev_structure("../output/data_with_metrics.rds", "../output")
  cat("      ✓ BEV/PHEV结构图\n")
}, error = function(e) {
  cat("      ✗ BEV/PHEV结构图失败: ", e$message, "\n")
})

tryCatch({
  plot_sales_comparison("../output/data_with_metrics.rds", "../output")
  cat("      ✓ 销量对比图\n")
}, error = function(e) {
  cat("      ✗ 销量对比图失败: ", e$message, "\n")
})

tryCatch({
  plot_yoy_growth("../output/data_with_metrics.rds", "../output")
  cat("      ✓ 同比增速图\n")
}, error = function(e) {
  cat("      ✗ 同比增速图失败: ", e$message, "\n")
})
cat("\n")

cat("[4/4] AI报告生成模块...\n")
source("ai_report/generate_report.R")
tryCatch({
  report <- generate_ai_report("../output/data_with_metrics.rds", "../output/ev_market_report.md")
  cat("      ✓ 完成\n")
}, error = function(e) {
  cat("      ✗ 报告生成失败: ", e$message, "\n")
})
cat("\n")

end_time <- Sys.time()
elapsed <- difftime(end_time, start_time, units = "secs")

cat("========================================\n")
cat("  分析完成！\n")
cat("  耗时: ", round(as.numeric(elapsed), 2), "秒\n")
cat("\n")
cat("  输出文件:\n")
cat("  - output/cleaned_sales_data.csv\n")
cat("  - output/data_with_metrics.csv\n")
cat("  - output/yearly_summary.csv\n")
cat("  - output/penetration_trend.png/html\n")
cat("  - output/bev_phev_structure.png\n")
cat("  - output/bev_phev_ratio.png\n")
cat("  - output/sales_comparison.png/html\n")
cat("  - output/yoy_growth.png\n")
cat("  - output/ev_market_report.md\n")
cat("========================================\n")
cat("\n")
