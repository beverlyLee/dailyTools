#!/usr/bin/env Rscript

cat("📦 正在安装依赖包...\n\n")

options(repos = c(CRAN = "https://mirrors.tuna.tsinghua.edu.cn/CRAN/"))

packages <- c(
  "shiny",
  "shinydashboard",
  "DT",
  "plotly",
  "dplyr",
  "ggplot2",
  "stringr"
)

for (pkg in packages) {
  if (!require(pkg, character.only = TRUE, quietly = TRUE)) {
    cat(sprintf("安装 %s...\n", pkg))
    install.packages(pkg, quiet = TRUE)
  } else {
    cat(sprintf("✓ %s 已安装\n", pkg))
  }
}

cat("\n✅ 所有依赖包安装完成！\n")
cat("现在可以运行 ./start.sh 启动应用\n")
