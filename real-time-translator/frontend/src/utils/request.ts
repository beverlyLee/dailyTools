const baseURL = 'http://localhost:8000/api/v1'

interface RequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
    header?: any
    timeout?: number
}

interface ResponseData<T = any> {
    code: number
    data: T
    message: string
}

export function request<T = any>(options: RequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
        const header = {
            'Content-Type': 'application/json',
            ...options.header
        }
        
        uni.request({
            url: baseURL + options.url,
            method: options.method || 'GET',
            data: options.data,
            header,
            timeout: options.timeout || 30000,
            success: (res) => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(res.data as T)
                } else {
                    uni.showToast({
                        title: `请求失败: ${res.statusCode}`,
                        icon: 'none'
                    })
                    reject(new Error(`HTTP Error: ${res.statusCode}`))
                }
            },
            fail: (err) => {
                console.error('请求失败:', err)
                uni.showToast({
                    title: '网络连接失败',
                    icon: 'none'
                })
                reject(err)
            }
        })
    })
}

export function uploadFile(options: {
    url: string
    filePath: string
    name: string
    formData?: any
}): Promise<any> {
    return new Promise((resolve, reject) => {
        uni.uploadFile({
            url: baseURL + options.url,
            filePath: options.filePath,
            name: options.name,
            formData: options.formData,
            success: (res) => {
                if (res.statusCode === 200) {
                    try {
                        const data = JSON.parse(res.data)
                        resolve(data)
                    } catch (e) {
                        resolve(res.data)
                    }
                } else {
                    reject(new Error(`Upload Error: ${res.statusCode}`))
                }
            },
            fail: (err) => {
                reject(err)
            }
        })
    })
}

export function downloadFile(options: {
    url: string
}): Promise<string> {
    return new Promise((resolve, reject) => {
        uni.downloadFile({
            url: baseURL + options.url,
            success: (res) => {
                if (res.statusCode === 200) {
                    resolve(res.tempFilePath)
                } else {
                    reject(new Error(`Download Error: ${res.statusCode}`))
                }
            },
            fail: (err) => {
                reject(err)
            }
        })
    })
}
