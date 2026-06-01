library(ggplot2)
library(dplyr)
library(plotly)

trend_line <- function(df, school_col = "school", year_col = "year", score_col = "score", 
                       major_col = "major", selected_schools = NULL, selected_major = NULL) {
  if (is.null(selected_schools) || length(selected_schools) == 0) {
    selected_schools <- unique(df[[school_col]])[1:min(5, length(unique(df[[school_col]])))]
  }
  
  plot_data <- df %>%
    filter(!!sym(school_col) %in% selected_schools)
  
  if (!is.null(selected_major) && selected_major != "全部") {
    plot_data <- plot_data %>%
      filter(!!sym(major_col) == selected_major)
  }
  
  if (nrow(plot_data) == 0) {
    p <- ggplot() +
      annotate("text", x = 1, y = 1, label = "暂无数据") +
      theme_void()
    return(ggplotly(p))
  }
  
  years <- unique(plot_data[[year_col]]) %>% sort()
  if (length(years) > 5) {
    years <- tail(years, 5)
    plot_data <- plot_data %>% filter(!!sym(year_col) %in% years)
  }
  
  p <- ggplot(plot_data, aes(x = factor(!!sym(year_col)), y = !!sym(score_col), 
                             color = !!sym(school_col), group = !!sym(school_col))) +
    geom_line(linewidth = 1) +
    geom_point(size = 3) +
    geom_text(aes(label = !!sym(score_col)), vjust = -0.5, size = 3) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.title = element_text(size = 12),
      legend.title = element_text(size = 12),
      legend.position = "bottom"
    ) +
    labs(
      title = sprintf("%s 分数线趋势", ifelse(is.null(selected_major) || selected_major == "全部", 
                                               "各专业", selected_major)),
      x = "年份",
      y = "分数线",
      color = "学校"
    ) +
    scale_color_brewer(palette = "Set1")
  
  ggplotly(p, tooltip = c("x", "y", "color")) %>%
    layout(legend = list(orientation = "h", y = -0.2))
}

get_top_difficult_majors <- function(df, n = 10, difficulty_col = "difficulty_index", 
                                      major_col = "major", school_col = "school") {
  result <- df %>%
    arrange(desc(!!sym(difficulty_col))) %>%
    head(n) %>%
    select(!!sym(major_col), !!sym(school_col), !!sym(difficulty_col), everything())
  
  return(result)
}

compare_schools <- function(df, school_col = "school", score_col = "score", 
                            major_col = "major", year_col = "year", selected_year = NULL) {
  if (!is.null(selected_year)) {
    df <- df %>% filter(!!sym(year_col) == selected_year)
  }
  
  summary_df <- df %>%
    group_by(!!sym(school_col)) %>%
    summarise(
      avg_score = mean(!!sym(score_col), na.rm = TRUE),
      min_score = min(!!sym(score_col), na.rm = TRUE),
      max_score = max(!!sym(score_col), na.rm = TRUE),
      major_count = n_distinct(!!sym(major_col)),
      .groups = "drop"
    ) %>%
    arrange(desc(avg_score))
  
  return(summary_df)
}

score_distribution <- function(df, score_col = "score", major_col = "major_category", 
                                selected_category = NULL) {
  plot_data <- df
  
  if (!is.null(selected_category) && selected_category != "全部") {
    plot_data <- df %>% filter(!!sym(major_col) == selected_category)
  }
  
  if (nrow(plot_data) == 0) {
    p <- ggplot() +
      annotate("text", x = 1, y = 1, label = "暂无数据") +
      theme_void()
    return(ggplotly(p))
  }
  
  p <- ggplot(plot_data, aes(x = !!sym(score_col))) +
    geom_histogram(bins = 15, fill = "#3498db", color = "white", alpha = 0.8) +
    geom_density(aes(y = after_stat(count)), color = "#e74c3c", linewidth = 1) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.title = element_text(size = 12)
    ) +
    labs(
      title = sprintf("%s 分数线分布", ifelse(is.null(selected_category) || selected_category == "全部", 
                                              "各学科门类", selected_category)),
      x = "分数线",
      y = "频数"
    )
  
  ggplotly(p)
}

school_ranking_plot <- function(df, school_col = "school", score_col = "score", top_n = 15) {
  ranking_data <- df %>%
    group_by(!!sym(school_col)) %>%
    summarise(
      avg_score = mean(!!sym(score_col), na.rm = TRUE),
      .groups = "drop"
    ) %>%
    arrange(desc(avg_score)) %>%
    head(top_n)
  
  p <- ggplot(ranking_data, aes(x = reorder(!!sym(school_col), avg_score), y = avg_score)) +
    geom_bar(stat = "identity", fill = "#2ecc71", alpha = 0.8) +
    coord_flip() +
    geom_text(aes(label = round(avg_score, 1)), hjust = -0.1, size = 3.5) +
    theme_minimal() +
    theme(
      plot.title = element_text(hjust = 0.5, size = 14, face = "bold"),
      axis.title = element_text(size = 12)
    ) +
    labs(
      title = sprintf("Top %d 高校平均分数线排名", top_n),
      x = "",
      y = "平均分数线"
    ) +
    expand_limits(y = max(ranking_data$avg_score) * 1.1)
  
  ggplotly(p)
}

predict_trend <- function(df, school_col = "school", year_col = "year", score_col = "score",
                          selected_school, selected_major, years_ahead = 1) {
  school_data <- df %>%
    filter(!!sym(school_col) == selected_school, !!sym(major_col) == selected_major) %>%
    arrange(!!sym(year_col))
  
  if (nrow(school_data) < 3) {
    return(list(
      data = school_data,
      prediction = NULL,
      message = "数据点不足，无法进行预测"
    ))
  }
  
  years <- as.numeric(school_data[[year_col]])
  scores <- school_data[[score_col]]
  
  model <- lm(scores ~ years)
  
  last_year <- max(years)
  predict_years <- seq(last_year + 1, last_year + years_ahead)
  predict_scores <- predict(model, newdata = data.frame(years = predict_years))
  
  prediction_df <- data.frame(
    year = predict_years,
    predicted_score = round(predict_scores, 1)
  )
  
  return(list(
    data = school_data,
    prediction = prediction_df,
    message = "预测成功"
  ))
}
