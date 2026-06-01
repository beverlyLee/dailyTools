import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import logging
import json
import hashlib
from dataclasses import dataclass, asdict
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataSourceType(Enum):
    GOVERNMENT_TOURISM = "government_tourism"
    OPEN_DATASET = "open_dataset"
    PARTNER_PLATFORM = "partner_platform"
    SOCIAL_MEDIA = "social_media"
    MOCK_DATA = "mock_data"
    USER_GENERATED = "user_generated"


class DataQualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    CRITICAL = "critical"


@dataclass
class DataSourceConfig:
    source_id: str
    source_name: str
    source_type: DataSourceType
    description: str
    data_format: str
    update_frequency: str
    contact_info: str
    enabled: bool = True
    weight: float = 1.0


@dataclass
class DataQualityReport:
    total_records: int
    valid_records: int
    invalid_records: int
    missing_values_rate: float
    duplicate_rate: float
    outlier_rate: float
    consistency_score: float
    overall_score: float
    quality_level: DataQualityLevel
    issues: List[Dict[str, Any]]
    timestamp: str


class DataImporter:
    def __init__(self, config_dir: str = "data_sources"):
        self.config_dir = config_dir
        self.data_sources = self._load_data_sources()
        self.import_history = []
        
    def _load_data_sources(self) -> Dict[str, DataSourceConfig]:
        sources = {
            "china_tourism_bureau": DataSourceConfig(
                source_id="china_tourism_bureau",
                source_name="中国文化和旅游部公开数据",
                source_type=DataSourceType.GOVERNMENT_TOURISM,
                description="全国各景区节假日客流量统计数据",
                data_format="CSV",
                update_frequency="Monthly",
                contact_info="https://www.mct.gov.cn/",
                weight=0.9
            ),
            "national_bureau_statistics": DataSourceConfig(
                source_id="national_bureau_statistics",
                source_name="国家统计局公开数据",
                source_type=DataSourceType.GOVERNMENT_TOURISM,
                description="国民旅游出行统计、节假日出行人数",
                data_format="CSV",
                update_frequency="Quarterly",
                contact_info="https://www.stats.gov.cn/",
                weight=0.95
            ),
            "kaggle_camping_dataset": DataSourceConfig(
                source_id="kaggle_camping_dataset",
                source_name="Kaggle露营数据集",
                source_type=DataSourceType.OPEN_DATASET,
                description="全球露营地评分、客流量、用户评价数据集",
                data_format="CSV/JSON",
                update_frequency="Annually",
                contact_info="https://www.kaggle.com/",
                weight=0.7
            ),
            "uciml_tourism_data": DataSourceConfig(
                source_id="uciml_tourism_data",
                source_name="UCI机器学习旅游数据集",
                source_type=DataSourceType.OPEN_DATASET,
                description="旅游需求预测、客流量时间序列数据",
                data_format="CSV",
                update_frequency="Irregular",
                contact_info="https://archive.ics.uci.edu/",
                weight=0.75
            ),
            "xiaohongshu_open_api": DataSourceConfig(
                source_id="xiaohongshu_open_api",
                source_name="小红书开放平台",
                source_type=DataSourceType.PARTNER_PLATFORM,
                description="笔记打卡数据、景点热度指数",
                data_format="JSON API",
                update_frequency="Daily",
                contact_info="https://open.xiaohongshu.com/",
                weight=0.85
            ),
            "dianping_open_api": DataSourceConfig(
                source_id="dianping_open_api",
                source_name="大众点评开放平台",
                source_type=DataSourceType.PARTNER_PLATFORM,
                description="景点评分、评论数、打卡数、收藏数",
                data_format="JSON API",
                update_frequency="Daily",
                contact_info="https://open.dianping.com/",
                weight=0.8
            )
        }
        return sources

    def import_from_csv(self, file_path: str, source_id: str, encoding: str = "utf-8") -> pd.DataFrame:
        logger.info(f"从CSV导入数据: {file_path}")
        try:
            df = pd.read_csv(file_path, encoding=encoding)
            df["_source_id"] = source_id
            df["_import_time"] = datetime.now().isoformat()
            df["_data_hash"] = df.apply(lambda x: hashlib.md5(str(x).encode()).hexdigest(), axis=1)
            logger.info(f"成功导入 {len(df)} 条记录")
            return df
        except Exception as e:
            logger.error(f"CSV导入失败: {e}")
            raise

    def import_from_json(self, file_path: str, source_id: str) -> pd.DataFrame:
        logger.info(f"从JSON导入数据: {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list):
                df = pd.DataFrame(data)
            else:
                df = pd.DataFrame([data])
            
            df["_source_id"] = source_id
            df["_import_time"] = datetime.now().isoformat()
            df["_data_hash"] = df.apply(lambda x: hashlib.md5(str(x).encode()).hexdigest(), axis=1)
            logger.info(f"成功导入 {len(df)} 条记录")
            return df
        except Exception as e:
            logger.error(f"JSON导入失败: {e}")
            raise

    def generate_mock_tourism_data(self, site_names: List[str], start_date: datetime, 
                                    days: int = 365) -> pd.DataFrame:
        logger.info("生成模拟旅游统计数据")
        records = []
        
        for site_name in site_names:
            for day in range(days):
                current_date = start_date + timedelta(days=day)
                month = current_date.month
                weekday = current_date.weekday()
                is_weekend = weekday >= 5
                
                base_visitors = {
                    "武功山": 5000, "莫干山": 4500, "千岛湖": 4200,
                    "安吉小杭坑": 3800, "黄山风景区": 6000, "张家界": 7000,
                    "桂林阳朔": 5500, "三亚亚龙湾": 8000, "长白山": 3000,
                    "天目湖": 3500
                }.get(site_name, 3000)
                
                seasonal_factor = {
                    1: 0.5, 2: 0.6, 3: 1.0, 4: 1.3, 5: 1.5, 6: 1.4,
                    7: 1.6, 8: 1.7, 9: 1.5, 10: 1.8, 11: 1.0, 12: 0.7
                }.get(month, 1.0)
                
                weekend_factor = 1.4 if is_weekend else 1.0
                
                holiday_factor = 1.0
                if month == 5 and 1 <= current_date.day <= 5:
                    holiday_factor = 2.5
                elif month == 10 and 1 <= current_date.day <= 7:
                    holiday_factor = 3.0
                elif month == 1 and 20 <= current_date.day <= 30:
                    holiday_factor = 2.0
                
                visitors = int(base_visitors * seasonal_factor * weekend_factor * holiday_factor)
                visitors += int(np.random.normal(0, visitors * 0.1))
                
                records.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "site_name": site_name,
                    "daily_visitors": max(0, visitors),
                    "ticket_revenue": max(0, visitors) * np.random.uniform(50, 150),
                    "average_stay_hours": np.random.uniform(3, 8),
                    "peak_hour_visitors": max(0, int(visitors * 0.15)),
                    "weekend_flag": is_weekend,
                    "holiday_flag": holiday_factor > 1.0,
                    "source": "GOVERNMENT_STATISTICS_MOCK"
                })
        
        df = pd.DataFrame(records)
        df["_source_id"] = "mock_tourism_data"
        df["_import_time"] = datetime.now().isoformat()
        df["_data_hash"] = df.apply(lambda x: hashlib.md5(str(x).encode()).hexdigest(), axis=1)
        
        logger.info(f"生成 {len(df)} 条模拟数据")
        return df


