from celery import shared_task
from celery.utils.log import get_task_logger
from django.utils import timezone
from datetime import timedelta
from django.db import transaction
from django.conf import settings

logger = get_task_logger(__name__)


@shared_task
def check_contract_expiry():
    """
    检查即将到期的合同并发送提醒
    每天定时执行
    """
    from rental_contract.apps.contracts.models import RentalContract
    from rental_contract.apps.reminders.models import Reminder, ReminderLog

    today = timezone.now().date()
    logger.info(f"开始检查合同到期提醒，日期: {today}")

    reminder_days = getattr(settings, 'REMINDER_DAYS_BEFORE_EXPIRY', [7, 3, 1])

    # 获取所有有效的合同
    active_contracts = RentalContract.objects.filter(
        status='active'
    ).select_related('landlord', 'tenant', 'property')

    for contract in active_contracts:
        days_remaining = contract.days_remaining
        
        # 检查是否在提醒天数范围内
        if days_remaining in reminder_days:
            logger.info(f"合同 {contract.contract_number} 即将在 {days_remaining} 天后到期")
            
            # 创建提醒记录
            try:
                with transaction.atomic():
                    # 检查是否已存在相同类型的提醒
                    existing_reminder = Reminder.objects.filter(
                        contract=contract,
                        reminder_type='contract_expiry',
                        scheduled_date=today,
                        is_sent=False
                    ).first()

                    if not existing_reminder:
                        reminder = Reminder.objects.create(
                            contract=contract,
                            user=contract.landlord,
                            reminder_type='contract_expiry',
                            title=f'合同即将到期提醒 - {days_remaining}天后到期',
                            message=f'合同 {contract.contract_number}（{contract.property.name}）将在 {days_remaining} 天后到期。\n'
                                   f'房客：{contract.tenant.name}\n'
                                   f'月租金：¥{contract.monthly_rent}\n'
                                   f'到期日期：{contract.end_date}\n'
                                   f'请及时与房客沟通续租或退房事宜。',
                            scheduled_date=today,
                            scheduled_time=timezone.now().time(),
                            channels=['app']
                        )
                        logger.info(f"已创建合同到期提醒: {reminder.id}")
                        
                        # 同时为房客创建提醒
                        if contract.tenant.user:
                            Reminder.objects.create(
                                contract=contract,
                                user=contract.tenant.user,
                                reminder_type='contract_expiry',
                                title=f'合同即将到期提醒 - {days_remaining}天后到期',
                                message=f'您的租房合同 {contract.contract_number}（{contract.property.name}）将在 {days_remaining} 天后到期。\n'
                                       f'到期日期：{contract.end_date}\n'
                                       f'请及时与房东沟通续租或退房事宜。',
                                scheduled_date=today,
                                scheduled_time=timezone.now().time(),
                                channels=['app']
                            )

            except Exception as e:
                logger.error(f"创建合同到期提醒失败: {str(e)}")
                continue

    logger.info("合同到期提醒检查完成")


