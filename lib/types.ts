export interface Registration {
  id: string
  folio: string
  client_name: string
  person_count: number
  amount_paid: number
  created_at: string
  created_by: string | null
  updated_at: string
}

export interface QRCode {
  id: string
  registration_id: string
  qr_hash: string
  person_number: number
  is_used: boolean
  used_at: string | null
  used_by: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface ExportData {
  registration_id: string
  folio: string
  client_name: string
  person_count: number
  amount_paid: number
  registration_date: string
  qr_code_id: string
  qr_hash: string
  person_number: number
  is_used: boolean
  used_at: string | null
}
