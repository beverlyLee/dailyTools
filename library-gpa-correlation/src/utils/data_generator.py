import random
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config.settings import DATA_CONFIG, MAJOR_HOURS_CONFIG, DATA_DIR


def generate_students(random_seed: Optional[int] = 42) -> List[Dict]:
    if random_seed is not None:
        random.seed(random_seed)
    
    students = []
    for i in range(DATA_CONFIG['students_count']):
        major = random.choice(DATA_CONFIG['majors'])
        if major == 'CS':
            gpa = min(4.0, max(2.0, DATA_CONFIG['cs_gpa_base'] + random.normalvariate(0, 0.4)))
        elif major == 'Chinese':
            gpa = min(4.0, max(2.0, DATA_CONFIG['chinese_gpa_base'] + random.normalvariate(0, 0.35)))
        else:
            gpa = min(4.0, max(2.0, DATA_CONFIG['default_gpa_base'] + random.normalvariate(0, 0.38)))
        
        students.append({
            'student_id': f'STU{i+1:04d}',
            'name': f'Student_{i+1}',
            'major': major,
            'gpa': round(gpa, 2),
            'grade': random.randint(1, 4)
        })
    return students


def generate_swipes(students: List[Dict], random_seed: Optional[int] = 42) -> List[Dict]:
    if random_seed is not None:
        random.seed(random_seed)
    
    swipes = []
    start_date = datetime.now() - timedelta(days=DATA_CONFIG['days_range'])
    
    for student in students:
        major_config = MAJOR_HOURS_CONFIG.get(student['major'], MAJOR_HOURS_CONFIG['Math'])
        avg_visits = major_config['avg_visits']
        avg_hours = major_config['avg_hours']
        
        num_visits = max(5, int(random.normalvariate(avg_visits * DATA_CONFIG['days_range'] / 7, 10)))
        
        for _ in range(num_visits):
            day_offset = random.randint(0, DATA_CONFIG['days_range'] - 1)
            visit_date = start_date + timedelta(days=day_offset)
            hour_in = random.randint(8, 20)
            minute_in = random.randint(0, 59)
            duration_hours = min(8, max(0.5, random.normalvariate(avg_hours, 1.0)))
            
            time_in = visit_date.replace(hour=hour_in, minute=minute_in)
            time_out = time_in + timedelta(hours=duration_hours)
            
            swipes.append({
                'student_id': student['student_id'],
                'time_in': time_in.strftime('%Y-%m-%d %H:%M:%S'),
                'time_out': time_out.strftime('%Y-%m-%d %H:%M:%S'),
                'duration_hours': round(duration_hours, 2)
            })
    
    return swipes


def generate_dataset(random_seed: int = 42) -> Dict[str, pd.DataFrame]:
    students = generate_students(random_seed)
    swipes = generate_swipes(students, random_seed)
    
    grades_df = pd.DataFrame(students)
    swipes_df = pd.DataFrame(swipes)
    
    return {
        'grades': grades_df,
        'swipes': swipes_df
    }


def save_dataset_to_csv(dataset: Dict[str, pd.DataFrame], output_dir: str = None):
    if output_dir is None:
        output_dir = DATA_DIR
    
    for name, df in dataset.items():
        filepath = os.path.join(output_dir, f'{name}.csv')
        df.to_csv(filepath, index=False, encoding='utf-8')
        print(f'Saved {name} data to {filepath}')


def load_dataset_from_csv(input_dir: str = None) -> Dict[str, pd.DataFrame]:
    if input_dir is None:
        input_dir = DATA_DIR
    
    dataset = {}
    for name in ['grades', 'swipes']:
        filepath = os.path.join(input_dir, f'{name}.csv')
        if os.path.exists(filepath):
            dataset[name] = pd.read_csv(filepath)
            if name == 'swipes':
                dataset[name]['time_in'] = pd.to_datetime(dataset[name]['time_in'])
                dataset[name]['time_out'] = pd.to_datetime(dataset[name]['time_out'])
                dataset[name]['date'] = dataset[name]['time_in'].dt.date
    
    return dataset


def get_or_create_dataset(force_regenerate: bool = False, random_seed: int = 42) -> Dict[str, pd.DataFrame]:
    grades_path = os.path.join(DATA_DIR, 'grades.csv')
    if not force_regenerate and os.path.exists(grades_path):
        return load_dataset_from_csv()
    
    dataset = generate_dataset(random_seed)
    save_dataset_to_csv(dataset)
    return dataset


if __name__ == '__main__':
    print('Generating mock dataset...')
    dataset = get_or_create_dataset(force_regenerate=True)
    print(f"Generated {len(dataset['grades'])} students")
    print(f"Generated {len(dataset['swipes'])} swipe records")
    print('\nSample grades data:')
    print(dataset['grades'].head())
    print('\nSample swipes data:')
    print(dataset['swipes'].head())
