import jieba
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, date


class NLPService:
    """NLP服务类，用于简历信息提取"""
    
    def __init__(self):
        jieba.initialize()
        
        self.position_keywords = [
            "工程师", "开发", "设计师", "产品", "经理", "总监", "主管",
            "分析师", "顾问", "专员", "助理", "实习生", "负责人", "leader",
            "CEO", "CTO", "COO", "总裁", "副总裁", "总经理", "副总经理"
        ]
        
        self.education_keywords = {
            "博士": ["博士", "PhD", "Ph.D", "博士后", "博士生"],
            "硕士": ["硕士", "研究生", "Master", "M.S"],
            "本科": ["本科", "学士", "Bachelor", "大学", "统招本科"],
            "大专": ["大专", "专科", "高职", "高专"],
            "高中": ["高中", "中专", "职高", "技校"]
        }
        
        self.skill_keywords = [
            "Python", "Java", "JavaScript", "JS", "TypeScript", "TS", "C++", "C#", "Go", "Golang",
            "PHP", "Ruby", "Swift", "Kotlin", "Rust", "Scala", "Perl", "Shell", "Bash",
            "React", "Vue", "Angular", "Next.js", "Nuxt.js", "Node.js", "Express", "Django", "Flask",
            "Spring", "Spring Boot", "MyBatis", "Hibernate", "JPA",
            "MySQL", "PostgreSQL", "Oracle", "SQL Server", "MongoDB", "Redis", "Elasticsearch",
            "Docker", "Kubernetes", "K8s", "AWS", "阿里云", "腾讯云", "华为云",
            "Git", "SVN", "Jenkins", "GitLab CI", "Travis CI",
            "Linux", "Unix", "Windows", "macOS",
            "机器学习", "深度学习", "AI", "人工智能", "NLP", "自然语言处理",
            "计算机视觉", "CV", "数据挖掘", "数据分析", "大数据",
            "HTML", "CSS", "CSS3", "Sass", "Less", "Bootstrap", "Tailwind",
            "RESTful", "API", "GraphQL", "WebSocket", "MQTT",
            "TCP/IP", "HTTP", "HTTPS", "网络协议",
            "设计模式", "架构设计", "系统设计", "微服务", "分布式",
            "敏捷开发", "Scrum", "Kanban", "TDD", "BDD",
            "英语", "日语", "韩语", "法语", "德语", "西班牙语",
            "Excel", "Word", "PPT", "PowerPoint", "Office",
            "项目管理", "产品设计", "UI/UX", "用户体验", "交互设计",
            "市场营销", "销售", "运营", "客服", "人力资源", "HR",
            "财务", "会计", "金融", "投资", "风控",
            "物流", "供应链", "生产", "质量", "安全",
            "法律", "法务", "知识产权", "专利",
            "医学", "医药", "生物", "化学", "环境",
            "教育", "培训", "咨询", "研究", "研发"
        ]
    
    def extract_resume_info(self, text: str) -> Dict[str, Any]:
        """
        从简历文本中提取结构化信息
        
        Args:
            text: 简历文本内容
            
        Returns:
            结构化的简历信息字典
        """
        info = {}
        
        info["name"] = self._extract_name(text)
        info["gender"] = self._extract_gender(text)
        info["phone"] = self._extract_phone(text)
        info["email"] = self._extract_email(text)
        info["address"] = self._extract_address(text)
        info["birth_date"] = self._extract_birth_date(text)
        
        education_info = self._extract_education(text)
        info.update(education_info)
        
        work_info = self._extract_work_info(text)
        info.update(work_info)
        
        info["skills"] = self._extract_skills(text)
        
        info["work_experiences"] = self._extract_work_experiences(text)
        
        info["educations"] = self._extract_educations(text)
        
        return info
    
    def _extract_name(self, text: str) -> str:
        """提取姓名"""
        name_pattern = r'(?:姓名|名字)[:：]\s*([\u4e00-\u9fa5]{2,4})'
        match = re.search(name_pattern, text)
        if match:
            return match.group(1).strip()
        
        lines = text.split('\n')
        for line in lines[:5]:
            line = line.strip()
            name_match = re.match(r'^([\u4e00-\u9fa5]{2,4})$', line)
            if name_match:
                name = name_match.group(1)
                exclude_words = ["简历", "个人", "求职", "应聘", "自我介绍", "基本信息"]
                if name not in exclude_words and not any(word in name for word in exclude_words):
                    return name
        
        return "未知"
    
    def _extract_gender(self, text: str) -> Optional[str]:
        """提取性别"""
        gender_pattern = r'(?:性别)[:：]\s*(男|女)'
        match = re.search(gender_pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
        
        simple_pattern = r'\b(男|女)\b'
        match = re.search(simple_pattern, text)
        if match:
            return match.group(1)
        
        return None
    
    def _extract_phone(self, text: str) -> Optional[str]:
        """提取电话号码"""
        mobile_pattern = r'(?:1[3-9]\d{9})'
        match = re.search(mobile_pattern, text)
        if match:
            return match.group(0)
        
        landline_pattern = r'(?:\d{3,4}-)?\d{7,8}'
        match = re.search(landline_pattern, text)
        if match:
            return match.group(0)
        
        return None
    
    def _extract_email(self, text: str) -> Optional[str]:
        """提取邮箱地址"""
        email_pattern = r'[\w.-]+@[\w.-]+\.\w+'
        match = re.search(email_pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)
        return None
    
    def _extract_address(self, text: str) -> Optional[str]:
        """提取现居地址"""
        address_patterns = [
            r'(?:现居地|现住址|居住地|地址|所在地)[:：]\s*([\u4e00-\u9fa50-9a-zA-Z\s\-]+)',
            r'(?:籍贯|户籍)[:：]\s*([\u4e00-\u9fa50-9a-zA-Z\s\-]+)'
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        
        return None
    
    def _extract_birth_date(self, text: str) -> Optional[date]:
        """提取出生日期"""
        date_pattern = r'(?:出生年月|出生日期|生日)[:：]\s*(\d{4})[年\-/](\d{1,2})[月\-/]?(\d{1,2})?'
        match = re.search(date_pattern, text)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            day = int(match.group(3)) if match.group(3) else 1
            
            try:
                return date(year=year, month=month, day=day)
            except ValueError:
                pass
        
        year_pattern = r'(\d{4})年出生'
        match = re.search(year_pattern, text)
        if match:
            try:
                return date(year=int(match.group(1)), month=1, day=1)
            except ValueError:
                pass
        
        return None
    
    def _extract_education(self, text: str) -> Dict[str, Any]:
        """提取教育信息"""
        info = {
            "education_level": None,
            "major": None,
            "university": None,
            "graduation_date": None
        }
        
        for level, keywords in self.education_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    info["education_level"] = level
                    break
            if info["education_level"]:
                break
        
        major_pattern = r'(?:专业)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)'
        match = re.search(major_pattern, text)
        if match:
            info["major"] = match.group(1).strip()
        
        university_patterns = [
            r'(?:毕业院校|学校|大学)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:大学|学院|学校))',
            r'([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:大学|学院|学校))'
        ]
        
        for pattern in university_patterns:
            match = re.search(pattern, text)
            if match:
                university = match.group(1).strip()
                if "大学" in university or "学院" in university or "学校" in university:
                    info["university"] = university
                    break
        
        graduation_pattern = r'(?:毕业时间|毕业年份)[:：]\s*(\d{4})'
        match = re.search(graduation_pattern, text)
        if match:
            try:
                info["graduation_date"] = date(year=int(match.group(1)), month=7, day=1)
            except ValueError:
                pass
        
        return info
    
    def _extract_work_info(self, text: str) -> Dict[str, Any]:
        """提取工作相关信息"""
        info = {
            "work_years": 0,
            "current_position": None,
            "current_company": None,
            "expected_salary": None,
            "expected_position": None
        }
        
        work_years_patterns = [
            r'(?:工作年限|工作经验)[:：]\s*(\d+)\s*年',
            r'(\d+)\s*年工作经验',
            r'工作(\d+)年'
        ]
        
        for pattern in work_years_patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    info["work_years"] = int(match.group(1))
                    break
                except ValueError:
                    pass
        
        position_patterns = [
            r'(?:当前职位|现任职位|现任岗位)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)',
            r'(?:职位|岗位)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)'
        ]
        
        for pattern in position_patterns:
            match = re.search(pattern, text)
            if match:
                info["current_position"] = match.group(1).strip()
                break
        
        company_patterns = [
            r'(?:当前公司|现任公司|工作单位)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)',
            r'(?:公司|单位)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)'
        ]
        
        for pattern in company_patterns:
            match = re.search(pattern, text)
            if match:
                info["current_company"] = match.group(1).strip()
                break
        
        salary_patterns = [
            r'(?:期望薪资|薪资要求)[:：]\s*([\u4e00-\u9fa50-9\-~Kk万\s]+)',
            r'(?:薪资|待遇)[:：]\s*([\u4e00-\u9fa50-9\-~Kk万\s]+)'
        ]
        
        for pattern in salary_patterns:
            match = re.search(pattern, text)
            if match:
                info["expected_salary"] = match.group(1).strip()
                break
        
        expected_position_patterns = [
            r'(?:期望职位|意向职位)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)',
            r'(?:求职意向|意向岗位)[:：]\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+)'
        ]
        
        for pattern in expected_position_patterns:
            match = re.search(pattern, text)
            if match:
                info["expected_position"] = match.group(1).strip()
                break
        
        return info
    
    def _extract_skills(self, text: str) -> List[Dict[str, Any]]:
        """提取技能信息"""
        skills = []
        found_skills = set()
        
        words = jieba.cut(text)
        
        for word in words:
            word_lower = word.lower()
            for keyword in self.skill_keywords:
                if keyword.lower() == word_lower and keyword not in found_skills:
                    skills.append({
                        "skill_name": keyword,
                        "proficiency": "熟练",
                        "years": 0
                    })
                    found_skills.add(keyword)
        
        skill_section_pattern = r'(?:技能|专业技能|技术栈|掌握技能)[:：]?\s*([\s\S]*?)(?=\n\n|\n[A-Z\u4e00-\u9fa5]{2,10}[:：]|$)'
        match = re.search(skill_section_pattern, text, re.IGNORECASE | re.MULTILINE)
        if match:
            skill_section = match.group(1)
            skill_items = re.split(r'[，。；、,.;\n]+', skill_section)
            for item in skill_items:
                item = item.strip()
                if item and item not in found_skills and len(item) > 1:
                    for keyword in self.skill_keywords:
                        if keyword.lower() in item.lower() and keyword not in found_skills:
                            skills.append({
                                "skill_name": keyword,
                                "proficiency": "熟练",
                                "years": 0
                            })
                            found_skills.add(keyword)
        
        return skills[:20]
    
    def _extract_work_experiences(self, text: str) -> List[Dict[str, Any]]:
        """提取工作经历"""
        experiences = []
        
        work_section_pattern = r'(?:工作经历|工作经验|项目经验|职业经历)[:：]?\s*([\s\S]*?)(?=\n\n|\n[A-Z\u4e00-\u9fa5]{2,10}[:：]|$)'
        match = re.search(work_section_pattern, text, re.IGNORECASE | re.MULTILINE)
        
        if not match:
            return experiences
        
        work_section = match.group(1)
        
        experience_patterns = [
            r'([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:公司|集团|企业|科技|互联网|软件|信息技术))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:工程师|设计师|经理|主管|专员|助理))\s*(\d{4}[年\-/]\d{1,2}[月\-/]?\s*(?:至|到|\-)\s*(?:\d{4}[年\-/]\d{1,2}[月\-/]?|至今|现在|当前))',
            r'(\d{4}[年\-/]\d{1,2}[月\-/]?\s*(?:至|到|\-)\s*(?:\d{4}[年\-/]\d{1,2}[月\-/]?|至今|现在|当前))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:公司|集团|企业|科技|互联网|软件|信息技术))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:工程师|设计师|经理|主管|专员|助理))'
        ]
        
        for pattern in experience_patterns:
            matches = re.findall(pattern, work_section)
            for match in matches:
                if len(match) == 3:
                    company = match[0].strip() if "公司" in match[0] or "集团" in match[0] else match[1].strip()
                    position = match[1].strip() if "工程师" in match[1] or "经理" in match[1] else match[2].strip()
                    time_str = match[2].strip() if "年" in match[2] or "至今" in match[2] else match[0].strip()
                    
                    start_date, end_date, is_current = self._parse_time_range(time_str)
                    
                    experiences.append({
                        "company_name": company,
                        "position": position,
                        "start_date": start_date,
                        "end_date": end_date,
                        "is_current": 1 if is_current else 0,
                        "description": ""
                    })
        
        if not experiences:
            paragraphs = re.split(r'\n\s*\n', work_section)
            for para in paragraphs[:3]:
                para = para.strip()
                if not para:
                    continue
                
                company_match = re.search(r'([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:公司|集团|企业|科技|互联网|软件|信息技术))', para)
                company = company_match.group(1).strip() if company_match else "未知公司"
                
                position_match = re.search(r'([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:工程师|设计师|经理|主管|专员|助理|实习生))', para)
                position = position_match.group(1).strip() if position_match else "未知职位"
                
                time_match = re.search(r'(\d{4}[年\-/]\d{1,2}[月\-/]?\s*(?:至|到|\-)\s*(?:\d{4}[年\-/]\d{1,2}[月\-/]?|至今|现在|当前))', para)
                if time_match:
                    start_date, end_date, is_current = self._parse_time_range(time_match.group(1))
                else:
                    start_date = None
                    end_date = None
                    is_current = 0
                
                experiences.append({
                    "company_name": company,
                    "position": position,
                    "start_date": start_date,
                    "end_date": end_date,
                    "is_current": 1 if is_current else 0,
                    "description": para[:200]
                })
        
        return experiences
    
    def _extract_educations(self, text: str) -> List[Dict[str, Any]]:
        """提取教育经历"""
        educations = []
        
        education_section_pattern = r'(?:教育经历|教育背景|学习经历)[:：]?\s*([\s\S]*?)(?=\n\n|\n[A-Z\u4e00-\u9fa5]{2,10}[:：]|$)'
        match = re.search(education_section_pattern, text, re.IGNORECASE | re.MULTILINE)
        
        if not match:
            return educations
        
        education_section = match.group(1)
        
        education_patterns = [
            r'([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:大学|学院|学校))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:本科|硕士|博士|专科|高中))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]*专业)?\s*(\d{4}[年\-/]\d{1,2}[月\-/]?\s*(?:至|到|\-)\s*(?:\d{4}[年\-/]\d{1,2}[月\-/]?|至今|现在|当前))',
            r'(\d{4}[年\-/]\d{1,2}[月\-/]?\s*(?:至|到|\-)\s*(?:\d{4}[年\-/]\d{1,2}[月\-/]?|至今|现在|当前))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:大学|学院|学校))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:本科|硕士|博士|专科|高中))\s*([\u4e00-\u9fa5a-zA-Z0-9\s]*专业)?'
        ]
        
        for pattern in education_patterns:
            matches = re.findall(pattern, education_section)
            for match in matches:
                university = ""
                degree = ""
                major = ""
                time_str = ""
                
                for part in match:
                    part = part.strip()
                    if "大学" in part or "学院" in part or "学校" in part:
                        university = part
                    elif "本科" in part or "硕士" in part or "博士" in part or "专科" in part or "高中" in part:
                        degree = part
                    elif "专业" in part:
                        major = part.replace("专业", "").strip()
                    elif "年" in part or "至今" in part:
                        time_str = part
                
                start_date, end_date, _ = self._parse_time_range(time_str)
                
                if university or degree:
                    educations.append({
                        "university": university or "未知学校",
                        "degree": degree or "未知学历",
                        "major": major or "未知专业",
                        "start_date": start_date,
                        "end_date": end_date
                    })
        
        if not educations:
            paragraphs = re.split(r'\n\s*\n', education_section)
            for para in paragraphs[:2]:
                para = para.strip()
                if not para:
                    continue
                
                university_match = re.search(r'([\u4e00-\u9fa5a-zA-Z0-9\s]+(?:大学|学院|学校))', para)
                university = university_match.group(1).strip() if university_match else "未知学校"
                
                degree_match = re.search(r'(本科|硕士|博士|专科|高中)', para)
                degree = degree_match.group(1) if degree_match else "未知学历"
                
                major_match = re.search(r'([\u4e00-\u9fa5a-zA-Z0-9\s]+)专业', para)
                major = major_match.group(1).strip() if major_match else "未知专业"
                
                time_match = re.search(r'(\d{4}[年\-/]\d{1,2}[月\-/]?\s*(?:至|到|\-)\s*(?:\d{4}[年\-/]\d{1,2}[月\-/]?|至今|现在|当前))', para)
                if time_match:
                    start_date, end_date, _ = self._parse_time_range(time_match.group(1))
                else:
                    start_date = None
                    end_date = None
                
                educations.append({
                    "university": university,
                    "degree": degree,
                    "major": major,
                    "start_date": start_date,
                    "end_date": end_date
                })
        
        return educations
    
    def _parse_time_range(self, time_str: str) -> tuple:
        """
        解析时间范围字符串
        
        Args:
            time_str: 时间范围字符串，如 "2020年01月 至 2023年06月" 或 "2020-01 至今"
            
        Returns:
            (开始日期, 结束日期, 是否当前在职)
        """
        if not time_str:
            return (None, None, False)
        
        parts = re.split(r'(?:至|到|\-)\s*', time_str)
        
        if len(parts) < 2:
            return (None, None, False)
        
        start_part = parts[0].strip()
        end_part = parts[1].strip()
        
        start_date = self._parse_date(start_part)
        
        is_current = False
        end_date = None
        
        if end_part in ["至今", "现在", "当前", "present", "now"]:
            is_current = True
        else:
            end_date = self._parse_date(end_part)
        
        return (start_date, end_date, is_current)
    
    def _parse_date(self, date_str: str) -> Optional[date]:
        """
        解析日期字符串
        
        Args:
            date_str: 日期字符串，如 "2020年01月" 或 "2020-01"
            
        Returns:
            date对象或None
        """
        if not date_str:
            return None
        
        match = re.search(r'(\d{4})[年\-/](\d{1,2})[月\-/]?', date_str)
        if match:
            try:
                year = int(match.group(1))
                month = int(match.group(2))
                day = 1
                return date(year=year, month=month, day=day)
            except ValueError:
                pass
        
        match = re.search(r'(\d{4})', date_str)
        if match:
            try:
                year = int(match.group(1))
                return date(year=year, month=1, day=1)
            except ValueError:
                pass
        
        return None
