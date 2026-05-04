import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
})

export const uploadAndExtract = async (file, documentType) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)
  
  const response = await api.post('/invoice/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  return response.data
}

export const validateInvoice = async (invoiceData, documentType) => {
  const response = await api.post('/invoice/validate', invoiceData, {
    params: { document_type: documentType }
  })
  return response.data
}

export const saveInvoice = async (invoiceData, documentType) => {
  const response = await api.post('/invoice/save', invoiceData, {
    params: { document_type: documentType }
  })
  return response.data
}

export const getInvoiceList = async (documentType, skip = 0, limit = 50) => {
  const response = await api.get('/invoice/list', {
    params: { document_type: documentType, skip, limit }
  })
  return response.data
}

export const exportExcel = async (documentType) => {
  const response = await api.get('/invoice/export', {
    params: { document_type: documentType },
    responseType: 'blob'
  })
  return response.data
}

export const markReimbursed = async (invoiceId, documentType) => {
  const response = await api.put(`/invoice/reimburse/${invoiceId}`, null, {
    params: { document_type: documentType }
  })
  return response.data
}

export const deleteInvoice = async (invoiceId, documentType) => {
  const response = await api.delete(`/invoice/${invoiceId}`, {
    params: { document_type: documentType }
  })
  return response.data
}

export default api
