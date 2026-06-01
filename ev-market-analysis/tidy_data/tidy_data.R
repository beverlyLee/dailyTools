library(readxl)
library(dplyr)
library(lubridate)
library(stringr)
library(tidyr)

tidy_sales_data <- function(data_dir = "../data") {
  excel_files <- list.files(data_dir, pattern = "\\.xlsx?$", full.names = TRUE)
  
  if (length(excel_files) == 0) {
    message("未找到Excel文件，使用模拟数据...")
    return(generate_sample_data())
  }
  
  all_data <- list()
  
  for (file in excel_files) {
    message("处理文件: ", basename(file))
    
    sheets <- excel_sheets(file)
    
    for (sheet in sheets) {
      df <- read_excel(file, sheet = sheet)
      
      df_cleaned <- clean_dataframe(df)
      
      if (!is.null(df_cleaned) && nrow(df_cleaned) > 0) {
        all_data[[length(all_data) + 1]] <- df_cleaned
      }
    }
  }
  
  if (length(all_data) == 0) {
    message("无法从Excel文件提取数据，使用模拟数据...")
    return(generate_sample_data())
  }
  
  final_data <- bind_rows(all_data) %>%
    arrange(date) %>%
    distinct()
  
  saveRDS(final_data, "../output/cleaned_sales_data.rds")
  write.csv(final_data, "../output/cleaned_sales_data.csv", row.names = FALSE)
  
  message("数据整理完成，共 ", nrow(final_data), " 条记录")
  return(final_data)
}

clean_dataframe <- function(df) {
  df <- df %>%
    rename_all(~str_replace_all(., "\\s+", "")) %>%
    rename_all(~str_to_lower(.))
  
  date_col <- grep("date|年月|月份|时间", names(df), value = TRUE)[1]
  total_col <- grep("total|总销量|乘用车|汽车", names(df), value = TRUE)[1]
  ev_col <- grep("nev|新能源|electric", names(df), value = TRUE)[1]
  bev_col <- grep("bev|纯电动", names(df), value = TRUE)[1]
  phev_col <- grep("phev|插电", names(df), value = TRUE)[1]
  
  if (is.na(date_col)) {
    return(NULL)
  }
  
  result <- data.frame(date = parse_date(df[[date_col]]))
  
  if (!is.na(total_col)) result$total_sales <- as.numeric(df[[total_col]])
  if (!is.na(ev_col)) result$ev_sales <- as.numeric(df[[ev_col]])
  if (!is.na(bev_col)) result$bev_sales <- as.numeric(df[[bev_col]])
  if (!is.na(phev_col)) result$phev_sales <- as.numeric(df[[phev_col]])
  
  result <- result %>%
    filter(!is.na(date)) %>%
    mutate(year = year(date),
           month = month(date))
  
  return(result)
}

parse_date <- function(date_vec) {
  tryCatch({
    if (inherits(date_vec, "Date")) {
      return(date_vec)
    }
    
    date_str <- as.character(date_vec)
    
    if (all(grepl("^\\d{6}$", date_str))) {
      return(ymd(paste0(date_str, "01")))
    }
    
    if (all(grepl("^\\d{4}年\\d{1,2}月", date_str))) {
      year_part <- str_extract(date_str, "\\d{4}")
      month_part <- str_extract(date_str, "\\d{1,2}月") %>% str_remove("月")
      return(ymd(paste(year_part, month_part, "01")))
    }
    
    return(ymd(date_str))
  }, error = function(e) {
    return(rep(NA, length(date_vec)))
  })
}

generate_sample_data <- function() {
  start_date <- ymd("2020-01-01")
  end_date <- ymd("2025-03-01")
  dates <- seq(start_date, end_date, by = "month")
  
  n <- length(dates)
  
  base_total <- 1800000
  
  ev_share_start <- 0.055
  ev_share_end <- 0.40
  
  ev_share <- seq(ev_share_start, ev_share_end, length.out = n)
  
  ev_share <- ev_share + rnorm(n, 0, 0.01)
  
  ev_share <- pmax(pmin(ev_share, 0.5), 0.03)
  
  seasonal_factor <- rep(c(0.92, 0.98, 1.05, 1.02, 1.0, 1.03, 
                           0.95, 0.98, 1.02, 1.05, 1.04, 0.96), 
                         length.out = n)
  
  total_trend <- seq(1, 1.1, length.out = n)
  
  total_sales <- round(base_total * total_trend * seasonal_factor * (1 + rnorm(n, 0, 0.03)))
  
  ev_sales <- round(total_sales * ev_share)
  
  bev_ratio_start <- 0.72
  bev_ratio_end <- 0.68
  bev_ratio <- seq(bev_ratio_start, bev_ratio_end, length.out = n) + rnorm(n, 0, 0.02)
  bev_ratio <- pmax(pmin(bev_ratio, 0.85), 0.55)
  
  bev_sales <- round(ev_sales * bev_ratio)
  phev_sales <- ev_sales - bev_sales
  
  data <- data.frame(
    date = dates,
    year = year(dates),
    month = month(dates),
    total_sales = total_sales,
    ev_sales = ev_sales,
    bev_sales = bev_sales,
    phev_sales = phev_sales
  )
  
  dir.create("../output", showWarnings = FALSE)
  saveRDS(data, "../output/cleaned_sales_data.rds")
  write.csv(data, "../output/cleaned_sales_data.csv", row.names = FALSE)
  
  message("已生成模拟数据，共 ", nrow(data), " 条记录")
  return(data)
}

if (!interactive()) {
  tidy_sales_data()
}
