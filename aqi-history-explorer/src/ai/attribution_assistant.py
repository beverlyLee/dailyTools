"""
AI归因助手模块
调用火山大模型（RESTful API方式），分析重污染天气成因
"""
import os
import requests
import json
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()


class AIAnalysisAssistant:
    """AI污染归因分析助手"""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, endpoint: Optional[str] = None):
        """
        初始化AI分析助手（使用火山引擎RESTful API）
        
        Args:
            api_key: 火山引擎API Key
            model: 模型名称，如 doubao-pro-32k
            endpoint: API端点URL
        """
        self.api_key = api_key or os.getenv("VOLCENGINE_API_KEY")
        self.model = model or os.getenv("VOLCENGINE_MODEL", "doubao-pro-32k")
        self.endpoint = endpoint or os.getenv("VOLCENGINE_ENDPOINT", 
            "https://ark.cn-beijing.volces.com/api/v3/chat/completions")
        
        self.api_available = bool(self.api_key)
        
        if self.api_available:
            print(f"火山引擎RESTful API已配置，模型: {self.model}")
        else:
            print("火山引擎API Key未配置，将使用模拟分析模式")

    def analyze_pollution_cause(
        self,
        data_point: Dict,
        city_name: str,
        historical_context: Optional[List[Dict]] = None
    ) -> str:
        """分析重污染天气成因"""
        prompt = self._build_pollution_prompt(data_point, city_name, historical_context)

        if self.api_available:
            try:
                return self._call_rest_api(prompt)
            except Exception as e:
                print(f"火山引擎API调用失败: {e}，使用模拟分析结果")
                return self._generate_mock_analysis(data_point, city_name)
        else:
            return self._generate_mock_analysis(data_point, city_name)

    def _call_rest_api(self, prompt: str) -> str:
        """调用火山引擎RESTful API"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 2000
        }

        response = requests.post(
            self.endpoint,
            headers=headers,
            json=payload,
            timeout=60
        )

        response.raise_for_status()
        result = response.json()

        return result["choices"][0]["message"]["content"]

    def _build_pollution_prompt(
        self,
        data_point: Dict,
        city_name: str,
        historical_context: Optional[List[Dict]] = None
    ) -> str:
        """构建分析提示词"""
        prompt = f"""你是一位环境科学专家，专长于大气污染成因分析。请根据以下数据，分析该城市重污染天气的可能成因。

【基本信息】
城市: {city_name}
日期: {data_point.get('date', '未知')}

【空气质量数据】
AQI: {data_point.get('aqi', '未知')}
空气质量等级: {data_point.get('level', '未知')}
PM2.5浓度: {data_point.get('pm25', '未知')} μg/m³
PM10浓度: {data_point.get('pm10', '未知')} μg/m³
SO₂浓度: {data_point.get('so2', '未知')} μg/m³
NO₂浓度: {data_point.get('no2', '未知')} μg/m³
CO浓度: {data_point.get('co', '未知')} mg/m³
O₃浓度: {data_point.get('o3', '未知')} μg/m³

【气象条件】
温度: {data_point.get('temperature', '未知')} °C
相对湿度: {data_point.get('humidity', '未知')} %
风速: {data_point.get('wind_speed', '未知')} m/s
风向: {data_point.get('wind_direction', '未知')}
天气状况: {data_point.get('weather', '未知')}
"""

        if historical_context:
            avg_aqi = sum(d.get('aqi', 0) for d in historical_context[:7]) / max(1, min(7, len(historical_context)))
            prompt += f"""
【历史对比数据】
前7天平均AQI: {avg_aqi:.1f}
"""

        prompt += """
请从以下几个方面进行详细分析：

## 一、污染特征分析
1. 主要污染物是什么？各污染物的贡献度如何？
2. PM2.5/PM10比值说明什么问题？

## 二、气象条件影响
1. 当前气象条件（风速、湿度、温度、气压）对污染物扩散的影响
2. 是否存在逆温、静稳等不利扩散条件？
3. 湿度条件是否有利于二次气溶胶生成？

