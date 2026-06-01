library(ggplot2)
library(dplyr)
library(plotly)
library(scales)
library(lubridate)

plot_penetration_trend <- function(data_path = "../output/data_with_metrics.rds", output_dir = "../output") {
  if (!file.exists(data_path)) {
    stop("未找到数据文件，请先运行 calculate_metrics.R")
  }
  
  data <- readRDS(data_path)
  
  p <- ggplot(data, aes(x = date)) +
    geom_line(aes(y = penetration_rate, color = "月度渗透率"), size = 0.8, alpha = 0.6) +
    geom_line(aes(y = penetration_ma3, color = "3月移动平均"), size = 1.2) +
    geom_point(aes(y = penetration_rate), color = "#1f77b4", size = 1.5, alpha = 0.7) +
    scale_y_continuous(labels = percent_format(accuracy = 1), limits = c(0, 0.5)) +
    scale_x_date(date_breaks = "6 months", date_labels = "%Y-%m") +
    scale_color_manual(values = c("月度渗透率" = "#1f77b4", "3月移动平均" = "#ff7f0e")) +
    labs(
      title = "中国新能源汽车渗透率趋势",
      subtitle = paste("数据期间:", min(data$date), "至", max(data$date)),
      x = "月份",
      y = "新能源汽车渗透率",
      color = "指标"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      plot.subtitle = element_text(hjust = 0.5, size = 10),
      axis.text.x = element_text(angle = 45, hjust = 1),
      legend.position = "bottom"
    )
  
  ggsave(file.path(output_dir, "penetration_trend.png"), p, width = 12, height = 7, dpi = 150)
  
  p_interactive <- ggplotly(p) %>%
    layout(legend = list(orientation = "h", y = -0.2))
  
  htmlwidgets::saveWidget(p_interactive, file.path(output_dir, "penetration_trend.html"), selfcontained = TRUE)
  
  message("渗透率趋势图已生成")
  return(list(static = p, interactive = p_interactive))
}

plot_bev_phev_structure <- function(data_path = "../output/data_with_metrics.rds", output_dir = "../output") {
  if (!file.exists(data_path)) {
    stop("未找到数据文件，请先运行 calculate_metrics.R")
  }
  
  data <- readRDS(data_path)
  
  data_long <- data %>%
    select(date, bev_sales, phev_sales) %>%
    tidyr::pivot_longer(cols = c(bev_sales, phev_sales),
                        names_to = "type",
                        values_to = "sales") %>%
    mutate(type = factor(type, 
                         levels = c("bev_sales", "phev_sales"),
                         labels = c("BEV 纯电动", "PHEV 插电混动")))
  
  p_area <- ggplot(data_long, aes(x = date, y = sales, fill = type)) +
    geom_area(alpha = 0.8, position = "stack") +
    scale_y_continuous(labels = comma_format()) +
    scale_x_date(date_breaks = "6 months", date_labels = "%Y-%m") +
    scale_fill_manual(values = c("BEV 纯电动" = "#2ca02c", "PHEV 插电混动" = "#9467bd")) +
    labs(
      title = "新能源汽车销量结构：BEV vs PHEV",
      x = "月份",
      y = "销量（辆）",
      fill = "动力类型"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.text.x = element_text(angle = 45, hjust = 1),
      legend.position = "bottom"
    )
  
  ggsave(file.path(output_dir, "bev_phev_structure.png"), p_area, width = 12, height = 7, dpi = 150)
  
  p_ratio <- ggplot(data, aes(x = date)) +
    geom_line(aes(y = bev_ratio, color = "BEV占比"), size = 1.2) +
    geom_line(aes(y = phev_ratio, color = "PHEV占比"), size = 1.2) +
    scale_y_continuous(labels = percent_format(accuracy = 1), limits = c(0, 1)) +
    scale_x_date(date_breaks = "6 months", date_labels = "%Y-%m") +
    scale_color_manual(values = c("BEV占比" = "#2ca02c", "PHEV占比" = "#9467bd")) +
    labs(
      title = "BEV与PHEV占比变化趋势",
      x = "月份",
      y = "占比",
      color = "类型"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.text.x = element_text(angle = 45, hjust = 1),
      legend.position = "bottom"
    )
  
  ggsave(file.path(output_dir, "bev_phev_ratio.png"), p_ratio, width = 12, height = 7, dpi = 150)
  
  message("BEV/PHEV结构分析图已生成")
  return(list(area_plot = p_area, ratio_plot = p_ratio))
}

