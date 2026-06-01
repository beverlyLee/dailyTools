from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import re
from typing import List, Optional, Tuple

DATABASE_URL = "sqlite:///./voice_memo.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

app = FastAPI(title="Voice Memo Todo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TodoDB(Base):
    __tablename__ = "todos"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True)
    time = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class NoteDB(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class ParseRequest(BaseModel):
    text: str

class TodoItem(BaseModel):
    id: int
    text: str
    time: Optional[str] = None
    completed: bool
    createdAt: str

    class Config:
        from_attributes = True

class NoteItem(BaseModel):
    id: int
    text: str
    createdAt: str

    class Config:
        from_attributes = True

class ParseResponse(BaseModel):
    todos: List[TodoItem]
    notes: List[NoteItem]
    originalText: str

ACTION_VERBS = [
    '买', '购买', '买东西', '买菜', '买饭', '买水', '买水果',
    '做', '去做', '完成', '处理', '搞定', '做掉',
    '写', '写邮件', '写报告', '写作业', '写信', '写文档',
    '打电话', '联系', '回复', '回电', 'call', '打给',
    '去', '去取', '去拿', '去送', '去接', '去看', '去买', '去办',
    '准备', '准备好', '备好', '准备一下',
    '看', '看电影', '看书', '看医生', '看病', '看看',
    '学习', '复习', '预习', '背', '记',
    '整理', '收拾', '打扫', '清理', '整理一下',
    '预约', '预订', '预定', '报名', '参加', '参会',
    '开会', '会议', '出席', '开个会', '开会讨论',
    '记得', '别忘了', '要记得', '记得要',
    '交', '提交', '上交', '交作业', '交报告',
    '取', '拿', '送', '取快递', '拿快递', '送东西',
    '找', '约', '问', '找人', '约时间', '问一下',
    '开始', '启动', '结束', '完成它', '弄完',
    '吃', '吃饭', '吃午饭', '吃晚饭', '吃早餐',
    '喝', '喝水', '喝咖啡', '喝奶茶',
    '取车', '停车', '洗车', '加油',
    '还', '还钱', '还书', '还信用卡',
    '付', '付钱', '付款', '缴费', '交电费', '交水费',
    '收', '收快递', '收衣服', '收东西',
    '洗', '洗衣服', '洗碗', '洗车', '洗澡',
    '晾', '晾衣服',
    '烧', '烧水', '烧饭',
]

TIME_KEYWORDS = [
    '今天', '明天', '后天', '明日', '昨日', '昨天',
    '早上', '上午', '中午', '下午', '晚上', '今晚', '夜里', '晚间',
    '点', '点钟', '分', '分钟', '小时', '个小时', '半',
    '之前', '之后', '以前', '以后', '前', '后',
    '周一', '周二', '周三', '周四', '周五', '周六', '周日',
    '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日',
    '这周', '下周', '这周末', '下周末', '周末', '礼拜',
    '这个月', '下个月', '下月', '这个月',
    '一号', '二号', '三号', '四号', '五号',
    '六号', '七号', '八号', '九号', '十号',
    '十一号', '十二号', '十三号', '十四号', '十五号',
    '十六号', '十七号', '十八号', '十九号', '二十号',
    '二十一号', '二十二号', '二十三号', '二十四号', '二十五号',
    '二十六号', '二十七号', '二十八号', '二十九号', '三十号', '三十一号',
    '1号', '2号', '3号', '4号', '5号', '6号', '7号', '8号', '9号', '10号',
]

MODAL_VERBS = [
    '需要', '要', '应该', '必须', '得', '得要', '必须得',
    '可以', '能', '能够', '可以考虑', '可以去',
    '想要', '想', '打算', '计划', '准备要', '想要去',
]

TIME_PATTERNS = [
    (r'(\d{1,2})[:：](\d{2})', lambda m: f"{m.group(1)}:{m.group(2)}"),
    (r'(\d{1,2})点(\d{2})分?', lambda m: f"{m.group(1)}:{m.group(2)}"),
    (r'(\d{1,2})点半', lambda m: f"{m.group(1)}:30"),
    (r'(\d{1,2})点整?', lambda m: f"{m.group(1)}:00"),
    (r'早上(\d{1,2})点', lambda m: f"早上{m.group(1)}点"),
    (r'下午(\d{1,2})点', lambda m: f"下午{m.group(1)}点"),
    (r'晚上(\d{1,2})点', lambda m: f"晚上{m.group(1)}点"),
    (r'今晚(\d{1,2})点', lambda m: f"今晚{m.group(1)}点"),
    (r'上午(\d{1,2})点', lambda m: f"上午{m.group(1)}点"),
    (r'今天\s*(\d{1,2})\s*点', lambda m: f"今天{m.group(1)}点"),
    (r'明天\s*(\d{1,2})\s*点', lambda m: f"明天{m.group(1)}点"),
    (r'后天\s*(\d{1,2})\s*点', lambda m: f"后天{m.group(1)}点"),
]

DESCRIPTION_WORDS = [
    '有', '卖', '是', '在', '好像', '听说', '据说', '听说了',
    '看到', '看见', '发现', '注意到',
    '这家店', '那个店', '这里', '那里', '那边', '这边',
    '真的', '很', '非常', '特别', '挺',
    '漂亮', '好看', '美丽', '便宜', '贵',
    '味道', '好吃', '好喝', '香', '甜',
    '可能', '大概',
    '感觉', '觉得', '认为',
    '不错', '挺好', '很棒', '厉害',
    '写得', '太好', '太好了', '真不错',
    '风景', '景色', '天气',
]

RECOMMENDATION_WORDS = ['推荐', '建议']

NEGATIVE_TODO_WORDS = [
    '好看', '漂亮', '不错', '挺好', '好吃', '好喝',
    '便宜', '贵', '美丽', '香', '甜',
    '写得', '太好了', '太好',
    '天气', '风景', '景色',
    '真不错', '很棒', '厉害',
]

def extract_time_info(text: str) -> Tuple[str, Optional[str]]:
    time_info = []
    cleaned_text = text
    
    for pattern, formatter in TIME_PATTERNS:
        match = re.search(pattern, text)
        if match:
            time_str = formatter(match)
            time_info.append(time_str)
            cleaned_text = re.sub(pattern, '', cleaned_text).strip()
    
    for keyword in TIME_KEYWORDS:
        if keyword in text and keyword not in time_info:
            if keyword in cleaned_text:
                time_info.append(keyword)
    
    time_result = ' '.join(time_info) if time_info else None
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    
    return cleaned_text, time_result

def contains_action_verb(sentence: str) -> bool:
    return any(verb in sentence for verb in ACTION_VERBS)

def contains_time_info(sentence: str) -> bool:
    for keyword in TIME_KEYWORDS:
        if keyword in sentence:
            return True
    for pattern, _ in TIME_PATTERNS:
        if re.search(pattern, sentence):
            return True
    return False

def contains_modal_verb(sentence: str) -> bool:
    return any(verb in sentence for verb in MODAL_VERBS)

def is_pure_description(sentence: str) -> bool:
    desc_count = sum(1 for word in DESCRIPTION_WORDS if word in sentence)
    neg_count = sum(1 for word in NEGATIVE_TODO_WORDS if word in sentence)
    return (desc_count >= 1 or neg_count >= 1)

def has_action_only(sentence: str) -> bool:
    has_act = contains_action_verb(sentence)
    has_t = contains_time_info(sentence)
    has_m = contains_modal_verb(sentence)
    return has_act and not has_t and not has_m

def classify_sentence(sentence: str) -> Tuple[str, str, Optional[str]]:
    sentence = sentence.strip()
    if not sentence or len(sentence) < 2:
        return 'none', '', None
    
    has_time = contains_time_info(sentence)
    has_action = contains_action_verb(sentence)
    has_modal = contains_modal_verb(sentence)
    is_desc = is_pure_description(sentence)
    
    cleaned_text, time_info = extract_time_info(sentence)
    
    is_todo = False
    
    if is_desc and not has_action and not has_time and not has_modal:
        return 'note', cleaned_text, None
    
    if has_action:
        is_todo = True
    if has_time and (has_action or has_modal):
        is_todo = True
    if has_modal and (has_action or has_time):
        is_todo = True
    
    if is_desc and has_action_only(sentence):
        return 'note', cleaned_text, None
    
    if is_desc and not (has_action or has_modal or has_time):
        return 'note', cleaned_text, None
    
    if is_todo:
        return 'todo', cleaned_text, time_info
    elif is_desc or (not has_action and not has_time and not has_modal):
        return 'note', cleaned_text, None
    else:
        return 'todo', cleaned_text, time_info

def split_sentences(text: str) -> List[str]:
    sentences = re.split(r'[，,。.!！？?；;\n]+', text)
    sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) >= 2]
    return sentences