class DataCleaner:
    def __init__(self):
        self.cleaning_rules = {
            "remove_duplicates": True,
            "handle_missing_values": True,
            "remove_outliers": True,
            "standardize_formats": True,
            "validate_ranges": True
        }
        
    def remove_duplicates(self, df: pd.DataFrame, subset: List[str] = None) -> Tuple[pd.DataFrame, int]:
        initial_count = len(df)
        
        if subset:
            df_cleaned = df.drop_duplicates(subset=subset, keep='first')
        else:
            df_cleaned = df.drop_duplicates(keep='first')
            
        removed_count = initial_count - len(df_cleaned)
        logger.info(f"移除 {removed_count} 条重复记录")
        return df_cleaned, removed_count

    def handle_missing_values(self, df: pd.DataFrame, strategy: str = "smart") -> Tuple[pd.DataFrame, Dict]:
        missing_stats = df.isnull().sum().to_dict()
        missing_report = {col: cnt for col, cnt in missing_stats.items() if cnt > 0}
        
        if strategy == "drop":
            df_cleaned = df.dropna()
        elif strategy == "smart":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            for col in numeric_cols:
                if df[col].isnull().sum() > 0:
                    df[col] = df[col].fillna(df[col].median())
            
            categorical_cols = df.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if df[col].isnull().sum() > 0:
                    df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "Unknown")
        else:
            for col in df.columns:
                if df[col].isnull().sum() > 0:
                    df[col] = df[col].fillna(0)
        
        logger.info(f"处理缺失值，涉及 {len(missing_report)} 列")
        return df, missing_report

    def remove_outliers(self, df: pd.DataFrame, columns: List[str] = None, 
                       z_threshold: float = 3.0) -> Tuple[pd.DataFrame, int]:
        if columns is None:
            columns = df.select_dtypes(include=[np.number]).columns
        
        outlier_mask = pd.Series([False] * len(df))
        outlier_count = 0
        
        for col in columns:
            z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
            col_outliers = z_scores > z_threshold
            outlier_mask = outlier_mask | col_outliers
            outlier_count += col_outliers.sum()
        
        df_cleaned = df[~outlier_mask]
        removed_count = outlier_mask.sum()
        logger.info(f"移除 {removed_count} 条异常值记录")
        return df_cleaned, removed_count

    def standardize_dates(self, df: pd.DataFrame, date_columns: List[str] = None) -> pd.DataFrame:
        if date_columns is None:
            date_columns = [col for col in df.columns if 'date' in col.lower()]
        
        for col in date_columns:
            try:
                df[col] = pd.to_datetime(df[col], errors='coerce')
                logger.info(f"标准化日期格式: {col}")
            except Exception as e:
                logger.warning(f"日期标准化失败 {col}: {e}")
        
        return df

    def standardize_numeric_ranges(self, df: pd.DataFrame, 
                                    column_ranges: Dict[str, Tuple[float, float]]) -> pd.DataFrame:
        for col, (min_val, max_val) in column_ranges.items():
            if col in df.columns:
                df[col] = df[col].clip(lower=min_val, upper=max_val)
                logger.info(f"标准化数值范围: {col} [{min_val}, {max_val}]")
        return df

    def clean_text_fields(self, df: pd.DataFrame, text_columns: List[str] = None) -> pd.DataFrame:
        if text_columns is None:
            text_columns = df.select_dtypes(include=['object']).columns
        
        for col in text_columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.strip()
                df[col] = df[col].apply(lambda x: re.sub(r'\s+', ' ', x))
        
        return df

    def clean_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
        cleaning_report = {
            "initial_record_count": len(df),
            "duplicates_removed": 0,
            "missing_values_handled": {},
            "outliers_removed": 0,
            "final_record_count": 0
        }
        
        df, dup_count = self.remove_duplicates(df)
        cleaning_report["duplicates_removed"] = dup_count
        
        df, missing_report = self.handle_missing_values(df, strategy="smart")
        cleaning_report["missing_values_handled"] = missing_report
        
        df, outlier_count = self.remove_outliers(df)
        cleaning_report["outliers_removed"] = outlier_count
        
        df = self.standardize_dates(df)
        
        cleaning_report["final_record_count"] = len(df)
        
        return df, cleaning_report


