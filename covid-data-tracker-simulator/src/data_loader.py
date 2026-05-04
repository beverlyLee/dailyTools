import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, Date, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

Base = declarative_base()

class CovidData(Base):
    __tablename__ = 'covid_data'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False)
    country = Column(String(100), nullable=False)
    confirmed = Column(Integer, default=0)
    deaths = Column(Integer, default=0)
    recovered = Column(Integer, default=0)
    population = Column(Integer, default=0)

class DataLoader:
    def __init__(self, db_path=None):
        self.data = None
        self.engine = None
        self.Session = None
        
        if db_path:
            self._init_database(db_path)
    
    def _init_database(self, db_path):
        try:
            self.engine = create_engine(f'sqlite:///{db_path}')
            Base.metadata.create_all(self.engine)
            self.Session = sessionmaker(bind=self.engine)
            print(f"数据库初始化成功: {db_path}")
        except Exception as e:
            print(f"数据库初始化失败: {e}")
    
    def load_csv_data(self, csv_path):
        try:
            if not os.path.exists(csv_path):
                raise FileNotFoundError(f"CSV文件不存在: {csv_path}")
            
            self.data = pd.read_csv(
                csv_path,
                parse_dates=['date'],
                dtype={
                    'country': str,
                    'confirmed': int,
                    'deaths': int,
                    'recovered': int,
                    'population': int
                }
            )
            
            self.data['date'] = pd.to_datetime(self.data['date'])
            
            print(f"成功加载 {len(self.data)} 条记录")
            print(f"数据日期范围: {self.data['date'].min()} 到 {self.data['date'].max()}")
            print(f"覆盖国家/地区数: {self.data['country'].nunique()}")
            
            return True
            
        except Exception as e:
            print(f"加载CSV数据失败: {e}")
            return False
    
    def save_to_database(self):
        if self.data is None or self.engine is None:
            print("数据未加载或数据库未初始化")
            return False
        
        try:
            session = self.Session()
            
            for _, row in self.data.iterrows():
                record = CovidData(
                    date=row['date'].date() if pd.notna(row['date']) else None,
                    country=row['country'],
                    confirmed=int(row['confirmed']) if pd.notna(row['confirmed']) else 0,
                    deaths=int(row['deaths']) if pd.notna(row['deaths']) else 0,
                    recovered=int(row['recovered']) if pd.notna(row['recovered']) else 0,
                    population=int(row['population']) if pd.notna(row['population']) else 0
                )
                session.add(record)
            
            session.commit()
            session.close()
            
            print(f"成功保存 {len(self.data)} 条记录到数据库")
            return True
            
        except Exception as e:
            print(f"保存到数据库失败: {e}")
            return False
    
    def load_from_database(self):
        if self.engine is None:
            print("数据库未初始化")
            return False
        
        try:
            query = "SELECT * FROM covid_data"
            self.data = pd.read_sql_query(query, self.engine)
            self.data['date'] = pd.to_datetime(self.data['date'])
            
            print(f"成功从数据库加载 {len(self.data)} 条记录")
            return True
            
        except Exception as e:
            print(f"从数据库加载失败: {e}")
            return False
    
    def get_all_data(self):
        return self.data.copy() if self.data is not None else None
    
    def get_data_by_country(self, country):
        if self.data is None:
            return None
        
        return self.data[self.data['country'] == country].copy()
    
    def get_data_by_date_range(self, start_date, end_date):
        if self.data is None:
            return None
        
        mask = (self.data['date'] >= start_date) & (self.data['date'] <= end_date)
        return self.data.loc[mask].copy()
    
    def get_countries(self):
        if self.data is None:
            return []
        
        return sorted(self.data['country'].unique().tolist())
    
    def get_latest_data(self):
        if self.data is None:
            return None
        
        latest_date = self.data['date'].max()
        return self.data[self.data['date'] == latest_date].copy()
    
    def get_global_summary(self):
        if self.data is None:
            return None
        
        latest_date = self.data['date'].max()
        latest_data = self.data[self.data['date'] == latest_date]
        
        summary = {
            'date': latest_date,
            'total_confirmed': latest_data['confirmed'].sum(),
            'total_deaths': latest_data['deaths'].sum(),
            'total_recovered': latest_data['recovered'].sum(),
            'countries_count': latest_data['country'].nunique()
        }
        
        return summary
    
    def get_daily_trends(self, country=None):
        if self.data is None:
            return None
        
        df = self.data.copy()
        
        if country:
            df = df[df['country'] == country]
        
        daily_trends = df.groupby('date').agg({
            'confirmed': 'sum',
            'deaths': 'sum',
            'recovered': 'sum'
        }).reset_index()
        
        daily_trends['new_confirmed'] = daily_trends['confirmed'].diff()
        daily_trends['new_deaths'] = daily_trends['deaths'].diff()
        daily_trends['new_recovered'] = daily_trends['recovered'].diff()
        
        return daily_trends
