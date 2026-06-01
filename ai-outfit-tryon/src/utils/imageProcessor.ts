export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export const removeWhiteBackgroundWithFeathering = (
  image: HTMLImageElement,
  hardThreshold: number = 235,
  softThreshold: number = 200,
  featherRadius: number = 2
): HTMLCanvasElement => {
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data
  const width = canvas.width
  const height = canvas.height

  const alphaMap = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      const brightness = (r + g + b) / 3

      if (brightness > hardThreshold) {
        alphaMap[y * width + x] = 0
      } else if (brightness > softThreshold) {
        const t = (brightness - softThreshold) / (hardThreshold - softThreshold)
        alphaMap[y * width + x] = 1 - t
      } else {
        alphaMap[y * width + x] = 1
      }
    }
  }

  if (featherRadius > 0) {
    const tempAlpha = new Float32Array(width * height)
    for (let pass = 0; pass < featherRadius; pass++) {
      tempAlpha.set(alphaMap)
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = y * width + x
          let sum = tempAlpha[idx]
          let count = 1
          if (tempAlpha[idx - 1] < 1 || tempAlpha[idx + 1] < 1 ||
              tempAlpha[idx - width] < 1 || tempAlpha[idx + width] < 1) {
            sum += tempAlpha[idx - 1] + tempAlpha[idx + 1] + tempAlpha[idx - width] + tempAlpha[idx + width]
            count += 4
            alphaMap[idx] = sum / count
          }
        }
      }
    }
  }

  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = Math.round(alphaMap[i / 4] * 255)
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}

export const autoDetectThreshold = (image: HTMLImageElement): { hard: number; soft: number } => {
  const canvas = createCanvas(image.width, image.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, 0, 0)

  const sampleSize = 100
  const stepX = Math.floor(image.width / sampleSize)
  const stepY = Math.floor(image.height / sampleSize)
  const brightnessValues: number[] = []

  for (let y = 0; y < image.height; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      const pixel = ctx.getImageData(x, y, 1, 1).data
      const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3
      brightnessValues.push(brightness)
    }
  }

  brightnessValues.sort((a, b) => a - b)
  const p90 = brightnessValues[Math.floor(brightnessValues.length * 0.9)]

  if (p90 > 220) {
    return { hard: 240, soft: 210 }
  } else if (p90 > 180) {
    return { hard: 220, soft: 190 }
  } else {
    return { hard: 200, soft: 170 }
  }
}

export const createTextureFromCanvas = (
  canvas: HTMLCanvasElement
): string => {
  return canvas.toDataURL('image/png')
}

export const processClothesImage = async (
  imageUrl: string
): Promise<{ url: string; width: number; height: number }> => {
  const img = await loadImage(imageUrl)
  const { hard, soft } = autoDetectThreshold(img)
  const processed = removeWhiteBackgroundWithFeathering(img, hard, soft, 2)
  return {
    url: createTextureFromCanvas(processed),
    width: img.width,
    height: img.height,
  }
}

export const getImageDimensions = (
  imageUrl: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = imageUrl
  })
}

export const processPersonImageForTexture = async (
  imageUrl: string,
  targetAspect: number = 1
): Promise<{ url: string; aspect: number }> => {
  const img = await loadImage(imageUrl)
  const imgAspect = img.width / img.height

  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')!

  let drawWidth = img.width
  let drawHeight = img.height
  let offsetX = 0
  let offsetY = 0

  if (imgAspect > targetAspect) {
    drawHeight = img.height
    drawWidth = img.height * targetAspect
    offsetX = (img.width - drawWidth) / 2
  } else {
    drawWidth = img.width
    drawHeight = img.width / targetAspect
    offsetY = (img.height - drawHeight) / 2
  }

  ctx.fillStyle = '#e0e0e0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)

  return {
    url: createTextureFromCanvas(canvas),
    aspect: imgAspect
  }
}