class DataStandardizer:
    def __init__(self):
        self.standard_schema = {
            "date": "datetime64[ns]",
            "site_name": "object",
            "checkin_count": "int64",
            "like_count": "int64",
            "comment_count": "int64",
            "share_count": "int64",
            "visitors_count": "int64",
            "weather_score": "float64",
            "congestion_level": "float64",
            "is_holiday": "bool",
            "is_weekend": "bool",
            "data_source": "object"
        }
        
        self.site_name_mapping = {
            "武功山": "武功山", "武功山景区": "武功山", "江西武功山": "武功山",
            "莫干山": "莫干山", "德清莫干山": "莫干山", "莫干山景区": "莫干山",
            "千岛湖": "千岛湖", "杭州千岛湖": "千岛湖", "淳安千岛湖": "千岛湖",
            "安吉小杭坑": "安吉小杭坑", "小杭坑": "安吉小杭坑",
            "黄山": "黄山风景区", "黄山风景区": "黄山风景区", "安徽黄山": "黄山风景区",
            "张家界": "张家界", "张家界国家森林公园": "张家界",
            "阳朔": "桂林阳朔", "桂林阳朔": "桂林阳朔", "阳朔西街": "桂林阳朔",
            "三亚": "三亚亚龙湾", "亚龙湾": "三亚亚龙湾", "三亚亚龙湾": "三亚亚龙湾",
            "长白山": "长白山", "长白山景区": "长白山", "吉林长白山": "长白山",
            "天目湖": "天目湖", "溧阳天目湖": "天目湖"
        }
    
    def standardize_site_names(self, df: pd.DataFrame, site_col: str = "site_name") -> pd.DataFrame:
        if site_col in df.columns:
            df[site_col] = df[site_col].map(self.site_name_mapping).fillna(df[site_col])
        return df
    
    def normalize_numeric_fields(self, df: pd.DataFrame, columns: List[str], 
                                 method: str = "minmax") -> pd.DataFrame:
        df_norm = df.copy()
        
        for col in columns:
            if col in df_norm.columns:
                if method == "minmax":
                    min_val = df_norm[col].min()
                    max_val = df_norm[col].max()
                    if max_val > min_val:
                        df_norm[f"{col}_normalized"] = (df_norm[col] - min_val) / (max_val - min_val)
                elif method == "zscore":
                    df_norm[f"{col}_normalized"] = (df_norm[col] - df_norm[col].mean()) / df_norm[col].std()
        
        return df_norm

    def aggregate_time_series(self, df: pd.DataFrame, date_col: str = "date",
                               site_col: str = "site_name", freq: str = "D") -> pd.DataFrame:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        agg_dict = {col: 'sum' for col in numeric_cols if col != date_col}
        agg_dict.update({col: 'first' for col in df.columns if col not in numeric_cols and col != date_col})
        
        df_agg = df.groupby([pd.Grouper(key=date_col, freq=freq), site_col]).agg(agg_dict).reset_index()
        return df_agg


