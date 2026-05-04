# Python 技巧

## 列表推导式

```python
# 创建平方数列表
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# 带条件的列表推导式
evens = [x for x in range(20) if x % 2 == 0]
# [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
```

## 字典推导式

```python
# 交换键值
original = {'a': 1, 'b': 2, 'c': 3}
swapped = {v: k for k, v in original.items()}
# {1: 'a', 2: 'b', 3: 'c'}
```

## 相关链接

- 父分类：[[编程技巧]]
- 更多语言：[[JavaScript 技巧]]
