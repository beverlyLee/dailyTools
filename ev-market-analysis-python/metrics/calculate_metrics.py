import pandas as pd
import numpy as np


def calculate_penetration_rate(df):
    df = df.copy()
    df['penetration_rate'] = df['ev_sales'] / df['total_sales']
    return df


def calculate_bev_phev_ratios(df):
    df = df.copy()
    total_ev = df['bev'] + df['phev']
    df['bev_ratio'] = df['bev'] / total_ev
    df['phev_ratio'] = df['phev'] / total_ev
    return df


def calculate_growth_rates(df):
    df = df.copy()
    
    df['total_sales_mom'] = df['total_sales'].pct_change(1) * 100
    df['ev_sales_mom'] = df['ev_sales'].pct_change(1) * 100
    
    df['total_sales_yoy'] = df['total_sales'].pct_change(12) * 100
    df['ev_sales_yoy'] = df['ev_sales'].pct_change(12) * 100
    
    return df


def calculate_moving_average(df, window=3):
    df = df.copy()
    
    df['penetration_rate_ma'] = df['penetration_rate'].rolling(window=window, center=False).mean()
    df['ev_sales_ma'] = df['ev_sales'].rolling(window=window, center=False).mean()
    df['total_sales_ma'] = df['total_sales'].rolling(window=window, center=False).mean()
    
    return df


def calculate_yearly_summary(df):
    df = df.copy()
    df['year'] = df['date'].str[:4]
    
    yearly = df.groupby('year').agg({
        'total_sales': ['sum', 'mean'],
        'ev_sales': ['sum', 'mean'],
        'bev': ['sum', 'mean'],
        'phev': ['sum', 'mean'],
        'penetration_rate': ['mean', 'max', 'min']
    }).round(4)
    
    yearly.columns = ['_'.join(col).strip() for col in yearly.columns.values]
    yearly = yearly.reset_index()
    
    yearly['total_sales_yoy'] = yearly['total_sales_sum'].pct_change() * 100
    yearly['ev_sales_yoy'] = yearly['ev_sales_sum'].pct_change() * 100
    
    return yearly


def extract_latest_metrics(df):
    latest = df.iloc[-1]
    prev_month = df.iloc[-2] if len(df) > 1 else None
    prev_year = df.iloc[-13] if len(df) > 12 else None
    
    metrics = {
        'latest_date': latest['date'],
        'latest_penetration': latest['penetration_rate'],
        'latest_total_sales': latest['total_sales'],
        'latest_ev_sales': latest['ev_sales'],
        'latest_bev': latest['bev'],
        'latest_phev': latest['phev'],
        'bev_ratio': latest['bev_ratio'],
        'phev_ratio': latest['phev_ratio'],
    }
    
    if prev_month is not None:
        metrics.update({
            'mom_total': (latest['total_sales'] - prev_month['total_sales']) / prev_month['total_sales'] * 100,
            'mom_ev': (latest['ev_sales'] - prev_month['ev_sales']) / prev_month['ev_sales'] * 100,
        })
    
    if prev_year is not None:
        metrics.update({
            'yoy_total': (latest['total_sales'] - prev_year['total_sales']) / prev_year['total_sales'] * 100,
            'yoy_ev': (latest['ev_sales'] - prev_year['ev_sales']) / prev_year['ev_sales'] * 100,
        })
    
    return metrics


def calculate_metrics(df):
    df = df.copy()
    
    df = calculate_penetration_rate(df)
    df = calculate_bev_phev_ratios(df)
    df = calculate_growth_rates(df)
    df = calculate_moving_average(df, window=3)
    
    return df
