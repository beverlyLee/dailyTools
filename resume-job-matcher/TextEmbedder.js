class TextEmbedder {
    constructor(apiKey = null, modelName = null, apiUrl = null, encodingFormat = null) {
        console.log('[TextEmbedder] 构造函数');
        
        this.apiKey = typeof apiKey === 'string' ? apiKey : null;
        this.modelName = typeof modelName === 'string' && modelName.trim() !== '' ? modelName : null;
        this.apiUrl = typeof apiUrl === 'string' && apiUrl.trim() !== '' ? apiUrl.trim() : null;
        this.encodingFormat = typeof encodingFormat === 'string' && encodingFormat.trim() !== '' ? encodingFormat.trim() : null;
        this.isModelLoaded = true;
        
        console.log('[TextEmbedder] 初始化完成');
        console.log('[TextEmbedder] 参数全部从外部传入，无硬编码默认值');
    }

    setApiKey(apiKey) {
        console.log('[TextEmbedder] 设置 API Key:', apiKey ? '[已设置]' : '[空]');
        this.apiKey = typeof apiKey === 'string' ? apiKey : null;
    }

    setModelName(modelName) {
        if (typeof modelName === 'string' && modelName.trim() !== '') {
            console.log('[TextEmbedder] 设置模型名称:', modelName);
            this.modelName = modelName;
        } else {
            console.warn('[TextEmbedder] 无效的模型名称');
            this.modelName = null;
        }
    }

    setApiUrl(apiUrl) {
        if (typeof apiUrl === 'string' && apiUrl.trim() !== '') {
            this.apiUrl = apiUrl.trim();
            console.log('[TextEmbedder] 设置 API 地址:', this.apiUrl);
        } else {
            console.warn('[TextEmbedder] 无效的 API 地址');
            this.apiUrl = null;
        }
    }

    setEncodingFormat(encodingFormat) {
        if (typeof encodingFormat === 'string' && encodingFormat.trim() !== '') {
            this.encodingFormat = encodingFormat.trim();
            console.log('[TextEmbedder] 设置编码格式:', this.encodingFormat);
        } else {
            console.warn('[TextEmbedder] 无效的编码格式');
            this.encodingFormat = null;
        }
    }

    async loadModel() {
        console.log('[TextEmbedder] loadModel 开始');
        
        if (!this.apiKey || typeof this.apiKey !== 'string' || this.apiKey.trim() === '') {
            console.error('[TextEmbedder] API Key 未设置');
            throw new Error('请先设置火山引擎 API Key');
        }
        console.log('[TextEmbedder] 已配置火山引擎向量化模型:', this.modelName);
        console.log('[TextEmbedder] API URL:', this.apiUrl);
    }

    async fetchWithTimeout(url, options, timeout = 30000) {
        console.log('[TextEmbedder] fetchWithTimeout 开始，超时时间:', timeout, 'ms');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('[TextEmbedder] 请求超时，中止请求');
            controller.abort();
        }, timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            console.log('[TextEmbedder] 请求完成，状态码:', response.status);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                console.error('[TextEmbedder] 请求被中止（超时）');
                throw new Error('请求超时，请检查网络连接或稍后重试');
            }
            console.error('[TextEmbedder] 请求失败:', error);
            throw error;
        }
    }

    async embed(text) {
        console.log('[TextEmbedder] embed 开始');
        
        if (!this.apiUrl || typeof this.apiUrl !== 'string' || this.apiUrl.trim() === '') {
            console.error('[TextEmbedder] embed 错误：API 地址未设置');
            throw new Error('请先设置 API 地址');
        }

        if (!this.apiKey || typeof this.apiKey !== 'string' || this.apiKey.trim() === '') {
            console.error('[TextEmbedder] embed 错误：API Key 未设置');
            throw new Error('请先设置火山引擎 API Key');
        }

        if (!this.modelName || typeof this.modelName !== 'string' || this.modelName.trim() === '') {
            console.error('[TextEmbedder] embed 错误：模型名称未设置');
            throw new Error('请先设置模型名称');
        }

        if (typeof text !== 'string' || text.trim() === '') {
            console.error('[TextEmbedder] embed 错误：文本为空');
            throw new Error('文本不能为空');
        }

        console.log('[TextEmbedder] 文本长度:', text.length);
        console.log('[TextEmbedder] 请求地址:', this.apiUrl);
        console.log('[TextEmbedder] 模型名称:', this.modelName);
        console.log('[TextEmbedder] 编码格式:', this.encodingFormat);

        try {
            console.log('[TextEmbedder] 开始发送请求...');
            
            const requestBody = {
                model: this.modelName,
                input: text
            };

            if (this.encodingFormat) {
                requestBody.encoding_format = this.encodingFormat;
            }

            console.log('[TextEmbedder] 请求体:', JSON.stringify(requestBody));
            
            const response = await this.fetchWithTimeout(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            }, 30000);

            console.log('[TextEmbedder] 收到响应');

            if (!response.ok) {
                console.error('[TextEmbedder] API 调用失败，状态码:', response.status);
                
                let errorMessage = response.statusText;
                try {
                    const errorData = await response.json();
                    console.error('[TextEmbedder] 错误详情:', errorData);
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    console.warn('[TextEmbedder] 无法解析错误响应 JSON');
                }
                throw new Error(`API 调用失败: ${response.status} ${errorMessage}`);
            }

            console.log('[TextEmbedder] 开始解析响应 JSON');
            const data = await response.json();
            console.log('[TextEmbedder] JSON 解析完成');
            
            if (data && Array.isArray(data.data) && data.data.length > 0) {
                const firstEmbedding = data.data[0];
                if (firstEmbedding) {
                    let embedding = firstEmbedding.embedding;
                    
                    if (this.encodingFormat === 'base64' && typeof embedding === 'string') {
                        console.log('[TextEmbedder] 解码 Base64 格式的向量');
                        embedding = this.decodeBase64Embedding(embedding);
                    }
                    
                    if (Array.isArray(embedding)) {
                        console.log('[TextEmbedder] 成功获取向量，维度:', embedding.length);
                        return embedding;
                    }
                }
            }
            
            console.error('[TextEmbedder] API 响应格式错误:', data);
            throw new Error('API 响应格式错误');
        } catch (error) {
            console.error('[TextEmbedder] embed 捕获异常:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('文本向量化失败');
        }
    }

    async embedMultiple(texts) {
        console.log('[TextEmbedder] embedMultiple 开始');
        
        if (!this.apiUrl || typeof this.apiUrl !== 'string' || this.apiUrl.trim() === '') {
            console.error('[TextEmbedder] embedMultiple 错误：API 地址未设置');
            throw new Error('请先设置 API 地址');
        }

        if (!this.apiKey || typeof this.apiKey !== 'string' || this.apiKey.trim() === '') {
            console.error('[TextEmbedder] embedMultiple 错误：API Key 未设置');
            throw new Error('请先设置火山引擎 API Key');
        }

        if (!this.modelName || typeof this.modelName !== 'string' || this.modelName.trim() === '') {
            console.error('[TextEmbedder] embedMultiple 错误：模型名称未设置');
            throw new Error('请先设置模型名称');
        }

        if (!Array.isArray(texts) || texts.length === 0) {
            console.error('[TextEmbedder] embedMultiple 错误：文本数组为空');
            throw new Error('文本数组不能为空');
        }

        console.log('[TextEmbedder] 文本数量:', texts.length);
        console.log('[TextEmbedder] 文本 1 长度:', texts[0]?.length || 0);
        console.log('[TextEmbedder] 文本 2 长度:', texts[1]?.length || 0);
        console.log('[TextEmbedder] 请求地址:', this.apiUrl);
        console.log('[TextEmbedder] 模型名称:', this.modelName);
        console.log('[TextEmbedder] 编码格式:', this.encodingFormat);

        try {
            console.log('[TextEmbedder] 开始发送批量请求...');
            
            const requestBody = {
                model: this.modelName,
                input: texts
            };

            if (this.encodingFormat) {
                requestBody.encoding_format = this.encodingFormat;
            }

            console.log('[TextEmbedder] 请求体:', JSON.stringify(requestBody));
            
            const response = await this.fetchWithTimeout(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            }, 30000);

            console.log('[TextEmbedder] 收到批量响应');

            if (!response.ok) {
                console.error('[TextEmbedder] 批量 API 调用失败，状态码:', response.status);
                
                let errorMessage = response.statusText;
                try {
                    const errorData = await response.json();
                    console.error('[TextEmbedder] 错误详情:', errorData);
                    if (errorData.error && errorData.error.message) {
                        errorMessage = errorData.error.message;
                    }
                } catch (e) {
                    console.warn('[TextEmbedder] 无法解析错误响应 JSON');
                }
                throw new Error(`API 调用失败: ${response.status} ${errorMessage}`);
            }

            console.log('[TextEmbedder] 开始解析批量响应 JSON');
            const data = await response.json();
            console.log('[TextEmbedder] 批量 JSON 解析完成');
            
            if (data && Array.isArray(data.data) && data.data.length > 0) {
                console.log('[TextEmbedder] 原始数据项数量:', data.data.length);
                
                const validItems = data.data.filter(item => {
                    if (!item || typeof item.index !== 'number') {
                        console.warn('[TextEmbedder] 过滤无效数据项:', item);
                        return false;
                    }
                    return true;
                });
                
                console.log('[TextEmbedder] 有效数据项数量:', validItems.length);
                
                const sortedEmbeddings = validItems
                    .sort((a, b) => a.index - b.index)
                    .map(item => {
                        let embedding = item.embedding;
                        
                        if (this.encodingFormat === 'base64' && typeof embedding === 'string') {
                            console.log('[TextEmbedder] 解码 Base64 格式的向量，索引:', item.index);
                            embedding = this.decodeBase64Embedding(embedding);
                        }
                        
                        if (!Array.isArray(embedding)) {
                            console.warn('[TextEmbedder] 向量不是数组，索引:', item.index);
                            return null;
                        }
                        
                        console.log('[TextEmbedder] 向量索引:', item.index, '维度:', embedding.length);
                        return embedding;
                    })
                    .filter(embedding => Array.isArray(embedding));
                
                if (sortedEmbeddings.length > 0) {
                    console.log('[TextEmbedder] 成功获取', sortedEmbeddings.length, '个向量');
                    return sortedEmbeddings;
                }
            }
            
            console.error('[TextEmbedder] 批量 API 响应格式错误:', data);
            throw new Error('API 响应格式错误');
        } catch (error) {
            console.error('[TextEmbedder] embedMultiple 捕获异常:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('批量向量化失败');
        }
    }

    decodeBase64Embedding(base64String) {
        console.log('[TextEmbedder] decodeBase64Embedding 开始');
        
        try {
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const floatArray = new Float32Array(bytes.buffer);
            const result = Array.from(floatArray);
            
            console.log('[TextEmbedder] Base64 解码完成，向量维度:', result.length);
            return result;
        } catch (error) {
            console.error('[TextEmbedder] Base64 解码失败:', error);
            throw new Error('Base64 解码失败: ' + (error.message || '未知错误'));
        }
    }
}

export default TextEmbedder;
