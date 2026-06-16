import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateGrowthReport(livestock, weightRecords, feedRecords, fcrStats) {
  const doc = new jsPDF()
  const today = new Date().toLocaleDateString('zh-CN')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('牲畜生长生产报表', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`生成日期: ${today}`, 14, 32)
  doc.text(`耳标编号: ${livestock.earTag}`, 14, 40)
  doc.text(`品种: ${livestock.breed}`, 14, 48)
  doc.text(`出生日期: ${livestock.birthDate}`, 14, 56)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('关键指标 (KPI)', 14, 72)

  const kpiData = [
    ['日增重 (g/天)', fcrStats?.dailyGain ? (fcrStats.dailyGain * 1000).toFixed(1) : 'N/A'],
    ['累计增重 (kg)', fcrStats?.weightGain ? fcrStats.weightGain.toFixed(2) : 'N/A'],
    ['累计耗料 (kg)', fcrStats?.totalFeed ? fcrStats.totalFeed.toFixed(2) : 'N/A'],
    ['料肉比 (FCR)', fcrStats?.fcr ? fcrStats.fcr.toFixed(2) : 'N/A'],
    ['标准料肉比', fcrStats?.standardFCR || 'N/A'],
    ['偏离度 (%)', fcrStats?.deviation ? (fcrStats.deviation * 100).toFixed(1) + '%' : 'N/A'],
    ['生长状态', fcrStats?.isWarning ? '预警 - 生长迟缓' : '正常']
  ]

  autoTable(doc, {
    startY: 78,
    head: [['指标', '数值']],
    body: kpiData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 10 }
  })

  let finalY = doc.lastAutoTable.finalY + 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('体重记录', 14, finalY)
  finalY += 6

  const weightData = weightRecords
    .sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
    .map(r => [r.recordDate, r.weight.toFixed(2) + ' kg'])

  autoTable(doc, {
    startY: finalY,
    head: [['记录日期', '体重']],
    body: weightData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 10 }
  })

  finalY = doc.lastAutoTable.finalY + 10

  if (finalY > 250) {
    doc.addPage()
    finalY = 20
  }

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('饲料记录', 14, finalY)
  finalY += 6

  const feedData = feedRecords
    .sort((a, b) => new Date(a.recordDate) - new Date(b.recordDate))
    .map(r => [r.recordDate, r.feedAmount.toFixed(2) + ' kg', r.notes || '-'])

  autoTable(doc, {
    startY: finalY,
    head: [['日期', '投喂量', '备注']],
    body: feedData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 10 }
  })

  doc.save(`生长报表_${livestock.earTag}_${today}.pdf`)
}

export function generateBatchReport(livestockList, stats) {
  const doc = new jsPDF()
  const today = new Date().toLocaleDateString('zh-CN')

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('群体生产汇总报表', 105, 20, { align: 'center' })

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`生成日期: ${today}`, 14, 32)
  doc.text(`存栏数量: ${livestockList.length}`, 14, 40)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('群体统计指标', 14, 56)

  const summaryData = [
    ['平均体重 (kg)', stats?.avgWeight ? stats.avgWeight.toFixed(2) : 'N/A'],
    ['平均日增重 (g)', stats?.avgDailyGain ? (stats.avgDailyGain * 1000).toFixed(1) : 'N/A'],
    ['平均料肉比', stats?.avgFCR ? stats.avgFCR.toFixed(2) : 'N/A'],
    ['均匀度 (%)', stats?.uniformity ? stats.uniformity.toFixed(1) : 'N/A'],
    ['变异系数 (%)', stats?.cv ? stats.cv.toFixed(2) : 'N/A'],
    ['生长迟缓个体数', stats?.warningCount || 0]
  ]

  autoTable(doc, {
    startY: 62,
    head: [['指标', '数值']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 10 }
  })

  let finalY = doc.lastAutoTable.finalY + 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('个体明细', 14, finalY)
  finalY += 6

  const detailData = livestockList.map(l => [
    l.earTag,
    l.breed,
    l.birthDate,
    l.currentWeight ? l.currentWeight.toFixed(2) + ' kg' : 'N/A',
    l.fcr ? l.fcr.toFixed(2) : 'N/A',
    l.status || '正常'
  ])

  autoTable(doc, {
    startY: finalY,
    head: [['耳标', '品种', '出生日期', '当前体重', 'FCR', '状态']],
    body: detailData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 9 }
  })

  doc.save(`群体汇总报表_${today}.pdf`)
}
