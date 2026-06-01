#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 正在启动考研复试分数线分析系统..."

R -e "shiny::runApp(launch.browser=TRUE)"
