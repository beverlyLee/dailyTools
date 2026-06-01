import React, { useRef } from 'react'
import { useAppStore } from '../store/appStore'

interface UploaderProps {
  type: 'person' | 'clothes'
}

const Uploader: React.FC<UploaderProps> = ({ type }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageUrl =
    type === 'person'
      ? useAppStore((s) => s.personImageUrl)
      : useAppStore((s) => s.clothesImageUrl)
  const setImageUrl =
    type === 'person'
      ? useAppStore((s) => s.setPersonImageUrl)
      : useAppStore((s) => s.setClothesImageUrl)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (type === 'person') {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
      if (!validTypes.includes(file.type)) {
        alert('请上传 JPG 或 PNG 格式的人像图片')
        return
      }
    }

    const url = URL.createObjectURL(file)
    setImageUrl(url)
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
    setImageUrl(null)
  }

  const label = type === 'person' ? '上传人像' : '上传衣服'
  const hint =
    type === 'person'
      ? '支持 JPG/PNG 格式，建议正脸照'
      : '建议使用白底平铺图'
  const accept = type === 'person' ? 'image/jpeg,image/jpg,image/png' : 'image/*'

  return (
    <div className="uploader-card">
      <h3>{label}</h3>
      <p className="uploader-hint">{hint}</p>

      {imageUrl ? (
        <div className="uploader-preview">
          <img src={imageUrl} alt={label} />
          <button className="remove-btn" onClick={handleRemove}>
            移除
          </button>
        </div>
      ) : (
        <div className="uploader-placeholder" onClick={handleClick}>
          <span>+ 点击上传</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}

export default Uploader
