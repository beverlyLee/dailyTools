package com.smartcampus.controller;

import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final Random random = new Random();

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("cameras", 128);
        stats.put("accessPoints", 56);
        stats.put("activeAlarms", random.nextInt(10));
        stats.put("totalEnergy", String.format("%.1f", 2400 + random.nextDouble() * 200));
        return stats;
    }

    @GetMapping("/alarms")
    public List<Map<String, Object>> getRecentAlarms() {
        List<Map<String, Object>> alarms = new ArrayList<>();
        
        String[] types = {"消防", "门禁", "视频", "入侵"};
        String[] locations = {"A栋1层", "北门", "停车场", "B栋3层", "C栋2层"};
        
        for (int i = 0; i < 5; i++) {
            Map<String, Object> alarm = new HashMap<>();
            alarm.put("type", types[random.nextInt(types.length)]);
            alarm.put("location", locations[random.nextInt(locations.length)]);
            alarm.put("time", String.format("%02d:%02d:%02d", 
                random.nextInt(24), random.nextInt(60), random.nextInt(60)));
            alarms.add(alarm);
        }
        
        return alarms;
    }

    @GetMapping("/map-markers")
    public List<Map<String, Object>> getMapMarkers() {
        List<Map<String, Object>> markers = new ArrayList<>();
        
        String[] types = {"camera", "access", "fire", "alarm"};
        String[] titles = {"摄像头 A", "摄像头 B", "门禁 北门", "门禁 南门", "消防栓 B1", "告警 消防"};
        
        for (int i = 0; i < 6; i++) {
            Map<String, Object> marker = new HashMap<>();
            marker.put("type", types[i % types.length]);
            marker.put("lng", 116.404 + (random.nextDouble() - 0.5) * 0.01);
            marker.put("lat", 39.915 + (random.nextDouble() - 0.5) * 0.01);
            marker.put("title", titles[i % titles.length]);
            markers.add(marker);
        }
        
        return markers;
    }
}
