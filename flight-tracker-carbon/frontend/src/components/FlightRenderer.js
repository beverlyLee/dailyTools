import * as Cesium from 'cesium'

export class FlightRenderer {
  constructor(viewer) {
    this.viewer = viewer
    this.flights = new Map()
    this.aircraftModels = new Map()
  }
  
  updateOrCreateFlight(flightData) {
    const flightId = flightData.flight_number
    
    if (this.flights.has(flightId)) {
      this.updateFlightPosition(flightId, flightData)
    } else {
      this.createFlight(flightData)
    }
  }
  
  createFlight(flightData) {
    const { longitude, latitude, altitude, heading = 0 } = flightData
    const altitudeMeters = (altitude * 0.3048) || 10000
    
    const position = Cesium.Cartesian3.fromDegrees(
      longitude, 
      latitude, 
      altitudeMeters
    )
    
    const headingRad = Cesium.Math.toRadians(heading || 0)
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(headingRad, 0, 0)
    )
    
    const color = this.getAircraftColor(flightData.aircraft_type)
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)
    
    const entity = this.viewer.entities.add({
      id: flightData.flight_number,
      name: flightData.flight_number,
      position: position,
      orientation: orientation,
      model: {
        uri: this.getAircraftModel(flightData.aircraft_type),
        scale: 1000,
        minimumPixelSize: 32,
        maximumScale: 50000,
        color: color,
        silhouetteColor: Cesium.Color.WHITE,
        silhouetteSize: 1
      },
      label: {
        text: flightData.flight_number,
        font: '12px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10),
        eyeOffset: new Cesium.Cartesian3(0, 0, -100),
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
      },
      path: {
        resolution: 1,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.RED,
          outlineWidth: 2,
          outlineColor: Cesium.Color.BLACK
        }),
        width: 3,
        trailTime: 3600,
        leadTime: 0
      },
      description: `
        <table>
          <tr><th>航班号</th><td>${flightData.flight_number}</td></tr>
          <tr><th>机型</th><td>${flightData.aircraft_type || '未知'}</td></tr>
          <tr><th>航线</th><td>${flightData.origin} → ${flightData.destination}</td></tr>
          <tr><th>高度</th><td>${flightData.altitude} ft</td></tr>
          <tr><th>速度</th><td>${flightData.speed} kts</td></tr>
          <tr><th>CO₂排放</th><td>${(flightData.co2_estimate || 0).toFixed(2)} kg</td></tr>
        </table>
      `
    })
    
    this.flights.set(flightData.flight_number, {
      entity: entity,
      data: { ...flightData }
    })
  }
  
  updateFlightPosition(flightId, flightData) {
    const flightInfo = this.flights.get(flightId)
    if (!flightInfo) return
    
    const { longitude, latitude, altitude, heading = 0 } = flightData
    const altitudeMeters = (altitude * 0.3048) || 10000
    
    const position = Cesium.Cartesian3.fromDegrees(
      longitude, 
      latitude, 
      altitudeMeters
    )
    
    const headingRad = Cesium.Math.toRadians(heading || 0)
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(headingRad, 0, 0)
    )
    
    flightInfo.entity.position = position
    flightInfo.entity.orientation = orientation
    flightInfo.data = { ...flightData }
    
    if (flightInfo.entity.label) {
      flightInfo.entity.label.text = `${flightData.flight_number}\n${(flightData.co2_estimate || 0).toFixed(1)}kg CO₂`
    }
  }
  
  removeFlight(flightId) {
    const flightInfo = this.flights.get(flightId)
    if (flightInfo) {
      this.viewer.entities.remove(flightInfo.entity)
      this.flights.delete(flightId)
    }
  }
  
  getAircraftColor(aircraftType) {
    const colors = {
      'B737': Cesium.Color.CYAN,
      'B747': Cesium.Color.GOLD,
      'B777': Cesium.Color.ORANGE,
      'B787': Cesium.Color.PINK,
      'A320': Cesium.Color.LIGHTBLUE,
      'A330': Cesium.Color.LIGHTGREEN,
      'A350': Cesium.Color.MAGENTA,
      'A380': Cesium.Color.RED
    }
    return colors[aircraftType] || Cesium.Color.YELLOW
  }
  
  getAircraftModel(aircraftType) {
    return Cesium.buildModuleUrl('Widgets/Images/Cesium_Logo_Color.png')
  }
  
  getAllFlights() {
    return Array.from(this.flights.values()).map(f => f.data)
  }
}
