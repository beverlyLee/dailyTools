from typing import List, Optional, Dict, Type
from .base import BaseBillParser, BillData
from .wechat import WechatBillParser
from .alipay import AlipayBillParser


class BillParserFactory:
    _parsers: List[Type[BaseBillParser]] = [
        WechatBillParser,
        AlipayBillParser,
    ]
    
    _parser_cache: Dict[str, BaseBillParser] = {}

    @classmethod
    def get_parser_for_content(cls, content: str) -> Optional[BaseBillParser]:
        for ParserClass in cls._parsers:
            parser = cls._get_parser_instance(ParserClass)
            if parser.can_parse(content):
                return parser
        return None

    @classmethod
    def get_parser_by_source(cls, source: str) -> Optional[BaseBillParser]:
        source_lower = source.lower()
        
        if source_lower in ['wechat', '微信']:
            return cls._get_parser_instance(WechatBillParser)
        elif source_lower in ['alipay', '支付宝']:
            return cls._get_parser_instance(AlipayBillParser)
        
        return None

    @classmethod
    def parse_content(cls, content: str, source: Optional[str] = None) -> List[BillData]:
        parser: Optional[BaseBillParser] = None
        
        if source:
            parser = cls.get_parser_by_source(source)
        
        if not parser:
            parser = cls.get_parser_for_content(content)
        
        if not parser:
            return cls._try_all_parsers(content)
        
        return parser.parse(content)

    @classmethod
    def _try_all_parsers(cls, content: str) -> List[BillData]:
        for ParserClass in cls._parsers:
            parser = cls._get_parser_instance(ParserClass)
            bills = parser.parse(content)
            if bills:
                return bills
        return []

    @classmethod
    def _get_parser_instance(cls, ParserClass: Type[BaseBillParser]) -> BaseBillParser:
        key = ParserClass.__name__
        if key not in cls._parser_cache:
            cls._parser_cache[key] = ParserClass()
        return cls._parser_cache[key]

    @classmethod
    def detect_source(cls, content: str) -> Optional[str]:
        for ParserClass in cls._parsers:
            parser = cls._get_parser_instance(ParserClass)
            if parser.can_parse(content):
                if isinstance(parser, WechatBillParser):
                    return 'wechat'
                elif isinstance(parser, AlipayBillParser):
                    return 'alipay'
        return None


def parse_bill_content(content: str, source: Optional[str] = None) -> List[BillData]:
    return BillParserFactory.parse_content(content, source)


def detect_bill_source(content: str) -> Optional[str]:
    return BillParserFactory.detect_source(content)
