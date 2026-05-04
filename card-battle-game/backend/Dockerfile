# 使用 Node.js 20 Alpine 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖（用于构建 sqlite3）
RUN apk add --no-cache python3 make g++

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY src ./src

# 创建数据目录（用于 SQLite 数据库）
RUN mkdir -p data

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["npm", "start"]
