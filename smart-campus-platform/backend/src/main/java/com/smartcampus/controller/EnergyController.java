package com.smartcampus.controller;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/energy")
@CrossOrigin(origins = "*")
public class EnergyController {

    private final Random random = new Random();

    @GetMapping("/overview")
    public Map<String, Object> getOverview(
            @RequestParam(required = false, defaultValue = "day") String timeRange) {
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("electricity", Map.of(
                "value", "2,458.5",
                "unit", "kWh",
                "trend", "down",
                "change", "-12.5%"
        ));
        stats.put("water", Map.of(
                "value", "156.8",
                "unit", "m³",
                "trend", "down",
                "change", "-8.3%"
        ));
        stats.put("gas", Map.of(
                "value", "89.2",
                "unit", "m³",
                "trend", "up",
                "change", "+5.2%"
        ));
        stats.put("cost", Map.of(
                "value", "3,256.8",
                "unit", "",
                "trend", "down",
                "change", "-10.1%"
        ));

        List<Map<String, Object>> pieData = Arrays.asList(
                Map.of("name", "用电", "value", 2458, "percent", "65%", "itemStyle", Map.of("color", "#409EFF")),
                Map.of("name", "用水", "value", 560, "percent", "15%", "itemStyle", Map.of("color", "#67C23A")),
                Map.of("name", "用气", "value", 450, "percent", "12%", "itemStyle", Map.of("color", "#E6A23C")),
                Map.of("name", "其他", "value", 320, "percent", "8%", "itemStyle", Map.of("color", "#909399"))
        );

        Map<String, Object> response = new HashMap<>();
        response.put("stats", stats);
        response.put("pieData", pieData);
        return response;
    }