## 三、可能污染源分析
1. 本地排放源（工业、机动车、燃煤、扬尘等）
2. 区域传输影响
3. 特殊排放源（如秸秆焚烧、烟花爆竹等）

## 四、综合结论与建议
1. 本次污染过程的主要成因
2. 针对性的防控建议

请用中文回答，保持专业、客观、条理清晰，使用Markdown格式。
"""

        return prompt

    def _generate_mock_analysis(self, data_point: Dict, city_name: str) -> str:
        """生成模拟分析结果（用于演示）"""
        aqi = data_point.get('aqi', 100)
        pm25 = data_point.get('pm25', 50)
        pm10 = data_point.get('pm10', 80)
        wind_speed = data_point.get('wind_speed', 3)
        humidity = data_point.get('humidity', 60)
        weather = data_point.get('weather', '晴')
        temperature = data_point.get('temperature', 20)

        pm_ratio = pm25 / pm10 if pm10 > 0 else 0.5

        analysis = f"""# {city_name}大气污染成因分析报告

> **说明**：此为智能分析模拟结果。如需真实AI分析，请在 `.env` 中配置 `VOLCENGINE_API_KEY`。

---

## 一、污染特征分析

**空气质量等级：** {data_point.get('level', '中度污染')}（AQI = {aqi}）

### 主要污染物及贡献度
- **PM2.5：** {pm25} μg/m³，为首要污染物
- **PM10：** {pm10} μg/m³
- **PM2.5/PM10比值：** {pm_ratio:.2f}

### 特征解读
"""

        if pm_ratio > 0.7:
            analysis += """PM2.5/PM10比值较高（>0.7），表明本次污染以细颗粒物为主，可能与以下因素有关：
- 燃煤、机动车尾气等燃烧源排放
- 二次气溶胶的化学转化生成
- 区域传输的细颗粒污染物
"""
        elif pm_ratio > 0.5:
            analysis += """PM2.5/PM10比值中等（0.5-0.7），表明污染来源较为复杂：
- 既有本地燃烧源排放，也有扬尘等粗颗粒排放
- 可能存在一定程度的二次转化
"""
        else:
            analysis += """PM2.5/PM10比值较低（<0.5），表明本次污染以粗颗粒物为主：
- 可能以扬尘污染为主
- 可能受到大风带来的外源沙尘影响
"""

        analysis += f"""
---

## 二、气象条件影响分析

### 当前气象要素
- **温度：** {temperature}°C
- **相对湿度：** {humidity}%
- **风速：** {wind_speed} m/s
- **天气：** {weather}

### 扩散条件评估
"""

        if wind_speed < 2:
            analysis += """⚠️ **不利扩散条件明显：**
- 风速较低（<2 m/s），大气静稳程度高
- 水平扩散能力弱，污染物易在本地积累
"""
        elif wind_speed < 3:
            analysis += """⚠️ **扩散条件一般：**
- 风速中等（2-3 m/s）
- 扩散能力有限，不利于污染物快速清除
"""
        else:
            analysis += """✅ **扩散条件较好：**
- 风速较大（>3 m/s）
- 水平扩散条件较好
"""

        if humidity > 70:
            analysis += f"""
⚠️ **湿度条件影响：**
- 相对湿度较高（{humidity}%），有利于颗粒物吸湿增长
- 高湿度条件可能促进二次气溶胶的液相反应生成
- 能见度降低，易形成雾霾天气
"""
        elif humidity > 50:
            analysis += f"""
ℹ️ **湿度条件适中：**
- 相对湿度中等（{humidity}%）
- 对污染物生成和扩散影响较为平衡
"""
        else:
            analysis += f"""
ℹ️ **湿度条件：**
- 相对湿度较低（{humidity}%）
- 不利于颗粒物吸湿增长，但干燥条件易产生扬尘
"""

        analysis += f"""
---

## 三、可能污染源分析

