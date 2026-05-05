import { 
  DataCleaner, 
  SchemaDefinition, 
  CleanResult,
  ValidationError,
  OutlierInfo
} from '../data-validator/src/index';

interface UserRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  age: number;
  salary: number;
  joinDate: string | Date;
  active: string | boolean;
  tags: string | string[];
  website?: string;
}

function dataCleanerExample() {
  console.log('=== 数据校验与清洗示例 ===\n');

  const schema: SchemaDefinition = {
    fields: {
      id: {
        type: 'number',
        required: true,
        nullable: false,
        rules: [
          { type: 'range', min: 1, message: 'ID 必须大于 0' }
        ]
      },
      name: {
        type: 'string',
        required: true,
        nullable: false,
        missingStrategy: 'fill',
        default: 'Unknown',
        rules: [
          { type: 'length', min: 2, max: 50, message: '姓名长度必须在 2-50 个字符之间' }
        ]
      },
      email: {
        type: 'string',
        required: true,
        nullable: false,
        rules: [
          { type: 'email', message: '无效的邮箱格式' }
        ]
      },
      phone: {
        type: 'string',
        required: true,
        nullable: false,
        rules: [
          { type: 'phone', message: '无效的手机号格式' }
        ]
      },
      age: {
        type: 'number',
        required: true,
        nullable: false,
        missingStrategy: 'fill',
        default: 30,
        outlierDetection: true,
        outlierMethod: 'iqr',
        outlierAction: 'mark',
        rules: [
          { type: 'range', min: 18, max: 100, message: '年龄必须在 18-100 岁之间' }
        ],
        transform: (value: any) => Math.floor(Number(value))
      },
      salary: {
        type: 'number',
        required: true,
        nullable: false,
        missingStrategy: 'fill',
        default: 50000,
        outlierDetection: true,
        outlierMethod: 'zscore',
        outlierAction: 'mark'
      },
      joinDate: {
        type: 'date',
        required: true,
        nullable: false,
        missingStrategy: 'fill',
        default: new Date()
      },
      active: {
        type: 'boolean',
        required: false,
        nullable: true,
        default: true
      },
      tags: {
        type: 'array',
        required: false,
        nullable: true,
        default: []
      },
      website: {
        type: 'string',
        required: false,
        nullable: true,
        rules: [
          { type: 'url', message: '无效的网站 URL' }
        ]
      }
    },
    strict: false
  };

  const rawData: any[] = [
    {
      id: 1,
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138001',
      age: 28,
      salary: 60000,
      joinDate: '2023-01-15',
      active: 'true',
      tags: '开发,前端,React',
      website: 'https://zhangsan.com'
    },
    {
      id: 2,
      name: '李四',
      email: 'lisi@invalid',
      phone: '13800138002',
      age: 35,
      salary: 75000,
      joinDate: '2022-06-20',
      active: 1,
      tags: ['后端', 'Java'],
      website: 'lisi.com'
    },
    {
      id: 3,
      name: null,
      email: 'wangwu@example.com',
      phone: '13800138003',
      age: '',
      salary: 50000,
      joinDate: null,
      active: false,
      tags: ''
    },
    {
      id: 4,
      name: '赵六',
      email: 'zhaoliu@example.com',
      phone: '021-12345678',
      age: 150,
      salary: 2000000,
      joinDate: '2021-03-10',
      active: 'yes',
      tags: 'manager|leader',
      website: 'https://zhaoliu.io'
    },
    {
      id: -5,
      name: '孙七',
      email: 'sunqi@example.com',
      phone: '13800138005',
      age: 42,
      salary: 85000,
      joinDate: '2020-11-05',
      active: 'no'
    }
  ];

  console.log('1. 创建 DataCleaner 实例...');
  const cleaner = new DataCleaner(schema);

  console.log('\n2. 从数据推断 Schema（自动检测）...');
  const inferredSchema = cleaner.inferSchema(rawData);
  console.log('推断的字段类型:');
  for (const [field, def] of Object.entries(inferredSchema.fields)) {
    console.log(`  - ${field}: ${def.type} (required: ${def.required}, nullable: ${def.nullable})`);
  }

  console.log('\n3. 执行数据清洗...');
  const result: CleanResult<UserRecord> = cleaner.clean<UserRecord>(rawData);

  console.log('\n=== 清洗结果 ===');
  console.log(`清洗后数据条数: ${result.data.length}`);
  console.log(`被移除的行: ${result.removedRows.length > 0 ? result.removedRows.join(', ') : '无'}`);
  console.log(`验证错误数: ${result.errors.length}`);
  console.log(`异常值数: ${result.outliers.filter(o => o.isOutlier).length}`);
  console.log(`数据转换数: ${result.transformations.length}`);

  if (result.errors.length > 0) {
    console.log('\n=== 验证错误详情 ===');
    result.errors.forEach((error: ValidationError) => {
      console.log(`  字段: ${error.field}`);
      console.log(`    值: ${JSON.stringify(error.value)}`);
      console.log(`    规则: ${error.rule}`);
      console.log(`    错误: ${error.message}`);
    });
  }

  if (result.outliers.filter((o: OutlierInfo) => o.isOutlier).length > 0) {
    console.log('\n=== 异常值检测 ===');
    result.outliers
      .filter((o: OutlierInfo) => o.isOutlier)
      .forEach((outlier: OutlierInfo) => {
        console.log(`  行 ${outlier.index}, 字段 ${outlier.field}:`);
        console.log(`    值: ${outlier.value}, 检测方法: ${outlier.method}`);
      });
  }

  if (result.transformations.length > 0) {
    console.log('\n=== 数据转换 ===');
    result.transformations.forEach(t => {
      console.log(`  行 ${t.index}, 字段 ${t.field}:`);
      console.log(`    从: ${JSON.stringify(t.from)} -> 到: ${JSON.stringify(t.to)}`);
    });
  }

  console.log('\n=== 清洗后的数据 ===');
  result.data.forEach((record, index) => {
    console.log(`\n  记录 ${index + 1}:`);
    console.log(`    ID: ${record.id}`);
    console.log(`    姓名: ${record.name}`);
    console.log(`    邮箱: ${record.email}`);
    console.log(`    手机: ${record.phone}`);
    console.log(`    年龄: ${record.age}`);
    console.log(`    薪资: ${record.salary}`);
    console.log(`    入职日期: ${record.joinDate instanceof Date ? record.joinDate.toISOString().split('T')[0] : record.joinDate}`);
    console.log(`    状态: ${record.active}`);
    console.log(`    标签: ${Array.isArray(record.tags) ? record.tags.join(', ') : record.tags}`);
    if (record.website) {
      console.log(`    网站: ${record.website}`);
    }
  });

  console.log('\n4. 单独验证数据...');
  const validationResult = cleaner.validate(rawData);
  console.log(`\n验证结果: ${validationResult.valid ? '通过' : '失败'}`);
  if (!validationResult.valid) {
    console.log(`错误数: ${validationResult.errors.length}`);
  }

  console.log('\n=== 数据校验与清洗示例完成 ===');
}

dataCleanerExample();
