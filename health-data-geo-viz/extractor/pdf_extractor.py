import pdfplumber
import pandas as pd
import os
from typing import List, Dict, Optional


class PDFExtractor:
    def __init__(self, pdf_dir: str = "../data"):
        self.pdf_dir = pdf_dir
        self.data = None

    def extract_table_from_pdf(self, pdf_path: str) -> Optional[pd.DataFrame]:
        try:
            with pdfplumber.open(pdf_path) as pdf:
                all_tables = []
                for page in pdf.pages:
                    table = page.extract_table()
                    if table:
                        df = pd.DataFrame(table[1:], columns=table[0])
                        all_tables.append(df)
                
                if all_tables:
                    combined_df = pd.concat(all_tables, ignore_index=True)
                    return self._clean_data(combined_df)
                return None
        except Exception as e:
            print(f"Error extracting PDF {pdf_path}: {e}")
            return None

    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.dropna(how='all')
        df.columns = [str(col).strip() for col in df.columns]
        for col in df.columns:
            df[col] = df[col].astype(str).str.strip()
        return df

    def extract_all_pdfs(self) -> pd.DataFrame:
        all_data = []
        pdf_files = [f for f in os.listdir(self.pdf_dir) if f.endswith('.pdf')]
        
        for pdf_file in pdf_files:
            pdf_path = os.path.join(self.pdf_dir, pdf_file)
            df = self.extract_table_from_pdf(pdf_path)
            if df is not None:
                all_data.append(df)
        
        if all_data:
            self.data = pd.concat(all_data, ignore_index=True)
            return self.data
        return pd.DataFrame()

    def parse_flu_data(self, df: pd.DataFrame) -> List[Dict]:
        parsed_data = []
        province_col = self._find_column(df, ['省份', '地区', '省'])
        percent_col = self._find_column(df, ['百分比', '流感样病例', 'ILI%', '%'])
        cases_col = self._find_column(df, ['病例数', '人数', '感染人数'])

        if province_col is None:
            return parsed_data

        for _, row in df.iterrows():
            province = str(row[province_col]).strip()
            if province and self._is_valid_province(province):
                item = {'province': province}
                if percent_col is not None:
                    item['percentage'] = self._parse_number(row[percent_col])
                if cases_col is not None:
                    item['cases'] = self._parse_number(row[cases_col])
                parsed_data.append(item)
        
        return parsed_data

    def _find_column(self, df: pd.DataFrame, keywords: List[str]) -> Optional[str]:
        for col in df.columns:
            for keyword in keywords:
                if keyword in str(col):
                    return col
        return None

    def _is_valid_province(self, name: str) -> bool:
        valid_provinces = [
            '北京', '天津', '河北', '山西', '内蒙古',
            '辽宁', '吉林', '黑龙江',
            '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东',
            '河南', '湖北', '湖南', '广东', '广西', '海南',
            '重庆', '四川', '贵州', '云南', '西藏',
            '陕西', '甘肃', '青海', '宁夏', '新疆',
            '香港', '澳门', '台湾'
        ]
        return any(prov in name for prov in valid_provinces)

    def _parse_number(self, value: str) -> float:
        try:
            value = str(value).replace('%', '').strip()
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def save_to_csv(self, output_path: str):
        if self.data is not None:
            self.data.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"Data saved to {output_path}")
