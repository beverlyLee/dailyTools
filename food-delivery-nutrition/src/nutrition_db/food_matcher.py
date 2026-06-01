#!/usr/bin/env python3
from fuzzywuzzy import fuzz, process
from .database import get_all_foods, get_connection

class FoodMatcher:
    def __init__(self):
        self.foods = get_all_foods()
        self._build_search_index()
    
    def _build_search_index(self):
        self.search_terms = []
        for food in self.foods:
            self.search_terms.append((food['name'], food))
            if food['alias']:
                for alias in food['alias'].split(','):
                    self.search_terms.append((alias.strip(), food))
    
    def match_food(self, food_name, threshold=60):
        if not self.search_terms:
            return {
                'matched': False,
                'score': 0,
                'original_name': food_name,
                'food_name': food_name,
                'display_name': food_name,
                'is_approximate': False,
                'calories': 0,
                'protein': 0,
                'fat': 0,
                'carbs': 0,
                'category': '未知',
                'unit': '100g'
            }
        
        top_matches = process.extract(food_name, [t[0] for t in self.search_terms], 
                                      scorer=fuzz.partial_ratio, limit=5)
        
        valid_matches = []
        for match_term, score in top_matches:
            if score >= threshold:
                for term, food in self.search_terms:
                    if term == match_term:
                        valid_matches.append({
                            'food': food,
                            'score': score
                        })
                        break
        
        if valid_matches:
            if len(valid_matches) == 1:
                best_match = valid_matches[0]
            else:
                avg_calories = sum(m['food']['calories'] for m in valid_matches) / len(valid_matches)
                valid_matches.sort(key=lambda x: abs(x['food']['calories'] - avg_calories))
                best_match = valid_matches[0]
            
            food = best_match['food']
            is_approximate = (best_match['score'] < 85 or food_name != food['name'])
            
            display_name = food_name if is_approximate else food['name']
            if is_approximate:
                display_name = f"{food_name} (热量近似: {food['name']})"
            
            return {
                'matched': True,
                'score': best_match['score'],
                'original_name': food_name,
                'food_name': food['name'],
                'display_name': display_name,
                'matched_name': food['name'],
                'is_approximate': is_approximate,
                'calories': food['calories'],
                'protein': food['protein'],
                'fat': food['fat'],
                'carbs': food['carbs'],
                'category': food['category'],
                'unit': food['unit']
            }
        
        return {
            'matched': False,
            'score': top_matches[0][1] if top_matches else 0,
            'original_name': food_name,
            'food_name': food_name,
            'display_name': food_name,
            'matched_name': None,
            'is_approximate': False,
            'calories': 0,
            'protein': 0,
            'fat': 0,
            'carbs': 0,
            'category': '未知',
            'unit': '100g'
        }
    
    def estimate_portion(self, food_name, portion_desc=None):
        portion_map = {
            '小': 0.7,
            '中': 1.0,
            '大': 1.5,
            '份': 1.2,
            '碗': 1.5,
            '盘': 1.3,
            '盒': 1.0,
            '个': 0.8,
        }
        
        multiplier = 1.0
        if portion_desc:
            for key, value in portion_map.items():
                if key in portion_desc:
                    multiplier = value
                    break
        
        return multiplier
    
    def calculate_calories(self, food_name, quantity=1, weight=None):
        match_result = self.match_food(food_name)
        
        if match_result['matched']:
            base_calories = match_result['calories']
            if weight:
                total_calories = base_calories * (weight / 100) * quantity
            else:
                multiplier = self.estimate_portion(food_name)
                total_calories = base_calories * multiplier * quantity
            
            return {
                **match_result,
                'total_calories': round(total_calories, 2),
                'quantity': quantity,
                'weight': weight or 120
            }
        else:
            return {
                **match_result,
                'total_calories': 0,
                'quantity': quantity,
                'weight': weight or 100
            }

