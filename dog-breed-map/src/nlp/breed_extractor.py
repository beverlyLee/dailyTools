import re

BREED_KEYWORDS = {
    "泰迪": ["泰迪", "贵宾犬", "泰迪犬", "红贵宾"],
    "金毛": ["金毛", "金毛犬", "金毛寻回", "golden retriever"],
    "哈士奇": ["哈士奇", "二哈", "西伯利亚", "雪橇犬"],
    "比熊": ["比熊", "比熊犬", "卷毛比熊"],
    "柴犬": ["柴犬", "柴", "豆柴", "日本柴犬"],
    "柯基": ["柯基", "柯基犬", "威尔士柯基"],
    "萨摩耶": ["萨摩耶", "萨摩耶犬", "微笑天使"],
    "拉布拉多": ["拉布拉多", "拉拉", "导盲犬"],
    "贵宾": ["贵宾", "贵宾犬", "贵妇犬"],
    "博美": ["博美", "博美犬", "松鼠犬"],
}

def extract_breed(text):
    text = text.lower()
    matched_breeds = []
    
    for breed, keywords in BREED_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text:
                matched_breeds.append(breed)
                break
    
    return list(set(matched_breeds))

def extract_breed_from_post(post):
    content = post.get("content", "")
    tags = post.get("tags", "")
    
    text = f"{content} {tags}"
    breeds = extract_breed(text)
    
    if breeds:
        return breeds[0]
    return None

def batch_extract_breeds(posts):
    results = []
    
    for post in posts:
        breed = extract_breed_from_post(post)
        if breed:
            results.append({
                "city": post.get("city"),
                "breed": breed,
                "likes": post.get("likes", 0),
                "content": post.get("content")
            })
    
    return results