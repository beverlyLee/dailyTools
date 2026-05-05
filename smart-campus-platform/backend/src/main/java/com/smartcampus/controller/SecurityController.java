package com.smartcampus.controller;

import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/security")
@CrossOrigin(origins = "*")
public class SecurityController {

    private final Random random = new Random();
    
    private static final List<Map<String, Object>> cameras = Arrays.asList(
            Map.of("id", "CAM001", "name", "摄像头 A1-大厅", "location", "A栋1层大厅", "status", "online", "type", "球机"),
            Map.of("id", "CAM002", "name", "摄像头 A2-走廊", "location", "A栋2层走廊", "status", "online", "type", "枪机"),
            Map.of("id", "CAM003", "name", "摄像头 B1-停车场", "location", "B栋停车场", "status", "online", "type", "球机"),
            Map.of("id", "CAM004", "name", "摄像头 C1-大门", "location", "园区大门", "status", "offline", "type", "枪机"),
            Map.of("id", "CAM005", "name", "摄像头 D1-仓库", "location", "仓库区域", "status", "online", "type", "球机")
    );

    private static final List<Map<String, Object>> accessDevices = Arrays.asList(
            Map.of("id", "ACC001", "name", "北门门禁", "location", "北门", "status", "online", "todayCount", 156),
            Map.of("id", "ACC002", "name", "南门门禁", "location", "南门", "status", "online", "todayCount", 89),
            Map.of("id", "ACC003", "name", "A栋门禁", "location", "A栋大厅", "status", "online", "todayCount", 234),
            Map.of("id", "ACC004", "name", "B栋门禁", "location", "B栋大厅", "status", "offline", "todayCount", 0),
            Map.of("id", "ACC005", "name", "停车场门禁", "location", "停车场入口", "status", "online", "todayCount", 67)
    );

    private static final List<Map<String, Object>> fireDevices = Arrays.asList(
            Map.of("id", "FR001", "name", "烟感探测器 A1", "location", "A栋1层", "status", "online", "deviceType", "smoke"),
            Map.of("id", "FR002", "name", "烟感探测器 A2", "location", "A栋2层", "status", "online", "deviceType", "smoke"),
            Map.of("id", "FR003", "name", "喷淋系统 B1", "location", "B栋1层", "status", "online", "deviceType", "sprinkler"),
            Map.of("id", "FR004", "name", "消防栓 北门", "location", "北门", "status", "online", "deviceType", "hydrant"),
            Map.of("id", "FR005", "name", "烟感探测器 C1", "location", "C栋1层", "status", "offline", "deviceType", "smoke")
    );

    private final List<Map<String, Object>> alarms = new ArrayList<>(Arrays.asList(
            createAlarm("ALM001", "fire", "high", "A栋1层", "烟感报警", "pending"),
            createAlarm("ALM002", "access", "medium", "北门", "非法刷卡", "pending"),
            createAlarm("ALM003", "camera", "low", "停车场", "移动侦测", "handled"),
            createAlarm("ALM004", "fire", "high", "B栋3层", "温度异常", "pending")
    ));

    private static Map<String, Object> createAlarm(String id, String type, String level, String location, String desc, String status) {
        Map<String, Object> alarm = new HashMap<>();
        alarm.put("id", id);
        alarm.put("alarmType", type);
        alarm.put("alarmLevel", level);
        alarm.put("location", location);
        alarm.put("description", desc);
        alarm.put("status", status);
        alarm.put("occurTime", LocalDateTime.now().minusMinutes(random.nextInt(60)).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        alarm.put("handler", status.equals("handled") ? "张三" : null);
        alarm.put("handleTime", status.equals("handled") ? LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null);
        alarm.put("handleRecords", new ArrayList<>());
        return alarm;
    }

    @GetMapping("/cameras")
    public List<Map<String, Object>> getCameras() {
        return cameras;
    }

    @GetMapping("/cameras/{id}")
    public Map<String, Object> getCameraById(@PathVariable String id) {
        return cameras.stream()
                .filter(c -> c.get("id").equals(id))
                .findFirst()
                .orElse(null);
    }

    @GetMapping("/access")
    public List<Map<String, Object>> getAccessDevices() {
        return accessDevices;
    }

    @GetMapping("/access/records")
    public Map<String, Object> getAccessRecords(
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) String accessType,
            @RequestParam(required = false) String result,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        List<Map<String, Object>> records = generateAccessRecords();
        
        Map<String, Object> response = new HashMap<>();
        response.put("total", records.size());
        response.put("page", page);
        response.put("size", size);
        response.put("list", records);
        return response;
    }

