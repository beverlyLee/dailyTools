import "reflect-metadata";
import { Database, setGlobalDatabase, Model } from "../src";
import { User } from "./models/User";
import { Post } from "./models/Post";

// 主函数
async function main() {
  console.log("=== Lightweight ORM 演示 ===\n");

  // 使用内存数据库进行测试
  const db = await Database.create({ filename: ":memory:" });

  // 设置全局数据库连接
  setGlobalDatabase(db);

  // 1. 创建表（使用模型的 createTable 方法）
  console.log("1. 创建表...");
  db.exec(User.createTable());
  db.exec(Post.createTable());
  console.log("表创建成功\n");

  // 2. 插入数据
  console.log("2. 插入数据...");

  // 使用静态 insert 方法
  const userId1 = await User.insert({
    name: "张三",
    email: "zhangsan@example.com",
    age: 25,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log(`创建用户 ID: ${userId1}`);

  const userId2 = await User.insert({
    name: "李四",
    email: "lisi@example.com",
    age: 30,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log(`创建用户 ID: ${userId2}`);

  // 使用实例的 save 方法
  const post = new Post();
  post.title = "第一篇文章";
  post.content = "这是第一篇文章的内容";
  post.userId = userId1;
  post.createdAt = new Date();
  post.updatedAt = new Date();
  await post.save();
  console.log(`创建文章 ID: ${post.id}`);

  console.log("数据插入成功\n");

  // 3. 查询数据
  console.log("3. 查询数据...");

  // 查询所有用户
  const allUsers = await User.find();
  console.log("所有用户:", allUsers);

  // 查询单个用户
  const user1 = await User.findById(userId1);
  console.log("用户 1:", user1);

  // 使用 where 条件查询
  const activeUsers = await User.query()
    .where("isActive", "=", true)
    .find();
  console.log("活跃用户:", activeUsers);

  // 使用链式查询
  const oldUsers = await User.query()
    .where("age", ">", 20)
    .orderBy("name", "ASC")
    .limit(10)
    .find();
  console.log("年龄大于 20 的用户:", oldUsers);

  // 类型安全的查询 - 这里的列名会在编译时检查
  // 如果你写 where("invalidColumn", "=", 1)，TypeScript 会报错
  const typedQuery = User.query()
    .where("name", "LIKE", "%张%")
    .where("age", ">=", 18)
    .orderBy("age", "DESC");
  
  console.log("生成的 SQL:", typedQuery.toSQL());

  console.log("\n");

  // 4. 更新数据
  console.log("4. 更新数据...");

  // 使用静态 update 方法
  const updatedCount = await User.query()
    .where("id", "=", userId1)
    .update({
      age: 26,
      updatedAt: new Date()
    });
  console.log(`更新了 ${updatedCount} 条记录`);

  // 使用实例的 save 方法
  if (user1) {
    user1.name = "张三三";
    await user1.save();
    console.log(`更新用户后的名字: ${user1.name}`);
  }

  console.log("\n");

  // 5. 删除数据
  console.log("5. 删除数据...");

  // 使用静态 delete 方法
  const deletedCount = await User.query()
    .where("id", "=", userId2)
    .delete();
  console.log(`删除了 ${deletedCount} 条记录`);

  // 使用实例的 delete 方法
  const postToDelete = await Post.findById(post.id);
  if (postToDelete) {
    const postDeletedCount = await postToDelete.delete();
    console.log(`删除了 ${postDeletedCount} 篇文章`);
  }

  console.log("\n");

  // 6. 验证表结构
  console.log("6. 表结构信息:");
  console.log("Users 表创建 SQL:");
  console.log(User.createTable());
  console.log("\nPosts 表创建 SQL:");
  console.log(Post.createTable());

  // 7. 类型安全演示
  console.log("\n7. 类型安全演示:");
  
  // 这些操作会在编译时检查类型
  // 如果列名或值类型不匹配，TypeScript 会报错
  
  // 正确的用法：
  const validUpdate: Partial<User> = {
    name: "新名字", // string 类型，正确
    age: 30,        // number 类型，正确
    isActive: false // boolean 类型，正确
  };
  
  console.log("有效的更新对象:", validUpdate);
  
  // 错误的用法（会被 TypeScript 捕获）：
  // const invalidUpdate: Partial<User> = {
  //   name: 123,          // 错误：number 不能赋值给 string
  //   nonExistent: "test" // 错误：属性不存在于 User 类型
  // };

  console.log("\n=== 演示完成 ===");
  
  // 关闭数据库连接
  db.close();
}

// 运行示例
main()
  .catch(console.error);
