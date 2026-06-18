CREATE TABLE IF NOT EXISTS manufacturers (
  manufacturer_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  license_number TEXT,
  address TEXT,
  contact TEXT,
  is_blacklisted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS seeds (
  seed_id TEXT PRIMARY KEY,
  seed_name TEXT NOT NULL,
  crop_type TEXT NOT NULL,
  variety TEXT,
  registration_number TEXT,
  production_date TEXT,
  net_content TEXT,
  manufacturer_id TEXT,
  warning TEXT,
  quality TEXT,
  qr_code TEXT UNIQUE,
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(manufacturer_id)
);

CREATE TABLE IF NOT EXISTS blacklist (
  id TEXT PRIMARY KEY,
  manufacturer_id TEXT,
  reason TEXT,
  date_added TEXT,
  status TEXT,
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(manufacturer_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  email TEXT,
  phone TEXT,
  manufacturer_ids TEXT,
  created_at TEXT
);

INSERT OR IGNORE INTO manufacturers VALUES 
('M001', '中农种业有限公司', '农种许字2023第001号', '北京市海淀区中关村南大街12号', '400-123-4567', 0),
('M002', '河南金种子集团', '农种许字2023第002号', '河南省郑州市金水区农业路1号', '400-234-5678', 1),
('M003', '山东鲁农种业股份有限公司', '农种许字2023第003号', '山东省济南市历城区工业北路202号', '400-345-6789', 0),
('M004', '江苏明天种业科技有限公司', '农种许字2023第004号', '江苏省南京市玄武区钟灵街50号', '400-456-7890', 0);

INSERT OR IGNORE INTO seeds VALUES 
('S001', '郑单958', '玉米', '郑单958', '国审玉20000009', '2024-03', '5000g', 'M001', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-001'),
('S002', '登海605', '玉米', '登海605', '国审玉2010009', '2024-02', '4500g', 'M001', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-002'),
('S003', '先玉335', '玉米', '先玉335', '国审玉2004017', '2024-01', '4200g', 'M003', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-003'),
('S004', '京科968', '玉米', '京科968', '国审玉2011007', '2024-04', '5500g', 'M003', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-004'),
('S005', '南粳9108', '水稻', '南粳9108', '国审稻2013033', '2024-05', '10000g', 'M004', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-005'),
('S006', '扬粳805', '水稻', '扬粳805', '国审稻2014037', '2024-03', '8000g', 'M004', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-006'),
('S007', '济麦22', '小麦', '济麦22', '国审麦2006018', '2024-09', '15000g', 'M001', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-007'),
('S008', '山农20', '小麦', '山农20', '国审麦2010007', '2024-10', '12000g', 'M003', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'valid-seed-008'),
('S009', '金丰1号', '玉米', '金丰1号', '国审玉20200099', '2024-06', '5000g', 'M002', '请放置阴凉干燥处，注意防虫防霉', 'GB4404.1-2008', 'blacklist-seed-001');

INSERT OR IGNORE INTO blacklist VALUES 
('B001', 'M002', '生产假劣种子，2023年第四季度抽检不合格，涉嫌伪造审定编号', '2024-01-15', 'active'),
('B002', 'M002', '2024年第一季度再次抽检不合格，种子纯度不达标', '2024-04-20', 'active');