@shared_task
def check_billing_reminders():
    """
    检查即将到期的账单并发送提醒
    每天定时执行
    """
    from rental_contract.apps.billing.models import Bill
    from rental_contract.apps.reminders.models import Reminder

    today = timezone.now().date()
    logger.info(f"开始检查账单到期提醒，日期: {today}")

    # 检查未来7天内到期的账单
    end_date = today + timedelta(days=7)

    pending_bills = Bill.objects.filter(
        status__in=['pending', 'partially_paid'],
        due_date__gte=today,
        due_date__lte=end_date
    ).select_related('contract', 'contract__landlord', 'contract__tenant')

    for bill in pending_bills:
        days_until_due = (bill.due_date - today).days
        
        if days_until_due in [7, 3, 1]:
            logger.info(f"账单 {bill.bill_number} 即将在 {days_until_due} 天后到期")

            try:
                with transaction.atomic():
                    # 检查是否已存在相同类型的提醒
                    existing_reminder = Reminder.objects.filter(
                        reminder_type='billing_due',
                        scheduled_date=today,
                        is_sent=False
                    ).first()

                    if not existing_reminder:
                        # 为房东创建提醒
                        landlord_reminder = Reminder.objects.create(
                            contract=bill.contract,
                            user=bill.contract.landlord,
                            reminder_type='billing_due',
                            title=f'账单到期提醒 - {days_until_due}天后到期',
                            message=f'账单 {bill.bill_number}（{bill.get_bill_type_display()}）将在 {days_until_due} 天后到期。\n'
                                   f'房客：{bill.contract.tenant.name}\n'
                                   f'账单金额：¥{bill.total_amount}\n'
                                   f'已支付金额：¥{bill.paid_amount}\n'
                                   f'剩余金额：¥{bill.remaining_amount}\n'
                                   f'到期日期：{bill.due_date}',
                            scheduled_date=today,
                            scheduled_time=timezone.now().time(),
                            channels=['app']
                        )
                        logger.info(f"已为房东创建账单到期提醒: {landlord_reminder.id}")

                        # 为房客创建提醒
                        if bill.contract.tenant.user:
                            Reminder.objects.create(
                                contract=bill.contract,
                                user=bill.contract.tenant.user,
                                reminder_type='billing_due',
                                title=f'账单到期提醒 - {days_until_due}天后到期',
                                message=f'您的 {bill.get_bill_type_display()} 账单 {bill.bill_number} 将在 {days_until_due} 天后到期。\n'
                                       f'账单金额：¥{bill.total_amount}\n'
                                       f'已支付金额：¥{bill.paid_amount}\n'
                                       f'剩余金额：¥{bill.remaining_amount}\n'
                                       f'到期日期：{bill.due_date}\n'
                                       f'请及时支付账单。',
                                scheduled_date=today,
                                scheduled_time=timezone.now().time(),
                                channels=['app']
                            )

            except Exception as e:
                logger.error(f"创建账单到期提醒失败: {str(e)}")
                continue

    logger.info("账单到期提醒检查完成")


@shared_task
def send_reminder_notification(reminder_id):
    """
    发送单个提醒通知
    可以作为异步任务调用
    """
    from rental_contract.apps.reminders.models import Reminder, ReminderLog

    try:
        reminder = Reminder.objects.get(id=reminder_id)
        
        if reminder.is_sent:
            logger.info(f"提醒 {reminder_id} 已发送，跳过")
            return

        logger.info(f"开始发送提醒: {reminder_id}")

        # 这里可以实现不同渠道的通知发送
        # 目前只实现应用内通知，其他渠道需要集成相应的服务
        
        for channel in reminder.channels:
            try:
                with transaction.atomic():
                    # 创建提醒日志
                    log = ReminderLog.objects.create(
                        reminder=reminder,
                        channel=channel,
                        status='sent',
                        recipient=reminder.user.username,
                        message_content=reminder.message[:500] if reminder.message else None,
                        processed_at=timezone.now()
                    )
                    logger.info(f"已通过 {channel} 发送提醒，日志ID: {log.id}")

            except Exception as e:
                logger.error(f"通过 {channel} 发送提醒失败: {str(e)}")
                ReminderLog.objects.create(
                    reminder=reminder,
                    channel=channel,
                    status='failed',
                    recipient=reminder.user.username,
                    error_message=str(e)
                )
                continue

        # 标记提醒为已发送
        reminder.is_sent = True
        reminder.sent_at = timezone.now()
        reminder.save()

        logger.info(f"提醒 {reminder_id} 发送完成")

    except Reminder.DoesNotExist:
        logger.error(f"提醒 {reminder_id} 不存在")
    except Exception as e:
        logger.error(f"发送提醒时发生错误: {str(e)}")


