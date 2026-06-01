library(shiny)
library(shinydashboard)
library(DT)
library(plotly)

ui_header <- dashboardHeader(
  title = "考研复试分数线分析",
  dropdownMenuOutput("messageMenu")
)

ui_sidebar <- dashboardSidebar(
  sidebarMenu(
    id = "sidebar_menu",
    menuItem("数据概览", tabName = "overview", icon = icon("dashboard")),
    menuItem("趋势分析", tabName = "trend", icon = icon("line-chart")),
    menuItem("专业难度", tabName = "difficulty", icon = icon("trophy")),
    menuItem("学校对比", tabName = "comparison", icon = icon("balance-scale")),
    menuItem("数据管理", tabName = "data", icon = icon("database"))
  )
)

ui_body <- dashboardBody(
  tabItems(
    tabItem(
      tabName = "overview",
      fluidRow(
        box(
          title = "数据统计", status = "primary", solidHeader = TRUE, width = 12,
          valueBoxOutput("total_schools", width = 3),
          valueBoxOutput("total_majors", width = 3),
          valueBoxOutput("total_years", width = 3),
          valueBoxOutput("avg_score", width = 3)
        )
      ),
      fluidRow(
        box(
          title = "分数线分布", status = "info", solidHeader = TRUE, width = 6,
          selectInput("dist_category", "选择学科门类:", choices = NULL),
          plotlyOutput("score_distribution_plot")
        ),
        box(
          title = "高校分数线排名", status = "success", solidHeader = TRUE, width = 6,
          sliderInput("ranking_top_n", "Top N:", min = 5, max = 30, value = 15),
          plotlyOutput("school_ranking_plot")
        )
      )
    ),
    tabItem(
      tabName = "trend",
      fluidRow(
        box(
          title = "趋势分析设置", status = "primary", solidHeader = TRUE, width = 12,
          column(4, selectInput("trend_schools", "选择学校:", choices = NULL, multiple = TRUE)),
          column(4, selectInput("trend_major", "选择专业:", choices = NULL)),
          column(4, actionButton("update_trend", "更新图表", class = "btn-primary"))
        )
      ),
      fluidRow(
        box(
          title = "分数线5年趋势图", status = "info", solidHeader = TRUE, width = 12,
          plotlyOutput("trend_line_plot", height = "500px")
        )
      ),
      fluidRow(
        box(
          title = "数据表格", status = "warning", solidHeader = TRUE, width = 12,
          DTOutput("trend_data_table")
        )
      )
    ),
    tabItem(
      tabName = "difficulty",
      fluidRow(
        box(
          title = "筛选条件", status = "primary", solidHeader = TRUE, width = 12,
          column(6, selectInput("diff_category", "选择学科门类:", choices = NULL)),
          column(6, sliderInput("diff_top_n", "显示 Top N:", min = 5, max = 20, value = 10))
        )
      ),
      fluidRow(
        box(
          title = "难考专业排名", status = "danger", solidHeader = TRUE, width = 12,
          DTOutput("difficulty_table")
        )
      ),
      fluidRow(
        box(
          title = "难度指数分布", status = "info", solidHeader = TRUE, width = 6,
          plotlyOutput("difficulty_dist_plot")
        ),
        box(
          title = "难度说明", status = "success", solidHeader = TRUE, width = 6,
          HTML("
            <h4>难度指数计算方法:</h4>
            <ul>
              <li><strong>分数线权重 (60%)</strong>: 分数线越高，难度越大</li>
              <li><strong>报录比权重 (40%)</strong>: 报录比越高，难度越大</li>
            </ul>
            <h4>难度等级说明:</h4>
            <ul>
              <li><span style='color:red'>90-100: 极难</span></li>
              <li><span style='color:orange'>75-90: 很难</span></li>
              <li><span style='color:gold'>60-75: 较难</span></li>
              <li><span style='color:green'>45-60: 一般</span></li>
              <li><span style='color:blue'>0-45: 较易</span></li>
            </ul>
          ")
        )
      )
    ),
    tabItem(
      tabName = "comparison",
      fluidRow(
        box(
          title = "对比设置", status = "primary", solidHeader = TRUE, width = 12,
          column(6, selectInput("comp_schools", "选择要对比的学校:", choices = NULL, multiple = TRUE)),
          column(6, selectInput("comp_year", "选择年份:", choices = NULL))
        )
      ),
      fluidRow(
        box(
          title = "学校对比表格", status = "info", solidHeader = TRUE, width = 12,
          DTOutput("comparison_table")
        )
      ),
      fluidRow(
        box(
          title = "对比图表", status = "success", solidHeader = TRUE, width = 12,
          plotlyOutput("comparison_plot", height = "400px")
        )
      )
    ),
    tabItem(
      tabName = "data",
      fluidRow(
        box(
          title = "数据源", status = "primary", solidHeader = TRUE, width = 12,
          HTML("
            <p><strong>数据来源:</strong> 各高校研究生院官网公布的复试分数线</p>
            <p><strong>更新频率:</strong> 每年3-4月复试分数线公布后更新</p>
            <p><strong>注意事项:</strong> 本系统数据仅供参考，具体以官方公布为准</p>
          ")
        )
      ),
      fluidRow(
        box(
          title = "导入数据", status = "info", solidHeader = TRUE, width = 6,
          fileInput("import_file", "选择CSV文件:", accept = c(".csv")),
          actionButton("load_sample", "加载示例数据", class = "btn-success")
        ),
        box(
          title = "导出数据", status = "success", solidHeader = TRUE, width = 6,
          downloadButton("export_csv", "导出CSV"),
          downloadButton("export_excel", "导出Excel")
        )
      ),
      fluidRow(
        box(
          title = "完整数据预览", status = "warning", solidHeader = TRUE, width = 12,
          DTOutput("full_data_table")
        )
      )
    )
  )
)

app_ui <- dashboardPage(
  skin = "blue",
  ui_header,
  ui_sidebar,
  ui_body
)

style_difficulty <- function(value) {
  if (is.na(value)) {
    return("")
  }
  if (value >= 90) {
    return("background-color: #dc3545; color: white;")
  } else if (value >= 75) {
    return("background-color: #fd7e14; color: white;")
  } else if (value >= 60) {
    return("background-color: #ffc107; color: black;")
  } else if (value >= 45) {
    return("background-color: #28a745; color: white;")
  } else {
    return("background-color: #17a2b8; color: white;")
  }
}

render_difficulty_table <- function(data) {
  datatable(
    data,
    options = list(
      pageLength = 10,
      order = list(list(3, "desc")),
      scrollX = TRUE,
      columnDefs = list(
        list(targets = "_all", className = "dt-center")
      )
    ),
    rownames = FALSE,
    colnames = c(
      "专业名称" = "major",
      "学校" = "school",
      "难度指数" = "difficulty_index",
      "分数线" = "score",
      "报录比" = "ratio",
      "年份" = "year",
      "学科门类" = "major_category"
    )
  ) %>%
    formatStyle(
      "difficulty_index",
      target = "cell",
      backgroundColor = styleInterval(
        c(45, 60, 75, 90),
        c("#17a2b8", "#28a745", "#ffc107", "#fd7e14", "#dc3545")
      ),
      color = styleInterval(
        c(45, 60, 75, 90),
        c("white", "white", "black", "white", "white")
      )
    )
}
