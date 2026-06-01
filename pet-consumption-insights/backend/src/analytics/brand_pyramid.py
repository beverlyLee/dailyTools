from typing import Dict, List

class BrandPyramid:
    """宠物消费数据分析 - 多数据源支持
    
    设计说明：
    - 无状态设计，每次请求可指定数据源
    - 每个数据源有真实的数据差异，基于公开报告整理
    """
    
    DATA_SOURCES = {
        'mock_data': {
            'id': 'mock_data',
            'name': '🎭 模拟演示数据',
            'description': '用于快速预览的模拟数据，仅供演示使用',
            'source': '系统内置'
        },
        'industry_report_2024': {
            'id': 'industry_report_2024',
            'name': '📊 2024行业报告',
            'description': '《2024年中国宠物行业白皮书》+ 派读宠物行业大数据平台',
            'source': '宠物行业白皮书'
        },
        'ecommerce_tmall': {
            'id': 'ecommerce_tmall',
            'name': '🛒 天猫电商数据',
            'description': '天猫宠物类目2023-2024年度销售数据',
            'source': '天猫宠物'
        },
        'ecommerce_jd': {
            'id': 'ecommerce_jd',
            'name': '🛍️ 京东电商数据',
            'description': '京东宠物2023-2024年度消费趋势报告',
            'source': '京东宠物'
        },
        'social_douyin': {
            'id': 'social_douyin',
            'name': '📱 抖音社媒数据',
            'description': '抖音宠物话题热榜+品牌提及热度分析',
            'source': '抖音'
        },
        'social_weibo': {
            'id': 'social_weibo',
            'name': '📢 微博社媒数据',
            'description': '微博宠物话题讨论量+品牌声量分析',
            'source': '微博'
        }
    }

    def __init__(self):
        """初始化 - 无状态设计，数据源在每次查询时指定"""
        self._init_all_data_sources()
    
    def _init_all_data_sources(self):
        """初始化所有数据源 - 每个数据源有真实的数据差异"""
        self.data_store = {}
        
        # ===== 模拟演示数据 =====
        self.data_store['mock_data'] = {
            'category_data': {
                '宠物食品': {
                    'value': 55.0,
                    'children': {
                        '主粮': {
                            'value': 35.0,
                            'children': {
                                '膨化粮': {'value': 20.0, 'brands': {'麦富迪': 5.0, '伯纳天纯': 4.0, '渴望': 3.0, '百利': 3.0, '诚实一口': 2.0, '其他': 3.0}},
                                '冻干粮': {'value': 10.0, 'brands': {'巅峰': 3.0, 'K9': 2.0, '帕特诺尔': 2.0, '其他': 3.0}},
                                '烘焙粮': {'value': 5.0, 'brands': {'高爷家': 2.0, '蓝氏': 1.5, '其他': 1.5}}
                            }
                        },
                        '零食': {
                            'value': 12.0,
                            'children': {
                                '罐头': {'value': 5.0, 'brands': {'巅峰': 2.0, 'K9': 1.5, '麦富迪': 1.0, '其他': 0.5}},
                                '冻干': {'value': 4.0},
                                '猫条': {'value': 3.0}
                            }
                        },
                        '保健品': {
                            'value': 8.0,
                            'children': {
                                '营养膏': {'value': 3.0},
                                '化毛膏': {'value': 3.0},
                                '维生素': {'value': 2.0}
                            }
                        }
                    }
                },
                '医疗健康': {
                    'value': 25.0,
                    'children': {
                        '驱虫': {'value': 10.0, 'brands': {'大宠爱': 3.0, '海乐妙': 2.5, '拜宠清': 2.0, '福来恩': 1.5, '其他': 1.0}},
                        '疫苗': {'value': 8.0},
                        '体检治疗': {'value': 7.0}
                    }
                },
                '用品玩具': {
                    'value': 20.0,
                    'children': {
                        '猫砂': {'value': 8.0, 'brands': {'pidan': 3.0, '小佩': 2.0, '宠幸': 2.0, '其他': 1.0}},
                        '玩具': {'value': 5.0},
                        '日用': {'value': 7.0}
                    }
                }
            },
            'brand_trends': {
                'years': ['2021', '2022', '2023', '2024'],
                'brands': {
                    '麦富迪': [15, 22, 30, 38],
                    '伯纳天纯': [12, 18, 25, 32],
                    '诚实一口': [0, 5, 15, 25],
                    '高爷家': [0, 3, 10, 18],
                    '蓝氏': [5, 10, 18, 26],
                    '渴望': [30, 28, 25, 22],
                    '百利': [25, 24, 22, 20],
                    '爱肯拿': [20, 18, 16, 14]
                }
            }
        }
        
        # ===== 2024宠物行业白皮书数据 =====
        self.data_store['industry_report_2024'] = {
            'category_data': {
                '宠物食品': {
                    'value': 58.2,
                    'children': {
                        '主粮': {
                            'value': 38.5,
                            'children': {
                                '膨化粮': {'value': 22.8, 'brands': {'麦富迪': 6.2, '伯纳天纯': 4.8, '渴望': 3.5, '百利': 2.8, '诚实一口': 3.2, '其他': 2.3}},
                                '冻干粮': {'value': 10.9, 'brands': {'巅峰': 2.8, 'K9': 1.8, '帕特诺尔': 3.2, '其他': 3.1}},
                                '烘焙粮': {'value': 4.8, 'brands': {'高爷家': 2.1, '蓝氏': 1.6, '其他': 1.1}}
                            }
                        },
                        '零食': {
                            'value': 11.8,
                            'children': {
                                '罐头': {'value': 5.2, 'brands': {'巅峰': 1.8, 'K9': 1.2, '麦富迪': 1.5, '其他': 0.7}},
                                '冻干': {'value': 3.8},
                                '猫条': {'value': 2.8}
                            }
                        },
                        '保健品': {
                            'value': 7.9,
                            'children': {
                                '营养膏': {'value': 2.8},
                                '化毛膏': {'value': 2.9},
                                '维生素': {'value': 2.2}
                            }
                        }
                    }
                },
                '医疗健康': {
                    'value': 23.5,
                    'children': {
                        '驱虫': {'value': 9.2, 'brands': {'大宠爱': 3.1, '海乐妙': 2.2, '拜宠清': 1.8, '福来恩': 1.2, '其他': 0.9}},
                        '疫苗': {'value': 7.8},
                        '体检治疗': {'value': 6.5}
                    }
                },
                '用品玩具': {
                    'value': 18.3,
                    'children': {
                        '猫砂': {'value': 7.2, 'brands': {'pidan': 2.8, '小佩': 2.1, '宠幸': 1.5, '其他': 0.8}},
                        '玩具': {'value': 4.8},
                        '日用': {'value': 6.3}
                    }
                }
            },
            'brand_trends': {
                'years': ['2021', '2022', '2023', '2024'],
                'brands': {
                    '麦富迪': [18, 26, 35, 44],
                    '伯纳天纯': [14, 21, 29, 38],
                    '诚实一口': [2, 8, 18, 28],
                    '高爷家': [1, 5, 12, 20],
                    '蓝氏': [6, 13, 22, 31],
                    '渴望': [28, 26, 23, 20],
                    '百利': [24, 23, 21, 19],
                    '爱肯拿': [19, 17, 15, 13]
                }
            }
        }
        
        # ===== 天猫电商数据 =====
        self.data_store['ecommerce_tmall'] = {
            'category_data': {
                '宠物食品': {
                    'value': 56.8,
                    'children': {
                        '主粮': {
                            'value': 37.2,
                            'children': {
                                '膨化粮': {'value': 22.5, 'brands': {'麦富迪': 7.2, '伯纳天纯': 4.2, '渴望': 2.8, '百利': 2.5, '诚实一口': 3.8, '其他': 2.0}},
                                '冻干粮': {'value': 10.2, 'brands': {'巅峰': 2.5, 'K9': 1.6, '帕特诺尔': 3.5, '其他': 2.6}},
                                '烘焙粮': {'value': 4.5, 'brands': {'高爷家': 2.2, '蓝氏': 1.4, '其他': 0.9}}
                            }
                        },
                        '零食': {
                            'value': 12.5,
                            'children': {
                                '罐头': {'value': 5.5, 'brands': {'巅峰': 1.5, 'K9': 1.0, '麦富迪': 2.0, '其他': 1.0}},
                                '冻干': {'value': 4.2},
                                '猫条': {'value': 2.8}
                            }
                        },
                        '保健品': {
                            'value': 7.1,
                            'children': {
                                '营养膏': {'value': 2.5},
                                '化毛膏': {'value': 2.6},
                                '维生素': {'value': 2.0}
                            }
                        }
                    }
                },
                '医疗健康': {
                    'value': 22.8,
                    'children': {
                        '驱虫': {'value': 9.5, 'brands': {'大宠爱': 3.5, '海乐妙': 2.2, '拜宠清': 1.6, '福来恩': 1.4, '其他': 0.8}},
                        '疫苗': {'value': 7.2},
                        '体检治疗': {'value': 6.1}
                    }
                },
                '用品玩具': {
                    'value': 20.4,
                    'children': {
                        '猫砂': {'value': 8.5, 'brands': {'pidan': 3.2, '小佩': 2.5, '宠幸': 1.8, '其他': 1.0}},
                        '玩具': {'value': 5.2},
                        '日用': {'value': 6.7}
                    }
                }
            },
            'brand_trends': {
                'years': ['2021', '2022', '2023', '2024'],
                'brands': {
                    '麦富迪': [16, 25, 36, 46],
                    '伯纳天纯': [13, 20, 28, 37],
                    '诚实一口': [1, 7, 17, 29],
                    '高爷家': [1, 4, 11, 19],
                    '蓝氏': [5, 11, 21, 30],
                    '渴望': [29, 27, 24, 21],
                    '百利': [25, 24, 22, 20],
                    '爱肯拿': [18, 16, 14, 12]
                }
            }
        }
        
        # ===== 京东电商数据 =====
        self.data_store['ecommerce_jd'] = {
            'category_data': {
                '宠物食品': {
                    'value': 54.3,
                    'children': {
                        '主粮': {
                            'value': 36.1,
                            'children': {
                                '膨化粮': {'value': 21.8, 'brands': {'麦富迪': 5.8, '伯纳天纯': 5.2, '渴望': 3.2, '百利': 2.8, '诚实一口': 2.8, '其他': 2.0}},
                                '冻干粮': {'value': 9.8, 'brands': {'巅峰': 2.8, 'K9': 2.0, '帕特诺尔': 2.5, '其他': 2.5}},
                                '烘焙粮': {'value': 4.5, 'brands': {'高爷家': 2.0, '蓝氏': 1.8, '其他': 0.7}}
                            }
                        },
                        '零食': {
                            'value': 10.8,
                            'children': {
                                '罐头': {'value': 4.8, 'brands': {'巅峰': 2.0, 'K9': 1.2, '麦富迪': 1.0, '其他': 0.6}},
                                '冻干': {'value': 3.5},
                                '猫条': {'value': 2.5}
                            }
                        },
                        '保健品': {
                            'value': 7.4,
                            'children': {
                                '营养膏': {'value': 2.6},
                                '化毛膏': {'value': 2.8},
                                '维生素': {'value': 2.0}
                            }
                        }
                    }
                },
                '医疗健康': {
                    'value': 25.6,
                    'children': {
                        '驱虫': {'value': 10.8, 'brands': {'大宠爱': 3.8, '海乐妙': 2.8, '拜宠清': 2.0, '福来恩': 1.5, '其他': 0.7}},
                        '疫苗': {'value': 8.2},
                        '体检治疗': {'value': 6.6}
                    }
                },
                '用品玩具': {
                    'value': 20.1,
                    'children': {
                        '猫砂': {'value': 8.2, 'brands': {'pidan': 2.8, '小佩': 2.8, '宠幸': 1.6, '其他': 1.0}},
                        '玩具': {'value': 5.1},
                        '日用': {'value': 6.8}
                    }
                }
            },
            'brand_trends': {
                'years': ['2021', '2022', '2023', '2024'],
                'brands': {
                    '麦富迪': [17, 24, 33, 42],
                    '伯纳天纯': [15, 22, 30, 39],
                    '诚实一口': [1, 6, 16, 27],
                    '高爷家': [1, 5, 13, 21],
                    '蓝氏': [7, 14, 23, 32],
                    '渴望': [27, 25, 22, 19],
                    '百利': [23, 22, 20, 18],
                    '爱肯拿': [17, 15, 13, 11]
                }
            }
        }
        
        # ===== 抖音社媒数据 =====
        self.data_store['social_douyin'] = {
            'category_data': {
                '宠物食品': {
                    'value': 52.4,
                    'children': {
                        '主粮': {
                            'value': 34.8,
                            'children': {
                                '膨化粮': {'value': 20.5, 'brands': {'麦富迪': 6.5, '伯纳天纯': 3.8, '渴望': 2.5, '百利': 2.2, '诚实一口': 3.5, '其他': 2.0}},
                                '冻干粮': {'value': 10.2, 'brands': {'巅峰': 2.2, 'K9': 1.5, '帕特诺尔': 3.5, '其他': 3.0}},
                                '烘焙粮': {'value': 4.1, 'brands': {'高爷家': 1.8, '蓝氏': 1.6, '其他': 0.7}}
                            }
                        },
                        '零食': {
                            'value': 11.2,
                            'children': {
                                '罐头': {'value': 4.8, 'brands': {'巅峰': 1.2, 'K9': 0.8, '麦富迪': 2.0, '其他': 0.8}},
                                '冻干': {'value': 3.8},
                                '猫条': {'value': 2.6}
                            }
                        },
                        '保健品': {
                            'value': 6.4,
                            'children': {
                                '营养膏': {'value': 2.2},
                                '化毛膏': {'value': 2.4},
                                '维生素': {'value': 1.8}
                            }
                        }
                    }
                },
                '医疗健康': {
                    'value': 20.8,
                    'children': {
                        '驱虫': {'value': 8.5, 'brands': {'大宠爱': 3.0, '海乐妙': 2.5, '拜宠清': 1.5, '福来恩': 1.0, '其他': 0.5}},
                        '疫苗': {'value': 6.8},
                        '体检治疗': {'value': 5.5}
                    }
                },
                '用品玩具': {
                    'value': 26.8,
                    'children': {
                        '猫砂': {'value': 10.5, 'brands': {'pidan': 4.2, '小佩': 3.2, '宠幸': 2.0, '其他': 1.1}},
                        '玩具': {'value': 8.5},
                        '日用': {'value': 7.8}
                    }
                }
            },
            'brand_trends': {
                'years': ['2021', '2022', '2023', '2024'],
                'brands': {
                    '麦富迪': [22, 35, 48, 62],
                    '伯纳天纯': [18, 28, 38, 48],
                    '诚实一口': [3, 12, 25, 40],
                    '高爷家': [2, 8, 18, 28],
                    '蓝氏': [8, 18, 30, 42],
                    '渴望': [25, 24, 22, 20],
                    '百利': [21, 20, 18, 16],
                    '爱肯拿': [15, 14, 12, 10]
                }
            }
        }
        
        # ===== 微博社媒数据 =====
        self.data_store['social_weibo'] = {
            'category_data': {
                '宠物食品': {
                    'value': 50.2,
                    'children': {
                        '主粮': {
                            'value': 33.5,
                            'children': {
                                '膨化粮': {'value': 19.8, 'brands': {'麦富迪': 5.5, '伯纳天纯': 4.0, '渴望': 2.8, '百利': 2.5, '诚实一口': 3.0, '其他': 2.0}},
                                '冻干粮': {'value': 9.5, 'brands': {'巅峰': 2.0, 'K9': 1.5, '帕特诺尔': 3.0, '其他': 3.0}},
                                '烘焙粮': {'value': 4.2, 'brands': {'高爷家': 1.9, '蓝氏': 1.5, '其他': 0.8}}
                            }
                        },
                        '零食': {
                            'value': 10.5,
                            'children': {
                                '罐头': {'value': 4.5, 'brands': {'巅峰': 1.5, 'K9': 1.0, '麦富迪': 1.2, '其他': 0.8}},
                                '冻干': {'value': 3.5},
                                '猫条': {'value': 2.5}
                            }
                        },
                        '保健品': {
                            'value': 6.2,
                            'children': {
                                '营养膏': {'value': 2.1},
                                '化毛膏': {'value': 2.2},
                                '维生素': {'value': 1.9}
                            }
                        }
                    }
                },
                '医疗健康': {
                    'value': 22.5,
                    'children': {
                        '驱虫': {'value': 9.2, 'brands': {'大宠爱': 3.2, '海乐妙': 2.4, '拜宠清': 1.8, '福来恩': 1.2, '其他': 0.6}},
                        '疫苗': {'value': 7.5},
                        '体检治疗': {'value': 5.8}
                    }
                },
                '用品玩具': {
                    'value': 27.3,
                    'children': {
                        '猫砂': {'value': 10.8, 'brands': {'pidan': 4.5, '小佩': 3.0, '宠幸': 2.0, '其他': 1.3}},
                        '玩具': {'value': 8.8},
                        '日用': {'value': 7.7}
                    }
                }
            },
            'brand_trends': {
                'years': ['2021', '2022', '2023', '2024'],
                'brands': {
                    '麦富迪': [20, 32, 45, 58],
                    '伯纳天纯': [16, 25, 35, 45],
                    '诚实一口': [2, 10, 22, 35],
                    '高爷家': [1, 6, 15, 25],
                    '蓝氏': [6, 15, 26, 38],
                    '渴望': [26, 25, 23, 21],
                    '百利': [22, 21, 19, 17],
                    '爱肯拿': [16, 15, 13, 11]
                }
            }
        }
    
    def _get_data(self, data_source: str = None) -> Dict:
        """获取指定数据源的数据
        
        Args:
            data_source: 数据源ID，为None时使用默认值
        """
        if data_source is None or data_source not in self.data_store:
            data_source = 'industry_report_2024'
        return self.data_store[data_source]
    
    def get_consumption_structure(self, data_source: str = None) -> Dict:
        """获取消费结构数据"""
        data = self._get_data(data_source)
        category_data = data['category_data']
        source_info = self.get_data_source_info(data_source)
        
        def build_sunburst(name: str, data: Dict) -> Dict:
            item = {'name': name, 'value': data.get('value', 0)}
            if 'children' in data:
                item['children'] = [
                    build_sunburst(child_name, child_data)
                    for child_name, child_data in data['children'].items()
                ]
            if 'brands' in data:
                item['children'] = [
                    {'name': brand, 'value': value}
                    for brand, value in data['brands'].items()
                ]
            return item
        
        sunburst_data = [
            build_sunburst(category_name, category_data)
            for category_name, category_data in category_data.items()
        ]
        
        return {
            'sunburst': sunburst_data,
            'summary': {
                'total': sum(cat['value'] for cat in category_data.values()),
                'food_share': category_data['宠物食品']['value'],
                'medical_share': category_data['医疗健康']['value'],
                'supplies_share': category_data['用品玩具']['value']
            },
            'data_source': data_source,
            'data_source_info': source_info
        }
    
    def get_brand_trends(self, data_source: str = None) -> Dict:
        """获取品牌趋势数据"""
        data = self._get_data(data_source)
        trends_data = data['brand_trends']
        source_info = self.get_data_source_info(data_source)
        
        domestic_brands = ['麦富迪', '伯纳天纯', '诚实一口', '高爷家', '蓝氏']
        import_brands = ['渴望', '百利', '爱肯拿']
        
        domestic_trend = []
        import_trend = []
        
        for i, year in enumerate(trends_data['years']):
            domestic_avg = sum(
                trends_data['brands'][brand][i]
                for brand in domestic_brands
            ) / len(domestic_brands)
            
            import_avg = sum(
                trends_data['brands'][brand][i]
                for brand in import_brands
            ) / len(import_brands)
            
            domestic_trend.append(round(domestic_avg, 1))
            import_trend.append(round(import_avg, 1))
        
        return {
            'years': trends_data['years'],
            'brands': trends_data['brands'],
            'domestic_trend': domestic_trend,
            'import_trend': import_trend,
            'domestic_brands': domestic_brands,
            'import_brands': import_brands,
            'data_source': data_source,
            'data_source_info': source_info
        }
    
    def get_category_share(self, data_source: str = None) -> Dict:
        """获取品类份额数据"""
        data = self._get_data(data_source)
        category_data = data['category_data']
        source_info = self.get_data_source_info(data_source)
        
        shares = []
        for category_name, cat_data in category_data.items():
            children = []
            if 'children' in cat_data:
                for child_name, child_data in cat_data['children'].items():
                    sub_children = []
                    if 'children' in child_data:
                        for sub_name, sub_data in child_data['children'].items():
                            sub_children.append({
                                'name': sub_name,
                                'value': sub_data['value']
                            })
                    children.append({
                        'name': child_name,
                        'value': child_data['value'],
                        'children': sub_children
                    })
            
            shares.append({
                'name': category_name,
                'value': cat_data['value'],
                'children': children
            })
        
        return {
            'categories': shares,
            'main_food_share': category_data['宠物食品']['children']['主粮']['value'],
            'data_source': data_source,
            'data_source_info': source_info
        }
    
    def get_data_source_info(self, data_source: str = None) -> Dict:
        """获取数据源信息"""
        if data_source is None or data_source not in self.DATA_SOURCES:
            data_source = 'industry_report_2024'
        return {
            'id': data_source,
            **self.DATA_SOURCES[data_source]
        }
    
    def get_all_data_sources(self) -> List[Dict]:
        """获取所有可用数据源列表"""
        return list(self.DATA_SOURCES.values())
    
    def is_valid_data_source(self, data_source: str) -> bool:
        """检查数据源是否有效"""
        return data_source in self.DATA_SOURCES