@shared_task
def check_rent_payment_reminders():
    """
    检查租金支付提醒
    每天定时执行
    """
    from rental_contract.apps.contracts.models import RentalContract
    from rental_contract.apps.reminders.models import Reminder

    today = timezone.now().date()
    logger.info(f"开始检查租金支付提醒，日期: {today}")

    # 获取所有有效的合同
    active_contracts = RentalContract.objects.filter(
        status='active'
    ).select_related('landlord', 'tenant', 'property')

    for contract in active_contracts:
        # 检查是否是付款日的前3天或当天
        payment_day = contract.payment_day
        
        # 计算距离付款日的天数
        # 简化处理：检查是否是每月的付款日
        # 更复杂的逻辑需要考虑跨月等情况
        
        days_until_payment = 0
        if today.day < payment_day:
            days_until_payment = payment_day - today.day
        elif today.day == payment_day:
            days_until_payment = 0
        else:
            # 已过本月付款日，计算到下月付款日的天数
            import calendar
            days_in_month = calendar.monthrange(today.year, today.month)[1]
            days_until_payment = (days_in_month - today.day) + payment_day

        if days_until_payment in [3, 1, 0]:
            logger.info(f"合同 {contract.contract_number} 租金支付提醒：{days_until_payment} 天后/今天是付款日")

            try:
                with transaction.atomic():
                    # 检查是否已存在相同类型的提醒
                    existing_reminder = Reminder.objects.filter(
                        contract=contract,
                        reminder_type='rent_payment',
                        scheduled_date=today,
                        is_sent=False
                    ).first()

                    if not existing_reminder:
                        # 为房东创建提醒
                        if days_until_payment == 0:
                            title = '租金支付提醒 - 今天是付款日'
                            message = f'今天是合同 {contract.contract_number}（{contract.property.name}）的租金付款日。\n'
                        else:
                            title = f'租金支付提醒 - {days_until_payment}天后付款'
                            message = f'合同 {contract.contract_number}（{contract.property.name}）的租金将在 {days_until_payment} 天后到期支付。\n'

                        message += (
                            f'房客：{contract.tenant.name}\n'
                            f'月租金：¥{contract.monthly_rent}\n'
                            f'付款日：每月 {contract.payment_day} 日\n'
                            f'请留意租金到账情况。'
                        )

                        landlord_reminder = Reminder.objects.create(
                            contract=contract,
                            user=contract.landlord,
                            reminder_type='rent_payment',
                            title=title,
                            message=message,
                            scheduled_date=today,
                            scheduled_time=timezone.now().time(),
                            channels=['app']
                        )
                        logger.info(f"已为房东创建租金支付提醒: {landlord_reminder.id}")

                        # 为房客创建提醒
                        if contract.tenant.user:
                            tenant_message = message.replace(
                                '请留意租金到账情况。',
                                '请及时支付租金。'
                            )
                            Reminder.objects.create(
                                contract=contract,
                                user=contract.tenant.user,
                                reminder_type='rent_payment',
                                title=title,
                                message=tenant_message,
                                scheduled_date=today,
                                scheduled_time=timezone.now().time(),
                                channels=['app']
                            )

            except Exception as e:
                logger.error(f"创建租金支付提醒失败: {str(e)}")
                continue

    logger.info("租金支付提醒检查完成")


@shared_task
def process_pending_reminders():
    """
    处理所有待发送的提醒
    可以定时调用或作为其他任务的后续处理
    """
    from rental_contract.apps.reminders.models import Reminder

    today = timezone.now().date()
    now = timezone.now().time()

    logger.info(f"开始处理待发送的提醒，时间: {today} {now}")

    # 获取今天应该发送且尚未发送的提醒
    pending_reminders = Reminder.objects.filter(
        scheduled_date=today,
        scheduled_time__lte=now,
        is_sent=False
    )

    for reminder in pending_reminders:
        try:
            # 异步发送每个提醒
            send_reminder_notification.delay(reminder.id)
            logger.info(f"已调度发送提醒: {reminder.id}")
        except Exception as e:
            logger.error(f"调度发送提醒失败 {reminder.id}: {str(e)}")
            continue

    logger.info(f"待发送提醒处理完成，共调度 {pending_reminders.count()} 个提醒")