def smart_parse(text: str) -> Tuple[List[Tuple[str, Optional[str]]], List[str]]:
    sentences = split_sentences(text)
    
    todos = []
    notes = []
    
    for sentence in sentences:
        classification, cleaned_text, time_info = classify_sentence(sentence)
        
        if classification == 'todo':
            todos.append((cleaned_text, time_info))
        elif classification == 'note':
            notes.append(cleaned_text)
    
    return todos, notes

@app.post("/api/speech-to-text")
async def speech_to_text(audio: UploadFile = File(...)):
    try:
        contents = await audio.read()
        audio_size = len(contents)
        
        print(f"收到音频文件: {audio.filename}, 大小: {audio_size} 字节")
        
        mock_transcripts = [
            "下午三点开会，然后去买牛奶",
            "这家店卖彩色郁金香，挺好看的",
            "明天上午去超市买东西，记得带伞",
            "下午三点开会，买牛奶，这家店卖彩色郁金香",
            "周五晚上要开会，准备好资料",
            "今天天气真不错，适合出去散步",
            "这本书写得太好了，推荐给大家",
            "明天早上八点半开会，记得准备PPT",
            "周末去爬山，带上水和零食",
            "下周三之前要完成这个项目的报告",
        ]
        
        import random
        transcript = random.choice(mock_transcripts)
        
        print(f"语音识别结果: {transcript}")
        
        return {
            "text": transcript,
            "success": True,
            "audio_size": audio_size
        }
        
    except Exception as e:
        print(f"语音识别错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"语音识别失败: {str(e)}")

@app.post("/api/parse-memo", response_model=ParseResponse)
async def parse_memo(request: ParseRequest):
    try:
        todo_items, note_texts = smart_parse(request.text)
        
        db = SessionLocal()
        
        todos = []
        for todo_text, time_str in todo_items:
            if todo_text and len(todo_text) > 0:
                db_todo = TodoDB(
                    text=todo_text,
                    time=time_str,
                    completed=False
                )
                db.add(db_todo)
                db.commit()
                db.refresh(db_todo)
                todos.append(TodoItem(
                    id=db_todo.id,
                    text=db_todo.text,
                    time=db_todo.time,
                    completed=db_todo.completed,
                    createdAt=db_todo.created_at.strftime("%Y-%m-%d %H:%M:%S")
                ))
        
        notes = []
        for note_text in note_texts:
            if note_text and len(note_text) > 0:
                db_note = NoteDB(text=note_text)
                db.add(db_note)
                db.commit()
                db.refresh(db_note)
                notes.append(NoteItem(
                    id=db_note.id,
                    text=db_note.text,
                    createdAt=db_note.created_at.strftime("%Y-%m-%d %H:%M:%S")
                ))
        
        db.close()
        
        return ParseResponse(todos=todos, notes=notes, originalText=request.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/todos", response_model=List[TodoItem])
async def get_todos():
    db = SessionLocal()
    todos_db = db.query(TodoDB).order_by(TodoDB.created_at.desc()).all()
    todos = [
        TodoItem(
            id=t.id,
            text=t.text,
            time=t.time,
            completed=t.completed,
            createdAt=t.created_at.strftime("%Y-%m-%d %H:%M:%S")
        )
        for t in todos_db
    ]
    db.close()
    return todos

@app.get("/api/notes", response_model=List[NoteItem])
async def get_notes():
    db = SessionLocal()
    notes_db = db.query(NoteDB).order_by(NoteDB.created_at.desc()).all()
    notes = [
        NoteItem(
            id=n.id,
            text=n.text,
            createdAt=n.created_at.strftime("%Y-%m-%d %H:%M:%S")
        )
        for n in notes_db
    ]
    db.close()
    return notes

@app.patch("/api/todos/{todo_id}")
async def toggle_todo(todo_id: int):
    db = SessionLocal()
    todo = db.query(TodoDB).filter(TodoDB.id == todo_id).first()
    if not todo:
        db.close()
        raise HTTPException(status_code=404, detail="Todo not found")
    todo.completed = not todo.completed
    db.commit()
    db.close()
    return {"success": True}

@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: int):
    db = SessionLocal()
    todo = db.query(TodoDB).filter(TodoDB.id == todo_id).first()
    if not todo:
        db.close()
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(todo)
    db.commit()
    db.close()
    return {"success": True}

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: int):
    db = SessionLocal()
    note = db.query(NoteDB).filter(NoteDB.id == note_id).first()
    if not note:
        db.close()
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    db.close()
    return {"success": True}

@app.delete("/api/clear-all")
async def clear_all():
    db = SessionLocal()
    db.query(TodoDB).delete()
    db.query(NoteDB).delete()
    db.commit()
    db.close()
    return {"success": True}

@app.get("/api/test-parse")
async def test_parse(text: str):
    todos, notes = smart_parse(text)
    return {
        "input": text,
        "todos": [{"text": t[0], "time": t[1]} for t in todos],
        "notes": notes
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
