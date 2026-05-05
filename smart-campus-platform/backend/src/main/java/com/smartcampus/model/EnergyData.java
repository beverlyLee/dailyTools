package com.smartcampus.model;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EnergyData {
    private String id;
    private String deviceId;
    private String energyType;
    private double value;
    private String unit;
    private LocalDateTime collectTime;
    private String period;
    private String building;
    private String floor;
    private String room;
}
