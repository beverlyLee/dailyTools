from pyecharts import options as opts
from pyecharts.charts import Map, Geo
from pyecharts.globals import ChartType, SymbolType
from typing import List, Dict, Optional
import os
import re


ECHARTS_BASE_PATH = "/static/echarts/"


class FluHeatmap:
    def __init__(self, output_dir: str = "../output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def create_province_heatmap(
        self,
        data: List[Dict],
        title: str = "中国各省份流感样病例百分比",
        subtitle: str = "数据来源：国家卫健委",
        output_file: str = "flu_heatmap.html"
    ) -> str:
        map_data = []
        for item in data:
            pyecharts_name = item.get('pyecharts_name')
            percentage = item.get('percentage', 0)
            if pyecharts_name:
                map_data.append((pyecharts_name, percentage))

        c = (
            Map()
            .add(
                series_name="流感样病例百分比(%)",
                data_pair=map_data,
                maptype="china",
                is_map_symbol_show=False,
            )
            .set_global_opts(
                title_opts=opts.TitleOpts(
                    title=title,
                    subtitle=subtitle,
                    pos_left="center",
                    title_textstyle_opts=opts.TextStyleOpts(font_size=20)
                ),
                tooltip_opts=opts.TooltipOpts(
                    formatter=self._tooltip_formatter(data)
                ),
                visualmap_opts=opts.VisualMapOpts(
                    min_=0,
                    max_=self._get_max_percentage(data),
                    is_piecewise=True,
                    pieces=[
                        {"min": 0, "max": 2, "label": "0-2%", "color": "#FFE6E6"},
                        {"min": 2, "max": 4, "label": "2-4%", "color": "#FFB3B3B"},
                        {"min": 4, "max": 6, "label": "4-6%", "color": "#FF8080"},
                        {"min": 6, "max": 8, "label": "6-8%", "color": "#FF4D4D"},
                        {"min": 8, "label": ">8%", "color": "#CC0000"},
                    ],
                    pos_left="left",
                    pos_bottom="center",
                ),
                legend_opts=opts.LegendOpts(is_show=False),
            )
            .set_series_opts(
                label_opts=opts.LabelOpts(
                    is_show=True,
                    font_size=10
                )
            )
        )

        output_path = os.path.join(self.output_dir, output_file)
        raw_html = c.render_embed()
        final_html = self._process_html_resources(raw_html)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
            
        print(f"Heatmap saved to {output_path}")
        return output_path

    def _tooltip_formatter(self, data: List[Dict]):
        def formatter(params):
            province_name = params.name
            for item in data:
                if item.get('pyecharts_name') == province_name:
                    percentage = item.get('percentage', 0)
                    cases = item.get('cases', 0)
                    result = f"""
                    <div style="font-size: 14px; padding: 10px;">
                        <strong>{province_name}</strong><br/>
                        流感样病例百分比: {percentage:.2f}%<br/>
                    """
                    if cases > 0:
                        result += f"感染人数: {int(cases)} 人<br/>"
                    result += "</div>"
                    return result
            return f"{province_name}: 无数据"
        return formatter

    def _get_max_percentage(self, data: List[Dict]) -> float:
        max_p = max([item.get('percentage', 0) for item in data], default=10)
        return max(max_p, 10)

    def create_geo_scatter(
        self,
        data: List[Dict],
        title: str = "中国各省份流感病例分布",
        output_file: str = "flu_scatter.html"
    ) -> str:
        geo_data = []
        for item in data:
            province = item.get('province', '')
            cases = item.get('cases', item.get('percentage', 0) * 1000)
            longitude = item.get('longitude')
            latitude = item.get('latitude')
            
            if longitude and latitude:
                geo_data.append((province, cases))

        c = (
            Geo()
            .add_schema(maptype="china")
            .add(
                series_name="流感病例数",
                data_pair=geo_data,
                type_=ChartType.EFFECT_SCATTER,
                effect_opts=opts.EffectOpts(
                    scale=6,
                    period=3,
                    color="#FF0000"
                )
            )
            .set_series_opts(label_opts=opts.LabelOpts(is_show=False))
            .set_global_opts(
                title_opts=opts.TitleOpts(title=title, pos_left="center"),
                visualmap_opts=opts.VisualMapOpts(
                    min_=0,
                    max_=max([d[1] for d in geo_data], default=10000),
                    pos_left="left",
                    pos_bottom="center",
                ),
            )
        )

        output_path = os.path.join(self.output_dir, output_file)
        raw_html = c.render_embed()
        final_html = self._process_html_resources(raw_html)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
            
        print(f"Scatter map saved to {output_path}")
        return output_path

    def _process_html_resources(self, html: str) -> str:
        """仅替换资源路径，不做额外的地图注册逻辑"""
        
        # 1. 替换 echarts.min.js 路径
        html = re.sub(
            r'<script[^>]*src="[^"]*echarts[^"]*\.min\.js"[^>]*></script>',
            f'<script type="text/javascript" src="{ECHARTS_BASE_PATH}echarts.min.js"></script>',
            html
        )
        
        # 2. 替换 china.js 地图路径（pyecharts 会自动加载这个文件）
        html = re.sub(
            r'<script[^>]*src="[^"]*china[^"]*\.js"[^>]*></script>',
            f'<script type="text/javascript" src="{ECHARTS_BASE_PATH}china.js"></script>',
            html
        )
        
        # 3. 添加错误处理脚本
        error_handler_script = """
    <script>
        window.addEventListener('error', function(e) {
            if (e.target.tagName === 'SCRIPT' && e.target.src.indexOf('echarts') !== -1) {
                showMapError();
            }
        }, true);
        
        function showMapError() {
            var chartDiv = document.querySelector('div[id^="echarts"]');
            if (chartDiv && chartDiv.innerHTML.indexOf('地图资源') === -1) {
                chartDiv.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#f8f9fa;border-radius:8px;"><div style="font-size:48px;margin-bottom:20px;">⚠️</div><div style="font-size:18px;color:#666;">地图资源加载失败</div><div style="font-size:14px;color:#999;margin-top:10px;">请检查网络连接或刷新页面</div></div>';
            }
        }
        
        setTimeout(function() {
            if (typeof echarts === 'undefined') {
                showMapError();
            }
        }, 5000);
    </script>
        """
        
        html = html.replace('</body>', error_handler_script + '</body>')
        
        return html

    def create_timeline_heatmap(
        self,
        timeline_data: Dict[str, List[Dict]],
        title: str = "流感疫情时空演变",
        output_file: str = "flu_timeline.html"
    ) -> str:
        from pyecharts.charts import Timeline

        tl = Timeline()

        for date_str, data in sorted(timeline_data.items()):
            map_data = []
            for item in data:
                pyecharts_name = item.get('pyecharts_name')
                percentage = item.get('percentage', 0)
                if pyecharts_name:
                    map_data.append((pyecharts_name, percentage))

            c = (
                Map()
                .add(
                    series_name="流感样病例百分比(%)",
                    data_pair=map_data,
                    maptype="china",
                    is_map_symbol_show=False,
                )
                .set_global_opts(
                    title_opts=opts.TitleOpts(title=f"{title} - {date_str}"),
                    visualmap_opts=opts.VisualMapOpts(
                        min_=0,
                        max_=10,
                        is_piecewise=True,
                        pieces=[
                            {"min": 0, "max": 2, "label": "0-2%", "color": "#FFE6E6"},
                            {"min": 2, "max": 4, "label": "2-4%", "color": "#FFB3B3B"},
                            {"min": 4, "max": 6, "label": "4-6%", "color": "#FF8080"},
                            {"min": 6, "max": 8, "label": "6-8%", "color": "#FF4D4D"},
                            {"min": 8, "label": ">8%", "color": "#CC0000"},
                        ],
                    ),
                )
            )
            tl.add(c, date_str)

        output_path = os.path.join(self.output_dir, output_file)
        raw_html = tl.render_embed()
        final_html = self._process_html_resources(raw_html)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(final_html)
            
        print(f"Timeline map saved to {output_path}")
        return output_path
