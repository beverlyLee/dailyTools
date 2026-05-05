const BASE_URLS = {
    translation: 'http://localhost:8001/api/v1',
    invoice: 'http://localhost:8002/api/v1'
}

class HttpRequest {
    constructor(baseURL) {
        this.baseURL = baseURL
        this.timeout = 30000
    }

    request(options) {
        return new Promise((resolve, reject) => {
            const { url, method = 'GET', data, params, header = {} } = options
            
            let requestUrl = this.baseURL + url
            
            if (params && Object.keys(params).length > 0) {
                const queryString = Object.keys(params)
                    .map(key => `${key}=${encodeURIComponent(params[key])}`)
                    .join('&')
                requestUrl += `?${queryString}`
            }
            
            uni.request({
                url: requestUrl,
                method: method.toUpperCase(),
                data: data,
                header: {
                    'Content-Type': 'application/json',
                    ...header
                },
                timeout: this.timeout,
                success: (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(res.data)
                    } else {
                        const error = new Error(res.data?.detail || `HTTP Error: ${res.statusCode}`)
                        error.statusCode = res.statusCode
                        error.data = res.data
                        reject(error)
                    }
                },
                fail: (err) => {
                    const error = new Error(err.errMsg || '网络请求失败')
                    error.networkError = true
                    reject(error)
                }
            })
        })
    }

    get(url, params = {}, options = {}) {
        return this.request({
            url,
            method: 'GET',
            params,
            ...options
        })
    }

    post(url, data = {}, options = {}) {
        return this.request({
            url,
            method: 'POST',
            data,
            ...options
        })
    }

    put(url, data = {}, options = {}) {
        return this.request({
            url,
            method: 'PUT',
            data,
            ...options
        })
    }

    delete(url, options = {}) {
        return this.request({
            url,
            method: 'DELETE',
            ...options
        })
    }

    upload(url, filePath, name = 'file', formData = {}, options = {}) {
        return new Promise((resolve, reject) => {
            uni.uploadFile({
                url: this.baseURL + url,
                filePath: filePath,
                name: name,
                formData: formData,
                header: options.header || {},
                success: (res) => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const data = JSON.parse(res.data)
                            resolve(data)
                        } catch (e) {
                            resolve(res.data)
                        }
                    } else {
                        reject(new Error(`Upload Error: ${res.statusCode}))
                    }
                },
                fail: (err) => {
                    reject(new Error(err.errMsg || '上传失败'))
                }
            })
        })
    }
}

const translationApi = new HttpRequest(BASE_URLS.translation)
const invoiceApi = new HttpRequest(BASE_URLS.invoice)

export {
    HttpRequest,
    translationApi,
    invoiceApi,
    BASE_URLS
}

export default {
    translationApi,
    invoiceApi
}
