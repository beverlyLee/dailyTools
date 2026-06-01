import SunCalc from 'suncalc'
import * as THREE from 'three'

export interface SunPositionResult {
  azimuth: number
  altitude: number
  direction: THREE.Vector3
  position: THREE.Vector3
  isVisible: boolean
}

export class SunPosition {
  private latitude: number
  private longitude: number
  private distance: number = 50
  private timezoneOffset: number

  constructor(latitude: number = 39.9042, longitude: number = 116.4074) {
    this.latitude = latitude
    this.longitude = longitude
    this.timezoneOffset = Math.round(longitude / 15)
  }

  public setLocation(latitude: number, longitude: number): void {
    this.latitude = latitude
    this.longitude = longitude
    this.timezoneOffset = Math.round(longitude / 15)
  }

  public getTimezoneOffset(): number {
    return this.timezoneOffset
  }

  public getSunPosition(date: Date): SunPositionResult {
    const sunTimes = SunCalc.getTimes(date, this.latitude, this.longitude)
    const sunPosition = SunCalc.getPosition(date, this.latitude, this.longitude)

    const suncalcAzimuth = sunPosition.azimuth
    const altitude = sunPosition.altitude

    const isVisible = altitude > 0 && 
      date >= sunTimes.sunrise && 
      date <= sunTimes.sunset

    const direction = this.calculateDirection(suncalcAzimuth, altitude)
    const position = direction.clone().multiplyScalar(this.distance)

    return {
      azimuth: suncalcAzimuth,
      altitude,
      direction,
      position,
      isVisible
    }
  }

  private calculateDirection(suncalcAzimuth: number, altitude: number): THREE.Vector3 {
    const projectAzimuth = -suncalcAzimuth + Math.PI

    const x = Math.sin(projectAzimuth) * Math.cos(altitude)
    const y = Math.sin(altitude)
    const z = Math.cos(projectAzimuth) * Math.cos(altitude)

    return new THREE.Vector3(x, y, z).normalize()
  }

  public getSunTimes(date: Date): {
    sunrise: Date
    sunset: Date
    solarNoon: Date
  } {
    const times = SunCalc.getTimes(date, this.latitude, this.longitude)
    return {
      sunrise: times.sunrise,
      sunset: times.sunset,
      solarNoon: times.solarNoon
    }
  }

  public calculateShadowEndpoint(
    sunDirection: THREE.Vector3,
    gnomonTip: THREE.Vector3,
    planeY: number = 0
  ): THREE.Vector3 | null {
    const rayDirection = sunDirection.clone().negate()

    if (rayDirection.y >= 0) {
      return null
    }

    const t = (planeY - gnomonTip.y) / rayDirection.y

    if (t < 0) {
      return null
    }

    const intersection = new THREE.Vector3()
    intersection.copy(rayDirection)
    intersection.multiplyScalar(t)
    intersection.add(gnomonTip)

    return intersection
  }

  public formatTime(utcDate: Date): string {
    const localHours = utcDate.getUTCHours() + this.timezoneOffset
    const normalizedHours = ((localHours % 24) + 24) % 24
    const hours = Math.floor(normalizedHours).toString().padStart(2, '0')
    const minutes = utcDate.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  public formatDate(utcDate: Date): string {
    const localHours = utcDate.getUTCHours() + this.timezoneOffset
    let date = new Date(utcDate.getTime())
    if (localHours >= 24) {
      date = new Date(date.getTime() + 24 * 60 * 60 * 1000)
    } else if (localHours < 0) {
      date = new Date(date.getTime() - 24 * 60 * 60 * 1000)
    }
    const month = (date.getUTCMonth() + 1).toString()
    const day = date.getUTCDate().toString()
    return `${month}月${day}日`
  }

  public getDateFromDayOfYear(dayOfYear: number, hours: number = 12, minutes: number = 0): Date {
    const year = new Date().getFullYear()
    const utcHours = hours - this.timezoneOffset
    return new Date(Date.UTC(year, 0, dayOfYear + 1, utcHours, minutes, 0))
  }

  public getDayOfYear(date: Date): number {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0)
    const diff = date.getTime() - start
    const oneDay = 1000 * 60 * 60 * 24
    return Math.floor(diff / oneDay) - 1
  }

  public getMinutesFromTime(hours: number, minutes: number): number {
    return hours * 60 + minutes
  }

  public getTimeFromMinutes(totalMinutes: number): { hours: number; minutes: number } {
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return { hours, minutes }
  }
}