plot_sales_comparison <- function(data_path = "../output/data_with_metrics.rds", output_dir = "../output") {
  if (!file.exists(data_path)) {
    stop("未找到数据文件，请先运行 calculate_metrics.R")
  }
  
  data <- readRDS(data_path)
  
  data_long <- data %>%
    select(date, total_sales, ev_sales) %>%
    tidyr::pivot_longer(cols = c(total_sales, ev_sales),
                        names_to = "type",
                        values_to = "sales") %>%
    mutate(type = factor(type,
                         levels = c("total_sales", "ev_sales"),
                         labels = c("乘用车总销量", "新能源销量")))
  
  p <- ggplot(data_long, aes(x = date, y = sales, color = type)) +
    geom_line(size = 1) +
    geom_point(size = 1.5, alpha = 0.7) +
    scale_y_continuous(labels = comma_format()) +
    scale_x_date(date_breaks = "6 months", date_labels = "%Y-%m") +
    scale_color_manual(values = c("乘用车总销量" = "#7f7f7f", "新能源销量" = "#ff7f0e")) +
    labs(
      title = "新能源汽车销量 vs 乘用车总销量",
      x = "月份",
      y = "销量（辆）",
      color = ""
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.text.x = element_text(angle = 45, hjust = 1),
      legend.position = "bottom"
    )
  
  ggsave(file.path(output_dir, "sales_comparison.png"), p, width = 12, height = 7, dpi = 150)
  
  p_interactive <- ggplotly(p) %>%
    layout(legend = list(orientation = "h", y = -0.2))
  
  htmlwidgets::saveWidget(p_interactive, file.path(output_dir, "sales_comparison.html"), selfcontained = TRUE)
  
  message("销量对比图已生成")
  return(list(static = p, interactive = p_interactive))
}

plot_yoy_growth <- function(data_path = "../output/data_with_metrics.rds", output_dir = "../output") {
  if (!file.exists(data_path)) {
    stop("未找到数据文件，请先运行 calculate_metrics.R")
  }
  
  data <- readRDS(data_path)
  
  data_filtered <- data %>%
    filter(!is.na(yoy_ev), !is.na(yoy_total))
  
  p <- ggplot(data_filtered, aes(x = date)) +
    geom_line(aes(y = yoy_ev, color = "新能源销量同比"), size = 1.2) +
    geom_line(aes(y = yoy_total, color = "总销量同比"), size = 1.2) +
    geom_hline(yintercept = 0, linetype = "dashed", color = "gray50") +
    scale_y_continuous(labels = percent_format(accuracy = 1)) +
    scale_x_date(date_breaks = "6 months", date_labels = "%Y-%m") +
    scale_color_manual(values = c("新能源销量同比" = "#d62728", "总销量同比" = "#7f7f7f")) +
    labs(
      title = "新能源汽车销量同比增速 vs 整体市场",
      x = "月份",
      y = "同比增速",
      color = "指标"
    ) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.text.x = element_text(angle = 45, hjust = 1),
      legend.position = "bottom"
    )
  
  ggsave(file.path(output_dir, "yoy_growth.png"), p, width = 12, height = 7, dpi = 150)
  
  message("同比增速图已生成")
  return(p)
}

generate_all_charts <- function() {
  message("开始生成所有图表...")
  
  plot_penetration_trend()
  plot_bev_phev_structure()
  plot_sales_comparison()
  plot_yoy_growth()
  
  message("所有图表生成完成！")
}

if (!interactive()) {
  generate_all_charts()
}
