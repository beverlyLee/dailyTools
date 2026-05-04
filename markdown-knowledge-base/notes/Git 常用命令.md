# Git 常用命令

## 基础命令

```bash
# 初始化仓库
git init

# 克隆远程仓库
git clone <url>

# 查看状态
git status

# 查看历史
git log
```

## 暂存与提交

```bash
# 暂存所有更改
git add .

# 暂存特定文件
git add <file>

# 提交
git commit -m "提交信息"

# 暂存并提交
git commit -a -m "提交信息"
```

## 分支操作

```bash
# 查看所有分支
git branch -a

# 创建新分支
git branch <name>

# 切换分支
git checkout <name>

# 创建并切换
git checkout -b <name>

# 合并分支
git merge <branch>
```

## 远程操作

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add origin <url>

# 推送到远程
git push origin main

# 拉取远程更新
git pull origin main

# 获取远程更新但不合并
git fetch origin
```

## 撤销操作

```bash
# 撤销暂存
git restore --staged <file>

# 撤销工作区修改
git restore <file>

# 撤销最后一次提交
git reset --soft HEAD~1
```

## 相关链接

- 父分类：[[编程技巧]]
