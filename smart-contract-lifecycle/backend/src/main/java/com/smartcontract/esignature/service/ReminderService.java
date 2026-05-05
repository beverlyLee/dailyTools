package com.smartcontract.esignature.service;

import com.smartcontract.entity.Contract;
import com.smartcontract.entity.ContractReminder;
import com.smartcontract.esignature.dto.ReminderDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.transaction.Transactional;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ReminderService {

    private static final Logger logger = LoggerFactory.getLogger(ReminderService.class);

    @PersistenceContext
    private EntityManager entityManager;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy年MM月dd日");

    @Transactional
    public ContractReminder createReminder(ReminderDTO dto) {
        logger.info("创建提醒，合同ID: {}, 类型: {}", dto.getContractId(), dto.getReminderType());

        // 1. 验证合同是否存在
        Contract contract = null;
        if (dto.getContractId() != null) {
            contract = entityManager.find(Contract.class, dto.getContractId());
            if (contract == null) {
                throw new IllegalArgumentException("合同不存在，ID: " + dto.getContractId());
            }
        }

        // 2. 创建提醒记录
        ContractReminder reminder = new ContractReminder();
        reminder.setContract(contract);
        reminder.setReminderTitle(dto.getReminderTitle());
        reminder.setReminderContent(dto.getReminderContent());
        reminder.setReminderDate(dto.getReminderDate());
        reminder.setAdvanceDays(dto.getAdvanceDays() != null ? dto.getAdvanceDays() : 7);
        reminder.setRecipientName(dto.getRecipientName());
        reminder.setRecipientEmail(dto.getRecipientEmail());
        reminder.setRecipientPhone(dto.getRecipientPhone());

        // 3. 设置提醒类型
        if (dto.getReminderType() != null) {
            try {
                reminder.setReminderType(ContractReminder.ReminderType.valueOf(dto.getReminderType()));
            } catch (IllegalArgumentException e) {
                reminder.setReminderType(ContractReminder.ReminderType.CONTRACT_EXPIRATION);
            }
        } else {
            reminder.setReminderType(ContractReminder.ReminderType.CONTRACT_EXPIRATION);
        }

        // 4. 设置通知渠道
        if (dto.getNotificationChannels() != null && !dto.getNotificationChannels().isEmpty()) {
            reminder.setNotificationChannels(String.join(",", dto.getNotificationChannels()));
        }

        // 5. 保存提醒记录
        entityManager.persist(reminder);

        logger.info("提醒已创建，ID: {}", reminder.getId());
        return reminder;
    }

    @Transactional
    public void autoCreateRemindersForContract(Contract contract) {
        logger.info("为合同自动创建提醒，合同ID: {}", contract.getId());

        // 1. 创建到期提醒
        if (contract.getEndDate() != null) {
            ReminderDTO expirationReminder = new ReminderDTO();
            expirationReminder.setContractId(contract.getId());
            expirationReminder.setReminderType("CONTRACT_EXPIRATION");
            expirationReminder.setReminderTitle("合同到期提醒：" + contract.getTitle());
            expirationReminder.setReminderContent(
                String.format("您的合同 \"%s\" 将于 %s 到期，请及时处理续约或终止事宜。",
                    contract.getTitle(),
                    contract.getEndDate().format(DATE_FORMATTER)
                )
            );
            expirationReminder.setReminderDate(contract.getEndDate());
            expirationReminder.setAdvanceDays(7);
            expirationReminder.setRecipientName(contract.getPartyA());

            createReminder(expirationReminder);
        }

        // 2. 创建续约提醒（在到期前30天）
        if (contract.getEndDate() != null) {
            LocalDate renewalDate = contract.getEndDate().minusDays(30);
            if (renewalDate.isAfter(LocalDate.now())) {
                ReminderDTO renewalReminder = new ReminderDTO();
                renewalReminder.setContractId(contract.getId());
                renewalReminder.setReminderType("RENEWAL_REMINDER");
                renewalReminder.setReminderTitle("合同续约提醒：" + contract.getTitle());
                renewalReminder.setReminderContent(
                    String.format("您的合同 \"%s\" 将于 %s 到期，建议提前30天开始续约谈判。",
                        contract.getTitle(),
                        contract.getEndDate().format(DATE_FORMATTER)
                    )
                );
                renewalReminder.setReminderDate(renewalDate);
                renewalReminder.setAdvanceDays(0);
                renewalReminder.setRecipientName(contract.getPartyA());

                createReminder(renewalReminder);
            }
        }

        logger.info("合同提醒创建完成，合同ID: {}", contract.getId());
    }

    public List<ReminderDTO> getUpcomingReminders(Integer daysAhead) {
        logger.info("获取即将到来的提醒，提前天数: {}", daysAhead);

        LocalDate targetDate = LocalDate.now().plusDays(daysAhead != null ? daysAhead : 7);

        String jpql = "SELECT r FROM ContractReminder r " +
            "WHERE r.reminderDate <= :targetDate " +
            "AND r.status IN ('PENDING', 'SCHEDULED') " +
            "ORDER BY r.reminderDate ASC";

        List<ContractReminder> reminders = entityManager.createQuery(jpql, ContractReminder.class)
            .setParameter("targetDate", targetDate)
            .getResultList();

        return convertToDTOs(reminders);
    }

    public List<ReminderDTO> getRemindersByContract(Long contractId) {
        logger.info("获取合同的提醒记录，合同ID: {}", contractId);

        String jpql = "SELECT r FROM ContractReminder r " +
            "WHERE r.contract.id = :contractId " +
            "ORDER BY r.reminderDate DESC";

        List<ContractReminder> reminders = entityManager.createQuery(jpql, ContractReminder.class)
            .setParameter("contractId", contractId)
            .getResultList();

        return convertToDTOs(reminders);
    }

    @Transactional
    @Scheduled(cron = "0 0 9 * * ?") // 每天早上9点执行
    public void sendScheduledReminders() {
        logger.info("开始发送定时提醒");

        LocalDate today = LocalDate.now();

        // 1. 获取今天需要发送的提醒
        String jpql = "SELECT r FROM ContractReminder r " +
            "WHERE r.reminderDate = :today " +
            "AND r.status = 'SCHEDULED'";

        List<ContractReminder> reminders = entityManager.createQuery(jpql, ContractReminder.class)
            .setParameter("today", today)
            .getResultList();

        // 2. 发送提醒
        for (ContractReminder reminder : reminders) {
            try {
                sendReminder(reminder);
                reminder.setStatus(ContractReminder.ReminderStatus.SENT);
                entityManager.merge(reminder);
                logger.info("提醒已发送，ID: {}", reminder.getId());
            } catch (Exception e) {
                logger.error("发送提醒失败，ID: {}", reminder.getId(), e);
                reminder.setStatus(ContractReminder.ReminderStatus.FAILED);
                entityManager.merge(reminder);
            }
        }

        logger.info("定时提醒发送完成，共处理 {} 条", reminders.size());
    }

    @Transactional
    @Scheduled(cron = "0 0 8 * * ?") // 每天早上8点执行，准备当天的提醒
    public void prepareTodayReminders() {
        logger.info("准备当天的提醒");

        LocalDate today = LocalDate.now();

        // 将今天需要发送的提醒状态从 PENDING 改为 SCHEDULED
        String jpql = "UPDATE ContractReminder r " +
            "SET r.status = 'SCHEDULED' " +
            "WHERE r.reminderDate = :today " +
            "AND r.status = 'PENDING'";

        int updatedCount = entityManager.createQuery(jpql)
            .setParameter("today", today)
            .executeUpdate();

        logger.info("已准备 {} 条今天的提醒", updatedCount);
    }

    private void sendReminder(ContractReminder reminder) {
        // 实际项目中应该实现邮件、短信等通知方式
        // 这里简化处理，只记录日志

        logger.info("=== 发送提醒 ===");
        logger.info("提醒类型: {}", reminder.getReminderType());
        logger.info("接收人: {}", reminder.getRecipientName());
        logger.info("邮箱: {}", reminder.getRecipientEmail());
        logger.info("电话: {}", reminder.getRecipientPhone());
        logger.info("标题: {}", reminder.getReminderTitle());
        logger.info("内容: {}", reminder.getReminderContent());
        logger.info("===================");

        // 如果有邮箱，发送邮件
        if (reminder.getRecipientEmail() != null && !reminder.getRecipientEmail().isEmpty()) {
            // 实际项目中调用邮件服务
            logger.info("邮件已发送到: {}", reminder.getRecipientEmail());
        }

        // 如果有电话，发送短信
        if (reminder.getRecipientPhone() != null && !reminder.getRecipientPhone().isEmpty()) {
            // 实际项目中调用短信服务
            logger.info("短信已发送到: {}", reminder.getRecipientPhone());
        }
    }

    private List<ReminderDTO> convertToDTOs(List<ContractReminder> reminders) {
        List<ReminderDTO> dtos = new ArrayList<>();
        for (ContractReminder reminder : reminders) {
            dtos.add(convertToDTO(reminder));
        }
        return dtos;
    }

    private ReminderDTO convertToDTO(ContractReminder reminder) {
        ReminderDTO dto = new ReminderDTO();
        dto.setId(reminder.getId());
        dto.setContractId(reminder.getContract() != null ? reminder.getContract().getId() : null);
        dto.setContractTitle(reminder.getContract() != null ? reminder.getContract().getTitle() : null);
        dto.setReminderType(reminder.getReminderType() != null ? reminder.getReminderType().name() : null);
        dto.setReminderTitle(reminder.getReminderTitle());
        dto.setReminderContent(reminder.getReminderContent());
        dto.setReminderDate(reminder.getReminderDate());
        dto.setAdvanceDays(reminder.getAdvanceDays());
        dto.setStatus(reminder.getStatus() != null ? reminder.getStatus().name() : null);
        dto.setRecipientName(reminder.getRecipientName());
        dto.setRecipientEmail(reminder.getRecipientEmail());
        dto.setRecipientPhone(reminder.getRecipientPhone());

        // 解析通知渠道
        if (reminder.getNotificationChannels() != null && !reminder.getNotificationChannels().isEmpty()) {
            dto.setNotificationChannels(List.of(reminder.getNotificationChannels().split(",")));
        }

        return dto;
    }

    @Transactional
    public ContractReminder updateReminderStatus(Long reminderId, String status) {
        logger.info("更新提醒状态，ID: {}, 状态: {}", reminderId, status);

        ContractReminder reminder = entityManager.find(ContractReminder.class, reminderId);
        if (reminder == null) {
            throw new IllegalArgumentException("提醒记录不存在，ID: " + reminderId);
        }

        try {
            reminder.setStatus(ContractReminder.ReminderStatus.valueOf(status));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("无效的状态值: " + status);
        }

        entityManager.merge(reminder);

        logger.info("提醒状态已更新，ID: {}", reminderId);
        return reminder;
    }

    @Transactional
    public void deleteReminder(Long reminderId) {
        logger.info("删除提醒，ID: {}", reminderId);

        ContractReminder reminder = entityManager.find(ContractReminder.class, reminderId);
        if (reminder == null) {
            throw new IllegalArgumentException("提醒记录不存在，ID: " + reminderId);
        }

        entityManager.remove(reminder);

        logger.info("提醒已删除，ID: {}", reminderId);
    }
}
