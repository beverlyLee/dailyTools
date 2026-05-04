import jieba
import re
from typing import Dict, Any, List, Set
from collections import Counter
from datetime import datetime


class MatchService:
    """简历与岗位匹配服务"""
    
    def __init__(self):
        # 权重配置
        self.weights = {
            "skill": 0.4,  # 技能匹配权重
            "experience": 0.3,  # 经验匹配权重
            "education": 0.2,  # 教育匹配权重
            "other": 0.1  # 其他因素权重
        }
        
        # 技能重要程度权重
        self.skill_importance = {
            "required": 1.0,  # 必须技能
            "preferred": 0.7,  # 优先技能
            "bonus": 0.4  # 加分技能
        }
        
        # 学历等级映射
        self.education_levels = {
            "高中": 1,
            "大专": 2,
            "本科": 3,
            "硕士": 4,
            "博士": 5
        }
        
        # 常见技术栈分组
        self.tech_groups = {
            "前端开发": ["HTML", "CSS", "JavaScript", "JS", "TypeScript", "TS", "React", "Vue", "Angular", 
                          "Next.js", "Nuxt.js", "Webpack", "Vite", "Sass", "Less", "Tailwind", "Bootstrap"],
            "后端开发": ["Java", "Python", "Go", "Golang", "Node.js", "PHP", "C++", "C#", "Ruby", "Scala",
                         "Spring", "Spring Boot", "Django", "Flask", "Express", "FastAPI", "MyBatis", "Hibernate"],
            "数据库": ["MySQL", "PostgreSQL", "Oracle", "SQL Server", "MongoDB", "Redis", "Elasticsearch", "SQLite"],
            "云计算与DevOps": ["Docker", "Kubernetes", "K8s", "AWS", "阿里云", "腾讯云", "华为云", "Git", "SVN", 
                                 "Jenkins", "GitLab CI", "Linux", "Nginx"],
            "人工智能": ["机器学习", "深度学习", "AI", "人工智能", "NLP", "自然语言处理", "计算机视觉", "CV", 
                        "数据挖掘", "数据分析", "TensorFlow", "PyTorch"],
            "项目管理": ["项目管理", "敏捷开发", "Scrum", "Kanban", "TDD", "BDD", "需求分析", "产品设计"]
        }
    
    def calculate_match(self, resume, job_description) -> Dict[str, float]:
        """
        计算简历与岗位的匹配度
        
        Args:
            resume: 简历对象（Resume模型实例）
            job_description: 岗位描述对象（JobDescription模型实例）
            
        Returns:
            包含各项分数的字典
        """
        # 计算各项分数
        skill_score = self._calculate_skill_match(resume, job_description)
        experience_score = self._calculate_experience_match(resume, job_description)
        education_score = self._calculate_education_match(resume, job_description)
        other_score = self._calculate_other_match(resume, job_description)
        
        # 计算总分数
        total_score = (
            skill_score * self.weights["skill"] +
            experience_score * self.weights["experience"] +
            education_score * self.weights["education"] +
            other_score * self.weights["other"]
        )
        
        # 确保分数在0-100之间
        total_score = min(100, max(0, total_score))
        
        return {
            "total_score": round(total_score, 2),
            "skill_score": round(skill_score, 2),
            "experience_score": round(experience_score, 2),
            "education_score": round(education_score, 2),
            "other_score": round(other_score, 2)
        }
    
    def _calculate_skill_match(self, resume, job_description) -> float:
        """
        计算技能匹配度
        
        Args:
            resume: 简历对象
            job_description: 岗位描述对象
            
        Returns:
            技能匹配分数（0-100）
        """
        # 从岗位描述中提取技能要求
        job_skills = self._extract_job_skills(job_description)
        
        # 如果没有技能要求，返回基础分
        if not job_skills["required"] and not job_skills["preferred"]:
            return 60.0
        
        # 从简历中提取技能
        resume_skills = self._extract_resume_skills(resume)
        
        # 计算各项技能匹配
        required_match = 0.0
        required_total = 0.0
        
        for skill in job_skills["required"]:
            required_total += self.skill_importance["required"]
            if self._skill_matches(skill, resume_skills):
                required_match += self.skill_importance["required"]
        
        preferred_match = 0.0
        preferred_total = 0.0
        
        for skill in job_skills["preferred"]:
            preferred_total += self.skill_importance["preferred"]
            if self._skill_matches(skill, resume_skills):
                preferred_match += self.skill_importance["preferred"]
        
        bonus_match = 0.0
        bonus_total = 0.0
        
        for skill in job_skills["bonus"]:
            bonus_total += self.skill_importance["bonus"]
            if self._skill_matches(skill, resume_skills):
                bonus_match += self.skill_importance["bonus"]
        
        # 计算总分
        total_denominator = required_total + preferred_total + bonus_total
        if total_denominator == 0:
            return 60.0
        
        # 必须技能占主要权重，缺少必须技能会大幅扣分
        base_score = 0.0
        
        # 如果有必须技能但未完全匹配，基础分较低
        if required_total > 0:
            required_ratio = required_match / required_total
            if required_ratio < 0.5:
                # 必须技能匹配不足50%，分数很低
                base_score = required_ratio * 40
            elif required_ratio < 0.8:
                base_score = 40 + (required_ratio - 0.5) * 60
            else:
                base_score = 60 + (required_ratio - 0.8) * 40
        else:
            base_score = 60.0
        
        # 优先技能加分
        if preferred_total > 0:
            preferred_bonus = (preferred_match / preferred_total) * 20
            base_score = min(100, base_score + preferred_bonus)
        
        # 加分技能额外加分
        if bonus_total > 0:
            bonus_bonus = (bonus_match / bonus_total) * 10
            base_score = min(100, base_score + bonus_bonus)
        
        return base_score
    
    def _extract_job_skills(self, job_description) -> Dict[str, List[str]]:
        """
        从岗位描述中提取技能要求
        
        Args:
            job_description: 岗位描述对象
            
        Returns:
            包含必须技能、优先技能、加分技能的字典
        """
        skills = {
            "required": [],
            "preferred": [],
            "bonus": []
        }
        
        # 从required_skills字段提取
        if job_description.required_skills:
            skills_text = job_description.required_skills
            # 使用jieba分词
            words = jieba.cut(skills_text)
            
            # 匹配技能关键词
            for word in words:
                word_lower = word.lower()
                for group_name, group_skills in self.tech_groups.items():
                    for skill in group_skills:
                        if skill.lower() == word_lower and skill not in skills["required"]:
                            skills["required"].append(skill)
        
        # 从requirements字段提取更多技能
        if job_description.requirements:
            req_text = job_description.requirements
            # 使用jieba分词
            words = jieba.cut(req_text)
            
            for word in words:
                word_lower = word.lower()
                for group_name, group_skills in self.tech_groups.items():
                    for skill in group_skills:
                        if skill.lower() == word_lower:
                            if skill not in skills["required"] and skill not in skills["preferred"]:
                                # 根据上下文判断是必须还是优先
                                # 简单策略：如果requirements中提到"必须"、"要求"等词汇，视为必须
                                if "必须" in req_text or "要求" in req_text or "需要" in req_text:
                                    if skill not in skills["required"]:
                                        skills["required"].append(skill)
                                else:
                                    if skill not in skills["preferred"]:
                                        skills["preferred"].append(skill)
        
        # 从responsibilities字段提取加分技能
        if job_description.responsibilities:
            resp_text = job_description.responsibilities
            words = jieba.cut(resp_text)
            
            for word in words:
                word_lower = word.lower()
                for group_name, group_skills in self.tech_groups.items():
                    for skill in group_skills:
                        if (skill.lower() == word_lower and 
                            skill not in skills["required"] and 
                            skill not in skills["preferred"] and 
                            skill not in skills["bonus"]):
                            skills["bonus"].append(skill)
        
        return skills
    
    def _extract_resume_skills(self, resume) -> Set[str]:
        """
        从简历中提取技能
        
        Args:
            resume: 简历对象
            
        Returns:
            技能集合
        """
        skills = set()
        
        # 从skills关联表提取
        if resume.skills:
            for skill in resume.skills:
                skills.add(skill.skill_name.lower())
        
        # 从工作经历描述中提取
        if resume.work_experiences:
            for exp in resume.work_experiences:
                if exp.description:
                    words = jieba.cut(exp.description)
                    for word in words:
                        word_lower = word.lower()
                        for group_name, group_skills in self.tech_groups.items():
                            for skill in group_skills:
                                if skill.lower() == word_lower:
                                    skills.add(skill.lower())
        
        # 从当前职位和公司中提取
        if resume.current_position:
            words = jieba.cut(resume.current_position)
            for word in words:
                word_lower = word.lower()
                for group_name, group_skills in self.tech_groups.items():
                    for skill in group_skills:
                        if skill.lower() == word_lower:
                            skills.add(skill.lower())
        
        return skills
    
    def _skill_matches(self, required_skill: str, resume_skills: Set[str]) -> bool:
        """
        检查技能是否匹配
        
        Args:
            required_skill: 岗位要求的技能
            resume_skills: 简历中的技能集合
            
        Returns:
            是否匹配
        """
        required_lower = required_skill.lower()
        
        # 直接匹配
        if required_lower in resume_skills:
            return True
        
        # 检查相关技能组
        for group_name, group_skills in self.tech_groups.items():
            if required_skill in group_skills:
                # 检查是否有同组的其他技能
                for skill in group_skills:
                    if skill.lower() in resume_skills and skill != required_skill:
                        # 同组技能有一定的替代性
                        # 例如：React和Vue都是前端框架，有一定的相似性
                        return True
        
        return False
    
    def _calculate_experience_match(self, resume, job_description) -> float:
        """
        计算经验匹配度
        
        Args:
            resume: 简历对象
            job_description: 岗位描述对象
            
        Returns:
            经验匹配分数（0-100）
        """
        score = 50.0  # 基础分
        
        # 工作年限匹配
        if resume.work_years is not None and job_description.work_years_requirement:
            # 解析岗位要求的工作年限
            required_years = self._parse_work_years_requirement(job_description.work_years_requirement)
            actual_years = resume.work_years
            
            if required_years is not None:
                # 计算工作年限匹配度
                if actual_years >= required_years:
                    # 达到或超过要求，加分
                    extra_years = actual_years - required_years
                    if extra_years == 0:
                        year_score = 70.0
                    elif extra_years <= 2:
                        year_score = 85.0
                    else:
                        year_score = 100.0
                else:
                    # 未达到要求，扣分
                    deficit = required_years - actual_years
                    if deficit <= 1:
                        year_score = 50.0
                    elif deficit <= 2:
                        year_score = 30.0
                    else:
                        year_score = 10.0
                
                score = year_score
        
        # 工作经历相关性
        if resume.work_experiences and job_description.requirements:
            relevance_score = self._calculate_experience_relevance(resume, job_description)
            # 经验相关性占经验匹配的40%权重
            score = score * 0.6 + relevance_score * 0.4
        
        return min(100, max(0, score))
    
    def _parse_work_years_requirement(self, requirement: str) -> Optional[int]:
        """
        解析工作年限要求
        
        Args:
            requirement: 工作年限要求文本
            
        Returns:
            要求的工作年限
        """
        if not requirement:
            return None
        
        # 匹配 "3-5年" 格式
        match = re.search(r'(\d+)-(\d+)年', requirement)
        if match:
            # 取下限作为要求
            return int(match.group(1))
        
        # 匹配 "3年以上" 格式
        match = re.search(r'(\d+)年以上', requirement)
        if match:
            return int(match.group(1))
        
        # 匹配 "至少3年" 格式
        match = re.search(r'至少(\d+)年', requirement)
        if match:
            return int(match.group(1))
        
        # 匹配 "3年经验" 格式
        match = re.search(r'(\d+)年经验', requirement)
        if match:
            return int(match.group(1))
        
        # 匹配单独数字
        match = re.search(r'(\d+)年', requirement)
        if match:
            return int(match.group(1))
        
        return None
    
    def _calculate_experience_relevance(self, resume, job_description) -> float:
        """
        计算工作经历相关性
        
        Args:
            resume: 简历对象
            job_description: 岗位描述对象
            
        Returns:
            相关性分数（0-100）
        """
        if not resume.work_experiences:
            return 30.0
        
        # 提取岗位关键词
        job_keywords = set()
        if job_description.requirements:
            words = jieba.cut(job_description.requirements)
            for word in words:
                if len(word) > 1:
                    job_keywords.add(word.lower())
        
        if job_description.responsibilities:
            words = jieba.cut(job_description.responsibilities)
            for word in words:
                if len(word) > 1:
                    job_keywords.add(word.lower())
        
        if not job_keywords:
            return 50.0
        
        # 计算每份工作经历的相关性
        total_relevance = 0.0
        count = 0
        
        for exp in resume.work_experiences:
            exp_keywords = set()
            
            # 从职位提取
            if exp.position:
                words = jieba.cut(exp.position)
                for word in words:
                    if len(word) > 1:
                        exp_keywords.add(word.lower())
            
            # 从公司提取
            if exp.company_name:
                words = jieba.cut(exp.company_name)
                for word in words:
                    if len(word) > 1:
                        exp_keywords.add(word.lower())
            
            # 从描述提取
            if exp.description:
                words = jieba.cut(exp.description)
                for word in words:
                    if len(word) > 1:
                        exp_keywords.add(word.lower())
            
            # 计算相关性
            if exp_keywords:
                intersection = job_keywords & exp_keywords
                union = job_keywords | exp_keywords
                if union:
                    jaccard = len(intersection) / len(union)
                    relevance = jaccard * 100
                    total_relevance += relevance
                    count += 1
        
        if count > 0:
            return total_relevance / count
        
        return 30.0
    
    def _calculate_education_match(self, resume, job_description) -> float:
        """
        计算教育匹配度
        
        Args:
            resume: 简历对象
            job_description: 岗位描述对象
            
        Returns:
            教育匹配分数（0-100）
        """
        score = 50.0  # 基础分
        
        # 学历匹配
        if resume.education_level and job_description.education_requirement:
            # 获取简历学历等级
            resume_level = self.education_levels.get(resume.education_level, 0)
            
            # 解析岗位学历要求
            job_level = self._parse_education_requirement(job_description.education_requirement)
            
            if job_level > 0:
                # 计算学历匹配度
                if resume_level >= job_level:
                    # 达到或超过要求
                    extra_levels = resume_level - job_level
                    if extra_levels == 0:
                        edu_score = 80.0
                    elif extra_levels == 1:
                        edu_score = 90.0
                    else:
                        edu_score = 100.0
                else:
                    # 未达到要求
                    deficit = job_level - resume_level
                    if deficit == 1:
                        edu_score = 40.0
                    elif deficit == 2:
                        edu_score = 20.0
                    else:
                        edu_score = 10.0
                
                score = edu_score
        
        # 专业相关性
        if resume.major and job_description.requirements:
            major_relevance = self._calculate_major_relevance(resume, job_description)
            # 专业相关性占教育匹配的30%权重
            score = score * 0.7 + major_relevance * 0.3
        
        return min(100, max(0, score))
    
    def _parse_education_requirement(self, requirement: str) -> int:
        """
        解析学历要求
        
        Args:
            requirement: 学历要求文本
            
        Returns:
            学历等级
        """
        if not requirement:
            return 0
        
        requirement_lower = requirement.lower()
        
        for level_name, level_value in sorted(self.education_levels.items(), key=lambda x: x[1], reverse=True):
            if level_name in requirement_lower:
                return level_value
        
        return 0
    
    def _calculate_major_relevance(self, resume, job_description) -> float:
        """
        计算专业相关性
        
        Args:
            resume: 简历对象
            job_description: 岗位描述对象
            
        Returns:
            相关性分数（0-100）
        """
        if not resume.major:
            return 30.0
        
        # 专业关键词映射
        major_keywords = {
            "计算机科学与技术": ["计算机", "软件", "编程", "开发", "算法", "数据结构"],
            "软件工程": ["软件", "开发", "测试", "架构", "设计模式"],
            "电子信息工程": ["电子", "电路", "通信", "嵌入式", "硬件"],
            "自动化": ["自动化", "控制", "PLC", "机器人", "智能"],
            "数学": ["数学", "统计", "算法", "建模", "分析"],
            "统计学": ["统计", "数据分析", "机器学习", "概率"],
            "人工智能": ["AI", "机器学习", "深度学习", "NLP", "计算机视觉"],
            "数据科学": ["数据", "分析", "挖掘", "可视化", "大数据"],
            "信息管理与信息系统": ["信息", "系统", "管理", "ERP", "数据库"],
            "网络工程": ["网络", "通信", "安全", "协议", "路由"]
        }
        
        # 提取专业关键词
        major_words = jieba.cut(resume.major)
        major_keywords_set = set()
        
        for word in major_words:
            if len(word) > 1:
                major_keywords_set.add(word.lower())
        
        # 检查是否匹配预定义的专业
        matched_keywords = set()
        for major_name, keywords in major_keywords.items():
            if any(kw.lower() in major_keywords_set for kw in major_name.split()):
                matched_keywords.update([kw.lower() for kw in keywords])
        
        # 提取岗位要求关键词
        job_keywords = set()
        if job_description.requirements:
            words = jieba.cut(job_description.requirements)
            for word in words:
                if len(word) > 1:
                    job_keywords.add(word.lower())
        
        # 计算相关性
        if matched_keywords and job_keywords:
            intersection = matched_keywords & job_keywords
            if intersection:
                return min(100, len(intersection) * 20)
        
        # 检查专业是否包含岗位相关词汇
        if any(word in job_keywords for word in major_keywords_set):
            return 70.0
        
        return 30.0
    
    def _calculate_other_match(self, resume, job_description) -> float:
        """
        计算其他因素匹配度
        
        Args:
            resume: 简历对象
            job_description: 岗位描述对象
            
        Returns:
            其他因素匹配分数（0-100）
        """
        score = 50.0  # 基础分
        
        # 位置匹配
        if resume.current_address and job_description.location:
            location_match = self._calculate_location_match(resume.current_address, job_description.location)
            score = score * 0.5 + location_match * 0.5
        
        # 期望职位匹配
        if resume.expected_position and job_description.position_name:
            position_match = self._calculate_position_match(resume.expected_position, job_description.position_name)
            score = score * 0.7 + position_match * 0.3
        
        return min(100, max(0, score))
    
    def _calculate_location_match(self, resume_location: str, job_location: str) -> float:
        """
        计算位置匹配度
        
        Args:
            resume_location: 简历中的位置
            job_location: 岗位要求的位置
            
        Returns:
            位置匹配分数（0-100）
        """
        if not resume_location or not job_location:
            return 50.0
        
        resume_lower = resume_location.lower()
        job_lower = job_location.lower()
        
        # 直接匹配
        if resume_lower == job_lower:
            return 100.0
        
        # 部分匹配（城市级别）
        # 中国主要城市
        cities = [
            "北京", "上海", "广州", "深圳", "杭州", "南京", "苏州", "成都", "武汉", "西安",
            "重庆", "天津", "长沙", "郑州", "济南", "青岛", "大连", "沈阳", "哈尔滨", "长春",
            "合肥", "福州", "厦门", "南昌", "南宁", "昆明", "贵阳", "兰州", "西宁", "银川",
            "石家庄", "太原", "呼和浩特", "乌鲁木齐", "拉萨", "海口", "三亚"
        ]
        
        resume_city = None
        for city in cities:
            if city in resume_lower:
                resume_city = city
                break
        
        job_city = None
        for city in cities:
            if city in job_lower:
                job_city = city
                break
        
        if resume_city and job_city:
            if resume_city == job_city:
                return 90.0
            
            # 检查是否在同一省份（简化处理）
            # 这里只做简单的城市匹配
            return 30.0
        
        # 检查是否包含相同关键词
        resume_words = set(jieba.cut(resume_lower))
        job_words = set(jieba.cut(job_lower))
        
        intersection = resume_words & job_words
        if intersection:
            return 60.0
        
        return 20.0
    
    def _calculate_position_match(self, expected_position: str, job_position: str) -> float:
        """
        计算期望职位匹配度
        
        Args:
            expected_position: 简历中的期望职位
            job_position: 岗位名称
            
        Returns:
            职位匹配分数（0-100）
        """
        if not expected_position or not job_position:
            return 50.0
        
        expected_lower = expected_position.lower()
        job_lower = job_position.lower()
        
        # 直接匹配
        if expected_lower == job_lower:
            return 100.0
        
        # 职位类别匹配
        position_categories = {
            "开发工程师": ["开发", "工程师", "程序员", "码农", "coder"],
            "设计师": ["设计", "设计师", "UI", "UX", "美工"],
            "产品经理": ["产品", "经理", "PM"],
            "项目经理": ["项目", "经理", "PM"],
            "测试工程师": ["测试", "QA", "质量"],
            "运维工程师": ["运维", "运维工程师", "SRE"],
            "数据分析师": ["数据", "分析", "分析师"],
            "算法工程师": ["算法", "算法工程师"],
            "架构师": ["架构", "架构师"],
            "技术总监": ["技术", "总监", "CTO"],
            "前端开发": ["前端", "FE"],
            "后端开发": ["后端", "BE", "后台"],
            "全栈开发": ["全栈", "full stack"],
            "移动端开发": ["移动", "Android", "iOS", "APP"]
        }
        
        expected_category = None
        for category, keywords in position_categories.items():
            if any(kw.lower() in expected_lower for kw in keywords):
                expected_category = category
                break
        
        job_category = None
        for category, keywords in position_categories.items():
            if any(kw.lower() in job_lower for kw in keywords):
                job_category = category
                break
        
        if expected_category and job_category:
            if expected_category == job_category:
                return 80.0
            
            # 检查是否有重叠的类别
            # 例如：前端开发和全栈开发有一定相关性
            related_categories = {
                "前端开发": ["全栈开发", "移动端开发"],
                "后端开发": ["全栈开发", "运维工程师"],
                "全栈开发": ["前端开发", "后端开发"],
                "开发工程师": ["前端开发", "后端开发", "全栈开发", "移动端开发"]
            }
            
            if expected_category in related_categories and job_category in related_categories[expected_category]:
                return 60.0
            
            if job_category in related_categories and expected_category in related_categories[job_category]:
                return 60.0
        
        # 关键词匹配
        expected_words = set(jieba.cut(expected_lower))
        job_words = set(jieba.cut(job_lower))
        
        # 过滤掉无意义的词
        stop_words = {"的", "了", "是", "在", "有", "和", "与", "或", "等", "及", "相关", "有关"}
        expected_words = expected_words - stop_words
        job_words = job_words - stop_words
        
        intersection = expected_words & job_words
        if intersection:
            # 计算Jaccard相似度
            union = expected_words | job_words
            if union:
                jaccard = len(intersection) / len(union)
                return min(100, jaccard * 100)
        
        return 30.0
