import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from app.services.match_service import MatchService
from app.database.models import Resume, JobDescription, Skill


class TestMatchService:
    """匹配服务测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_init(self):
        """测试初始化"""
        assert self.service is not None
        assert self.service.weights["skill"] == 0.4
        assert self.service.weights["experience"] == 0.3
        assert self.service.weights["education"] == 0.2
        assert self.service.weights["other"] == 0.1
    
    def test_skill_importance_order(self):
        """测试技能重要性权重顺序"""
        assert self.service.skill_importance["required"] > self.service.skill_importance["preferred"]
        assert self.service.skill_importance["preferred"] > self.service.skill_importance["bonus"]
    
    def test_education_levels_order(self):
        """测试教育级别顺序"""
        levels = self.service.education_levels
        assert levels["博士"] > levels["硕士"]
        assert levels["硕士"] > levels["本科"]
        assert levels["本科"] > levels["大专"]
        assert levels["大专"] > levels["高中"]


class TestSkillMatch:
    """技能匹配测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_skill_match_without_skills(self):
        """测试无技能时的匹配分数"""
        resume = MagicMock(spec=Resume)
        resume.skills = []
        
        job = MagicMock(spec=JobDescription)
        job.required_skills = None
        
        score = self.service._calculate_skill_match(resume, job)
        assert score == 50.0
    
    def test_skill_match_with_required_skills(self):
        """测试必须技能匹配"""
        resume = MagicMock(spec=Resume)
        python_skill = MagicMock(spec=Skill)
        python_skill.skill_name = "Python"
        resume.skills = [python_skill]
        
        job = MagicMock(spec=JobDescription)
        job.required_skills = "必须: Python"
        
        score = self.service._calculate_skill_match(resume, job)
        assert score >= 80.0
    
    def test_skill_match_missing_required(self):
        """测试缺少必须技能"""
        resume = MagicMock(spec=Resume)
        java_skill = MagicMock(spec=Skill)
        java_skill.skill_name = "Java"
        resume.skills = [java_skill]
        
        job = MagicMock(spec=JobDescription)
        job.required_skills = "必须: Python"
        
        score = self.service._calculate_skill_match(resume, job)
        assert score < 50.0


class TestExperienceMatch:
    """经验匹配测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_experience_match_no_requirement(self):
        """测试无经验要求"""
        resume = MagicMock(spec=Resume)
        resume.work_years = 3
        resume.current_position = "软件工程师"
        
        job = MagicMock(spec=JobDescription)
        job.work_years_requirement = None
        job.requirements = None
        
        score = self.service._calculate_experience_match(resume, job)
        assert score == 50.0
    
    def test_experience_match_within_range(self):
        """测试经验在要求范围内"""
        resume = MagicMock(spec=Resume)
        resume.work_years = 3
        resume.current_position = "软件工程师"
        
        job = MagicMock(spec=JobDescription)
        job.work_years_requirement = "3-5年"
        job.requirements = None
        
        score = self.service._calculate_experience_match(resume, job)
        assert score == 100.0
    
    def test_experience_match_less_than_required(self):
        """测试经验少于要求"""
        resume = MagicMock(spec=Resume)
        resume.work_years = 1
        resume.current_position = "软件工程师"
        
        job = MagicMock(spec=JobDescription)
        job.work_years_requirement = "3-5年"
        job.requirements = None
        
        score = self.service._calculate_experience_match(resume, job)
        assert score < 100.0
        assert score > 0.0
    
    def test_experience_match_more_than_required(self):
        """测试经验超出要求"""
        resume = MagicMock(spec=Resume)
        resume.work_years = 10
        resume.current_position = "软件工程师"
        
        job = MagicMock(spec=JobDescription)
        job.work_years_requirement = "3-5年"
        job.requirements = None
        
        score = self.service._calculate_experience_match(resume, job)
        assert score >= 50.0


class TestEducationMatch:
    """教育匹配测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_education_match_no_requirement(self):
        """测试无教育要求"""
        resume = MagicMock(spec=Resume)
        resume.education_level = "本科"
        resume.major = "计算机科学"
        
        job = MagicMock(spec=JobDescription)
        job.education_requirement = None
        
        score = self.service._calculate_education_match(resume, job)
        assert score == 70.0
    
    def test_education_match_exact(self):
        """测试教育完全匹配"""
        resume = MagicMock(spec=Resume)
        resume.education_level = "本科"
        resume.major = "计算机科学"
        
        job = MagicMock(spec=JobDescription)
        job.education_requirement = "本科及以上"
        
        score = self.service._calculate_education_match(resume, job)
        assert score == 100.0
    
    def test_education_match_higher(self):
        """测试学历超出要求"""
        resume = MagicMock(spec=Resume)
        resume.education_level = "硕士"
        resume.major = "计算机科学"
        
        job = MagicMock(spec=JobDescription)
        job.education_requirement = "本科"
        
        score = self.service._calculate_education_match(resume, job)
        assert score == 90.0
    
    def test_education_match_lower(self):
        """测试学历低于要求"""
        resume = MagicMock(spec=Resume)
        resume.education_level = "大专"
        resume.major = "计算机科学"
        
        job = MagicMock(spec=JobDescription)
        job.education_requirement = "本科"
        
        score = self.service._calculate_education_match(resume, job)
        assert score < 50.0


