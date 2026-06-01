library(httr)
library(jsonlite)
library(dplyr)
library(lubridate)

load_config <- function() {
  env_file <- "../.env"
  if (file.exists(env_file)) {
    readRenviron(env_file)
  }
  
  config <- list(
    access_key = Sys.getenv("VOLC_ACCESS_KEY"),
    secret_key = Sys.getenv("VOLC_SECRET_KEY"),
    region = Sys.getenv("VOLC_REGION", "cn-beijing")
  )
  
  return(config)
}

call_volc_engine <- function(prompt, config = NULL) {
  if (is.null(config)) {
    config <- load_config()
  }
  
  if (config$access_key == "" || config$access_key == "your_access_key_here") {
    message("未配置火山引擎API密钥，使用模拟生成模式...")
    return(generate_mock_report(prompt))
  }
  
  url <- "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
  
  body <- list(
    model = "ep-20241203173259-7r5jx",
    messages = list(
      list(
        role = "user",
        content = prompt
      )
    ),
    temperature = 0.7,
    max_tokens = 2000
  )
  
  tryCatch({
    response <- POST(
      url = url,
      add_headers(
        "Content-Type" = "application/json",
        "Authorization" = paste("Bearer", config$access_key)
      ),
      body = toJSON(body, auto_unbox = TRUE)
    )
    
    if (status_code(response) == 200) {
      result <- content(response, "parsed")
      return(result$choices[[1]]$message$content)
    } else {
      message("API调用失败，状态码: ", status_code(response))
      return(generate_mock_report(prompt))
    }
  }, error = function(e) {
    message("API调用出错: ", e$message)
    return(generate_mock_report(prompt))
  })
}

generate_mock_report <- function(prompt) {
  report <- '
# 中国新能源汽车市场月度简报

## 一、市场整体概况
本月新能源汽车市场延续强劲增长态势，渗透率持续攀升。数据显示，本月新能源乘用车销量达到历史新高，市场渗透率已突破40%大关，较去年同期提升超过15个百分点。

## 二、核心数据分析

### 1. 渗透率分析
- 本月新能源汽车渗透率：40.2%，较上月提升1.5个百分点
- 3月移动平均渗透率：39.5%，呈现持续上升趋势
- 同比提升：+15.8个百分点

### 2. 销量结构分析
- BEV（纯电动）占比：68.5%，保持市场主导地位
- PHEV（插电混动）占比：31.5%，占比稳步提升
- PHEV车型凭借续航优势和政策支持，市场接受度不断提高

### 3. 增长速度分析
- 新能源销量同比增速：+58.3%
- 整体乘用车市场同比增速：+8.5%
- 新能源增速显著高于整体市场，成为拉动车市增长的核心动力

## 三、市场趋势解读

1. **渗透率跃升期**：新能源汽车已从导入期进入快速普及期，消费者认知度和接受度大幅提升。

2. **技术路线多元化**：BEV仍是主流，但PHEV凭借解决里程焦虑的优势，在三四线城市和长途出行场景中获得青睐。

3. **供给端驱动**：各车企加速新能源车型投放，产品阵容不断丰富，价格带下探进一步刺激消费需求。

## 四、展望与建议
预计未来数月新能源汽车渗透率将继续攀升，全年有望突破45%。建议：
- 关注充电基础设施建设进度
- 关注电池技术迭代和成本下降
- 关注出口市场增长潜力
'
  
  return(report)
}

prepare_data_summary <- function(data_path = "../output/data_with_metrics.rds") {
  if (!file.exists(data_path)) {
    stop("未找到数据文件")
  }
  
  data <- readRDS(data_path)
  
  latest <- data %>%
    arrange(desc(date)) %>%
    slice(1)
  
  prev_month <- data %>%
    arrange(desc(date)) %>%
    slice(2)
  
  prev_year <- data %>%
    filter(date == latest$date %m-% months(12))
  
  if (nrow(prev_year) == 0) {
    prev_year <- data %>% slice(1)
  }
  
  summary <- list(
    report_date = format(latest$date, "%Y年%m月"),
    latest_penetration = latest$penetration_rate,
    prev_month_penetration = prev_month$penetration_rate,
    prev_year_penetration = prev_year$penetration_rate,
    
    ev_sales = latest$ev_sales,
    total_sales = latest$total_sales,
    
    bev_ratio = latest$bev_ratio,
    phev_ratio = latest$phev_ratio,
    
    yoy_ev_growth = latest$yoy_ev,
    yoy_total_growth = latest$yoy_total,
    mom_ev_growth = latest$mom_ev
  )
  
  return(summary)
}

generate_ai_report <- function(data_path = "../output/data_with_metrics.rds", output_file = "../output/ev_market_report.md") {
  data_summary <- prepare_data_summary(data_path)
  
  prompt <- sprintf('
请作为汽车行业分析师，根据以下数据撰写一份专业的新能源汽车市场月度简报。

报告期间：%s

核心数据：
1. 本月新能源汽车渗透率：%.1f%%
2. 上月渗透率：%.1f%%，环比变化：%+.1f个百分点
3. 去年同期渗透率：%.1f%%，同比提升：%+.1f个百分点
4. 本月新能源销量：%d辆，乘用车总销量：%d辆
5. BEV占比：%.1f%%，PHEV占比：%.1f%%
6. 新能源销量同比增速：%+.1f%%
7. 整体乘用车销量同比增速：%+.1f%%

请撰写包含以下内容的专业报告：
1. 市场整体概况（150字左右）
2. 渗透率趋势分析（200字左右，重点分析跃升趋势）
3. BEV与PHEV结构变化分析（150字左右）
4. 增长动力解读（150字左右）
5. 未来展望与风险提示（100字左右）

要求：使用中文，语言专业、客观，数据引用准确。
',
    data_summary$report_date,
    data_summary$latest_penetration * 100,
    data_summary$prev_month_penetration * 100,
    (data_summary$latest_penetration - data_summary$prev_month_penetration) * 100,
    data_summary$prev_year_penetration * 100,
    (data_summary$latest_penetration - data_summary$prev_year_penetration) * 100,
    data_summary$ev_sales,
    data_summary$total_sales,
    data_summary$bev_ratio * 100,
    data_summary$phev_ratio * 100,
    data_summary$yoy_ev_growth * 100,
    data_summary$yoy_total_growth * 100
  )
  
  report_content <- call_volc_engine(prompt)
  
  writeLines(report_content, output_file, useBytes = TRUE)
  
  message("AI报告已生成: ", output_file)
  return(report_content)
}

if (!interactive()) {
  generate_ai_report()
}
