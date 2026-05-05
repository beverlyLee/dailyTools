package com.smartcampus.netty;

import com.alibaba.fastjson.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
public class MessageProcessor {

    public ProcessResult process(String deviceId, String messageType, JSONObject data) {
        log.info("处理消息 - deviceId: {}, messageType: {}", deviceId, messageType);

        switch (messageType) {
            case "REGISTER":
                return handleRegister(deviceId, data);
            case "HEARTBEAT":
                return handleHeartbeat(deviceId, data);
            case "ALARM":
                return handleAlarm(deviceId, data);
            case "DATA":
                return handleData(deviceId, data);
            case "COMMAND_RESPONSE":
                return handleCommandResponse(deviceId, data);
            default:
                log.warn("未知消息类型: {}", messageType);
                return ProcessResult.error("Unknown message type: " + messageType);
        }
    }

    private ProcessResult handleRegister(String deviceId, JSONObject data) {
        DeviceStatus status = IoTMessageHandler.getDeviceStatusMap().get(deviceId);
        if (status != null) {
            status.setDeviceType(data.getString("deviceType"));
            status.setLongitude(data.getDoubleValue("longitude"));
            status.setLatitude(data.getDoubleValue("latitude"));
            status.setLocation(data.getString("location"));
            log.info("设备注册成功: {}", deviceId);
        }
        return ProcessResult.success();
    }

    private ProcessResult handleHeartbeat(String deviceId, JSONObject data) {
        log.debug("设备心跳: {}", deviceId);
        Map<String, Object> response = new HashMap<>();
        response.put("serverTime", System.currentTimeMillis());
        return ProcessResult.success(response);
    }

    private ProcessResult handleAlarm(String deviceId, JSONObject data) {
        log.warn("收到告警 - 设备: {}, 告警类型: {}, 级别: {}",
                deviceId,
                data.getString("alarmType"),
                data.getString("alarmLevel"));
        
        return ProcessResult.success();
    }

    private ProcessResult handleData(String deviceId, JSONObject data) {
        log.debug("收到设备数据 - deviceId: {}, data: {}", deviceId, data.toJSONString());
        return ProcessResult.success();
    }

    private ProcessResult handleCommandResponse(String deviceId, JSONObject data) {
        log.info("收到命令响应 - deviceId: {}, command: {}",
                deviceId,
                data.getString("command"));
        return ProcessResult.success();
    }
}