    @GetMapping("/trend")
    public Map<String, Object> getTrend(
            @RequestParam(required = false, defaultValue = "day") String timeRange) {
        
        List<String> xAxisData;
        List<Integer> electricityData;
        List<Integer> waterData;
        List<Integer> gasData;

        if ("day".equals(timeRange)) {
            xAxisData = Arrays.asList("00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00");
            electricityData = Arrays.asList(120, 80, 250, 320, 280, 300, 180);
            waterData = Arrays.asList(20, 15, 35, 45, 38, 42, 25);
            gasData = Arrays.asList(10, 8, 15, 25, 20, 18, 12);
        } else if ("week".equals(timeRange)) {
            xAxisData = Arrays.asList("周一", "周二", "周三", "周四", "周五", "周六", "周日");
            electricityData = Arrays.asList(2400, 2350, 2520, 2480, 2390, 1560, 1200);
            waterData = Arrays.asList(156, 148, 162, 155, 149, 98, 78);
            gasData = Arrays.asList(89, 85, 92, 88, 86, 56, 48);
        } else {
            xAxisData = Arrays.asList("1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月");
            electricityData = Arrays.asList(65000, 58000, 62000, 59000, 68000, 72000, 85000, 82000, 75000, 68000, 65000, 70000);
            waterData = Arrays.asList(4200, 3800, 4100, 3900, 4500, 4800, 5200, 5000, 4600, 4300, 4100, 4400);
            gasData = Arrays.asList(2500, 2300, 2400, 2350, 2600, 2800, 2900, 2850, 2700, 2500, 2400, 2600);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("xAxis", xAxisData);
        response.put("electricity", electricityData);
        response.put("water", waterData);
        response.put("gas", gasData);
        return response;
    }

    @GetMapping("/building")
    public List<Map<String, Object>> getBuildingStats(
            @RequestParam(required = false) String building,
            @RequestParam(required = false) String energyType) {
        
        return Arrays.asList(
                createBuildingData("A栋", 856.2, 45.6, 28.5, 1256.5, "down", "up", "down"),
                createBuildingData("B栋", 752.8, 38.2, 25.3, 1089.3, "up", "down", "up"),
                createBuildingData("C栋", 542.6, 32.5, 18.9, 785.2, "down", "down", "down")
        );
    }

    private Map<String, Object> createBuildingData(String building, double electricity, double water, double gas, double cost,
                                                     String elecTrend, String waterTrend, String gasTrend) {
        Map<String, Object> data = new HashMap<>();
        data.put("building", building);
        data.put("electricity", Map.of(
                "value", String.format("%.1f", electricity),
                "trend", elecTrend,
                "change", String.format("%.1f%%", random.nextDouble() * 10)
        ));
        data.put("water", Map.of(
                "value", String.format("%.1f", water),
                "trend", waterTrend,
                "change", String.format("%.1f%%", random.nextDouble() * 8)
        ));
        data.put("gas", Map.of(
                "value", String.format("%.1f", gas),
                "trend", gasTrend,
                "change", String.format("%.1f%%", random.nextDouble() * 6)
        ));
        data.put("cost", cost);
        return data;
    }

    @GetMapping("/peak-valley")
    public Map<String, Object> getPeakValleyAnalysis(
            @RequestParam(required = false, defaultValue = "day") String timeRange) {
        
        Map<String, Object> peakValleyConfig = Map.of(
                "peak", Map.of(
                        "startTime", "08:00",
                        "endTime", "22:00",
                        "price", 0.95,
                        "color", "#F56C6C"
                ),
                "valley", Map.of(
                        "startTime", "22:00",
                        "endTime", "08:00",
                        "price", 0.35,
                        "color", "#67C23A"
                )
        );

        List<String> hours = new ArrayList<>();
        List<Integer> usage = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            hours.add(String.format("%02d:00", i));
            if (i >= 8 && i <= 12) {
                usage.add(280 + random.nextInt(50));
            } else if (i >= 14 && i <= 18) {
                usage.add(320 + random.nextInt(40));
            } else if (i >= 19 && i <= 21) {
                usage.add(250 + random.nextInt(30));
            } else if (i >= 22 || i < 6) {
                usage.add(80 + random.nextInt(20));
            } else {
                usage.add(150 + random.nextInt(30));
            }
        }

        Map<String, Object> statistics = Map.of(
                "peak", Map.of("usage", 3856.5, "cost", 3663.68, "percent", 72),
                "valley", Map.of("usage", 1498.2, "cost", 524.37, "percent", 28),
                "total", Map.of("usage", 5354.7, "cost", 4188.05)
        );

        List<Map<String, Object>> analysisTable = Arrays.asList(
                Map.of(
                        "timeSlot", "早高峰 (08:00-12:00)",
                        "avgUsage", "295.6 kWh/h",
                        "recommendation", "考虑将部分生产任务移至谷时段",
                        "savingPotential", "约 15% 电费节省"
                ),
                Map.of(
                        "timeSlot", "午高峰 (14:00-18:00)",
                        "avgUsage", "335.2 kWh/h",
                        "recommendation", "可考虑启用备用电源减负",
                        "savingPotential", "约 10% 电费节省"
                ),
                Map.of(
                        "timeSlot", "谷时段 (22:00-08:00)",
                        "avgUsage", "85.3 kWh/h",
                        "recommendation", "建议安排非紧急任务在此时段",
                        "savingPotential", "优化空间大"
                )
        );

        Map<String, Object> response = new HashMap<>();
        response.put("config", peakValleyConfig);
        response.put("hours", hours);
        response.put("usage", usage);
        response.put("statistics", statistics);
        response.put("analysisTable", analysisTable);
        return response;
    }

    @GetMapping("/ranking")
    public Map<String, Object> getRanking(
            @RequestParam(required = false, defaultValue = "today") String period) {
        
        List<Map<String, Object>> ranking = new ArrayList<>();
        
        String[] buildings = {"A栋", "B栋", "C栋", "D栋", "E栋", "F栋", "G栋"};
        String[] trends = {"up", "down", "stable"};
        
        for (int i = 0; i < buildings.length; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("rank", i + 1);
            item.put("building", buildings[i]);
            item.put("electricity", 850.0 - i * 80 + random.nextInt(50));
            item.put("water", 45.0 - i * 4.5 + random.nextInt(10));
            item.put("gas", 28.0 - i * 2.8 + random.nextInt(5));
            item.put("cost", 1250.0 - i * 120 + random.nextInt(50));
            item.put("trend", trends[random.nextInt(trends.length)]);
            item.put("change", String.format("%.1f%%", (random.nextDouble() - 0.5) * 20));
            ranking.add(item);
        }

        List<Map<String, Object>> comparison = Arrays.asList(
                Map.of("building", "A栋", "electricity", 856.2, "water", 45.6, "gas", 28.5, "cost", 1256.5),
                Map.of("building", "B栋", "electricity", 752.8, "water", 38.2, "gas", 25.3, "cost", 1089.3),
                Map.of("building", "C栋", "electricity", 542.6, "water", 32.5, "gas", 18.9, "cost", 785.2),
                Map.of("building", "D栋", "electricity", 420.5, "water", 28.3, "gas", 15.2, "cost", 586.8),
                Map.of("building", "E栋", "electricity", 385.2, "water", 22.8, "gas", 12.5, "cost", 498.5)
        );

        Map<String, Object> response = new HashMap<>();
        response.put("period", period);
        response.put("ranking", ranking);
        response.put("comparison", comparison);
        return response;
    }

