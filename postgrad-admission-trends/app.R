library(shiny)
library(shinydashboard)
library(DT)
library(plotly)
library(dplyr)
library(ggplot2)

source("R/data_processing.R")
source("R/analysis.R")
source("R/ui_module.R")

app_server <- function(input, output, session) {
  rv <- reactiveValues(
    data = NULL,
    processed_data = NULL
  )
  
  generate_sample_data <- function() {
    schools <- c(
      "清华大学", "北京大学", "复旦大学", "上海交通大学", "浙江大学",
      "南京大学", "中国科学技术大学", "哈尔滨工业大学", "西安交通大学", "华中科技大学",
      "同济大学", "北京航空航天大学", "北京理工大学", "东南大学", "武汉大学"
    )
    
    majors_computer <- c(
      "计算机科学与技术", "软件工程", "人工智能", "大数据科学与技术",
      "计算机应用技术", "计算机系统结构", "计算机软件与理论"
    )
    
    years <- c(2020, 2021, 2022, 2023, 2024)
    
    data <- expand.grid(
      school = schools,
      major = majors_computer,
      year = years,
      stringsAsFactors = FALSE
    )
    
    set.seed(42)
    data$score <- sapply(1:nrow(data), function(i) {
      base_score <- ifelse(data$school[i] %in% c("清华大学", "北京大学"), 360,
                          ifelse(data$school[i] %in% c("复旦大学", "上海交通大学", "浙江大学"), 340, 320))
      year_bonus <- (data$year[i] - 2020) * sample(c(2, 3, 4, 5), 1)
      round(base_score + rnorm(1, 0, 10) + year_bonus)
    })
    
    data$score <- pmin(pmax(data$score, 280), 400)
    
    data$applicants <- sample(100:500, nrow(data), replace = TRUE)
    data$admitted <- sample(10:80, nrow(data), replace = TRUE)
    data$major_category <- "工学"
    
    other_majors <- list(
      "理学" = c("数学", "物理学", "化学", "生物学"),
      "经济学" = c("金融学", "国际贸易学", "产业经济学", "数量经济学"),
      "管理学" = c("企业管理", "行政管理", "会计学", "工商管理")
    )
    
    for (cat in names(other_majors)) {
      cat_data <- expand.grid(
        school = sample(schools, 10),
        major = other_majors[[cat]],
        year = years,
        stringsAsFactors = FALSE
      )
      
      cat_data$score <- sapply(1:nrow(cat_data), function(i) {
        base_score <- ifelse(cat_data$school[i] %in% c("清华大学", "北京大学"), 350,
                            ifelse(cat_data$school[i] %in% c("复旦大学", "上海交通大学"), 330, 310))
        year_bonus <- (cat_data$year[i] - 2020) * sample(c(1, 2, 3), 1)
        round(base_score + rnorm(1, 0, 8) + year_bonus)
      })
      
      cat_data$score <- pmin(pmax(cat_data$score, 280), 390)
      cat_data$applicants <- sample(80:400, nrow(cat_data), replace = TRUE)
      cat_data$admitted <- sample(8:60, nrow(cat_data), replace = TRUE)
      cat_data$major_category <- cat
      
      data <- rbind(data, cat_data)
    }
    
    data <- clean_names(data)
    data <- calculate_ratio(data)
    data <- calculate_difficulty_index(data)
    
    return(data)
  }
  
  observeEvent(input$load_sample, {
    rv$data <- generate_sample_data()
    rv$processed_data <- rv$data
    showNotification("示例数据加载成功！", type = "message")
  })
  
  observeEvent(input$import_file, {
    req(input$import_file)
    tryCatch({
      rv$data <- read.csv(input$import_file$datapath, stringsAsFactors = FALSE)
      rv$data <- clean_names(rv$data)
      if ("applicants" %in% colnames(rv$data) && "admitted" %in% colnames(rv$data)) {
        rv$data <- calculate_ratio(rv$data)
      }
      if ("score" %in% colnames(rv$data)) {
        rv$data <- calculate_difficulty_index(rv$data)
      }
      rv$processed_data <- rv$data
      showNotification("数据导入成功！", type = "message")
    }, error = function(e) {
      showNotification(paste("导入失败:", e$message), type = "error")
    })
  })
  
  output$export_csv <- downloadHandler(
    filename = function() {
      paste0("admission_data_", Sys.Date(), ".csv")
    },
    content = function(file) {
      write.csv(rv$processed_data, file, row.names = FALSE)
    }
  )
  
  output$export_excel <- downloadHandler(
    filename = function() {
      paste0("admission_data_", Sys.Date(), ".xlsx")
    },
    content = function(file) {
      if (requireNamespace("writexl", quietly = TRUE)) {
        writexl::write_xlsx(rv$processed_data, file)
      } else {
        write.csv(rv$processed_data, file, row.names = FALSE)
      }
    }
  )
  
  observe({
    if (!is.null(rv$data)) {
      categories <- get_major_categories()
      schools <- sort(unique(rv$data$school))
      majors <- sort(unique(rv$data$major))
      years <- sort(unique(rv$data$year))
      
      updateSelectInput(session, "dist_category", choices = categories, selected = "全部")
      updateSelectInput(session, "diff_category", choices = categories, selected = "全部")
      updateSelectInput(session, "trend_schools", choices = schools, selected = c("清华大学", "北京大学"))
      updateSelectInput(session, "trend_major", choices = c("全部", majors), selected = "计算机科学与技术")
      updateSelectInput(session, "comp_schools", choices = schools, selected = schools[1:5])
      updateSelectInput(session, "comp_year", choices = years, selected = max(years))
    }
  })
  
  output$total_schools <- renderValueBox({
    req(rv$data)
    valueBox(
      n_distinct(rv$data$school),
      "收录高校",
      icon = icon("university"),
      color = "blue"
    )
  })
  
  output$total_majors <- renderValueBox({
    req(rv$data)
    valueBox(
      n_distinct(rv$data$major),
      "专业数量",
      icon = icon("book"),
      color = "green"
    )
  })
  
  output$total_years <- renderValueBox({
    req(rv$data)
    valueBox(
      n_distinct(rv$data$year),
      "数据年份",
      icon = icon("calendar"),
      color = "purple"
    )
  })
  
  output$avg_score <- renderValueBox({
    req(rv$data)
    valueBox(
      round(mean(rv$data$score, na.rm = TRUE), 1),
      "平均分数线",
      icon = icon("calculator"),
      color = "orange"
    )
  })
  
  output$score_distribution_plot <- renderPlotly({
    req(rv$data)
    score_distribution(rv$data, selected_category = input$dist_category)
  })
  
  output$school_ranking_plot <- renderPlotly({
    req(rv$data)
    school_ranking_plot(rv$data, top_n = input$ranking_top_n)
  })
  
  trend_plot_data <- eventReactive(input$update_trend, {
    req(rv$data)
    list(
      data = rv$data,
      schools = input$trend_schools,
      major = input$trend_major
    )
  }, ignoreNULL = FALSE)
  
  output$trend_line_plot <- renderPlotly({
    req(trend_plot_data())
    td <- trend_plot_data()
    trend_line(td$data, selected_schools = td$schools, selected_major = td$major)
  })
  
  output$trend_data_table <- renderDT({
    req(rv$data, input$trend_schools)
    data <- rv$data %>%
      filter(school %in% input$trend_schools)
    
    if (input$trend_major != "全部") {
      data <- data %>% filter(major == input$trend_major)
    }
    
    datatable(
      data %>% select(school, major, year, score, ratio, difficulty_index),
      options = list(pageLength = 10, scrollX = TRUE),
      rownames = FALSE,
      colnames = c("学校", "专业", "年份", "分数线", "报录比", "难度指数")
    )
  })
  
  difficulty_data <- reactive({
    req(rv$data)
    data <- rv$data
    if (input$diff_category != "全部") {
      data <- filter_by_major_category(data, selected_category = input$diff_category)
    }
    get_top_difficult_majors(data, n = input$diff_top_n)
  })
  
  output$difficulty_table <- renderDT({
    req(difficulty_data())
    render_difficulty_table(difficulty_data())
  })
  
  output$difficulty_dist_plot <- renderPlotly({
    req(rv$data)
    p <- ggplot(rv$data, aes(x = difficulty_index)) +
      geom_histogram(bins = 20, fill = "#9b59b6", color = "white", alpha = 0.8) +
      theme_minimal() +
      labs(
        title = "难度指数分布",
        x = "难度指数",
        y = "频数"
      )
    ggplotly(p)
  })
  
  comparison_data <- reactive({
    req(rv$data, input$comp_schools, input$comp_year)
    compare_schools(
      rv$data,
      selected_year = input$comp_year
    ) %>%
      filter(school %in% input$comp_schools)
  })
  
  output$comparison_table <- renderDT({
    req(comparison_data())
    datatable(
      comparison_data(),
      options = list(pageLength = 10, scrollX = TRUE),
      rownames = FALSE,
      colnames = c("学校", "平均分数线", "最低分数线", "最高分数线", "专业数量")
    )
  })
  
  output$comparison_plot <- renderPlotly({
    req(comparison_data())
    p <- ggplot(comparison_data(), aes(x = reorder(school, avg_score), y = avg_score)) +
      geom_bar(stat = "identity", fill = "#3498db", alpha = 0.8) +
      coord_flip() +
      geom_text(aes(label = round(avg_score, 1)), hjust = -0.1, size = 3.5) +
      theme_minimal() +
      labs(
        title = sprintf("%s年各学校平均分数线对比", input$comp_year),
        x = "",
        y = "平均分数线"
      ) +
      expand_limits(y = max(comparison_data()$avg_score) * 1.1)
    ggplotly(p)
  })
  
  output$full_data_table <- renderDT({
    req(rv$processed_data)
    datatable(
      rv$processed_data,
      options = list(pageLength = 15, scrollX = TRUE),
      rownames = FALSE,
      colnames = c(
        "学校" = "school",
        "专业" = "major",
        "年份" = "year",
        "分数线" = "score",
        "报考人数" = "applicants",
        "录取人数" = "admitted",
        "报录比" = "ratio",
        "学科门类" = "major_category",
        "难度指数" = "difficulty_index"
      )
    )
  })
  
  rv$data <- generate_sample_data()
  rv$processed_data <- rv$data
}

shinyApp(ui = app_ui, server = app_server)
