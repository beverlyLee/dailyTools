import { CesiumViewer } from './components/CesiumViewer.js'
import { WebSocketService } from './services/WebSocketService.js'
import { FlightRenderer } from './components/FlightRenderer.js'

const viewer = new CesiumViewer('cesiumContainer')
const wsService = new WebSocketService('ws://localhost:8080/ws')
const flightRenderer = new FlightRenderer(viewer.getViewer())

const flightsMap = new Map()

wsService.onConnect(() => {
  console.log('WebSocket 连接成功')
})

wsService.onDisconnect(() => {
  console.log('WebSocket 连接断开')
})

wsService.onMessage((data) => {
  if (data.type === 'flight_update') {
    updateFlight(data.payload)
  } else if (data.type === 'flight_list') {
    data.payload.forEach(flight => updateFlight(flight))
  }
})

function updateFlight(flightData) {
  const flightId = flightData.flight_number
  flightsMap.set(flightId, flightData)
  
  flightRenderer.updateOrCreateFlight(flightData)
  updateUI()
}

function updateUI() {
  const flightList = document.getElementById('flightList')
  flightList.innerHTML = ''
  
  Array.from(flightsMap.values()).slice(0, 10).forEach(flight => {
    const item = document.createElement('div')
    item.className = 'flight-item'
    item.innerHTML = `
      <div><strong>${flight.flight_number}</strong> 
        <span class="co2-badge">${(flight.co2_estimate || 0).toFixed(1)} kg CO₂</span>
      </div>
      <div style="font-size: 12px; margin-top: 4px;">
        ${flight.origin} → ${flight.destination} | 
        ${flight.altitude}ft | 
        ${flight.speed}kts
      </div>
    `
    flightList.appendChild(item)
  })
}

wsService.connect()
