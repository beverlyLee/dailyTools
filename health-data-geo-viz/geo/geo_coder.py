from typing import Dict, Tuple, Optional


class GeoCoder:
    PROVINCE_COORDS = {
        '北京': (116.405285, 39.904989),
        '天津': (117.190182, 39.125596),
        '河北': (114.51486, 38.042307),
        '山西': (112.549248, 37.857014),
        '内蒙古': (111.670797, 40.818311),
        '辽宁': (123.429096, 41.796767),
        '吉林': (125.323544, 43.817072),
        '黑龙江': (126.642464, 45.756967),
        '上海': (121.472644, 31.231707),
        '江苏': (118.767413, 32.041544),
        '浙江': (120.153576, 30.287459),
        '安徽': (117.227239, 31.820587),
        '福建': (119.296585, 26.074432),
        '江西': (115.892151, 28.676493),
        '山东': (117.000923, 36.675807),
        '河南': (113.665412, 34.757975),
        '湖北': (114.298572, 30.584355),
        '湖南': (112.938814, 28.228209),
        '广东': (113.266268, 23.13171),
        '广西': (108.320004, 22.82402),
        '海南': (110.33119, 20.031971),
        '重庆': (106.504962, 29.533155),
        '四川': (104.065735, 30.659475),
        '贵州': (106.630153, 26.647661),
        '云南': (102.712243, 25.040609),
        '西藏': (91.111855, 29.662557),
        '陕西': (108.948024, 34.263161),
        '甘肃': (103.823557, 36.058039),
        '青海': (101.778916, 36.617144),
        '宁夏': (106.278179, 38.46637),
        '新疆': (87.616882, 43.825592),
        '香港': (114.171985, 22.277438),
        '澳门': (113.54909, 22.198952),
        '台湾': (121.520076, 25.030724)
    }

    PYECHARTS_PROVINCE_MAP = {
        '北京': '北京市',
        '天津': '天津市',
        '河北': '河北省',
        '山西': '山西省',
        '内蒙古': '内蒙古自治区',
        '辽宁': '辽宁省',
        '吉林': '吉林省',
        '黑龙江': '黑龙江省',
        '上海': '上海市',
        '江苏': '江苏省',
        '浙江': '浙江省',
        '安徽': '安徽省',
        '福建': '福建省',
        '江西': '江西省',
        '山东': '山东省',
        '河南': '河南省',
        '湖北': '湖北省',
        '湖南': '湖南省',
        '广东': '广东省',
        '广西': '广西壮族自治区',
        '海南': '海南省',
        '重庆': '重庆市',
        '四川': '四川省',
        '贵州': '贵州省',
        '云南': '云南省',
        '西藏': '西藏自治区',
        '陕西': '陕西省',
        '甘肃': '甘肃省',
        '青海': '青海省',
        '宁夏': '宁夏回族自治区',
        '新疆': '新疆维吾尔自治区',
        '香港': '香港特别行政区',
        '澳门': '澳门特别行政区',
        '台湾': '台湾省'
    }

    def get_coords(self, province_name: str) -> Optional[Tuple[float, float]]:
        matched_name = self._match_province(province_name)
        return self.PROVINCE_COORDS.get(matched_name)

    def get_pyecharts_name(self, province_name: str) -> Optional[str]:
        matched_name = self._match_province(province_name)
        return self.PYECHARTS_PROVINCE_MAP.get(matched_name)

    def _match_province(self, name: str) -> Optional[str]:
        name = name.strip()
        for province in self.PROVINCE_COORDS.keys():
            if province in name or name in province:
                return province
        return None

    def batch_geo_code(self, data_list):
        results = []
        for item in data_list:
            province = item.get('province', '')
            coords = self.get_coords(province)
            pyecharts_name = self.get_pyecharts_name(province)
            
            result = item.copy()
            if coords:
                result['longitude'] = coords[0]
                result['latitude'] = coords[1]
            if pyecharts_name:
                result['pyecharts_name'] = pyecharts_name
            
            results.append(result)
        return results

    def get_all_provinces(self) -> list:
        return list(self.PROVINCE_COORDS.keys())

    def get_all_pyecharts_provinces(self) -> list:
        return list(self.PYECHARTS_PROVINCE_MAP.values())
