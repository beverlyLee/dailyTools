export interface User {
  id: number
  name: string
  email?: string
  created_at: string
  updated_at: string
}

export interface BillItem {
  id: number
  bill_id: number
  category: string
  description: string
  amount: number
  quantity?: number
  unit?: string
  unit_price?: number
  created_at: string
  updated_at: string
}

export interface Bill {
  id: number
  type: string
  amount: number
  date: string
  description: string
  payer_id: number
  payer?: User
  status: string
  created_at: string
  updated_at: string
  bill_items?: BillItem[]
}

export interface SplitShare {
  user_id: number
  amount: number
  ratio: number
}

export interface SplitResult {
  id: number
  bill_id: number
  user_id: number
  user?: User
  amount: number
  ratio: number
  status: string
  created_at: string
  updated_at: string
}

export interface Transfer {
  from_user_id: number
  to_user_id: number
  amount: number
  from_user_name?: string
  to_user_name?: string
}

export interface Balance {
  user_id: number
  amount: number
  user_name?: string
}

export interface OCRBillItem {
  description: string
  amount: number
  category: string
}

export interface OCRResult {
  raw_text: string
  bill_type: string
  total_amount: number
  items: OCRBillItem[]
  parsed_data: Record<string, string>
}

export interface Settlement {
  id: number
  from_user_id: number
  from_user?: User
  to_user_id: number
  to_user?: User
  amount: number
  bill_ids: string
  status: string
  created_at: string
  updated_at: string
}
