export function generateDemoData() {
  const schools = [
    { name: '中关村第一小学', district: '海淀', polygon: [[116.308,39.978],[116.325,39.978],[116.325,39.987],[116.308,39.987],[116.308,39.978]], center: [116.3168,39.9822], avg_premium_pct: 35, avg_unit_price: 98000, sample_count: 5 },
    { name: '中关村第二小学', district: '海淀', polygon: [[116.312,39.972],[116.326,39.972],[116.326,39.980],[116.312,39.980],[116.312,39.972]], center: [116.3185,39.976], avg_premium_pct: 28, avg_unit_price: 92000, sample_count: 5 },
    { name: '中关村第三小学', district: '海淀', polygon: [[116.304,39.968],[116.316,39.968],[116.316,39.976],[116.304,39.976],[116.304,39.968]], center: [116.3100,39.9720], avg_premium_pct: 22, avg_unit_price: 85000, sample_count: 5 },
    { name: '人大附中', district: '海淀', polygon: [[116.317,39.964],[116.327,39.964],[116.327,39.972],[116.317,39.972],[116.317,39.964]], center: [116.3220,39.9680], avg_premium_pct: 38, avg_unit_price: 105000, sample_count: 5 },
    { name: '北大附小', district: '海淀', polygon: [[116.301,39.988],[116.311,39.988],[116.311,39.996],[116.301,39.996],[116.301,39.988]], center: [116.3060,39.9920], avg_premium_pct: 30, avg_unit_price: 95000, sample_count: 5 },
    { name: '清华大学附属小学', district: '海淀', polygon: [[116.321,39.995],[116.331,39.995],[116.331,40.003],[116.321,40.003],[116.321,39.995]], center: [116.3260,39.9990], avg_premium_pct: 25, avg_unit_price: 88000, sample_count: 5 },
    { name: '史家胡同小学', district: '东城', polygon: [[116.413,39.924],[116.423,39.924],[116.423,39.932],[116.413,39.932],[116.413,39.924]], center: [116.4180,39.9280], avg_premium_pct: 32, avg_unit_price: 96000, sample_count: 5 },
    { name: '北京小学', district: '西城', polygon: [[116.349,39.900],[116.359,39.900],[116.359,39.908],[116.349,39.908],[116.349,39.900]], center: [116.3540,39.9040], avg_premium_pct: 20, avg_unit_price: 82000, sample_count: 5 },
    { name: '景山学校', district: '东城', polygon: [[116.406,39.920],[116.414,39.920],[116.414,39.928],[116.406,39.928],[116.406,39.920]], center: [116.4100,39.9240], avg_premium_pct: 26, avg_unit_price: 89000, sample_count: 5 },
    { name: '芳草地小学', district: '朝阳', polygon: [[116.457,39.917],[116.467,39.917],[116.467,39.925],[116.457,39.925],[116.457,39.917]], center: [116.4620,39.9210], avg_premium_pct: 15, avg_unit_price: 72000, sample_count: 5 },
  ]

  const premiums = []
  schools.forEach(s => {
    for (let j = 0; j < 5; j++) {
      const dLng = (Math.random() - 0.5) * 0.008
      const dLat = (Math.random() - 0.5) * 0.006
      premiums.push({
        community: `${s.name}周边小区${j + 1}`,
        unit_price: s.avg_unit_price + Math.round((Math.random() - 0.5) * 16000),
        area_sqm: Math.round(50 + Math.random() * 70),
        age: Math.round(5 + Math.random() * 20),
        school_name: s.name,
        premium_pct: Math.round((s.avg_premium_pct + (Math.random() - 0.5) * 10) * 100) / 100,
        lng: Math.round((s.center[0] + dLng) * 1e6) / 1e6,
        lat: Math.round((s.center[1] + dLat) * 1e6) / 1e6,
      })
    }
  })

  return { districts: schools, premiums }
}