    private List<Map<String, Object>> generateAccessRecords() {
        List<Map<String, Object>> records = new ArrayList<>();
        String[] names = {"张三", "李四", "王五", "赵六", "钱七", "孙八"};
        String[] devices = {"北门门禁", "南门门禁", "A栋门禁", "停车场门禁"};
        String[] types = {"刷卡", "人脸识别", "指纹", "密码"};
        String[] results = {"成功", "失败"};
        
        for (int i = 0; i < 20; i++) {
            Map<String, Object> record = new HashMap<>();
            record.put("id", "REC" + String.format("%04d", i + 1));
            record.put("deviceName", devices[random.nextInt(devices.length)]);
            record.put("personName", names[random.nextInt(names.length)]);
            record.put("accessType", types[random.nextInt(types.length)]);
            record.put("result", results[random.nextInt(results.length)]);
            record.put("time", LocalDateTime.now().minusMinutes(random.nextInt(1440)).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
            records.add(record);
        }
        return records;
    }

    @PostMapping("/access/{deviceId}/open")
    public Map<String, Object> openDoor(@PathVariable String deviceId) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "开门指令已发送");
        response.put("deviceId", deviceId);
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return response;
    }

    @GetMapping("/fire")
    public List<Map<String, Object>> getFireDevices() {
        return fireDevices;
    }

    @GetMapping("/fire/alarms")
    public List<Map<String, Object>> getFireAlarms() {
        return alarms.stream()
                .filter(a -> "fire".equals(a.get("alarmType")))
                .toList();
    }

    @GetMapping("/alarms")
    public Map<String, Object> getAlarms(
            @RequestParam(required = false) String alarmType,
            @RequestParam(required = false) String alarmLevel,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime) {
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", alarms.size());
        stats.put("pending", alarms.stream().filter(a -> "pending".equals(a.get("status"))).count());
        stats.put("handled", alarms.stream().filter(a -> "handled".equals(a.get("status"))).count());
        stats.put("falseAlarm", alarms.stream().filter(a -> "false".equals(a.get("status"))).count());

        Map<String, Object> response = new HashMap<>();
        response.put("stats", stats);
        response.put("list", alarms);
        return response;
    }

    @GetMapping("/alarms/{id}")
    public Map<String, Object> getAlarmById(@PathVariable String id) {
        return alarms.stream()
                .filter(a -> id.equals(a.get("id")))
                .findFirst()
                .map(alarm -> {
                    List<Map<String, Object>> records = new ArrayList<>();
                    if ("handled".equals(alarm.get("status"))) {
                        records.add(Map.of(
                                "time", LocalDateTime.now().minusMinutes(30).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                "operator", "张三",
                                "action", "开始处置",
                                "remark", "前往现场查看"
                        ));
                        records.add(Map.of(
                                "time", LocalDateTime.now().minusMinutes(10).format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                                "operator", "张三",
                                "action", "完成处置",
                                "remark", "已确认误报"
                        ));
                    }
                    Map<String, Object> result = new HashMap<>(alarm);
                    result.put("handleRecords", records);
                    return result;
                })
                .orElse(null);
    }

    @PutMapping("/alarms/{id}/handle")
    public Map<String, Object> handleAlarm(@PathVariable String id, @RequestBody Map<String, String> data) {
        return alarms.stream()
                .filter(a -> id.equals(a.get("id")))
                .findFirst()
                .map(alarm -> {
                    String action = data.get("action");
                    if ("start".equals(action)) {
                        alarm.put("handler", data.get("handler"));
                    } else if ("complete".equals(action)) {
                        alarm.put("status", "handled");
                        alarm.put("handleTime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    }
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("message", "操作成功");
                    response.put("alarm", alarm);
                    return response;
                })
                .orElse(Map.of("success", false, "message", "告警不存在"));
    }

    @PutMapping("/alarms/{id}/false")
    public Map<String, Object> markFalseAlarm(@PathVariable String id) {
        return alarms.stream()
                .filter(a -> id.equals(a.get("id")))
                .findFirst()
                .map(alarm -> {
                    alarm.put("status", "false");
                    alarm.put("handleTime", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
                    
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    response.put("message", "已标记为误报");
                    response.put("alarm", alarm);
                    return response;
                })
                .orElse(Map.of("success", false, "message", "告警不存在"));
    }
}
