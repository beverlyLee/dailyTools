package com.smartcampus.netty;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeviceStatus {
    private String deviceId;
    private String deviceType;
    private boolean online;
    private LocalDateTime lastMessageTime;
    private LocalDateTime registerTime;
    private double longitude;
    private double latitude;
    private String location;

    public DeviceStatus(String deviceId) {
        this.deviceId = deviceId;
        this.registerTime = LocalDateTime.now();
        this.online = true;
    }
}
