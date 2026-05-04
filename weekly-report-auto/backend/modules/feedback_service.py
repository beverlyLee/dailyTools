import os
import json
from typing import List, Dict, Optional
from datetime import datetime
from collections import defaultdict

from config import config


class FeedbackService:
    def __init__(self):
        self.feedback_file = config.FEEDBACK_STORAGE_PATH
        self._ensure_storage_exists()
    
    def _ensure_storage_exists(self):
        os.makedirs(os.path.dirname(self.feedback_file), exist_ok=True)
        
        if not os.path.exists(self.feedback_file):
            with open(self.feedback_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'version': '1.0',
                    'feedbacks': [],
                    'prompt_improvements': [],
                    'statistics': {
                        'total_submissions': 0,
                        'with_feedback': 0,
                        'with_modified_report': 0
                    }
                }, f, ensure_ascii=False, indent=2)
    
    def _load_data(self) -> Dict:
        try:
            with open(self.feedback_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            self._ensure_storage_exists()
            return self._load_data()
    
    def _save_data(self, data: Dict):
        with open(self.feedback_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def submit_feedback(
        self,
        report_id: Optional[str],
        original_report: str,
        modified_report: Optional[str] = None,
        feedback: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict:
        data = self._load_data()
        
        feedback_entry = {
            'id': f'fb_{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'report_id': report_id,
            'original_report': original_report,
            'modified_report': modified_report,
            'feedback': feedback,
            'metadata': metadata or {},
            'created_at': datetime.now().isoformat(),
            'processed': False
        }
        
        data['feedbacks'].append(feedback_entry)
        data['statistics']['total_submissions'] += 1
        
        if feedback:
            data['statistics']['with_feedback'] += 1
        
        if modified_report:
            data['statistics']['with_modified_report'] += 1
        
        self._save_data(data)
        
        return {
            'success': True,
            'feedback_id': feedback_entry['id'],
            'message': '反馈已提交'
        }
    
    def get_feedbacks(
        self,
        processed: Optional[bool] = None,
        limit: int = 50
    ) -> Dict:
        data = self._load_data()
        
        feedbacks = data.get('feedbacks', [])
        
        if processed is not None:
            feedbacks = [f for f in feedbacks if f.get('processed') == processed]
        
        feedbacks = feedbacks[-limit:]
        
        return {
            'success': True,
            'feedbacks': feedbacks,
            'count': len(feedbacks),
            'statistics': data.get('statistics', {})
        }
    
    def mark_as_processed(self, feedback_id: str) -> Dict:
        data = self._load_data()
        
        for feedback in data.get('feedbacks', []):
            if feedback.get('id') == feedback_id:
                feedback['processed'] = True
                feedback['processed_at'] = datetime.now().isoformat()
                self._save_data(data)
                return {
                    'success': True,
                    'feedback_id': feedback_id
                }
        
        return {
            'success': False,
            'error': '未找到该反馈记录'
        }
    
    def save_prompt_improvement(
        self,
        original_report: str,
        modified_report: str,
        feedback: str,
        analysis: str,
        optimized_prompt: str
    ) -> Dict:
        data = self._load_data()
        
        improvement_entry = {
            'id': f'pi_{datetime.now().strftime("%Y%m%d%H%M%S")}',
            'original_report': original_report,
            'modified_report': modified_report,
            'feedback': feedback,
            'analysis': analysis,
            'optimized_prompt': optimized_prompt,
            'created_at': datetime.now().isoformat(),
            'applied': False
        }
        
        data['prompt_improvements'].append(improvement_entry)
        self._save_data(data)
        
        return {
            'success': True,
            'improvement_id': improvement_entry['id'],
            'message': 'Prompt优化结果已保存'
        }
    
    def get_latest_optimized_prompt(self) -> Optional[str]:
        data = self._load_data()
        
        improvements = data.get('prompt_improvements', [])
        applied_improvements = [i for i in improvements if i.get('applied')]
        
        if applied_improvements:
            return applied_improvements[-1].get('optimized_prompt')
        
        if improvements:
            return improvements[-1].get('optimized_prompt')
        
        return None
    
    def apply_prompt_improvement(self, improvement_id: str) -> Dict:
        data = self._load_data()
        
        for improvement in data.get('prompt_improvements', []):
            if improvement.get('id') == improvement_id:
                improvement['applied'] = True
                improvement['applied_at'] = datetime.now().isoformat()
                
                for other in data.get('prompt_improvements', []):
                    if other.get('id') != improvement_id:
                        other['applied'] = False
                
                optimized_prompt = improvement.get('optimized_prompt', '')
                if optimized_prompt:
                    self._save_custom_prompt(optimized_prompt)
                
                self._save_data(data)
                
                return {
                    'success': True,
                    'improvement_id': improvement_id,
                    'message': 'Prompt已应用'
                }
        
        return {
            'success': False,
            'error': '未找到该Prompt优化记录'
        }
    
    def _save_custom_prompt(self, prompt: str):
        prompts_dir = config.PROMPT_TEMPLATES_PATH
        os.makedirs(prompts_dir, exist_ok=True)
        
        system_path = os.path.join(prompts_dir, 'system_prompt.txt')
        
        with open(system_path, 'w', encoding='utf-8') as f:
            f.write(prompt)
    
    def get_statistics(self) -> Dict:
        data = self._load_data()
        
        feedbacks = data.get('feedbacks', [])
        
        by_source = defaultdict(int)
        by_week = defaultdict(int)
        
        for feedback in feedbacks:
            metadata = feedback.get('metadata', {})
            source = metadata.get('source', 'unknown')
            by_source[source] += 1
            
            created_at = feedback.get('created_at', '')
            if created_at:
                try:
                    date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    week_key = date.strftime('%Y-W%U')
                    by_week[week_key] += 1
                except ValueError:
                    pass
        
        return {
            'success': True,
            'statistics': {
                **data.get('statistics', {}),
                'by_source': dict(by_source),
                'by_week': dict(sorted(by_week.items()))
            },
            'prompt_improvements_count': len(data.get('prompt_improvements', []))
        }
    
    def export_all(self) -> Dict:
        data = self._load_data()
        return {
            'success': True,
            'data': data
        }
    
    def clear_all(self) -> Dict:
        try:
            if os.path.exists(self.feedback_file):
                os.remove(self.feedback_file)
            self._ensure_storage_exists()
            return {
                'success': True,
                'message': '所有反馈数据已清除'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
