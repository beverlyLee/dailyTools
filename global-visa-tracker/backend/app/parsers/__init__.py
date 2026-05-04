from typing import Dict, Type, Optional
from .base import BaseVisaParser, ParserException
from .country_parsers import (
    USACEACParser,
    VFSGlobalParser,
    UKVIParser,
    JapanVisaParser,
)


PARSER_REGISTRY: Dict[str, Type[BaseVisaParser]] = {
    "usa": USACEACParser,
    "us": USACEACParser,
    "united states": USACEACParser,
    "schengen": VFSGlobalParser,
    "eu": VFSGlobalParser,
    "europe": VFSGlobalParser,
    "france": VFSGlobalParser,
    "germany": VFSGlobalParser,
    "italy": VFSGlobalParser,
    "spain": VFSGlobalParser,
    "netherlands": VFSGlobalParser,
    "uk": UKVIParser,
    "united kingdom": UKVIParser,
    "britain": UKVIParser,
    "japan": JapanVisaParser,
    "jp": JapanVisaParser,
}


def get_parser(country: str) -> BaseVisaParser:
    country_lower = country.strip().lower()
    
    parser_class = PARSER_REGISTRY.get(country_lower)
    
    if not parser_class:
        raise ParserException(
            f"No parser available for country: {country}. "
            f"Available countries: {list(set(p.country for p in PARSER_REGISTRY.values()))}"
        )
    
    return parser_class()


def get_supported_countries() -> Dict[str, str]:
    countries = {}
    for parser_class in set(PARSER_REGISTRY.values()):
        countries[parser_class.country] = parser_class.__name__
    return countries


def register_parser(country_key: str, parser_class: Type[BaseVisaParser]):
    PARSER_REGISTRY[country_key.lower()] = parser_class