class DataQualityAssessor:
    def __init__(self):
        self.thresholds = {
            "excellent": {"missing": 0.01, "duplicate": 0.001, "outlier": 0.01, "consistency": 0.95},
            "good": {"missing": 0.05, "duplicate": 0.01, "outlier": 0.05, "consistency": 0.85},
            "fair": {"missing": 0.10, "duplicate": 0.03, "outlier": 0.10, "consistency": 0.70},
            "poor": {"missing": 0.20, "duplicate": 0.05, "outlier": 0.15, "consistency": 0.50}
        }

    def assess_missing_values(self, df: pd.DataFrame) -> Tuple[float, List[Dict]]:
        missing_rates = df.isnull().sum() / len(df)
        issues = []
        
        for col, rate in missing_rates.items():
            if rate > 0.01:
                issues.append({
                    "type": "high_missing_rate",
                    "column": col,
                    "rate": float(rate),
                    "severity": "high" if rate > 0.1 else "medium"
                })
        
        return float(missing_rates.mean()), issues

    def assess_duplicates(self, df: pd.DataFrame) -> Tuple[float, List[Dict]]:
        duplicate_count = df.duplicated().sum()
        duplicate_rate = duplicate_count / len(df)
        
        issues = []
        if duplicate_rate > 0.001:
            issues.append({
                "type": "duplicate_records",
                "count": int(duplicate_count),
                "rate": float(duplicate_rate),
                "severity": "high" if duplicate_rate > 0.05 else "medium"
            })
        
        return float(duplicate_rate), issues

    def assess_outliers(self, df: pd.DataFrame) -> Tuple[float, List[Dict]]:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        outlier_counts = {}
        
        for col in numeric_cols:
            z_scores = np.abs((df[col] - df[col].mean()) / df[col].std())
            outlier_counts[col] = (z_scores > 3).sum()
        
        total_outliers = sum(outlier_counts.values())
        outlier_rate = total_outliers / (len(df) * len(numeric_cols)) if len(numeric_cols) > 0 else 0
        
        issues = []
        for col, count in outlier_counts.items():
            if count / len(df) > 0.01:
                issues.append({
                    "type": "column_outliers",
                    "column": col,
                    "count": int(count),
                    "rate": float(count / len(df)),
                    "severity": "high" if count / len(df) > 0.05 else "medium"
                })
        
        return float(outlier_rate), issues

    def assess_consistency(self, df: pd.DataFrame) -> Tuple[float, List[Dict]]:
        issues = []
        consistency_checks = []
        
        if "date" in df.columns:
            dates = pd.to_datetime(df["date"], errors='coerce')
            valid_dates = dates.notnull().sum()
            consistency_checks.append(valid_dates / len(df))
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            neg_count = (df[col] < 0).sum()
            if neg_count > 0 and col not in ["temperature"]:
                issues.append({
                    "type": "negative_values",
                    "column": col,
                    "count": int(neg_count),
                    "severity": "medium"
                })
            consistency_checks.append(1 - neg_count / len(df))
        
        consistency_score = np.mean(consistency_checks) if consistency_checks else 1.0
        return float(consistency_score), issues

    def assess_quality(self, df: pd.DataFrame) -> DataQualityReport:
        missing_rate, missing_issues = self.assess_missing_values(df)
        duplicate_rate, duplicate_issues = self.assess_duplicates(df)
        outlier_rate, outlier_issues = self.assess_outliers(df)
        consistency_score, consistency_issues = self.assess_consistency(df)
        
        all_issues = missing_issues + duplicate_issues + outlier_issues + consistency_issues
        
        valid_records = len(df) - sum(1 for issue in all_issues if issue["severity"] == "high")
        
        scores = {
            "missing": 1 - missing_rate,
            "duplicate": 1 - duplicate_rate,
            "outlier": 1 - outlier_rate,
            "consistency": consistency_score
        }
        weights = {"missing": 0.35, "duplicate": 0.25, "outlier": 0.15, "consistency": 0.25}
        overall_score = sum(scores[k] * weights[k] for k in scores)
        
        if overall_score >= 0.95:
            quality_level = DataQualityLevel.EXCELLENT
        elif overall_score >= 0.85:
            quality_level = DataQualityLevel.GOOD
        elif overall_score >= 0.70:
            quality_level = DataQualityLevel.FAIR
        elif overall_score >= 0.50:
            quality_level = DataQualityLevel.POOR
        else:
            quality_level = DataQualityLevel.CRITICAL
        
        return DataQualityReport(
            total_records=len(df),
            valid_records=valid_records,
            invalid_records=len(df) - valid_records,
            missing_values_rate=missing_rate,
            duplicate_rate=duplicate_rate,
            outlier_rate=outlier_rate,
            consistency_score=consistency_score,
            overall_score=overall_score,
            quality_level=quality_level,
            issues=all_issues,
            timestamp=datetime.now().isoformat()
        )


