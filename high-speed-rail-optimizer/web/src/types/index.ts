export interface Station {
  code: string
  name: string
  pinyin?: string
}

export interface SeatPrice {
  seatType: string
  seatName: string
  price: number
}

export interface StopInfo {
  stationCode: string
  stationName: string
  arrivalTime: string
  departureTime: string
  stayMinutes: number
  sequence: number
}

export interface Train {
  trainNo: string
  trainCode: string
  fromStation: string
  toStation: string
  fromStationName?: string
  toStationName?: string
  departureTime: string
  arrivalTime: string
  durationMinutes: number
  durationDisplay: string
  trainType: string
  date: string
  prices: SeatPrice[]
  stops: StopInfo[]
  dataSource: string
  score?: number
}

export interface TrainDetail extends Train {
}

export interface QueryParams {
  from: string
  to: string
  date: string
  trainTypes?: string[]
  seatTypes?: string[]
  sortBy: 'time' | 'price' | 'balanced'
  dataSource?: string
}

export interface QueryResponseData {
  trains: Train[]
  count: number
  sortBy: string
  dataSource: string
  dataSourceName: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  count?: number
  message?: string
  sortBy?: string
  dataSource?: string
  dataSourceName?: string
}

export interface DataSourceOption {
  id: string
  name: string
  description: string
  priority: number
}
