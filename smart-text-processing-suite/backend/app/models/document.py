from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.utils.database import Base


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(String(100), unique=True, index=True, nullable=False, comment="文档唯一标识")
    title = Column(String(255), nullable=False, comment="文档标题")
    
    doc_type = Column(String(50), comment="文档类型：notice通知, request请示, report报告, decision决定, opinion意见, letter函")
    doc_number = Column(String(100), comment="发文字号")
    
    current_version = Column(Integer, default=1, comment="当前版本号")
    total_versions = Column(Integer, default=1, comment="总版本数")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
    
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, comment="文档ID")
    version = Column(Integer, nullable=False, comment="版本号")
    
    title = Column(String(255), nullable=False, comment="版本标题")
    content = Column(Text, nullable=False, comment="文档内容")
    word_count = Column(Integer, default=0, comment="字数")
    
    check_result = Column(JSON, comment="校对结果")
    format_check_result = Column(JSON, comment="格式检查结果")
    polish_suggestions = Column(JSON, comment="润色建议")
    
    change_summary = Column(Text, comment="修改摘要")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    
    document = relationship("Document", back_populates="versions")
    issues = relationship("DocumentIssue", back_populates="version", cascade="all, delete-orphan")


class DocumentIssue(Base):
    __tablename__ = "document_issues"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False, comment="版本ID")
    
    category = Column(String(50), nullable=False, comment="问题类别：political政治术语, collocation固定搭配, punctuation标点, style文体, grammar语法")
    severity = Column(String(20), default="warning", comment="严重程度：error, warning, info")
    
    original_text = Column(String(500), comment="原文")
    suggestion_text = Column(String(500), comment="建议修改")
    explanation = Column(Text, comment="解释说明")
    
    start_line = Column(Integer, comment="开始行")
    start_col = Column(Integer, comment="开始列")
    end_line = Column(Integer, comment="结束行")
    end_col = Column(Integer, comment="结束列")
    
    is_resolved = Column(Integer, default=0, comment="是否已解决：0否, 1是")
    resolved_at = Column(DateTime, nullable=True, comment="解决时间")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    
    version = relationship("DocumentVersion", back_populates="issues")


class FormatCheckRule(Base):
    __tablename__ = "format_check_rules"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    rule_name = Column(String(100), nullable=False, comment="规则名称")
    rule_type = Column(String(50), nullable=False, comment="规则类型：title标题, number发文字号, paragraph段落, table表格, attachment附件")
    
    pattern = Column(String(500), nullable=False, comment="正则表达式模式")
    description = Column(Text, comment="规则描述")
    suggestion = Column(Text, comment="修改建议")
    
    is_enabled = Column(Integer, default=1, comment="是否启用：0否, 1是")
    priority = Column(Integer, default=5, comment="优先级：1-10")
    
    doc_types = Column(JSON, comment="适用文档类型，JSON数组")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")


class PolishDictionary(Base):
    __tablename__ = "polish_dictionary"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    colloquial = Column(String(200), nullable=False, comment="口语化表达")
    formal = Column(String(200), nullable=False, comment="公文用语")
    
    category = Column(String(50), comment="类别：verb动词, noun名词, phrase短语, conjunction连词")
    explanation = Column(Text, comment="使用说明")
    
    is_enabled = Column(Integer, default=1, comment="是否启用：0否, 1是")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")


class PoliticalTerm(Base):
    __tablename__ = "political_terms"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    term = Column(String(200), nullable=False, unique=True, comment="政治术语")
    correct_form = Column(String(200), nullable=False, comment="正确表述")
    common_mistakes = Column(JSON, comment="常见错误表述，JSON数组")
    
    category = Column(String(50), comment="类别：policy政策, organization机构, title职务, event事件")
    explanation = Column(Text, comment="术语说明")
    
    is_enabled = Column(Integer, default=1, comment="是否启用：0否, 1是")
    
    created_at = Column(DateTime, default=datetime.now, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间")