class DataPipeline:
    def __init__(self):
        self.importer = DataImporter()
        self.cleaner = DataCleaner()
        self.standardizer = DataStandardizer()
        self.assessor = DataQualityAssessor()
        self.processed_data = {}
        
    def run_full_pipeline(self, source_id: str, input_file: str = None, 
                          site_names: List[str] = None, days: int = 365) -> Dict[str, Any]:
        logger.info(f"启动数据处理流水线: {source_id}")
        
        if source_id == "mock_tourism_data" and site_names:
            df = self.importer.generate_mock_tourism_data(
                site_names=site_names,
                start_date=datetime.now() - timedelta(days=days),
                days=days
            )
        elif input_file and input_file.endswith('.csv'):
            df = self.importer.import_from_csv(input_file, source_id)
        elif input_file and input_file.endswith('.json'):
            df = self.importer.import_from_json(input_file, source_id)
        else:
            raise ValueError("不支持的数据源或缺少必要参数")
        
        quality_before = self.assessor.assess_quality(df)
        
        df_cleaned, cleaning_report = self.cleaner.clean_data(df)
        
        df_standardized = self.standardizer.standardize_site_names(df_cleaned)
        df_standardized = self.cleaner.standardize_dates(df_standardized)
        
        quality_after = self.assessor.assess_quality(df_standardized)
        
        result = {
            "source_id": source_id,
            "pipeline_timestamp": datetime.now().isoformat(),
            "initial_data": df,
            "cleaned_data": df_standardized,
            "cleaning_report": cleaning_report,
            "quality_before": asdict(quality_before),
            "quality_after": asdict(quality_after),
            "record_count_before": len(df),
            "record_count_after": len(df_standardized),
            "records_dropped": len(df) - len(df_standardized)
        }
        
        self.processed_data[source_id] = result
        logger.info(f"流水线处理完成，保留 {len(df_standardized)} 条记录")
        
        return result

    def merge_multi_source_data(self, source_ids: List[str]) -> pd.DataFrame:
        dfs = []
        for source_id in source_ids:
            if source_id in self.processed_data:
                df = self.processed_data[source_id]["cleaned_data"].copy()
                config = self.importer.data_sources.get(source_id)
                if config:
                    df["_source_weight"] = config.weight
                dfs.append(df)
        
        if not dfs:
            raise ValueError("没有可合并的数据源")
        
        merged_df = pd.concat(dfs, ignore_index=True)
        logger.info(f"合并 {len(dfs)} 个数据源，共 {len(merged_df)} 条记录")
        
        return merged_df
