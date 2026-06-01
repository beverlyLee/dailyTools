import asyncio
import uuid
from datetime import datetime
from typing import List, Dict
from app.schemas import AlertLevel, SoundType
from app.config import settings


class AlertDispatcher:
    def __init__(self):
        self.contacts = settings.DEFAULT_CONTACTS.copy()
        self.alert_history: List[Dict] = []
        self.enable_auto_notification = True
    
    def update_contacts(self, contacts: List[Dict]):
        self.contacts = contacts
    
    def get_contacts(self) -> List[Dict]:
        return self.contacts
    
    def get_alert_history(self) -> List[Dict]:
        return sorted(self.alert_history, key=lambda x: x['timestamp'], reverse=True)
    
    def resolve_alert(self, alert_id: str) -> bool:
        for alert in self.alert_history:
            if alert['alert_id'] == alert_id:
                alert['resolved'] = True
                return True
        return False
    
    def _determine_level(self, sound_type: str, confidence: float) -> AlertLevel:
        sound_level_map = {
            'fall': AlertLevel.CRITICAL,
            'scream': AlertLevel.HIGH,
            'cry': AlertLevel.MEDIUM,
        }
        
        base_level = sound_level_map.get(sound_type, AlertLevel.LOW)
        
        if confidence < 0.5:
            if base_level == AlertLevel.CRITICAL:
                return AlertLevel.HIGH
            elif base_level == AlertLevel.HIGH:
                return AlertLevel.MEDIUM
            elif base_level == AlertLevel.MEDIUM:
                return AlertLevel.LOW
        
        return base_level
    
    def _get_contacts_for_level(self, level: AlertLevel) -> List[Dict]:
        contacts_map = {
            AlertLevel.LOW: [c for c in self.contacts if c['relation'] == 'primary'],
            AlertLevel.MEDIUM: [c for c in self.contacts if c['relation'] in ['primary', 'secondary']],
            AlertLevel.HIGH: [c for c in self.contacts if c['relation'] in ['primary', 'secondary']],
            AlertLevel.CRITICAL: self.contacts,
        }
        return contacts_map.get(level, [])
    
    def _build_alert_message(self, sound_type: str, level: AlertLevel, location: str = None) -> str:
        sound_messages = {
            'fall': '检测到疑似跌倒声音',
            'scream': '检测到呼救声',
            'cry': '检测到哭声',
            'unknown': '检测到异常声音',
        }
        
        base_msg = sound_messages.get(sound_type, '检测到异常声音')
        location_msg = f"，位置：{location}" if location else ""
        level_msg = f"（{level.value}级别）"
        
        return f"{base_msg}{location_msg}{level_msg}"
    
    async def dispatch(self, sound_type: str, confidence: float = 0.8, 
                      location: str = None, audio_url: str = None) -> Dict:
        alert_id = str(uuid.uuid4())
        level = self._determine_level(sound_type, confidence)
        message = self._build_alert_message(sound_type, level, location)
        contacts_to_notify = self._get_contacts_for_level(level)
        
        if self.enable_auto_notification:
            await self._send_notifications(contacts_to_notify, message, level)
        
        alert_record = {
            'alert_id': alert_id,
            'timestamp': datetime.now().isoformat(),
            'level': level.value,
            'sound_type': sound_type,
            'message': message,
            'contacts': contacts_to_notify,
            'audio_url': audio_url,
            'resolved': False,
            'confidence': confidence
        }
        self.alert_history.append(alert_record)
        
        return {
            'status': 'alert_triggered',
            'alert_id': alert_id,
            'message': message,
            'level': level.value,
            'contacts_notified': contacts_to_notify
        }
    
    async def _send_notifications(self, contacts: List[Dict], message: str, level: AlertLevel):
        for contact in contacts:
            try:
                print(f"[NOTIFICATION] 发送给 {contact['name']}: {message}")
                if contact.get('phone'):
                    print(f"  → SMS 到 {contact['phone']}")
                if contact.get('email'):
                    print(f"  → Email 到 {contact['email']}")
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"[ERROR] 通知 {contact['name']} 失败: {e}")
    
    def trigger_test_alert(self) -> Dict:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            self.dispatch('fall', confidence=0.9, location='客厅')
        )
        loop.close()
        return result


alert_dispatcher = AlertDispatcher()
