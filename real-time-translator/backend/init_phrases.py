import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import settings
from app.database import Base
from app.models.models import BusinessPhrase

DEFAULT_PHRASES = [
    {
        "category": "问候与介绍",
        "language_code": "zh",
        "original_text": "您好，很高兴认识您。",
        "translated_text": "Hello, nice to meet you.",
        "target_language": "en"
    },
    {
        "category": "问候与介绍",
        "language_code": "zh",
        "original_text": "我是来自中国的张经理。",
        "translated_text": "I am Manager Zhang from China.",
        "target_language": "en"
    },
    {
        "category": "问候与介绍",
        "language_code": "zh",
        "original_text": "这是我的名片。",
        "translated_text": "This is my business card.",
        "target_language": "en"
    },
    {
        "category": "问候与介绍",
        "language_code": "zh",
        "original_text": "您是第一次来中国吗？",
        "translated_text": "Is this your first time in China?",
        "target_language": "en"
    },
    {
        "category": "问候与介绍",
        "language_code": "zh",
        "original_text": "旅途愉快吗？",
        "translated_text": "Did you have a pleasant journey?",
        "target_language": "en"
    },
    
    {
        "category": "商务会议",
        "language_code": "zh",
        "original_text": "会议现在开始。",
        "translated_text": "The meeting will now begin.",
        "target_language": "en"
    },
    {
        "category": "商务会议",
        "language_code": "zh",
        "original_text": "今天会议的议程如下。",
        "translated_text": "The agenda for today's meeting is as follows.",
        "target_language": "en"
    },
    {
        "category": "商务会议",
        "language_code": "zh",
        "original_text": "请您先做一下介绍。",
        "translated_text": "Could you please introduce yourself first?",
        "target_language": "en"
    },
    {
        "category": "商务会议",
        "language_code": "zh",
        "original_text": "我有一个问题想请教。",
        "translated_text": "I have a question to ask.",
        "target_language": "en"
    },
    {
        "category": "商务会议",
        "language_code": "zh",
        "original_text": "我们可以休息一下吗？",
        "translated_text": "Can we take a break?",
        "target_language": "en"
    },
    
    {
        "category": "价格谈判",
        "language_code": "zh",
        "original_text": "请问这个产品的价格是多少？",
        "translated_text": "What is the price of this product, please?",
        "target_language": "en"
    },
    {
        "category": "价格谈判",
        "language_code": "zh",
        "original_text": "这个价格有点高，能否优惠一点？",
        "translated_text": "This price is a bit high, can you offer a discount?",
        "target_language": "en"
    },
    {
        "category": "价格谈判",
        "language_code": "zh",
        "original_text": "如果我们订购1000件，价格是多少？",
        "translated_text": "What is the price if we order 1000 pieces?",
        "target_language": "en"
    },
    {
        "category": "价格谈判",
        "language_code": "zh",
        "original_text": "我们的最低价是每件5美元。",
        "translated_text": "Our lowest price is $5 per piece.",
        "target_language": "en"
    },
    {
        "category": "价格谈判",
        "language_code": "zh",
        "original_text": "包含运费吗？",
        "translated_text": "Is shipping included?",
        "target_language": "en"
    },
    
    {
        "category": "合同条款",
        "language_code": "zh",
        "original_text": "请您看一下合同条款。",
        "translated_text": "Please review the contract terms.",
        "target_language": "en"
    },
    {
        "category": "合同条款",
        "language_code": "zh",
        "original_text": "合同有效期是多久？",
        "translated_text": "How long is the contract valid?",
        "target_language": "en"
    },
    {
        "category": "合同条款",
        "language_code": "zh",
        "original_text": "付款方式是什么？",
        "translated_text": "What is the payment method?",
        "target_language": "en"
    },
    {
        "category": "合同条款",
        "language_code": "zh",
        "original_text": "违约条款需要确认。",
        "translated_text": "The breach clause needs to be confirmed.",
        "target_language": "en"
    },
    {
        "category": "合同条款",
        "language_code": "zh",
        "original_text": "我需要咨询一下律师。",
        "translated_text": "I need to consult my lawyer.",
        "target_language": "en"
    },
    
    {
        "category": "产品介绍",
        "language_code": "zh",
        "original_text": "这是我们的新产品。",
        "translated_text": "This is our new product.",
        "target_language": "en"
    },
    {
        "category": "产品介绍",
        "language_code": "zh",
        "original_text": "它有以下特点。",
        "translated_text": "It has the following features.",
        "target_language": "en"
    },
    {
        "category": "产品介绍",
        "language_code": "zh",
        "original_text": "质量有保证吗？",
        "translated_text": "Is the quality guaranteed?",
        "target_language": "en"
    },
    {
        "category": "产品介绍",
        "language_code": "zh",
        "original_text": "保修期是多久？",
        "translated_text": "How long is the warranty period?",
        "target_language": "en"
    },
    {
        "category": "产品介绍",
        "language_code": "zh",
        "original_text": "可以给我一些样品吗？",
        "translated_text": "Can you give me some samples?",
        "target_language": "en"
    },
    
    {
        "category": "客户服务",
        "language_code": "zh",
        "original_text": "有什么可以帮助您的吗？",
        "translated_text": "How may I help you?",
        "target_language": "en"
    },
    {
        "category": "客户服务",
        "language_code": "zh",
        "original_text": "我们会尽快处理您的问题。",
        "translated_text": "We will address your issue as soon as possible.",
        "target_language": "en"
    },
    {
        "category": "客户服务",
        "language_code": "zh",
        "original_text": "请提供您的订单号。",
        "translated_text": "Please provide your order number.",
        "target_language": "en"
    },
    {
        "category": "客户服务",
        "language_code": "zh",
        "original_text": "我们会给您全额退款。",
        "translated_text": "We will give you a full refund.",
        "target_language": "en"
    },
    {
        "category": "客户服务",
        "language_code": "zh",
        "original_text": "感谢您的反馈。",
        "translated_text": "Thank you for your feedback.",
        "target_language": "en"
    },
    
    {
        "category": "日语常用",
        "language_code": "zh",
        "original_text": "早上好。",
        "translated_text": "おはようございます。",
        "target_language": "ja"
    },
    {
        "category": "日语常用",
        "language_code": "zh",
        "original_text": "谢谢。",
        "translated_text": "ありがとうございます。",
        "target_language": "ja"
    },
    {
        "category": "日语常用",
        "language_code": "zh",
        "original_text": "请多关照。",
        "translated_text": "よろしくお願いします。",
        "target_language": "ja"
    },
    {
        "category": "日语常用",
        "language_code": "zh",
        "original_text": "对不起。",
        "translated_text": "すみません。",
        "target_language": "ja"
    },
    {
        "category": "日语常用",
        "language_code": "zh",
        "original_text": "再见。",
        "translated_text": "さようなら。",
        "target_language": "ja"
    },
    
    {
        "category": "韩语常用",
        "language_code": "zh",
        "original_text": "你好。",
        "translated_text": "안녕하세요。",
        "target_language": "ko"
    },
    {
        "category": "韩语常用",
        "language_code": "zh",
        "original_text": "谢谢。",
        "translated_text": "감사합니다。",
        "target_language": "ko"
    },
    {
        "category": "韩语常用",
        "language_code": "zh",
        "original_text": "请多关照。",
        "translated_text": "잘 부탁드립니다。",
        "target_language": "ko"
    },
    {
        "category": "韩语常用",
        "language_code": "zh",
        "original_text": "对不起。",
        "translated_text": "미안합니다。",
        "target_language": "ko"
    },
    {
        "category": "韩语常用",
        "language_code": "zh",
        "original_text": "再见。",
        "translated_text": "안녕히 가세요。",
        "target_language": "ko"
    }
]

async def init_phrases():
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(
        engine,
        expire_on_commit=False
    )
    
    async with async_session() as session:
        try:
            for phrase_data in DEFAULT_PHRASES:
                phrase = BusinessPhrase(**phrase_data)
                session.add(phrase)
            
            await session.commit()
            print(f"Successfully initialized {len(DEFAULT_PHRASES)} business phrases")
        except Exception as e:
            await session.rollback()
            print(f"Error initializing phrases: {e}")
            raise
        finally:
            await session.close()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(init_phrases())
