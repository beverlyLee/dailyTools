require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'vr_exhibition_jwt_secret_key_2024',
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE) || 52428800,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  
  supportedModelFormats: ['.fbx', '.gltf', '.glb', '.obj'],
  supportedImageFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  supportedAudioFormats: ['.mp3', '.wav', '.ogg', '.aac'],
  
  maxUsersPerSession: 50,
  sessionTimeout: 3600000,
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true'
  }
};
