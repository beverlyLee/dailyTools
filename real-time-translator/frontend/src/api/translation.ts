import { request, uploadFile, downloadFile } from '@/utils/request'

export interface TranslationRequest {
    source_text: string
    source_language?: string
    target_language?: string
    optimize_business?: boolean
}

export interface TranslationResponse {
    source_text: string
    translated_text: string
    source_language: string
    target_language: string
    confidence?: number
}

export interface LanguageInfo {
    code: string
    name: string
    voice: string
}

export async function translateText(data: TranslationRequest): Promise<TranslationResponse> {
    return request({
        url: '/translation/text',
        method: 'POST',
        data: {
            source_text: data.source_text,
            source_language: data.source_language || 'zh',
            target_language: data.target_language || 'en',
            optimize_business: data.optimize_business ?? true
        }
    })
}

export async function translateSpeech(
    filePath: string,
    sourceLanguage: string = 'zh',
    targetLanguage: string = 'en',
    optimizeBusiness: boolean = true
): Promise<any> {
    return uploadFile({
        url: '/translation/speech',
        filePath: filePath,
        name: 'audio_file',
        formData: {
            source_language: sourceLanguage,
            target_language: targetLanguage,
            optimize_business: String(optimizeBusiness)
        }
    })
}

export async function getSupportedLanguages(): Promise<{
    languages: LanguageInfo[]
    supported_pairs: any[]
}> {
    return request({
        url: '/translation/languages',
        method: 'GET'
    })
}

export async function transcribeAudio(filePath: string, language: string = 'zh'): Promise<{
    text: string
    language: string
    confidence?: number
}> {
    return uploadFile({
        url: '/asr/transcribe',
        filePath: filePath,
        name: 'audio_file',
        formData: {
            language: language,
            task: 'transcribe'
        }
    })
}

export async function synthesizeSpeech(
    text: string,
    language: string = 'zh',
    voice?: string,
    rate: number = 1.0,
    pitch: number = 1.0
): Promise<string> {
    const response = await request({
        url: '/tts/synthesize',
        method: 'POST',
        data: {
            text,
            language,
            voice,
            rate,
            pitch
        }
    })
    
    return response as string
}

export async function getAvailableVoices(): Promise<{
    voices: Array<{
        language: string
        name: string
        display_name: string
        gender: string
        locale: string
    }>
}> {
    return request({
        url: '/tts/voices',
        method: 'GET'
    })
}

export interface Phrase {
    id: number
    category: string
    language_code: string
    original_text: string
    translated_text: string
    target_language: string
    usage_count: number
    is_active: boolean
    created_at: string
    updated_at: string
}

export async function getPhrases(params?: {
    category?: string
    language_code?: string
    target_language?: string
    is_active?: boolean
}): Promise<Phrase[]> {
    return request({
        url: '/phrases/',
        method: 'GET',
        data: params
    })
}

export async function getPhraseCategories(): Promise<{
    categories: string[]
}> {
    return request({
        url: '/phrases/categories',
        method: 'GET'
    })
}

export async function createPhrase(data: {
    category: string
    language_code: string
    original_text: string
    translated_text: string
    target_language?: string
}): Promise<Phrase> {
    return request({
        url: '/phrases/',
        method: 'POST',
        data: {
            ...data,
            target_language: data.target_language || 'en'
        }
    })
}

export async function updatePhrase(
    id: number,
    data: Partial<{
        category: string
        original_text: string
        translated_text: string
        is_active: boolean
    }>
): Promise<Phrase> {
    return request({
        url: `/phrases/${id}`,
        method: 'PUT',
        data
    })
}

export async function deletePhrase(id: number): Promise<{
    message: string
}> {
    return request({
        url: `/phrases/${id}`,
        method: 'DELETE'
    })
}

export async function usePhrase(id: number): Promise<{
    message: string
    usage_count: number
}> {
    return request({
        url: `/phrases/${id}/use`,
        method: 'POST'
    })
}

export interface TranslationHistoryItem {
    id: number
    source_text: string
    translated_text: string
    source_language: string
    target_language: string
    created_at: string
}

export async function getTranslationHistory(
    skip: number = 0,
    limit: number = 50
): Promise<TranslationHistoryItem[]> {
    return request({
        url: '/phrases/history/',
        method: 'GET',
        data: { skip, limit }
    })
}
