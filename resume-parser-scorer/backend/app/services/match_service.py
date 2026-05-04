import jieba
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from app.database.models import Resume, JobDescription, MatchResult, Skill, WorkExperience, Education


class MatchService:
    """简历与岗位匹配服务"""
    
    def __init__(self):
        self.weights = {
            "skill": 0.4,
            "experience": 0.3,
            "education": 0.2,
            "other": 0.1
        }
        
        self.skill_importance = {
            "required": 1.0,
            "preferred": 0.6,
            "bonus": 0.3
        }
        
        self.education_levels = {
            "高中": 1,
            "大专": 2,
            "本科": 3,
            "硕士": 4,
            "博士": 5
        }
        
        jieba.initialize()
    
    def calculate_match(self, db: Session, resume_id: int, job_id: int) -> Dict[str, Any]:
        """
        计算简历与岗位的匹配度
        
        Args:
            db: 数据库会话
            resume_id: 简历ID
            job_id: 岗位ID
            
        Returns:
            匹配结果字典
        """
        resume = db.query(Resume).filter(Resume.id == resume_id).first()
        job = db.query(JobDescription).filter(JobDescription.id == job_id).first()
        
        if not resume or not job:
            return {
                "success": False,
                "message": "简历或岗位不存在"
            }
        
        skill_score = self._calculate_skill_match(resume, job)
        experience_score = self._calculate_experience_match(resume, job)
        education_score = self._calculate_education_match(resume, job)
        other_score = self._calculate_other_match(resume, job)
        
        total_score = (
            skill_score * self.weights["skill"] +
            experience_score * self.weights["experience"] +
            education_score * self.weights["education"] +
            other_score * self.weights["other"]
        )
        
        total_score = round(total_score, 2)
        total_score = min(max(total_score, 0), 100)
        
        match_result = MatchResult(
            resume_id=resume_id,
            job_description_id=job_id,
            total_score=total_score,
            skill_score=skill_score,
            experience_score=experience_score,
            education_score=education_score,
            other_score=other_score
        )
        
        db.add(match_result)
        db.commit()
        db.refresh(match_result)
        
        return {
            "success": True,
            "data": {
                "match_result_id": match_result.id,
                "total_score": total_score,
                "skill_score": skill_score,
                "experience_score": experience_score,
                "education_score": education_score,
                "other_score": other_score,
                "weights": self.weights
            }
        }
    
    def _calculate_skill_match(self, resume: Resume, job: JobDescription) -> float:
        """
        计算技能匹配分数
        
        Args:
            resume: 简历对象
            job: 岗位对象
            
        Returns:
            技能匹配分数 (0-100)
        """
        resume_skills = resume.skills
        resume_skill_names = set(
            [s.skill_name.lower() for s in resume_skills] if resume_skills else []
        )
        
        required_skills = []
        preferred_skills = []
        bonus_skills = []
        
        skill_text = ""
        if job.required_skills:
            skill_text = job.required_skills
            
            lines = skill_text.split('\n')
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                importance = "preferred"
                skill_content = line
                
                if "必须" in line or "要求" in line:
                    importance = "required"
                    skill_content = re.sub(r'[必须要求\s:：]+', '', line).strip()
                elif "优先" in line:
                    importance = "preferred"
                    skill_content = re.sub(r'[优先\s:：]+', '', line).strip()
                elif "加分" in line:
                    importance = "bonus"
                    skill_content = re.sub(r'[加分\s:：]+', '', line).strip()
                
                skill_items = re.split(r'[，。；、,.;\s]+', skill_content)
                for item in skill_items:
                    item = item.strip()
                    if item and len(item) > 1:
                        if importance == "required":
                            required_skills.append(item)
                        elif importance == "bonus":
                            bonus_skills.append(item)
                        else:
                            preferred_skills.append(item)
        
        if not required_skills and not preferred_skills and not bonus_skills:
            words = jieba.cut(skill_text if skill_text else "")
            for word in words:
                if len(word) > 1:
                    preferred_skills.append(word)
        
        total_score = 0
        total_possible = 0
        
        for skill in required_skills:
            total_possible += self.skill_importance["required"]
            if skill.lower() in resume_skill_names or any(s.lower().find(skill.lower()) >= 0 for s in resume_skill_names):
                total_score += self.skill_importance["required"]
        
        for skill in preferred_skills:
            total_possible += self.skill_importance["preferred"]
            if skill.lower() in resume_skill_names or any(s.lower().find(skill.lower()) >= 0 for s in resume_skill_names):
                total_score += self.skill_importance["preferred"]
        
        for skill in bonus_skills:
            total_possible += self.skill_importance["bonus"]
            if skill.lower() in resume_skill_names or any(s.lower().find(skill.lower()) >= 0 for s in resume_skill_names):
                total_score += self.skill_importance["bonus"]
        
        if total_possible == 0:
            return 50.0
        
        return (total_score / total_possible) * 100
    
    def _calculate_experience_match(self, resume: Resume, job: JobDescription) -> float:
        """
        计算工作经验匹配分数
        
        Args:
            resume: 简历对象
            job: 岗位对象
            
        Returns:
            经验匹配分数 (0-100)
        """
        score = 50.0
        
        job_years_req = job.work_years_requirement
        if job_years_req:
            resume_years = resume.work_years or 0
            
            years_match = re.search(r'(\d+)[-~至]?(\d+)?\s*年', job_years_req)
            if years_match:
                min_years = int(years_match.group(1))
                max_years = int(years_match.group(2)) if years_match.group(2) else None
                
                if max_years:
                    if min_years <= resume_years <= max_years:
                        score = 100.0
                    elif resume_years < min_years:
                        gap = min_years - resume_years
                        score = max(0, 100 - gap * 20)
                    else:
                        gap = resume_years - max_years
                        score = max(50, 100 - gap * 10)
                else:
                    if resume_years >= min_years:
                        score = 100.0
                    else:
                        gap = min_years - resume_years
                        score = max(0, 100 - gap * 20)
        
        if job.requirements and resume.current_position:
            req_lower = job.requirements.lower()
            pos_lower = resume.current_position.lower()
            
            if pos_lower in req_lower or any(kw in pos_lower for kw in ["工程师", "开发", "设计师", "经理", "主管", "分析师", "顾问"]):
                if any(kw in req_lower for kw in ["工程师", "开发", "设计师", "经理", "主管", "分析师", "顾问"]):
                    score = min(100, score + 20)
        
        return score
    
    def _calculate_education_match(self, resume: Resume, job: JobDescription) -> float:
        """
        计算教育背景匹配分数
        
        Args:
            resume: 简历对象
            job: 岗位对象
            
        Returns:
            教育匹配分数 (0-100)
        """
        score = 50.0
        
        resume_edu = resume.education_level
        job_edu_req = job.education_requirement
        
        if not job_edu_req:
            return 70.0
        
        job_level = 0
        for level_name, level_value in self.education_levels.items():
            if level_name in job_edu_req:
                job_level = level_value
                break
        
        resume_level = 0
        if resume_edu:
            for level_name, level_value in self.education_levels.items():
                if level_name in resume_edu:
                    resume_level = level_value
                    break
        
        if resume_level >= job_level:
            score = 100.0
            if resume_level > job_level:
                score = 90.0
        else:
            gap = job_level - resume_level
            score = max(0, 50 - gap * 20)
        
        if job.education_requirement and resume.major:
            edu_req_lower = job.education_requirement.lower()
            major_lower = resume.major.lower()
            
            if major_lower in edu_req_lower:
                score = min(100, score + 15)
        
        return score
    
    def _calculate_other_match(self, resume: Resume, job: JobDescription) -> float:
        """
        计算其他因素匹配分数
        
        Args:
            resume: 简历对象
            job: 岗位对象
            
        Returns:
            其他因素匹配分数 (0-100)
        """
        score = 50.0
        
        if job.location and resume.current_address:
            loc_lower = job.location.lower()
            addr_lower = resume.current_address.lower()
            
            if loc_lower in addr_lower or addr_lower in loc_lower:
                score = 100.0
            else:
                for city in ["北京", "上海", "广州", "深圳", "杭州", "南京", "苏州", "成都", "武汉", "西安", "重庆", "天津"]:
                    if city in job.location and city in resume.current_address:
                        score = 100.0
                        break
        
        if resume.expected_position and job.position_name:
            exp_lower = resume.expected_position.lower()
            job_lower = job.position_name.lower()
            
            if exp_lower in job_lower or job_lower in exp_lower:
                score = min(100, score + 30)
            else:
                common_keywords = ["开发", "工程师", "设计师", "经理", "主管", "分析", "产品", "运营", "销售"]
                for kw in common_keywords:
                    if kw in exp_lower and kw in job_lower:
                        score = min(100, score + 20)
                        break
        
        return score
    
    def batch_match(self, db: Session, resume_ids: List[int], job_id: int) -> List[Dict[str, Any]]:
        """
        批量匹配简历与岗位
        
        Args:
            db: 数据库会话
            resume_ids: 简历ID列表
            job_id: 岗位ID
            
        Returns:
            匹配结果列表
        """
        results = []
        for resume_id in resume_ids:
            result = self.calculate_match(db, resume_id, job_id)
            if result["success"]:
                results.append(result["data"])
        
        results.sort(key=lambda x: x["total_score"], reverse=True)
        
        return results
    
    def get_match_history(self, db: Session, resume_id: int = None, job_id: int = None, 
                           limit: int = 50) -> List[Dict[str, Any]]:
        """
        获取匹配历史记录
        
        Args:
            db: 数据库会话
            resume_id: 简历ID（可选）
            job_id: 岗位ID（可选）
            limit: 返回数量限制
            
        Returns:
            匹配历史列表
        """
        query = db.query(MatchResult)
        
        if resume_id:
            query = query.filter(MatchResult.resume_id == resume_id)
        if job_id:
            query = query.filter(MatchResult.job_description_id == job_id)
        
        results = query.order_by(MatchResult.created_at.desc()).limit(limit).all()
        
        return [
            {
                "id": r.id,
                "resume_id": r.resume_id,
                "job_description_id": r.job_description_id,
                "total_score": r.total_score,
                "skill_score": r.skill_score,
                "experience_score": r.experience_score,
                "education_score": r.education_score,
                "other_score": r.other_score,
                "created_at": r.created_at
            }
            for r in results
        ]
