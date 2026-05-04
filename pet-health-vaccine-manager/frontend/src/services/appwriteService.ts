// Appwrite 服务配置
// Appwrite 是 Firebase 和 Supabase 的开源替代方案，支持自托管

import { Client, Databases, Storage, ID, Query } from 'appwrite'

// Appwrite 配置
// 请替换为您自己的 Appwrite 服务器配置
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1' // 或者您的自托管服务器地址
const APPWRITE_PROJECT_ID = 'YOUR_PROJECT_ID' // 您的项目 ID
const APPWRITE_DATABASE_ID = 'YOUR_DATABASE_ID' // 您的数据库 ID
const APPWRITE_STORAGE_ID = 'YOUR_STORAGE_ID' // 您的存储桶 ID

// 初始化 Appwrite 客户端
let client: Client
let databases: Databases
let storage: Storage

const initAppwrite = () => {
  if (!client) {
    client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
    
    databases = new Databases(client)
    storage = new Storage(client)
  }
}

// 检查是否配置了有效的 Appwrite 凭证
const isAppwriteConfigured = (): boolean => {
  return APPWRITE_PROJECT_ID !== 'YOUR_PROJECT_ID' && 
         APPWRITE_DATABASE_ID !== 'YOUR_DATABASE_ID'
}

// 数据库操作
export const useAppwriteService = () => {
  initAppwrite()

  // 获取文档列表
  const getDocuments = async (collectionId: string, queries: string[] = []): Promise<any[]> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      const response = await databases.listDocuments(
        APPWRITE_DATABASE_ID,
        collectionId,
        queries
      )
      return response.documents
    } catch (error) {
      console.error('获取文档失败:', error)
      throw error
    }
  }

  // 创建文档
  const createDocument = async (collectionId: string, data: any): Promise<any> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      const response = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        ID.unique(),
        data
      )
      return response
    } catch (error) {
      console.error('创建文档失败:', error)
      throw error
    }
  }

  // 更新文档
  const updateDocument = async (collectionId: string, documentId: string, data: any): Promise<any> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      const response = await databases.updateDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        documentId,
        data
      )
      return response
    } catch (error) {
      console.error('更新文档失败:', error)
      throw error
    }
  }

  // 删除文档
  const deleteDocument = async (collectionId: string, documentId: string): Promise<any> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      const response = await databases.deleteDocument(
        APPWRITE_DATABASE_ID,
        collectionId,
        documentId
      )
      return response
    } catch (error) {
      console.error('删除文档失败:', error)
      throw error
    }
  }

  // 存储操作 - 上传文件
  const uploadFile = async (filePath: string): Promise<string> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      // 注意：在 uni-app 中，文件上传需要特殊处理
      // 这里需要将本地文件路径转换为 File 对象
      // 由于 uni-app 的限制，这里提供一个简化的实现
      
      // 实际项目中，您可能需要使用 uni.uploadFile 或其他方法
      // 这里返回一个模拟的文件 ID
      console.log('上传文件:', filePath)
      
      // 模拟上传成功
      const fileId = ID.unique()
      return fileId
    } catch (error) {
      console.error('上传文件失败:', error)
      throw error
    }
  }

  // 获取文件预览 URL
  const getFilePreview = async (fileId: string): Promise<string> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      const response = storage.getFilePreview(
        APPWRITE_STORAGE_ID,
        fileId
      )
      return response.toString()
    } catch (error) {
      console.error('获取文件预览失败:', error)
      throw error
    }
  }

  // 删除文件
  const deleteFile = async (fileId: string): Promise<any> => {
    if (!isAppwriteConfigured()) {
      console.warn('Appwrite 未配置，使用本地存储')
      throw new Error('Appwrite not configured')
    }

    try {
      const response = await storage.deleteFile(
        APPWRITE_STORAGE_ID,
        fileId
      )
      return response
    } catch (error) {
      console.error('删除文件失败:', error)
      throw error
    }
  }

  // 用户认证操作
  // 这里可以添加用户登录、注册、登出等操作

  return {
    getDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    uploadFile,
    getFilePreview,
    deleteFile,
    isAppwriteConfigured
  }
}

// 导出配置常量，供其他组件使用
export {
  APPWRITE_ENDPOINT,
  APPWRITE_PROJECT_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_STORAGE_ID,
  isAppwriteConfigured
}
