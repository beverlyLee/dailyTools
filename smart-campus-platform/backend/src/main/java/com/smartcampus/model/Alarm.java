package com.smartcampus.model;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class Alarm {
    private String id;
    private String deviceId;
    private String deviceType;
    private String alarmType;
    private String alarmLevel;
    private String location;
    private String description;
    private LocalDateTime occurTime;
    private String status;
    private String handler;
    private LocalDateTime handleTime;
    private double longitude;
    private double latitude;
}
