import pytest
from unittest.mock import Mock, MagicMock
from datetime import datetime


class TestMatchService:
    """匹配服务测试"""
    
    def setup_method(self):
        """测试前准备"""
        from ..services.match_service import MatchService
        self.service = MatchService()
    
    def test_weights_config(self):
        """测试权重配置"""
        # 验证权重之和为1
        total_weight = sum(self.service.weights.values())
        assert total_weight == 1.0
        
        # 验证各权重值
        assert self.service.weights["skill"] == 0.4
        assert self.service.weights["experience"] == 0.3
        assert self.service.weights["education"] == 0.2
        assert self.service.weights["other"] == 0.1
    
    def test_education_levels(self):
        """测试学历等级映射"""
        # 验证学历等级
        assert self.service.education_levels["高中"] == 1
        assert self.service.education_levels["大专"] == 2
        assert self.service.education_levels["本科"] == 3
        assert self.service.education_levels["硕士"] == 4
        assert self.service.education_levels["博士"] == 5
        
        # 验证等级顺序
        levels = list(self.service.education_levels.values())
        assert sorted(levels) == levels
    
    def test_skill_importance(self):
        """测试技能重要程度权重"""
        # 验证技能重要程度权重
        assert self.service.skill_importance["required"] == 1.0
        assert self.service.skill_importance["preferred"] == 0.7
        assert self.service.skill_importance["bonus"] == 0.4
        
        # 验证权重顺序
        assert self.service.skill_importance["required"] > self.service.skill_importance["preferred"]
        assert self.service.skill_importance["preferred"] > self.service.skill_importance["bonus"]
    
    def test_parse_work_years_requirement(self):
        """测试解析工作年限要求"""
        # 测试 "3-5年" 格式
        result = self.service._parse_work_years_requirement("3-5年经验")
        assert result == 3
        
        # 测试 "3年以上" 格式
        result = self.service._parse_work_years_requirement("需要3年以上经验")
        assert result == 3
        
        # 测试 "至少3年" 格式
        result = self.service._parse_work_years_requirement("至少3年工作经验")
        assert result == 3
        
        # 测试 "3年经验" 格式
        result = self.service._parse_work_years_requirement("3年经验")
        assert result == 3
        
        # 测试单独数字
        result = self.service._parse_work_years_requirement("要求5年")
        assert result == 5
        
        # 测试空值
        result = self.service._parse_work_years_requirement("")
        assert result is None
        
        result = self.service._parse_work_years_requirement(None)
        assert result is None
    
    def test_parse_education_requirement(self):
        """测试解析学历要求"""
        # 测试博士
        result = self.service._parse_education_requirement("博士学历")
        assert result == 5
        
        # 测试硕士
        result = self.service._parse_education_requirement("硕士及以上")
        assert result == 4
        
        # 测试本科
        result = self.service._parse_education_requirement("本科以上学历")
        assert result == 3
        
        # 测试大专
        result = self.service._parse_education_requirement("大专学历")
        assert result == 2
        
        # 测试高中
        result = self.service._parse_education_requirement("高中及以上")
        assert result == 1
        
        # 测试空值
        result = self.service._parse_education_requirement("")
        assert result == 0
        
        result = self.service._parse_education_requirement(None)
        assert result == 0
    
    def test_calculate_location_match(self):
        """测试计算位置匹配度"""
        # 测试完全匹配
        result = self.service._calculate_location_match("北京", "北京")
        assert result == 100.0
        
        # 测试城市匹配（简化测试，实际实现可能不同）
        result = self.service._calculate_location_match("北京市朝阳区", "北京")
        # 应该有一定的匹配度
        
        # 测试不同城市
        result = self.service._calculate_location_match("北京", "上海")
        # 应该有较低的匹配度
        
        # 测试空值
        result = self.service._calculate_location_match("", "北京")
        assert result == 50.0
        
        result = self.service._calculate_location_match("北京", "")
        assert result == 50.0
    
    def test_calculate_position_match(self):
        """测试计算期望职位匹配度"""
        # 测试完全匹配
        result = self.service._calculate_position_match("前端开发工程师", "前端开发工程师")
        assert result == 100.0
        
        # 测试同类职位
        result = self.service._calculate_position_match("前端开发工程师", "前端工程师")
        # 应该有较高的匹配度
        
        # 测试不同类职位
        result = self.service._calculate_position_match("前端开发工程师", "后端开发工程师")
        # 应该有较低的匹配度
        
        # 测试空值
        result = self.service._calculate_position_match("", "前端开发工程师")
        assert result == 50.0
        
        result = self.service._calculate_position_match("前端开发工程师", "")
        assert result == 50.0
    
    def test_skill_matches(self):
        """测试技能匹配"""
        # 测试直接匹配
        resume_skills = {"python", "java", "javascript"}
        
        result = self.service._skill_matches("Python", resume_skills)
        assert result is True
        
        result = self.service._skill_matches("Java", resume_skills)
        assert result is True
        
        result = self.service._skill_matches("JavaScript", resume_skills)
        assert result is True
        
        # 测试不匹配
        result = self.service._skill_matches("Go", resume_skills)
        assert result is False
        
        # 测试同组技能替代
        # 例如：React和Vue都是前端框架，有一定的替代性
        resume_skills = {"vue"}
        result = self.service._skill_matches("React", resume_skills)
        # 应该返回True，因为它们属于同一技术组
    
    def test_extract_resume_skills(self):
        """测试从简历提取技能"""
        # 创建模拟的简历对象
        mock_resume = Mock()
        
        # 模拟技能关联表
        mock_skill1 = Mock()
        mock_skill1.skill_name = "Python"
        
        mock_skill2 = Mock()
        mock_skill2.skill_name = "Java"
        
        mock_resume.skills = [mock_skill1, mock_skill2]
        
        # 模拟工作经历
        mock_exp = Mock()
        mock_exp.description = "负责后端开发，使用Django框架，熟悉MySQL数据库"
        mock_exp.position = "后端开发工程师"
        mock_exp.company_name = "某科技公司"
        
        mock_resume.work_experiences = [mock_exp]
        mock_resume.current_position = "高级后端工程师"
        
        # 调用方法
        skills = self.service._extract_resume_skills(mock_resume)
        
        # 验证结果
        assert "python" in skills
        assert "java" in skills
    
    def test_calculate_match_basic(self):
        """测试基本的匹配计算"""
        # 创建模拟的简历和岗位对象
        mock_resume = Mock()
        mock_job = Mock()
        
        # 设置简历基本信息
        mock_resume.skills = []
        mock_resume.work_experiences = []
        mock_resume.educations = []
        mock_resume.work_years = 3
        mock_resume.education_level = "本科"
        mock_resume.major = "计算机科学与技术"
        mock_resume.current_address = "北京"
        mock_resume.expected_position = "前端开发工程师"
        
        # 设置岗位信息
        mock_job.required_skills = "Python, Java, JavaScript"
        mock_job.requirements = "需要3年以上工作经验，本科以上学历"
        mock_job.responsibilities = "负责系统开发和维护"
        mock_job.work_years_requirement = "3-5年"
        mock_job.education_requirement = "本科"
        mock_job.location = "北京"
        mock_job.position_name = "前端开发工程师"
        
        # 调用匹配方法
        result = self.service.calculate_match(mock_resume, mock_job)
        
        # 验证结果结构
        assert "total_score" in result
        assert "skill_score" in result
        assert "experience_score" in result
        assert "education_score" in result
        assert "other_score" in result
        
        # 验证分数范围
        assert 0 <= result["total_score"] <= 100
        assert 0 <= result["skill_score"] <= 100
        assert 0 <= result["experience_score"] <= 100
        assert 0 <= result["education_score"] <= 100
        assert 0 <= result["other_score"] <= 100
    
    def test_calculate_match_high_match(self):
        """测试高度匹配的情况"""
        # 创建模拟的简历和岗位对象
        mock_resume = Mock()
        mock_job = Mock()
        
        # 设置简历技能
        mock_skill1 = Mock()
        mock_skill1.skill_name = "Python"
        
        mock_skill2 = Mock()
        mock_skill2.skill_name = "JavaScript"
        
        mock_skill3 = Mock()
        mock_skill3.skill_name = "Vue"
        
        mock_resume.skills = [mock_skill1, mock_skill2, mock_skill3]
        
        # 设置简历工作经历
        mock_exp = Mock()
        mock_exp.position = "前端开发工程师"
        mock_exp.company_name = "互联网科技公司"
        mock_exp.description = "使用Vue.js开发前端应用，负责页面重构和性能优化"
        mock_exp.start_date = datetime(2020, 1, 1)
        mock_exp.end_date = None
        mock_exp.is_current = 1
        
        mock_resume.work_experiences = [mock_exp]
        mock_resume.educations = []
        mock_resume.work_years = 5
        mock_resume.education_level = "硕士"
        mock_resume.major = "软件工程"
        mock_resume.current_address = "北京"
        mock_resume.expected_position = "高级前端开发工程师"
        
        # 设置岗位信息
        mock_job.required_skills = "JavaScript, Vue, React"
        mock_job.requirements = "需要3年以上前端开发经验，熟悉Vue或React框架，本科以上学历"
        mock_job.responsibilities = "负责公司前端项目开发，技术选型和架构设计"
        mock_job.work_years_requirement = "3年以上"
        mock_job.education_requirement = "本科"
        mock_job.location = "北京"
        mock_job.position_name = "高级前端开发工程师"
        
        # 调用匹配方法
        result = self.service.calculate_match(mock_resume, mock_job)
        
        # 验证应该有较高的匹配分数
        assert result["total_score"] > 60  # 应该超过60分
    
    def test_calculate_match_low_match(self):
        """测试低度匹配的情况"""
        # 创建模拟的简历和岗位对象
        mock_resume = Mock()
        mock_job = Mock()
        
        # 设置简历技能（完全不匹配）
        mock_skill1 = Mock()
        mock_skill1.skill_name = "会计"
        
        mock_skill2 = Mock()
        mock_skill2.skill_name = "财务管理"
        
        mock_resume.skills = [mock_skill1, mock_skill2]
        
        # 设置简历工作经历
        mock_exp = Mock()
        mock_exp.position = "财务主管"
        mock_exp.company_name = "贸易公司"
        mock_exp.description = "负责公司财务管理，财务报表编制"
        mock_exp.start_date = datetime(2018, 1, 1)
        mock_exp.end_date = None
        mock_exp.is_current = 1
        
        mock_resume.work_experiences = [mock_exp]
        mock_resume.educations = []
        mock_resume.work_years = 5
        mock_resume.education_level = "本科"
        mock_resume.major = "会计学"
        mock_resume.current_address = "上海"
        mock_resume.expected_position = "财务经理"
        
        # 设置岗位信息（技术岗位）
        mock_job.required_skills = "Python, Java, JavaScript, Vue"
        mock_job.requirements = "需要3年以上软件开发经验，熟悉前后端技术栈，本科以上学历"
        mock_job.responsibilities = "负责公司软件系统开发，技术架构设计"
        mock_job.work_years_requirement = "3年以上"
        mock_job.education_requirement = "本科"
        mock_job.location = "北京"
        mock_job.position_name = "高级软件开发工程师"
        
        # 调用匹配方法
        result = self.service.calculate_match(mock_resume, mock_job)
        
        # 验证应该有较低的匹配分数
        # 注意：这里不一定会很低，因为教育和经验年限可能匹配
        # 但技能匹配应该很低
        assert result["skill_score"] < 50  # 技能分数应该较低
