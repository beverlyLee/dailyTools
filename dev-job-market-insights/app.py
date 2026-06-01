from flask import Flask, render_template, jsonify
import os
import sys
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from loader.data_loader import DataLoader
from nlp.text_processor import TextProcessor
from nlp.wordcloud_generator import WordCloudGenerator
from stats.salary_analyzer import SalaryAnalyzer

app = Flask(__name__)

data_loader = DataLoader(data_dir=os.path.join(os.path.dirname(__file__), 'data'))
text_processor = TextProcessor()
wordcloud_generator = WordCloudGenerator()
salary_analyzer = SalaryAnalyzer()

TECH_TERMS = [
    'Python', 'Java', 'JavaScript', 'C++', 'Go', 'Rust',
    'Flask', 'Django', 'SpringBoot', 'Vue', 'React', 'Node.js',
    'MySQL', 'MongoDB', 'Redis', 'PostgreSQL', 'Elasticsearch',
    'Docker', 'Kubernetes', 'K8s', 'DevOps',
    'Git', 'Linux', 'Shell',
    '人工智能', '机器学习', '深度学习', 'AI', 'NLP',
    '计算机视觉', 'CV', 'TensorFlow', 'PyTorch', '大模型',
    '算法', '微服务', '分布式', '大数据', 'Spark', 'Hadoop',
    '云计算', '网络安全', '区块链', '数据分析'
]


@app.route('/')
def index():
    jobs = data_loader.load_all_data()
    
    if not jobs:
        return "没有找到招聘数据，请确保data目录下有JSON或CSV文件。"
    
    word_freq = text_processor.get_tech_word_frequencies(jobs)
    wordcloud_img = wordcloud_generator.generate_wordcloud(word_freq)
    
    tech_salaries = salary_analyzer.analyze_tech_salaries(jobs, TECH_TERMS)
    job_title_salaries = salary_analyzer.analyze_job_title_salaries(jobs)
    
    total_jobs = len(jobs)
    median_salary = salary_analyzer.calculate_median_salary(jobs)
    avg_salary = salary_analyzer.calculate_average_salary(jobs)
    salary_distribution = salary_analyzer.get_salary_distribution(jobs)
    
    return render_template('index.html',
                          wordcloud_img=wordcloud_img,
                          tech_salaries=tech_salaries,
                          job_title_salaries=job_title_salaries,
                          total_jobs=total_jobs,
                          median_salary=median_salary,
                          avg_salary=avg_salary,
                          salary_distribution=salary_distribution,
                          word_freq=word_freq,
                          now=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))


@app.route('/api/data')
def api_data():
    jobs = data_loader.load_all_data()
    
    word_freq = text_processor.get_tech_word_frequencies(jobs)
    wordcloud_img = wordcloud_generator.generate_wordcloud(word_freq)
    
    tech_salaries = salary_analyzer.analyze_tech_salaries(jobs, TECH_TERMS)
    job_title_salaries = salary_analyzer.analyze_job_title_salaries(jobs)
    
    return jsonify({
        'wordcloud_img': wordcloud_img,
        'tech_salaries': tech_salaries,
        'job_title_salaries': job_title_salaries,
        'total_jobs': len(jobs),
        'median_salary': salary_analyzer.calculate_median_salary(jobs),
        'avg_salary': salary_analyzer.calculate_average_salary(jobs),
        'salary_distribution': salary_analyzer.get_salary_distribution(jobs),
        'word_freq': word_freq
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=9999)
