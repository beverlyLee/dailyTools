import os
import sys
import pandas as pd
from typing import Dict, Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.data_generator import get_or_create_dataset

USE_LOCAL_DATA = True


def fetch_grades_data(use_local: bool = USE_LOCAL_DATA) -> pd.DataFrame:
    if use_local:
        dataset = get_or_create_dataset()
        return dataset.get('grades', pd.DataFrame())
    
    try:
        import requests
        API_BASE_URL = 'http://localhost:8000/api'
        response = requests.get(f'{API_BASE_URL}/grades', timeout=10)
        response.raise_for_status()
        result = response.json()
        if result and result.get('success'):
            return pd.DataFrame(result['data'])
    except:
        pass
    
    return pd.DataFrame()


def fetch_swipes_data(use_local: bool = USE_LOCAL_DATA) -> pd.DataFrame:
    if use_local:
        dataset = get_or_create_dataset()
        df = dataset.get('swipes', pd.DataFrame())
        if not df.empty:
            df['time_in'] = pd.to_datetime(df['time_in'])
            df['time_out'] = pd.to_datetime(df['time_out'])
            df['date'] = df['time_in'].dt.date
        return df
    
    try:
        import requests
        API_BASE_URL = 'http://localhost:8000/api'
        response = requests.get(f'{API_BASE_URL}/swipes', timeout=10)
        response.raise_for_status()
        result = response.json()
        if result and result.get('success'):
            df = pd.DataFrame(result['data'])
            df['time_in'] = pd.to_datetime(df['time_in'])
            df['time_out'] = pd.to_datetime(df['time_out'])
            df['date'] = df['time_in'].dt.date
            return df
    except:
        pass
    
    return pd.DataFrame()


def extract_daily_library_hours(swipes_df: pd.DataFrame) -> pd.DataFrame:
    daily_stats = swipes_df.groupby(['student_id', 'date']).agg(
        daily_hours=('duration_hours', 'sum'),
        daily_visits=('duration_hours', 'count')
    ).reset_index()
    
    student_stats = daily_stats.groupby('student_id').agg(
        avg_daily_hours=('daily_hours', 'mean'),
        total_hours=('daily_hours', 'sum'),
        total_visits=('daily_visits', 'sum'),
        active_days=('date', 'nunique')
    ).reset_index()
    
    student_stats['avg_daily_hours'] = student_stats['avg_daily_hours'].round(3)
    student_stats['total_hours'] = student_stats['total_hours'].round(2)
    
    return student_stats


def merge_gpa_with_library_data(grades_df: pd.DataFrame, library_stats_df: pd.DataFrame) -> pd.DataFrame:
    merged = pd.merge(
        grades_df,
        library_stats_df,
        on='student_id',
        how='inner'
    )
    return merged


def get_analysis_dataset(use_local: bool = USE_LOCAL_DATA) -> pd.DataFrame:
    grades_df = fetch_grades_data(use_local)
    swipes_df = fetch_swipes_data(use_local)
    
    if grades_df.empty or swipes_df.empty:
        return pd.DataFrame()
    
    library_stats = extract_daily_library_hours(swipes_df)
    final_df = merge_gpa_with_library_data(grades_df, library_stats)
    
    return final_df


def calculate_major_median_hours(df: pd.DataFrame) -> pd.DataFrame:
    return df.groupby('major').agg(
        median_hours=('avg_daily_hours', 'median'),
        mean_hours=('avg_daily_hours', 'mean'),
        student_count=('student_id', 'nunique')
    ).reset_index()


if __name__ == '__main__':
    print('Testing feature extraction...')
    df = get_analysis_dataset()
    if not df.empty:
        print(f'Successfully loaded {len(df)} student records')
        print('\nSample data:')
        print(df[['student_id', 'major', 'gpa', 'avg_daily_hours']].head())
        print('\nMajor statistics:')
        print(calculate_major_median_hours(df))
    else:
        print('Failed to load data. Make sure the mock server is running.')