def get_exercise_equivalent(calories):
    exercises = {
        '跑步': (600, '小时'),
        '快走': (300, '小时'),
        '游泳': (500, '小时'),
        '骑车': (400, '小时'),
        '跳绳': (700, '小时'),
        '瑜伽': (200, '小时'),
    }
    
    results = {}
    for exercise, (cal_per_hour, unit) in exercises.items():
        time = calories / cal_per_hour
        if time >= 1:
            results[exercise] = f"{round(time, 1)}{unit}"
        else:
            results[exercise] = f"{round(time * 60)}分钟"
    
    return results

def get_daily_calories_goal(gender='男', weight=70, height=170, age=25, activity_level='中'):
    if gender == '男':
        bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age)
    
    activity_multipliers = {
        '低': 1.2,
        '中': 1.55,
        '高': 1.725
    }
    
    tdee = bmr * activity_multipliers.get(activity_level, 1.55)
    
    return {
        'bmr': round(bmr),
        'tdee': round(tdee),
        'lose_weight': round(tdee - 500),
        'gain_weight': round(tdee + 500)
    }

def get_ai_nutrition_advice(daily_calories, goal_calories, food_items, api_key=None, endpoint=None, model=None, max_retries=2, timeout=20):
    has_real_data = daily_calories > 0 and len(food_items) > 0
    
    if not has_real_data:
        return """ℹ️  今日暂无饮食记录

请添加外卖订单后，再次获取AI饮食建议！

💡 提示:
  • 可以通过CSV导入历史订单
  • 可以通过OCR识别订单截图
  • 也可以手动添加当日订单
"""
    
    is_api_available = (
        api_key is not None and 
        api_key.strip() != '' and 
        api_key != 'your_ark_api_key_here' and
        len(api_key) > 10
    )
    
    if not is_api_available:
        diff = daily_calories - goal_calories
        if diff > 0:
            exercises = get_exercise_equivalent(diff)
            advice = f"""⚠️ 今日热量超标 {diff:.0f} kcal！

📋 今日摄入食物: {', '.join(food_items) if food_items else '无记录'}

🏃 建议运动:
"""
            for i, (exercise, time) in enumerate(list(exercises.items())[:3]):
                advice += f"  • {exercise}: {time}\n"
            
            advice += """
🥗 调整建议:
  • 晚餐选择蔬菜沙拉、鸡胸肉等低热量食物
  • 严格控制碳水化合物摄入
  • 多喝水，避免含糖饮料和奶茶
  • 睡前3小时不再进食

💡 配置 ARK_API_KEY 可获取更个性化的AI建议！"""
        else:
            advice = f"""✅ 今日摄入正常，距离减重目标还差 {-diff:.0f} kcal

📋 今日摄入食物: {', '.join(food_items) if food_items else '无记录'}

🎉 继续保持！
  • 确保蛋白质摄入充足
  • 多吃蔬菜水果，保证膳食纤维
  • 三餐定时定量，不要暴饮暴食
  • 可以适当补充一些优质蛋白，如鸡胸肉、鱼类等

💡 配置 ARK_API_KEY 可获取更个性化的AI建议！"""
        
        return advice
    
    import requests
    
    food_list = "、".join(food_items) if food_items else "无记录"
    
    prompt = f"""你是一位专业的营养师，请根据以下用户的真实饮食数据给出个性化建议：

📊 今日真实饮食数据:
- 实际摄入热量: {daily_calories:.0f} kcal
- 减重目标热量: {goal_calories:.0f} kcal
- 热量差值: {'+' if daily_calories > goal_calories else ''}{daily_calories - goal_calories:.0f} kcal
- 今日实际摄入食物: {food_list}

🎯 请根据以上真实数据给出以下建议:
1. 总体评价（是否达标、超标程度）
2. 3-5条非常具体的饮食调整建议，针对用户今天吃的食物
3. 精确的运动补偿方案（具体到项目和时长）
4. 明日的具体饮食规划建议

要求:
- 必须基于用户今天实际吃的食物来给出建议
- 语言亲切友好，像朋友一样建议
- 用emoji装饰内容
- 不超过500字
- 中文回答"""

    api_endpoint = endpoint or 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    model_name = model or 'doubao-pro-32k'
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key.strip()}'
    }
    
    data = {
        'model': model_name,
        'messages': [
            {'role': 'user', 'content': prompt}
        ],
        'temperature': 0.7,
        'max_tokens': 800,
        'stream': False
    }
    
    last_error = None
    
    for attempt in range(max_retries + 1):
        try:
            print(f"[AI 调用] 第 {attempt + 1} 次尝试...")
            
            response = requests.post(api_endpoint, headers=headers, json=data, timeout=timeout)
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    if 'choices' in result and len(result['choices']) > 0:
                        print("[AI 调用] 成功获取建议")
                        return result['choices'][0]['message']['content']
                    else:
                        last_error = "API返回格式异常: 缺少choices字段"
                        print(f"[AI 调用] {last_error}")
                except Exception as parse_error:
                    last_error = f"API响应解析失败: {str(parse_error)}"
                    print(f"[AI 调用] {last_error}")
                    
            elif response.status_code == 401:
                error_msg = """❌ API密钥无效（401错误）

请检查:
1. ARK_API_KEY 是否正确配置在 .env 文件中
2. 密钥是否已过期或被撤销
3. 是否有API调用权限

当前使用的密钥前缀: """ + (api_key[:20] + '...' if len(api_key) > 20 else api_key)
                print(f"[AI 调用] 401 未授权错误")
                return error_msg
                
            elif response.status_code == 404:
                try:
                    error_detail = response.json()
                    error_msg = error_detail.get('error', {}).get('message', str(response.text))
                except:
                    error_msg = str(response.text)
                
                return f"""❌ API端点或模型不存在（404错误）

请检查:
1. VOLCENGINE_ENDPOINT 配置是否正确
2. ARK_MODEL 模型名称是否存在
3. 是否有访问该模型的权限

错误详情: {error_msg}

当前配置:
  Endpoint: {api_endpoint}
  Model: {model_name}"""
                
            elif response.status_code >= 500:
                last_error = f"服务器错误 ({response.status_code})"
                print(f"[AI 调用] {last_error}，重试中...")
                if attempt < max_retries:
                    import time
                    time.sleep(1)
                    continue
            else:
                try:
                    error_detail = response.json()
                    error_msg = error_detail.get('error', {}).get('message', str(response.text))
                except:
                    error_msg = str(response.text)
                last_error = f"API返回错误 {response.status_code}: {error_msg}"
                print(f"[AI 调用] {last_error}")
                
        except requests.exceptions.Timeout:
            if attempt < max_retries:
                print(f"[AI 调用] 请求超时，第 {attempt + 1} 次重试...")
                import time
                time.sleep(2)
                continue
            else:
                return f"""⏰ AI服务请求超时

连续 {max_retries + 1} 次请求均超时，请检查:
1. 网络连接是否正常
2. 是否能访问火山引擎API
3. 服务器可能暂时繁忙，请稍后重试

超时设置: {timeout}秒"""
                
        except requests.exceptions.ConnectionError:
            if attempt < max_retries:
                print(f"[AI 调用] 连接失败，第 {attempt + 1} 次重试...")
                import time
                time.sleep(2)
                continue
            else:
                return f"""🌐 网络连接失败

无法连接到AI服务，请检查:
1. 网络连接是否正常
2. 是否能访问互联网
3. 防火墙设置是否阻止了连接

API端点: {api_endpoint}"""
                
        except Exception as e:
            last_error = f"未知错误: {str(e)}"
            print(f"[AI 调用] {last_error}")
            break
    
    if last_error:
        return f"""❌ AI服务调用失败

{last_error}

💡 建议:
1. 检查 .env 中的 ARK_API_KEY 和 VOLCENGINE_ENDPOINT 配置
2. 确认网络连接正常
3. 稍后重试
4. 查看控制台日志获取详细错误信息"""
    
    return """❌ AI服务暂时不可用

请稍后重试，或检查网络连接和API配置。"""

if __name__ == '__main__':
    matcher = FoodMatcher()
    
    test_foods = ['炸鸡', '香辣鸡腿堡', '珍珠奶茶', '宫保鸡丁盖饭', '麻辣烫']
    for food in test_foods:
        result = matcher.calculate_calories(food, quantity=1)
        print(f"{food}: {result['total_calories']} kcal (匹配度: {result['score']}%)")
