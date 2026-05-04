import os
import json
from typing import List, Dict, Optional, Any
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

from config import config
from .rag_engine import RAGEngine


class LLMService:
    def __init__(self, rag_engine: Optional[RAGEngine] = None):
        self.llm = ChatOpenAI(
            model=config.OPENAI_MODEL,
            api_key=config.OPENAI_API_KEY,
            max_tokens=config.MAX_TOKENS,
            temperature=config.TEMPERATURE
        )
        
        self.rag_engine = rag_engine or RAGEngine()
        self.custom_prompts = self._load_custom_prompts()
    
    def _load_custom_prompts(self) -> Dict:
        custom_prompts = {
            'system': None,
            'format': None
        }
        
        prompts_dir = config.PROMPT_TEMPLATES_PATH
        if os.path.exists(prompts_dir):
            system_path = os.path.join(prompts_dir, 'system_prompt.txt')
            format_path = os.path.join(prompts_dir, 'format_prompt.txt')
            
            if os.path.exists(system_path):
                with open(system_path, 'r', encoding='utf-8') as f:
                    custom_prompts['system'] = f.read()
            
            if os.path.exists(format_path):
                with open(format_path, 'r', encoding='utf-8') as f:
                    custom_prompts['format'] = f.read()
        
        return custom_prompts
    
    def _build_system_prompt(self, include_sections: List[str]) -> str:
        base_prompt = """你是一位专业的周报撰写助手。你的任务是根据用户提供的聊天记录、Git提交记录和其他工作文档，生成一份结构清晰、内容详实的周报。

# 写作原则
1. **真实客观**：只基于提供的上下文信息，不要编造内容
2. **条理清晰**：按逻辑组织内容，使用恰当的标题和列表
3. **突出重点**：重点展示完成的工作、遇到的问题和下一步计划
4. **专业得体**：使用正式但自然的语言风格

# 输出格式
请使用Markdown格式输出，包含以下结构：
"""
        
        if 'work_done' in include_sections:
            base_prompt += """
## 一、本周完成的工作
- 列出本周完成的主要任务和项目
- 可以按照项目或功能模块分组
- 包含Git提交中体现的开发工作
"""
        
        if 'issues' in include_sections:
            base_prompt += """
## 二、遇到的问题与解决方案
- 记录本周遇到的技术难点或阻塞点
- 说明解决方案或处理进展
- 如果问题尚未解决，说明当前状态
"""
        
        if 'plans' in include_sections:
            base_prompt += """
## 三、下周工作计划
- 列出下周计划完成的主要任务
- 可以包含优先级和预期成果
- 参考聊天记录中讨论的未来计划
"""
        
        if 'meetings' in include_sections:
            base_prompt += """
## 四、重要会议与讨论
- 总结本周重要的会议内容
- 记录关键决策和行动项
"""
        
        base_prompt += """

# 额外要求
- 每个部分的内容要具体，有实际细节，不要过于笼统
- 如果某个部分没有相关信息，可以简要说明"本周无相关内容"
- 注意时间线，确保内容是本周范围内的
- 适当使用项目符号和编号，提高可读性
"""
        
        if self.custom_prompts.get('system'):
            base_prompt += f"\n\n# 自定义指导意见\n{self.custom_prompts['system']}"
        
        return base_prompt
    
    def _build_format_prompt(self) -> str:
        format_prompt = """请根据以下上下文信息，生成一份完整的周报。

# 上下文信息
{context}

# 时间范围
本周：{week_start} 至 {week_end}

# 要求
1. 严格按照指定的格式输出
2. 确保信息的准确性和完整性
3. 语言要流畅自然，适合领导阅读
4. 如果信息不足，请合理推断但不要编造事实"""
        
        if self.custom_prompts.get('format'):
            format_prompt += f"\n\n# 自定义格式要求\n{self.custom_prompts['format']}"
        
        return format_prompt
    
    def generate_report(
        self,
        context: Dict,
        include_sections: List[str] = None,
        format: str = 'markdown'
    ) -> Dict:
        try:
            include_sections = include_sections or ['work_done', 'issues', 'plans']
            
            chat_records = context.get('chatRecords', [])
            document_fragments = context.get('documentFragments', [])
            week_start = context.get('weekStart')
            week_end = context.get('weekEnd')
            
            if chat_records:
                self.rag_engine.add_chat_records(chat_records)
            
            if document_fragments:
                for fragment in document_fragments:
                    if fragment.get('sourceType') == 'git':
                        self.rag_engine.add_git_commits([fragment.get('metadata', {})])
            
            rag_context = self.rag_engine.get_context_for_report(
                since=week_start,
                until=week_end,
                top_k=30
            )
            
            context_text = self._format_context(rag_context, chat_records, document_fragments)
            
            system_prompt = self._build_system_prompt(include_sections)
            format_prompt = self._build_format_prompt()
            
            prompt = ChatPromptTemplate.from_messages([
                SystemMessagePromptTemplate.from_template(system_prompt),
                HumanMessagePromptTemplate.from_template(format_prompt)
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            report = chain.invoke({
                'context': context_text,
                'week_start': week_start or '本周',
                'week_end': week_end or '本周'
            })
            
            return {
                'success': True,
                'report': report,
                'metadata': {
                    'model': config.OPENAI_MODEL,
                    'context_used': rag_context['total_count'],
                    'chat_records': len(chat_records),
                    'document_fragments': len(document_fragments),
                    'generated_at': datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _format_context(
        self,
        rag_context: Dict,
        chat_records: List,
        document_fragments: List
    ) -> str:
        context_parts = []
        
        if rag_context['documents']:
            context_parts.append("## 检索到的相关信息 (RAG)")
            for i, doc in enumerate(rag_context['documents'], 1):
                source_type = doc['metadata'].get('source_type', 'unknown')
                context_parts.append(f"\n### [{source_type.upper()}] {i}")
                context_parts.append(doc['content'])
        
        if chat_records:
            context_parts.append("\n\n## 聊天记录原始数据")
            for record in chat_records[:50]:
                sender = record.get('sender', '未知')
                content = record.get('content', '')
                source = record.get('source', 'unknown')
                context_parts.append(f"\n[{source}] {sender}: {content[:200]}")
        
        if document_fragments:
            context_parts.append("\n\n## 文档片段")
            for fragment in document_fragments[:30]:
                source_type = fragment.get('sourceType', 'unknown')
                content = fragment.get('content', '')
                context_parts.append(f"\n[{source_type}]: {content[:200]}")
        
        return "\n".join(context_parts)
    
    def generate_embeddings(self, texts: List[str]) -> Dict:
        try:
            embeddings = self.rag_engine.embeddings.embed_documents(texts)
            
            return {
                'success': True,
                'embeddings': embeddings,
                'model': config.OPENAI_EMBEDDING_MODEL
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def improve_prompt(
        self,
        original_report: str,
        modified_report: str,
        feedback: str = ""
    ) -> Dict:
        try:
            prompt = ChatPromptTemplate.from_template("""
你是一位Prompt优化专家。请分析以下原始报告和修改后的报告，以及用户反馈，提炼出用户的偏好和改进方向，生成一个优化后的系统提示词。

# 原始报告
{original_report}

# 修改后的报告
{modified_report}

# 用户反馈
{feedback}

# 任务
请分析修改前后的差异，识别用户的偏好：
1. 内容深度和详细程度的偏好
2. 结构和格式的偏好
3. 语言风格的偏好
4. 重点内容的选择偏好

然后生成一个优化后的系统提示词，用于指导AI生成更符合用户偏好的周报。

# 输出格式
请输出JSON格式，包含以下字段：
- "analysis": 对用户偏好的分析
- "optimized_prompt": 优化后的系统提示词
""")
            
            chain = prompt | self.llm | StrOutputParser()
            
            result = chain.invoke({
                'original_report': original_report,
                'modified_report': modified_report,
                'feedback': feedback
            })
            
            try:
                parsed = json.loads(result)
                return {
                    'success': True,
                    'analysis': parsed.get('analysis', ''),
                    'optimized_prompt': parsed.get('optimized_prompt', '')
                }
            except json.JSONDecodeError:
                return {
                    'success': True,
                    'analysis': '无法解析为JSON，返回原始结果',
                    'optimized_prompt': result
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def chat(self, messages: List[Dict]) -> Dict:
        try:
            from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
            
            langchain_messages = []
            for msg in messages:
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                
                if role == 'system':
                    langchain_messages.append(SystemMessage(content=content))
                elif role == 'assistant':
                    langchain_messages.append(AIMessage(content=content))
                else:
                    langchain_messages.append(HumanMessage(content=content))
            
            response = self.llm.invoke(langchain_messages)
            
            return {
                'success': True,
                'content': response.content,
                'model': config.OPENAI_MODEL
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
