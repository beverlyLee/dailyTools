import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

export class CesiumViewer {
  constructor(containerId) {
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTM2MTcsImlhdCI6MTYxOTg5MTQ0OH0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk'
    
    this.viewer = new Cesium.Viewer(containerId, {
      terrainProvider: Cesium.createWorldTerrain(),
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      vrButton: false
    })
    
    this.viewer.scene.globe.enableLighting = true
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(0, 20, 10000000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      },
      duration: 3
    })
  }
  
  getViewer() {
    return this.viewer
  }
  
  flyToPosition(lon, lat, altitude = 1000000) {
    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(lon, lat, altitude),
      duration: 2
    })
  }
}
