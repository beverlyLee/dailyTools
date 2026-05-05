package com.smartcampus.netty;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@ChannelHandler.Sharable
public class IoTMessageHandler extends SimpleChannelInboundHandler<String> {

    private static final ConcurrentHashMap<String, ChannelHandlerContext> deviceChannels = new ConcurrentHashMap<>();
    private static final ConcurrentHashMap<String, DeviceStatus> deviceStatusMap = new ConcurrentHashMap<>();

    @Autowired
    private MessageProcessor messageProcessor;

    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        log.info("设备连接: {}", ctx.channel().remoteAddress());
        super.channelActive(ctx);
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        String deviceId = getDeviceIdByChannel(ctx);
        if (deviceId != null) {
            deviceChannels.remove(deviceId);
            deviceStatusMap.remove(deviceId);
            log.info("设备断开连接: {}", deviceId);
        }
        log.info("连接断开: {}", ctx.channel().remoteAddress());
        super.channelInactive(ctx);
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) throws Exception {
        log.debug("收到消息: {} 来自: {}", msg, ctx.channel().remoteAddress());
        
        try {
            JSONObject jsonMsg = JSON.parseObject(msg);
            String deviceId = jsonMsg.getString("deviceId");
            String messageType = jsonMsg.getString("messageType");
            
            if (deviceId == null || messageType == null) {
                ctx.writeAndFlush(buildErrorResponse("Invalid message format"));
                return;
            }

            if (!deviceChannels.containsKey(deviceId)) {
                deviceChannels.put(deviceId, ctx);
                log.info("注册设备: {}", deviceId);
            }

            DeviceStatus status = deviceStatusMap.computeIfAbsent(deviceId, k -> new DeviceStatus(deviceId));
            status.setLastMessageTime(LocalDateTime.now());
            status.setOnline(true);

            ProcessResult result = messageProcessor.process(deviceId, messageType, jsonMsg);
            
            if (result.isSuccess()) {
                ctx.writeAndFlush(buildSuccessResponse(result.getData()));
            } else {
                ctx.writeAndFlush(buildErrorResponse(result.getMessage()));
            }

        } catch (Exception e) {
            log.error("消息处理异常", e);
            ctx.writeAndFlush(buildErrorResponse("Internal server error"));
        }
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        log.error("连接异常: {}", ctx.channel().remoteAddress(), cause);
        ctx.close();
    }

    private String getDeviceIdByChannel(ChannelHandlerContext ctx) {
        for (var entry : deviceChannels.entrySet()) {
            if (entry.getValue().equals(ctx)) {
                return entry.getKey();
            }
        }
        return null;
    }

    private String buildSuccessResponse(Object data) {
        JSONObject response = new JSONObject();
        response.put("code", 200);
        response.put("message", "success");
        response.put("data", data);
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return response.toJSONString();
    }

    private String buildErrorResponse(String message) {
        JSONObject response = new JSONObject();
        response.put("code", 500);
        response.put("message", message);
        response.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        return response.toJSONString();
    }

    public static ConcurrentHashMap<String, DeviceStatus> getDeviceStatusMap() {
        return deviceStatusMap;
    }

    public static ConcurrentHashMap<String, ChannelHandlerContext> getDeviceChannels() {
        return deviceChannels;
    }
}