    @GetMapping("/optimization")
    public Map<String, Object> getOptimizationReport(
            @RequestParam(required = false, defaultValue = "month") String period) {
        
        Map<String, Object> overview = Map.of(
                "totalElectricity", "125,680.5 kWh",
                "totalCost", "¥ 98,560.00",
                "optimizationSpace", "¥ 15,680.00",
                "estimatedSaving", "¥ 12,500.00"
        );

        List<Map<String, Object>> suggestions = Arrays.asList(
                Map.of(
                        "id", "OPT001",
                        "priority", "high",
                        "title", "空调系统优化",
                        "description", "调整空调温度设置和运行时间",
                        "problemAnalysis", "当前空调在非工作时段仍保持较高运行负荷，造成能源浪费",
                        "implementationSteps", Arrays.asList(
                                "1. 安装智能温控系统",
                                "2. 设置工作时段温度 24-26°C",
                                "3. 非工作时段自动调整至节能模式"
                        ),
                        "expectedEffect", Map.of(
                                "energySaving", "约 18%",
                                "costSaving", "¥ 8,500/月",
                                "paybackPeriod", "6个月"
                        )
                ),
                Map.of(
                        "id", "OPT002",
                        "priority", "medium",
                        "title", "照明系统升级",
                        "description", "更换为 LED 节能灯并加装人体感应",
                        "problemAnalysis", "部分区域使用传统荧光灯，能耗高且寿命短",
                        "implementationSteps", Arrays.asList(
                                "1. 统计需更换灯具数量",
                                "2. 采购优质 LED 灯具",
                                "3. 分批次更换并加装感应开关"
                        ),
                        "expectedEffect", Map.of(
                                "energySaving", "约 40%",
                                "costSaving", "¥ 2,800/月",
                                "paybackPeriod", "12个月"
                        )
                ),
                Map.of(
                        "id", "OPT003",
                        "priority", "low",
                        "title", "设备使用时间优化",
                        "description", "将高能耗设备调整至谷时段运行",
                        "problemAnalysis", "部分设备在峰时段运行，电费成本较高",
                        "implementationSteps", Arrays.asList(
                                "1. 分析设备运行时段需求",
                                "2. 制定错峰运行时间表",
                                "3. 定期评估执行效果"
                        ),
                        "expectedEffect", Map.of(
                                "energySaving", "约 5%",
                                "costSaving", "¥ 1,200/月",
                                "paybackPeriod", "3个月"
                        )
                )
        );

        Map<String, Object> comparison = Map.of(
                "current", Arrays.asList(12500, 11800, 12200, 13100, 12800),
                "optimized", Arrays.asList(10000, 9440, 9760, 10480, 10240)
        );

        Map<String, Object> response = new HashMap<>();
        response.put("overview", overview);
        response.put("suggestions", suggestions);
        response.put("comparison", comparison);
        return response;
    }

    @GetMapping("/optimization/history")
    public List<Map<String, Object>> getOptimizationHistory() {
        return Arrays.asList(
                Map.of(
                        "date", "2024-01-15",
                        "title", "A栋空调系统优化完成",
                        "status", "completed",
                        "result", "节能 18%，月省 ¥8,500"
                ),
                Map.of(
                        "date", "2024-01-10",
                        "title", "地下停车场照明改造",
                        "status", "completed",
                        "result", "节能 45%，月省 ¥2,200"
                ),
                Map.of(
                        "date", "2024-01-05",
                        "title", "设备错峰运行方案实施",
                        "status", "in_progress",
                        "result", "预计节能 8%"
                ),
                Map.of(
                        "date", "2023-12-28",
                        "title", "B栋光伏系统安装",
                        "status", "completed",
                        "result": "月发电 5,000 kWh"
                )
        );
    }
}
