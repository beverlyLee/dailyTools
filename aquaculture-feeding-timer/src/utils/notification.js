export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('浏览器不支持通知功能')
    return false
  }
  
  if (Notification.permission === 'granted') {
    return true
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }
  
  return false
}

export function showNotification(title, options) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    console.warn('无法显示通知')
    return null
  }
  
  const defaultOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    requireInteraction: false,
    ...options,
  }
  
  const notification = new Notification(title, defaultOptions)
  
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  
  return notification
}

export function showFeedingNotification(scheduleName, feedAmount) {
  return showNotification('🐟 该喂鱼了！', {
    body: `${scheduleName}时间到了，准备投喂 ${feedAmount}kg 饲料`,
    tag: 'feeding-reminder',
    renotify: true,
    vibrate: [200, 100, 200],
  })
}

export function showWeatherDelayNotification(reason) {
  return showNotification('⚠️ 投喂推迟提醒', {
    body: `因${reason}，投喂已推迟，请开启增氧机`,
    tag: 'weather-delay',
    renotify: true,
  })
}
