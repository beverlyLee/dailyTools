library(dplyr)
library(stringr)

user_agents <- c(
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

get_random_user_agent <- function() {
  sample(user_agents, 1)
}

clean_names <- function(df, school_col = "school") {
  if (!school_col %in% colnames(df)) {
    warning(sprintf("Column '%s' not found in dataframe", school_col))
    return(df)
  }
  
  df <- df %>%
    mutate(!!sym(school_col) := str_trim(!!sym(school_col))) %>%
    mutate(!!sym(school_col) := str_replace_all(!!sym(school_col), "\\s+", " ")) %>%
    mutate(!!sym(school_col) := str_replace_all(!!sym(school_col), "（", "(")) %>%
    mutate(!!sym(school_col) := str_replace_all(!!sym(school_col), "）", ")")) %>%
    mutate(!!sym(school_col) := case_when(
      str_detect(!!sym(school_col), "清华") ~ "清华大学",
      str_detect(!!sym(school_col), "北大") ~ "北京大学",
      str_detect(!!sym(school_col), "复旦") ~ "复旦大学",
      str_detect(!!sym(school_col), "上海交大") | str_detect(!!sym(school_col), "上海交通") ~ "上海交通大学",
      str_detect(!!sym(school_col), "浙大") | str_detect(!!sym(school_col), "浙江大学") ~ "浙江大学",
      str_detect(!!sym(school_col), "南大") | str_detect(!!sym(school_col), "南京大学") ~ "南京大学",
      str_detect(!!sym(school_col), "中科大") | str_detect(!!sym(school_col), "中国科学技术") ~ "中国科学技术大学",
      str_detect(!!sym(school_col), "哈工大") | str_detect(!!sym(school_col), "哈尔滨工业") ~ "哈尔滨工业大学",
      str_detect(!!sym(school_col), "西安交大") | str_detect(!!sym(school_col), "西安交通") ~ "西安交通大学",
      str_detect(!!sym(school_col), "华科") | str_detect(!!sym(school_col), "华中科技") ~ "华中科技大学",
      TRUE ~ !!sym(school_col)
    ))
  
  return(df)
}

calculate_ratio <- function(df, applicants_col = "applicants", admitted_col = "admitted", ratio_col = "ratio") {
  required_cols <- c(applicants_col, admitted_col)
  missing_cols <- required_cols[!required_cols %in% colnames(df)]
  
  if (length(missing_cols) > 0) {
    warning(sprintf("Columns not found: %s", paste(missing_cols, collapse = ", ")))
    df[[ratio_col]] <- NA_real_
    return(df)
  }
  
  df <- df %>%
    mutate(!!sym(ratio_col) := ifelse(
      !!sym(admitted_col) > 0 & !!sym(applicants_col) > 0,
      round(!!sym(applicants_col) / !!sym(admitted_col), 2),
      NA_real_
    ))
  
  return(df)
}

calculate_difficulty_index <- function(df, score_col = "score", ratio_col = "ratio", 
                                       difficulty_col = "difficulty_index", 
                                       score_weight = 0.6, ratio_weight = 0.4) {
  if (!score_col %in% colnames(df)) {
    warning(sprintf("Score column '%s' not found", score_col))
    df[[difficulty_col]] <- NA_real_
    return(df)
  }
  
  if (!ratio_col %in% colnames(df)) {
    df[[difficulty_col]] <- df[[score_col]] / max(df[[score_col]], na.rm = TRUE) * 100
    return(df)
  }
  
  max_score <- max(df[[score_col]], na.rm = TRUE)
  max_ratio <- max(df[[ratio_col]], na.rm = TRUE)
  
  if (max_ratio == 0 || is.infinite(max_ratio)) {
    max_ratio <- 1
  }
  
  df <- df %>%
    mutate(
      score_norm := !!sym(score_col) / max_score * 100,
      ratio_norm := ifelse(is.infinite(!!sym(ratio_col)) | !!sym(ratio_col) == 0,
                          50,
                          !!sym(ratio_col) / max_ratio * 100),
      !!sym(difficulty_col) := round(score_norm * score_weight + ratio_norm * ratio_weight, 2)
    ) %>%
    select(-score_norm, -ratio_norm)
  
  return(df)
}

filter_by_major_category <- function(df, major_col = "major_category", selected_category) {
  if (!major_col %in% colnames(df)) {
    warning(sprintf("Major category column '%s' not found", major_col))
    return(df)
  }
  
  if (selected_category == "全部") {
    return(df)
  }
  
  df <- df %>%
    filter(!!sym(major_col) == selected_category)
  
  return(df)
}

get_major_categories <- function() {
  c(
    "全部",
    "哲学",
    "经济学",
    "法学",
    "教育学",
    "文学",
    "历史学",
    "理学",
    "工学",
    "农学",
    "医学",
    "军事学",
    "管理学",
    "艺术学"
  )
}