### 1. 本地排放源影响
"""

        northern_cities = ["北京", "石家庄", "天津", "太原", "西安", "济南", "郑州", "沈阳", "哈尔滨", "长春"]
        
        if city_name in northern_cities:
            analysis += """🏭 **北方工业城市特征：**
- 燃煤排放：冬季采暖期燃煤贡献显著
- 工业排放：钢铁、化工、建材等行业排放
- 机动车尾气：城市机动车保有量大，排放强度高
- 扬尘污染：施工工地、道路扬尘贡献
"""
        elif city_name in ["海口", "三亚", "厦门", "深圳", "珠海"]:
            analysis += """🌴 **南方滨海城市特征：**
- 本底条件好，主要受外源输送影响
- 机动车尾气是主要本地排放源
- 海洋性气团带来的海盐气溶胶影响
"""
        elif city_name in ["上海", "广州", "杭州", "南京", "苏州"]:
            analysis += """🏙️ **南方沿海工业城市特征：**
- 机动车尾气：机动车保有量大，尾气排放贡献显著
- 工业排放：石化、电子、制造业等排放
- 船舶排放：港口城市船舶排放影响
- VOCs排放：有利于臭氧生成的前体物排放
"""
        else:
            analysis += """🏙️ **一般城市特征：**
- 机动车尾气排放
- 工业排放
- 居民生活排放
- 扬尘污染
"""

        analysis += f"""
### 2. 区域传输影响
根据气象条件和地理位置分析：
- 周边区域污染物可能通过大气环流输送至本地
- 在静稳天气下，区域污染容易连片发生
- 风向决定了主要传输通道

### 3. 特殊排放源排查
- 秸秆焚烧（春秋季高发）
- 烟花爆竹燃放（节假日）
- 工业企业非正常排放
- 施工扬尘突增

---

## 四、综合结论与建议

### 综合结论
本次{city_name}重污染天气是**不利气象条件**与**污染物排放**共同作用的结果：
1. 静稳天气导致扩散条件转差，污染物持续积累
2. 本地排放源强度较大，提供了充足的污染物
3. 二次转化过程加剧了PM2.5污染
4. 可能存在一定程度的区域传输贡献

### 防控建议

#### 应急管控措施
1. **工业减排：** 对重点排污企业实施限产、停产
2. **机动车管控：** 实施机动车限行或禁行措施
3. **扬尘控制：** 停止土石方作业，增加道路洒水频次
4. **生活源管控：** 禁止露天烧烤、秸秆焚烧

#### 长效治理建议
1. **优化能源结构：** 推进清洁能源替代，减少煤炭消费
2. **产业转型升级：** 淘汰落后产能，发展绿色产业
3. **移动源治理：** 推广新能源汽车，加强机动车排放监管
4. **区域联防联控：** 建立跨区域污染防治协作机制
5. **监测预警能力：** 提升空气质量预报预警精准度

---

*本分析基于监测数据和气象条件综合研判，仅供参考。*
"""

        return analysis

    def analyze_trend(
        self,
        df,
        city_name: str,
        years: List[int]
    ) -> str:
        """分析长期趋势变化"""
        prompt = self._build_trend_prompt(df, city_name, years)

        if self.api_available:
            try:
                return self._call_rest_api(prompt)
            except Exception as e:
                print(f"API调用失败: {e}，使用模拟分析结果")
                return self._generate_mock_trend_analysis(df, city_name)
        else:
            return self._generate_mock_trend_analysis(df, city_name)

    def _build_trend_prompt(self, df, city_name: str, years: List[int]) -> str:
        """构建趋势分析提示词"""
        yearly_stats = df.groupby(df["date"].dt.year).agg({
            "aqi": ["mean", "median", "max"],
            "pm25": "mean",
            "pm10": "mean"
        }).round(2)

        prompt = f"""你是一位环境科学专家，请分析{city_name}近年空气质量变化趋势。

【分析年份】
{', '.join(map(str, years))}

【年度统计数据】
{yearly_stats.to_string()}

请分析：
1. 整体空气质量变化趋势（改善/恶化/波动）
2. 主要污染物浓度变化
3. 可能的政策或环境因素影响
4. 未来展望与建议