class TestOtherMatch:
    """其他因素匹配测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_other_match_location_match(self):
        """测试地址匹配"""
        resume = MagicMock(spec=Resume)
        resume.current_address = "北京市朝阳区"
        resume.expected_position = "软件工程师"
        
        job = MagicMock(spec=JobDescription)
        job.location = "北京"
        job.position_name = "高级软件工程师"
        
        score = self.service._calculate_other_match(resume, job)
        assert score == 100.0
    
    def test_other_match_position_match(self):
        """测试职位匹配"""
        resume = MagicMock(spec=Resume)
        resume.current_address = "上海市"
        resume.expected_position = "Java开发工程师"
        
        job = MagicMock(spec=JobDescription)
        job.location = "北京"
        job.position_name = "Java开发工程师"
        
        score = self.service._calculate_other_match(resume, job)
        assert score >= 80.0


class TestMatchIntegration:
    """匹配集成测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_weighted_score_calculation(self):
        """测试加权分数计算"""
        skill_score = 80.0
        experience_score = 70.0
        education_score = 90.0
        other_score = 60.0
        
        total_score = (
            skill_score * self.service.weights["skill"] +
            experience_score * self.service.weights["experience"] +
            education_score * self.service.weights["education"] +
            other_score * self.service.weights["other"]
        )
        
        expected = 80 * 0.4 + 70 * 0.3 + 90 * 0.2 + 60 * 0.1
        assert total_score == expected
    
    def test_score_clamping(self):
        """测试分数边界"""
        high_score = 120.0
        clamped_high = min(max(high_score, 0), 100)
        assert clamped_high == 100.0
        
        low_score = -10.0
        clamped_low = min(max(low_score, 0), 100)
        assert clamped_low == 0.0


class TestBatchMatch:
    """批量匹配测试"""
    
    def setup_method(self):
        self.service = MatchService()
    
    def test_empty_resume_list(self):
        """测试空简历列表"""
        db = MagicMock()
        
        results = self.service.batch_match(db, [], 1)
        assert len(results) == 0
    
    @patch.object(MatchService, 'calculate_match')
    def test_batch_match_results_sorted(self, mock_calculate):
        """测试批量匹配结果是否按分数排序"""
        mock_calculate.side_effect = [
            {"success": True, "data": {"total_score": 60.0}},
            {"success": True, "data": {"total_score": 90.0}},
            {"success": True, "data": {"total_score": 75.0}}
        ]
        
        db = MagicMock()
        results = self.service.batch_match(db, [1, 2, 3], 1)
        
        assert len(results) == 3
        assert results[0]["total_score"] == 90.0
        assert results[1]["total_score"] == 75.0
        assert results[2]["total_score"] == 60.0
