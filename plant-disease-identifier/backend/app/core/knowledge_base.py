from typing import Dict, Optional, List
from app.schemas.disease import TreatmentInfo


class KnowledgeBase:
    def __init__(self):
        self._database: Dict[str, TreatmentInfo] = {}
        self._init_default_data()
    
    def _init_default_data(self):
        default_data = [
            TreatmentInfo(
                disease_name="健康",
                symptoms=["植株生长正常", "叶片颜色翠绿", "无明显病斑", "果实发育良好"],
                prevention_methods=[
                    "定期检查植株健康状况",
                    "保持适宜的温湿度环境",
                    "合理施肥，增强植株抗病性",
                    "及时清除杂草和落叶"
                ],
                treatment_methods=["保持现有良好的养护习惯"],
                recommended_pesticides=["无需使用农药"],
                notes="植株健康，建议继续保持良好的养护管理"
            ),
            TreatmentInfo(
                disease_name="番茄早疫病",
                symptoms=[
                    "叶片上出现深褐色圆形或椭圆形病斑",
                    "病斑具有同心轮纹",
                    "潮湿时病斑上产生黑色霉层",
                    "严重时叶片枯黄脱落"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "实行轮作，避免连作",
                    "合理密植，改善通风透光条件",
                    "及时清除病残体，减少初侵染源"
                ],
                treatment_methods=[
                    "发病初期及时摘除病叶",
                    "加强通风降湿",
                    "合理施肥，增施磷钾肥"
                ],
                recommended_pesticides=[
                    "75%百菌清可湿性粉剂 600-800倍液",
                    "50%多菌灵可湿性粉剂 500倍液",
                    "70%代森锰锌可湿性粉剂 500倍液"
                ],
                notes="每隔7-10天喷药一次，连续喷2-3次"
            ),
            TreatmentInfo(
                disease_name="番茄晚疫病",
                symptoms=[
                    "叶片边缘出现暗绿色水渍状病斑",
                    "病斑迅速扩大为褐色",
                    "潮湿时病斑边缘产生白色霉层",
                    "果实上出现不规则形褐色病斑"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "高垄栽培，避免大水漫灌",
                    "及时整枝打杈，改善通风条件",
                    "避免在阴雨天气整枝"
                ],
                treatment_methods=[
                    "发现中心病株立即拔除",
                    "加强通风排湿",
                    "适当控制浇水"
                ],
                recommended_pesticides=[
                    "72%克露可湿性粉剂 600倍液",
                    "69%安克锰锌可湿性粉剂 600倍液",
                    "58%甲霜灵锰锌可湿性粉剂 500倍液"
                ],
                notes="发病初期开始喷药，每隔7天一次，连续3-4次"
            ),
            TreatmentInfo(
                disease_name="番茄叶霉病",
                symptoms=[
                    "叶片正面出现椭圆形或不规则形淡黄色病斑",
                    "叶背面产生灰紫色至黑褐色绒状霉层",
                    "严重时叶片卷曲干枯",
                    "果实上出现黑色圆形病斑"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "种子消毒处理",
                    "实行轮作",
                    "加强通风透光，降低湿度"
                ],
                treatment_methods=[
                    "及时摘除病叶",
                    "加强通风排湿",
                    "适当增施磷钾肥"
                ],
                recommended_pesticides=[
                    "50%多菌灵可湿性粉剂 500倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "47%加瑞农可湿性粉剂 600-800倍液"
                ],
                notes="每隔7-10天喷药一次，连续喷2-3次"
            ),
            TreatmentInfo(
                disease_name="番茄灰霉病",
                symptoms=[
                    "叶片上出现V字形病斑，由叶缘向内发展",
                    "病斑呈水渍状，后变为灰褐色",
                    "潮湿时病斑上产生灰色霉层",
                    "果实软腐，表面密生灰色霉层"
                ],
                prevention_methods=[
                    "加强通风排湿",
                    "及时清除病残体",
                    "合理密植",
                    "避免大水漫灌"
                ],
                treatment_methods=[
                    "及时摘除病花、病果、病叶",
                    "加强通风，降低湿度",
                    "适当控制浇水"
                ],
                recommended_pesticides=[
                    "50%速克灵可湿性粉剂 1000-1500倍液",
                    "50%扑海因可湿性粉剂 1000倍液",
                    "40%施佳乐悬浮剂 800-1200倍液"
                ],
                notes="花期开始防治，每隔7-10天一次，连续2-3次"
            ),
            TreatmentInfo(
                disease_name="黄瓜霜霉病",
                symptoms=[
                    "叶片上出现水渍状淡黄色小斑点",
                    "病斑扩大后受叶脉限制呈多角形",
                    "叶背面产生灰黑色霉层",
                    "严重时病斑连片，叶片枯黄"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "培育壮苗",
                    "实行轮作",
                    "加强通风，降低湿度"
                ],
                treatment_methods=[
                    "及时摘除病叶",
                    "加强通风排湿",
                    "合理施肥，增施磷钾肥"
                ],
                recommended_pesticides=[
                    "72%克露可湿性粉剂 600-800倍液",
                    "69%安克锰锌可湿性粉剂 600倍液",
                    "58%甲霜灵锰锌可湿性粉剂 500倍液"
                ],
                notes="发病初期开始喷药，每隔7天一次，连续3-4次"
            ),
            TreatmentInfo(
                disease_name="黄瓜白粉病",
                symptoms=[
                    "叶片正面或背面产生白色近圆形小粉斑",
                    "粉斑逐渐扩大，连接成片",
                    "后期病斑变成灰白色",
                    "严重时叶片枯黄卷缩"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "合理密植，改善通风透光条件",
                    "避免偏施氮肥",
                    "及时清除病残体"
                ],
                treatment_methods=[
                    "及时摘除病叶",
                    "加强通风",
                    "适当增施磷钾肥"
                ],
                recommended_pesticides=[
                    "15%粉锈宁可湿性粉剂 1000-1500倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "40%福星乳油 8000倍液"
                ],
                notes="发病初期开始喷药，每隔7-10天一次，连续2-3次"
            ),
            TreatmentInfo(
                disease_name="黄瓜炭疽病",
                symptoms=[
                    "叶片上出现水渍状小斑点",
                    "病斑扩大后呈圆形或近圆形，红褐色",
                    "病斑边缘有黄色晕圈",
                    "潮湿时病斑上产生粉红色粘质物"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "种子消毒",
                    "实行轮作",
                    "加强通风，降低湿度"
                ],
                treatment_methods=[
                    "及时摘除病叶",
                    "加强通风排湿",
                    "合理施肥"
                ],
                recommended_pesticides=[
                    "50%多菌灵可湿性粉剂 500倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "75%百菌清可湿性粉剂 600倍液"
                ],
                notes="发病初期开始喷药，每隔7-10天一次，连续2-3次"
            ),
            TreatmentInfo(
                disease_name="苹果腐烂病",
                symptoms=[
                    "枝干上出现红褐色水渍状病斑",
                    "病斑组织松软，易剥离",
                    "病斑上产生黑色小粒点",
                    "后期病斑凹陷，表面粗糙"
                ],
                prevention_methods=[
                    "加强栽培管理，增强树势",
                    "合理修剪，避免造成大伤口",
                    "及时防治其他病虫害",
                    "冬季树干涂白"
                ],
                treatment_methods=[
                    "彻底刮除病斑",
                    "刮除后涂药保护",
                    "加强肥水管理，增强树势"
                ],
                recommended_pesticides=[
                    "40%福美砷可湿性粉剂 50倍液",
                    "腐必清 50倍液",
                    "843康复剂"
                ],
                notes="刮除病斑要彻底，周围健皮要刮去0.5-1厘米"
            ),
            TreatmentInfo(
                disease_name="苹果炭疽病",
                symptoms=[
                    "果实上出现褐色圆形小斑点",
                    "病斑扩大后呈漏斗状深入果肉",
                    "病斑上产生轮纹状排列的黑色小粒点",
                    "潮湿时病斑上产生粉红色粘质物"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "合理修剪，改善通风透光条件",
                    "及时清除病果、病枝",
                    "果实套袋"
                ],
                treatment_methods=[
                    "及时摘除病果",
                    "加强通风透光",
                    "合理施肥"
                ],
                recommended_pesticides=[
                    "50%多菌灵可湿性粉剂 600-800倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "75%百菌清可湿性粉剂 600倍液"
                ],
                notes="坐果后开始喷药，每隔15-20天一次，连续3-4次"
            ),
            TreatmentInfo(
                disease_name="苹果轮纹病",
                symptoms=[
                    "枝干上出现以皮孔为中心的瘤状突起",
                    "病斑凹陷，质地坚硬",
                    "果实上出现水渍状褐色小斑点",
                    "病斑扩大后呈同心轮纹状"
                ],
                prevention_methods=[
                    "选用抗病品种和无病苗木",
                    "加强栽培管理，增强树势",
                    "及时清除病残体",
                    "发芽前喷铲除剂"
                ],
                treatment_methods=[
                    "刮除枝干病斑",
                    "及时摘除病果",
                    "加强肥水管理"
                ],
                recommended_pesticides=[
                    "50%多菌灵可湿性粉剂 600-800倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "80%大生M-45可湿性粉剂 800倍液"
                ],
                notes="谢花后开始喷药，每隔15-20天一次，连续4-5次"
            ),
            TreatmentInfo(
                disease_name="葡萄白粉病",
                symptoms=[
                    "叶片上出现灰白色粉状物",
                    "病斑逐渐扩大，覆盖整片叶",
                    "严重时叶片卷缩、枯焦",
                    "果实上出现白色粉斑，后变为褐色"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "合理修剪，改善通风透光条件",
                    "及时清除病残体",
                    "避免偏施氮肥"
                ],
                treatment_methods=[
                    "及时摘除病叶、病果",
                    "加强通风透光",
                    "增施磷钾肥"
                ],
                recommended_pesticides=[
                    "15%粉锈宁可湿性粉剂 1500-2000倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "50%硫磺悬浮剂 200-300倍液"
                ],
                notes="发芽前喷波美3-5度石硫合剂，生长期每隔10-15天喷药一次"
            ),
            TreatmentInfo(
                disease_name="葡萄霜霉病",
                symptoms=[
                    "叶片上出现半透明水渍状小斑点",
                    "病斑扩大后呈多角形，黄色至褐色",
                    "叶背面产生白色霜状霉层",
                    "严重时叶片焦枯脱落"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "合理修剪，改善通风透光条件",
                    "及时清除病残体",
                    "避免大水漫灌"
                ],
                treatment_methods=[
                    "及时摘除病叶",
                    "加强通风排湿",
                    "增施磷钾肥"
                ],
                recommended_pesticides=[
                    "25%甲霜灵可湿性粉剂 500-700倍液",
                    "58%甲霜灵锰锌可湿性粉剂 500倍液",
                    "72%克露可湿性粉剂 600-800倍液"
                ],
                notes="发病初期开始喷药，每隔10-15天一次，连续2-3次"
            ),
            TreatmentInfo(
                disease_name="葡萄炭疽病",
                symptoms=[
                    "果实上出现水渍状褐色小斑点",
                    "病斑扩大后呈圆形或近圆形",
                    "病斑上产生轮纹状排列的黑色小粒点",
                    "潮湿时病斑上产生粉红色粘质物"
                ],
                prevention_methods=[
                    "选用抗病品种",
                    "合理修剪，改善通风透光条件",
                    "及时清除病残体",
                    "果实套袋"
                ],
                treatment_methods=[
                    "及时摘除病果",
                    "加强通风透光",
                    "合理施肥"
                ],
                recommended_pesticides=[
                    "50%多菌灵可湿性粉剂 600-800倍液",
                    "70%甲基托布津可湿性粉剂 800倍液",
                    "75%百菌清可湿性粉剂 600倍液"
                ],
                notes="坐果后开始喷药，每隔10-15天一次，连续3-4次"
            )
        ]
        
        for item in default_data:
            self._database[item.disease_name] = item
    
    def get_treatment(self, disease_name: str) -> Optional[TreatmentInfo]:
        return self._database.get(disease_name)
    
    def get_all_treatments(self) -> List[TreatmentInfo]:
        return list(self._database.values())
    
    def add_treatment(self, treatment: TreatmentInfo) -> bool:
        if treatment.disease_name in self._database:
            return False
        self._database[treatment.disease_name] = treatment
        return True
    
    def update_treatment(self, disease_name: str, treatment: TreatmentInfo) -> bool:
        if disease_name not in self._database:
            return False
        if disease_name != treatment.disease_name:
            del self._database[disease_name]
        self._database[treatment.disease_name] = treatment
        return True
    
    def delete_treatment(self, disease_name: str) -> bool:
        if disease_name in self._database:
            del self._database[disease_name]
            return True
        return False


knowledge_base = KnowledgeBase()