请用中文回答，保持专业、客观。
"""
        return prompt

    def _generate_mock_trend_analysis(self, df, city_name: str) -> str:
        """生成模拟趋势分析结果"""
        df["year"] = df["date"].dt.year
        yearly_stats = df.groupby("year").agg({
            "aqi": "mean",
            "pm25": "mean",
            "pm10": "mean"
        }).round(2)

        years = sorted(yearly_stats.index.tolist())
        if len(years) >= 2:
            first_year, last_year = years[0], years[-1]
            aqi_change = ((yearly_stats.loc[last_year, "aqi"] -
                           yearly_stats.loc[first_year, "aqi"]) /
                          yearly_stats.loc[first_year, "aqi"] * 100)

            pm25_change = ((yearly_stats.loc[last_year, "pm25"] -
                            yearly_stats.loc[first_year, "pm25"]) /
                           yearly_stats.loc[first_year, "pm25"] * 100)
        else:
            aqi_change = 0
            pm25_change = 0

        analysis = f"""# {city_name}空气质量长期趋势分析报告

> **说明**：此为智能分析模拟结果。如需真实AI分析，请在 `.env` 中配置 `VOLCENGINE_API_KEY`。

---

## 一、整体变化趋势

### AQI变化
- 分析时段：{min(years)} - {max(years)}年
- {len(years)}年平均AQI：{yearly_stats['aqi'].mean():.1f}
"""

        if aqi_change < -10:
            analysis += """✅ **空气质量显著改善**
近年来大气污染防治措施成效显著，空气质量明显提升。
"""
        elif aqi_change < 0:
            analysis += """✅ **空气质量有所改善**
空气质量呈现逐步改善趋势，但仍有提升空间。
"""
        elif aqi_change < 10:
            analysis += """⚠️ **空气质量基本稳定**
空气质量波动不大，保持在相对稳定水平。
"""
        else:
            analysis += """⚠️ **空气质量有所恶化**
需要关注污染反弹风险，加强污染防治力度。
"""

        analysis += f"""
### PM2.5变化
- {min(years)}年平均PM2.5：{yearly_stats.loc[min(years), 'pm25']:.1f} μg/m³
- {max(years)}年平均PM2.5：{yearly_stats.loc[max(years), 'pm25']:.1f} μg/m³
- 变化幅度：{'+' if pm25_change > 0 else ''}{pm25_change:.1f}%

---

## 二、主要污染物变化特征

### 季节性规律
- **冬季（12-2月）：** 污染最为严重，主要受燃煤供暖和不利扩散条件影响
- **春季（3-5月）：** 沙尘天气频发，PM10浓度较高
- **夏季（6-8月）：** 臭氧污染问题凸显
- **秋季（9-11月）：** 空气质量相对较好

### 变化原因分析

#### 改善因素
1. **政策驱动：** 大气污染防治行动计划深入实施
2. **能源结构优化：** 煤炭消费比重下降，清洁能源占比提升
3. **产业升级：** 淘汰落后产能，工业排放大幅削减
4. **机动车治理：** 新能源车推广，排放标准升级

#### 仍存在的问题
1. **重污染天气仍有发生：** 不利气象条件下仍会出现重污染
2. **臭氧污染日益凸显：** 夏季臭氧浓度呈上升趋势
3. **区域传输影响：** 区域性污染问题仍较突出

---

## 三、未来展望与建议

### 短期目标
- 巩固PM2.5治理成效，防止污染反弹
- 加强臭氧污染防控，推进VOCs治理
- 提升重污染天气应对能力

### 中长期建议
1. **深化能源转型：** 进一步提高清洁能源比重
2. **产业绿色发展：** 推动产业结构优化升级
3. **交通清洁化：** 全面推广新能源汽车
4. **区域协同治理：** 完善区域联防联控机制
5. **科技支撑：** 加强监测预警和科学研究

---

*分析基于监测数据统计，具体情况以官方发布为准。*
"""

        return analysis
