export const STANDARD_VACCINE_SCHEDULES = {
  '杜洛克猪': [
    { name: '猪瘟疫苗', days: 20, boosterDays: 60 },
    { name: '猪蓝耳病疫苗', days: 30, boosterDays: null },
    { name: '口蹄疫疫苗', days: 45, boosterDays: 100 },
    { name: '伪狂犬病疫苗', days: 14, boosterDays: 70 },
    { name: '猪丹毒疫苗', days: 60, boosterDays: null }
  ],
  '长白猪': [
    { name: '猪瘟疫苗', days: 21, boosterDays: 60 },
    { name: '猪蓝耳病疫苗', days: 28, boosterDays: null },
    { name: '口蹄疫疫苗', days: 50, boosterDays: 110 },
    { name: '伪狂犬病疫苗', days: 14, boosterDays: 70 },
    { name: '猪圆环病毒疫苗', days: 21, boosterDays: 42 }
  ],
  '大白猪': [
    { name: '猪瘟疫苗', days: 20, boosterDays: 60 },
    { name: '猪蓝耳病疫苗', days: 30, boosterDays: null },
    { name: '口蹄疫疫苗', days: 45, boosterDays: 100 },
    { name: '伪狂犬病疫苗', days: 14, boosterDays: 70 },
    { name: '猪细小病毒疫苗', days: 60, boosterDays: null }
  ],
  '地方品种': [
    { name: '猪瘟疫苗', days: 25, boosterDays: 65 },
    { name: '口蹄疫疫苗', days: 50, boosterDays: 110 },
    { name: '伪狂犬病疫苗', days: 21, boosterDays: 75 }
  ]
}

export function addDays(dateStr, days) {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function generateVaccineReminders(livestock) {
  const schedules = STANDARD_VACCINE_SCHEDULES[livestock.breed] || STANDARD_VACCINE_SCHEDULES['地方品种']
  const today = new Date().toISOString().split('T')[0]
  const reminders = []

  schedules.forEach(vaccine => {
    const firstDueDate = addDays(livestock.birthDate, vaccine.days)
    reminders.push({
      livestockId: livestock.id,
      earTag: livestock.earTag,
      vaccineName: vaccine.name,
      type: 'initial',
      dueDate: firstDueDate,
      isOverdue: firstDueDate < today,
      daysLeft: Math.ceil((new Date(firstDueDate) - new Date(today)) / (1000 * 60 * 60 * 24))
    })

    if (vaccine.boosterDays) {
      const boosterDueDate = addDays(livestock.birthDate, vaccine.boosterDays)
      reminders.push({
        livestockId: livestock.id,
        earTag: livestock.earTag,
        vaccineName: vaccine.name,
        type: 'booster',
        dueDate: boosterDueDate,
        isOverdue: boosterDueDate < today,
        daysLeft: Math.ceil((new Date(boosterDueDate) - new Date(today)) / (1000 * 60 * 60 * 24))
      })
    }
  })

  return reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
}

export function getUpcomingReminders(reminders, vaccineRecords, daysAhead = 14) {
  const vaccinatedKeys = new Set(
    vaccineRecords.map(r => `${r.livestockId}-${r.vaccineName}-${r.type || 'initial'}`)
  )

  const today = new Date()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + daysAhead)

  return reminders.filter(r => {
    const dueDate = new Date(r.dueDate)
    const key = `${r.livestockId}-${r.vaccineName}-${r.type}`
    return !vaccinatedKeys.has(key) && dueDate <= cutoff
  })
}
