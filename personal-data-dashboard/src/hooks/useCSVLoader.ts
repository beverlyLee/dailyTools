import { useState, useCallback } from 'react';
import { CSVData } from '../types';

const parseCSV = (csvText: string): CSVData => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string | number> = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      const numValue = Number(value);
      row[header] = isNaN(numValue) ? value : numValue;
    });
    
    return row;
  });

  return {
    columns: headers,
    rows,
    fileName: ''
  };
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

export const useCSVLoader = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromFile = useCallback((file: File): Promise<CSVData> => {
    return new Promise((resolve, reject) => {
      setLoading(true);
      setError(null);
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = parseCSV(text);
          data.fileName = file.name;
          resolve(data);
        } catch (err) {
          setError('CSV 文件解析失败');
          reject(err);
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('文件读取失败');
        setLoading(false);
        reject(new Error('文件读取失败'));
      };
      
      reader.readAsText(file);
    });
  }, []);

  const loadFromURL = useCallback(async (url: string): Promise<CSVData> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status}`);
      }
      
      const text = await response.text();
      const data = parseCSV(text);
      
      const urlParts = url.split('/');
      data.fileName = urlParts[urlParts.length - 1] || 'data.csv';
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    loadFromFile,
    loadFromURL
  };
};
