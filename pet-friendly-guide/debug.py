#!/usr/bin/env python3
from src.nlp.policy_detector import PolicyDetector

detector = PolicyDetector()

text = "打电话咨询过了，店家说不允许带宠物，建议放在门口的临时寄存处。"
print(f"文本: {text}")

print(f"\nfriendly_keywords: {detector.friendly_keywords}")
print(f"\nstrictly_forbidden_patterns:")
for p in ["不允许带宠物", "不允许带", "说不允许带"]:
    print(f"  '{p}' in text: {p in text}")

print(f"\n_is_strictly_forbidden result: {detector._is_strictly_forbidden(text)}")

print(f"\nallow_patterns:")
allow_patterns = [
    "可以带", "允许带", "可以进", "允许进",
    "室内可以", "室内允许", "户外可以", "露台可以",
    "接受宠物", "不排斥", "也可以带", "能带",
    "可以进哦", "允许进入"
]
for ap in allow_patterns:
    if ap in text:
        print(f"  FOUND: '{ap}'")
