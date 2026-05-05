package com.smartcontract.esignature.controller;

import com.smartcontract.esignature.dto.ReminderDTO;
import com.smartcontract.esignature.service.ReminderService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reminder")
@Api(tags = "履约提醒 API")
public class ReminderController {

    private static final Logger logger = LoggerFactory.getLogger(ReminderController.class);

    @Autowired
    private ReminderService reminderService;

    @PostMapping("/create")
    @ApiOperation(value = "创建提醒", notes = "创建新的履约提醒")
    public ResponseEntity<Map<String, Object>> createReminder(
            @ApiParam(value = "提醒请求", required = true)
            @Valid @RequestBody ReminderDTO dto) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("创建提醒，合同ID: {}", dto.getContractId());

            // 验证必要字段
            if (dto.getReminderTitle() == null || dto.getReminderTitle().trim().isEmpty()) {
                throw new IllegalArgumentException("提醒标题不能为空");
            }
            if (dto.getReminderDate() == null) {
                throw new IllegalArgumentException("提醒日期不能为空");
            }

            reminderService.createReminder(dto);

            response.put("success", true);
            response.put("message", "提醒创建成功");

            logger.info("提醒创建成功");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("创建提醒失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "创建提醒失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/upcoming")
    @ApiOperation(value = "获取即将到来的提醒", notes = "获取指定天数内即将到来的提醒")
    public ResponseEntity<Map<String, Object>> getUpcomingReminders(
            @ApiParam(value = "提前天数，默认7天")
            @RequestParam(required = false, defaultValue = "7") Integer daysAhead) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("获取即将到来的提醒，提前天数: {}", daysAhead);

            List<ReminderDTO> reminders = reminderService.getUpcomingReminders(daysAhead);

            response.put("success", true);
            response.put("message", "获取成功");
            response.put("data", reminders);
            response.put("total", reminders.size());

            logger.info("获取到 {} 条即将到来的提醒", reminders.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("获取即将到来的提醒失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "获取即将到来的提醒失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/contract/{contractId}")
    @ApiOperation(value = "获取合同的提醒记录", notes = "获取指定合同的所有提醒记录")
    public ResponseEntity<Map<String, Object>> getRemindersByContract(
            @ApiParam(value = "合同ID", required = true)
            @PathVariable Long contractId) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("获取合同的提醒记录，合同ID: {}", contractId);

            List<ReminderDTO> reminders = reminderService.getRemindersByContract(contractId);

            response.put("success", true);
            response.put("message", "获取成功");
            response.put("data", reminders);
            response.put("total", reminders.size());

            logger.info("获取到 {} 条提醒记录", reminders.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("获取合同的提醒记录失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "获取合同的提醒记录失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/status/{reminderId}")
    @ApiOperation(value = "更新提醒状态", notes = "更新提醒的状态")
    public ResponseEntity<Map<String, Object>> updateReminderStatus(
            @ApiParam(value = "提醒ID", required = true)
            @PathVariable Long reminderId,
            @ApiParam(value = "新状态", required = true)
            @RequestParam String status) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("更新提醒状态，ID: {}, 状态: {}", reminderId, status);

            reminderService.updateReminderStatus(reminderId, status);

            response.put("success", true);
            response.put("message", "提醒状态更新成功");

            logger.info("提醒状态更新成功，ID: {}", reminderId);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("更新提醒状态失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "更新提醒状态失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{reminderId}")
    @ApiOperation(value = "删除提醒", notes = "删除指定的提醒记录")
    public ResponseEntity<Map<String, Object>> deleteReminder(
            @ApiParam(value = "提醒ID", required = true)
            @PathVariable Long reminderId) {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("删除提醒，ID: {}", reminderId);

            reminderService.deleteReminder(reminderId);

            response.put("success", true);
            response.put("message", "提醒删除成功");

            logger.info("提醒删除成功，ID: {}", reminderId);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            logger.error("参数错误: {}", e.getMessage());
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            logger.error("删除提醒失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "删除提醒失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/trigger")
    @ApiOperation(value = "手动触发提醒发送", notes = "手动触发定时提醒发送（用于测试）")
    public ResponseEntity<Map<String, Object>> triggerReminders() {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("手动触发提醒发送");

            reminderService.sendScheduledReminders();

            response.put("success", true);
            response.put("message", "提醒发送触发成功");

            logger.info("提醒发送触发成功");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("触发提醒发送失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "触发提醒发送失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/types")
    @ApiOperation(value = "获取提醒类型列表", notes = "获取所有可用的提醒类型")
    public ResponseEntity<Map<String, Object>> getReminderTypes() {

        Map<String, Object> response = new HashMap<>();

        try {
            logger.info("获取提醒类型列表");

            Map<String, String> types = new HashMap<>();
            types.put("CONTRACT_EXPIRATION", "合同到期提醒");
            types.put("PAYMENT_DUE", "付款到期提醒");
            types.put("PERFORMANCE_NODE", "履约节点提醒");
            types.put("RENEWAL_REMINDER", "续约提醒");

            response.put("success", true);
            response.put("message", "获取成功");
            response.put("data", types);

            logger.info("获取到 {} 种提醒类型", types.size());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("获取提醒类型列表失败: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "获取提醒类型列表失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/health")
    @ApiOperation(value = "健康检查", notes = "检查服务是否正常运行")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "履约提醒服务正常运行");
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}
