from rest_framework import serializers
from django.contrib.auth.models import User
from rental_contract.apps.contracts.models import RentalContract
from .models import Reminder, ReminderLog


class SimpleContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalContract
        fields = ['id', 'contract_number']


class ReminderSerializer(serializers.ModelSerializer):
    contract = SimpleContractSerializer(read_only=True)
    contract_id = serializers.PrimaryKeyRelatedField(
        queryset=RentalContract.objects.all(),
        source='contract',
        write_only=True,
        required=False,
        allow_null=True
    )
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Reminder
        fields = ['id', 'contract', 'contract_id', 'user', 'reminder_type', 'title',
                  'message', 'scheduled_date', 'scheduled_time', 'channels',
                  'is_recurring', 'recurring_pattern', 'is_sent', 'sent_at',
                  'is_read', 'read_at', 'created_at', 'updated_at']
        read_only_fields = ['user', 'is_sent', 'sent_at', 'is_read', 'read_at', 
                           'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ReminderLogSerializer(serializers.ModelSerializer):
    reminder = ReminderSerializer(read_only=True)
    reminder_id = serializers.PrimaryKeyRelatedField(
        queryset=Reminder.objects.all(),
        source='reminder',
        write_only=True
    )

    class Meta:
        model = ReminderLog
        fields = ['id', 'reminder', 'reminder_id', 'channel', 'status',
                  'recipient', 'message_content', 'error_message',
                  'created_at', 'processed_at']
        read_only_fields = ['created_at', 'processed_at']
