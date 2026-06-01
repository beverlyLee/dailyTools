library(dplyr)
library(lubridate)

calculate_ev_metrics <- function(input_data = NULL, data_path = "../output/cleaned_sales_data.rds") {
  if (is.null(input_data)) {
    if (!file.exists(data_path)) {
      stop("未找到数据文件，请先运行 tidy_data.R")
    }
    data <- readRDS(data_path)
  } else {
    data <- input_data
  }
  
  data_with_metrics <- data %>%
    arrange(date) %>%
    mutate(
      penetration_rate = ev_sales / total_sales,
      
      bev_ratio = bev_sales / ev_sales,
      phev_ratio = phev_sales / ev_sales,
      
      yoy_total = (total_sales / lag(total_sales, 12) - 1),
      yoy_ev = (ev_sales / lag(ev_sales, 12) - 1),
      yoy_bev = (bev_sales / lag(bev_sales, 12) - 1),
      yoy_phev = (phev_sales / lag(phev_sales, 12) - 1),
      
      mom_total = (total_sales / lag(total_sales, 1) - 1),
      mom_ev = (ev_sales / lag(ev_sales, 1) - 1),
      
      ev_sales_ma3 = zoo::rollmean(ev_sales, 3, fill = NA, align = "right"),
      penetration_ma3 = zoo::rollmean(penetration_rate, 3, fill = NA, align = "right")
    )
  
  saveRDS(data_with_metrics, "../output/data_with_metrics.rds")
  write.csv(data_with_metrics, "../output/data_with_metrics.csv", row.names = FALSE)
  
  message("指标计算完成")
  return(data_with_metrics)
}

calculate_yearly_summary <- function(data_with_metrics) {
  yearly_summary <- data_with_metrics %>%
    group_by(year) %>%
    summarise(
      total_sales_sum = sum(total_sales, na.rm = TRUE),
      ev_sales_sum = sum(ev_sales, na.rm = TRUE),
      bev_sales_sum = sum(bev_sales, na.rm = TRUE),
      phev_sales_sum = sum(phev_sales, na.rm = TRUE),
      avg_penetration = mean(penetration_rate, na.rm = TRUE),
      avg_bev_ratio = mean(bev_ratio, na.rm = TRUE),
      months = n(),
      .groups = "drop"
    ) %>%
    mutate(
      yoy_total = (total_sales_sum / lag(total_sales_sum) - 1),
      yoy_ev = (ev_sales_sum / lag(ev_sales_sum) - 1)
    )
  
  saveRDS(yearly_summary, "../output/yearly_summary.rds")
  write.csv(yearly_summary, "../output/yearly_summary.csv", row.names = FALSE)
  
  return(yearly_summary)
}

get_latest_month_stats <- function(data_with_metrics) {
  latest <- data_with_metrics %>%
    arrange(desc(date)) %>%
    slice(1)
  
  stats <- list(
    date = latest$date,
    penetration_rate = latest$penetration_rate,
    ev_sales = latest$ev_sales,
    total_sales = latest$total_sales,
    bev_ratio = latest$bev_ratio,
    phev_ratio = latest$phev_ratio,
    yoy_ev = latest$yoy_ev,
    mom_ev = latest$mom_ev
  )
  
  return(stats)
}

if (!interactive()) {
  metrics_data <- calculate_ev_metrics()
  yearly <- calculate_yearly_summary(metrics_data)
  print("年度汇总:")
  print(yearly)
}
