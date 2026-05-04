# JavaScript 技巧

## 解构赋值

```javascript
// 数组解构
const [first, second, ...rest] = [1, 2, 3, 4, 5];
// first = 1, second = 2, rest = [3, 4, 5]

// 对象解构
const { name, age, ...others } = { 
  name: '张三', 
  age: 25, 
  city: '北京',
  job: '开发者'
};
```

## 可选链操作符

```javascript
// 安全地访问嵌套属性
const street = user?.address?.street;

// 安全地调用方法
const result = api?.fetch?.();

// 安全地访问数组
const item = arr?.[0];
```

## 空值合并运算符

```javascript
// 仅在 null 或 undefined 时使用默认值
const username = user.name ?? '匿名用户';

// 区别于 || 运算符
const count = 0 || 10;    // 10
const count = 0 ?? 10;    // 0
```

## 相关链接

- 父分类：[[编程技巧]]
- 其他语言：[[Python 技巧]]
