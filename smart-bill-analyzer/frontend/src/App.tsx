import React, { useState, useEffect, useCallback } from 'react';
import { DragDropUpload } from './components/DragDropUpload';
import { TrendChart } from './components/TrendChart';
import { DonutChart } from './components/DonutChart';
import { BillList } from './components/BillList';
import { billService, categoryService } from './services/api';
import { ocrService } from './services/ocr';
import type { Bill, BillStats, UploadFile } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'bills'>('upload');
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<'wechat' | 'alipay' | 'auto'>('auto');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab !== 'upload') {
      loadData();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getAllCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories(['餐饮', '购物', '交通', '娱乐', '居住', '医疗', '教育', '其他']);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [billsResult, statsResult] = await Promise.all([
        billService.getBills({ page_size: 100 }),
        billService.getStats(),
      ]);
      setBills(billsResult.bills);
      setStats(statsResult);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (files: FileList) => {
    const newFiles: UploadFile[] = Array.from(files).map(file => ({
      file,
      name: file.name,
      type: file.type || getFileType(file.name),
      status: 'pending',
      progress: 0,
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);

    for (const fileItem of newFiles) {
      const isImage = fileItem.type.startsWith('image/') || 
                      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff'].includes(
                        fileItem.name.split('.').pop()?.toLowerCase() || ''
                      );

      if (isImage) {
        await processImageFile(fileItem);
      } else {
        await processCSVFile(fileItem);
      }
    }
  }, [selectedSource]);

  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['csv'].includes(ext)) return 'text/csv';
    if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg';
    if (['png'].includes(ext)) return 'image/png';
    if (['gif'].includes(ext)) return 'image/gif';
    return 'application/octet-stream';
  };

  const processCSVFile = async (fileItem: UploadFile) => {
    updateFileStatus(fileItem.name, 'uploading', 10);

    try {
      let source: 'wechat' | 'alipay' = 'wechat';
      
      if (selectedSource === 'auto') {
        const content = await readFileContent(fileItem.file);
        source = detectSourceFromContent(content);
      } else {
        source = selectedSource;
      }

      updateFileStatus(fileItem.name, 'uploading', 50);

      const result = await billService.uploadCSV(fileItem.file, source);
      
      if (result.success) {
        updateFileStatus(fileItem.name, 'success', 100);
        alert(`成功导入 ${result.count || 0} 条账单记录`);
      } else {
        updateFileStatus(fileItem.name, 'error', 0);
        alert(`导入失败: ${result.message}`);
      }
    } catch (error) {
      console.error('CSV upload failed:', error);
      updateFileStatus(fileItem.name, 'error', 0);
      alert('上传失败，请检查网络连接或文件格式');
    }
  };

  const processImageFile = async (fileItem: UploadFile) => {
    updateFileStatus(fileItem.name, 'uploading', 10);

    try {
      setOcrProgress('正在初始化 OCR 引擎...');
      updateFileStatus(fileItem.name, 'uploading', 20);

      setOcrProgress('正在识别图片文字...');
      const ocrResult = await ocrService.recognizeImage(fileItem.file);
      updateFileStatus(fileItem.name, 'uploading', 70);

      if (!ocrResult.success) {
        updateFileStatus(fileItem.name, 'error', 0);
        setOcrProgress(`OCR 识别失败: ${ocrResult.message}`);
        return;
      }

      setOcrProgress('正在上传识别结果...');
      updateFileStatus(fileItem.name, 'uploading', 85);

      const formData = new FormData();
      formData.append('file', fileItem.file);
      if (ocrResult.bills && ocrResult.bills.length > 0) {
        formData.append('parsed_data', JSON.stringify(ocrResult.bills));
      }

      const result = await billService.uploadOCR(fileItem.file);
      
      if (result.success) {
        updateFileStatus(fileItem.name, 'success', 100);
        setOcrProgress('');
        alert(`成功识别并导入 ${result.bills?.length || 0} 条账单记录`);
      } else {
        updateFileStatus(fileItem.name, 'error', 0);
        setOcrProgress(`导入失败: ${result.message}`);
      }
    } catch (error) {
      console.error('Image OCR failed:', error);
      updateFileStatus(fileItem.name, 'error', 0);
      setOcrProgress('OCR 处理失败，请重试');
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = reject;
      reader.readAsText(file, 'UTF-8');
    });
  };

  const detectSourceFromContent = (content: string): 'wechat' | 'alipay' => {
    if (content.includes('微信') || content.includes('交易时间') || content.includes('交易类型')) {
      return 'wechat';
    }
    if (content.includes('支付宝') || content.includes('付款时间') || content.includes('商品说明')) {
      return 'alipay';
    }
    return 'wechat';
  };

  const updateFileStatus = (
    fileName: string, 
    status: UploadFile['status'], 
    progress: number
  ) => {
    setUploadFiles(prev => 
      prev.map(f => 
        f.name === fileName 
          ? { ...f, status, progress } 
          : f
      )
    );
  };

  const handleUpdateCategory = async (billId: number, category: string) => {
    try {
      await billService.updateCategory(billId, category);
      setBills(prev => 
        prev.map(b => 
          b.id === billId ? { ...b, category } : b
        )
      );
    } catch (error) {
      console.error('Failed to update category:', error);
      alert('更新分类失败');
    }
  };

  const handleDeleteBill = async (billId: number) => {
    try {
      await billService.deleteBill(billId);
      setBills(prev => prev.filter(b => b.id !== billId));
    } catch (error) {
      console.error('Failed to delete bill:', error);
      alert('删除失败');
    }
  };

  const clearUploadedFiles = () => {
    setUploadFiles([]);
    setOcrProgress('');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>💳 智能账单分析系统</h1>
        <p>基于机器学习的智能账单解析与分类</p>
      </header>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📤 上传账单
        </div>
        <div 
          className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 数据仪表板
        </div>
        <div 
          className={`tab ${activeTab === 'bills' ? 'active' : ''}`}
          onClick={() => setActiveTab('bills')}
        >
          📋 账单列表
        </div>
      </div>

      {activeTab === 'upload' && (
        <div>
          <div className="card">
            <h2>选择账单源类型</h2>
            <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
              <button
                className={`btn ${selectedSource === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedSource('auto')}
              >
                🔍 自动检测
              </button>
              <button
                className={`btn ${selectedSource === 'wechat' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedSource('wechat')}
              >
                💬 微信账单
              </button>
              <button
                className={`btn ${selectedSource === 'alipay' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedSource('alipay')}
              >
                💰 支付宝账单
              </button>
            </div>
            <p style={{ marginTop: 15, color: '#666', fontSize: '0.9rem' }}>
              支持 CSV 格式账单文件（微信/支付宝导出）以及图片格式小票（JPG/PNG/GIF）
            </p>
          </div>

          <div className="card">
            <h2>上传文件</h2>
            <DragDropUpload
              onFileSelect={handleFileSelect}
              accept=".csv,.jpg,.jpeg,.png,.gif,.bmp,.tiff"
              multiple={true}
              maxSize={20 * 1024 * 1024}
              title="拖拽文件到此处或点击选择"
              hint="支持 CSV 账单文件和图片小票，单文件最大 20MB"
              files={uploadFiles}
            />
            
            {ocrProgress && (
              <div className="ocr-status">
                <p style={{ fontWeight: 500, color: '#667eea' }}>
                  {ocrProgress}
                </p>
              </div>
            )}

            {uploadFiles.length > 0 && (
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button
                  className="btn btn-secondary"
                  onClick={clearUploadedFiles}
                >
                  清空列表
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card expense">
                  <h3>总支出</h3>
                  <div className="value">
                    ¥{stats?.total_expense?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="stat-card income">
                  <h3>总收入</h3>
                  <div className="value">
                    ¥{stats?.total_income?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="stat-card count">
                  <h3>账单笔数</h3>
                  <div className="value">
                    {stats?.total_count || 0}
                  </div>
                </div>
                <div className="stat-card">
                  <h3>净收支</h3>
                  <div className="value" style={{ 
                    color: (stats?.total_income || 0) >= (stats?.total_expense || 0) 
                      ? '#27ae60' : '#e74c3c' 
                  }}>
                    {((stats?.total_income || 0) - (stats?.total_expense || 0)) >= 0 ? '+' : ''}
                    ¥{((stats?.total_income || 0) - (stats?.total_expense || 0)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="card">
                <TrendChart 
                  data={stats?.expense_by_month || {}} 
                  title="月度消费趋势"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
                <div className="card">
                  <DonutChart 
                    data={stats?.expense_by_category || {}} 
                    title="消费分类占比"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'bills' && (
        <div className="card">
          <h2>账单列表</h2>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <BillList
              bills={bills}
              onUpdateCategory={handleUpdateCategory}
              onDelete={handleDeleteBill}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default App;
