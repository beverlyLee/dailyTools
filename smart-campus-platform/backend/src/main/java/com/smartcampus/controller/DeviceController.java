package com.smartcampus.controller;

import com.smartcampus.netty.DeviceStatus;
import com.smartcampus.netty.IoTMessageHandler;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
@CrossOrigin(origins = "*")
public class DeviceController {

    @GetMapping
    public List<DeviceStatus> getAllDevices() {
        Map<String, DeviceStatus> deviceMap = IoTMessageHandler.getDeviceStatusMap();
        return new ArrayList<>(deviceMap.values());
    }

    @GetMapping("/{deviceId}")
    public DeviceStatus getDevice(@PathVariable String deviceId) {
        return IoTMessageHandler.getDeviceStatusMap().get(deviceId);
    }

    @GetMapping("/status")
    public DeviceStatusSummary getDeviceStatusSummary() {
        Map<String, DeviceStatus> deviceMap = IoTMessageHandler.getDeviceStatusMap();
        long onlineCount = deviceMap.values().stream().filter(DeviceStatus::isOnline).count();
        long offlineCount = deviceMap.size() - onlineCount;
        
        DeviceStatusSummary summary = new DeviceStatusSummary();
        summary.setTotal(deviceMap.size());
        summary.setOnline(onlineCount);
        summary.setOffline(offlineCount);
        
        return summary;
    }

    public static class DeviceStatusSummary {
        private long total;
        private long online;
        private long offline;

        public long getTotal() { return total; }
        public void setTotal(long total) { this.total = total; }
        public long getOnline() { return online; }
        public void setOnline(long online) { this.online = online; }
        public long getOffline() { return offline; }
        public void setOffline(long offline) { this.offline = offline; }
    }
}
