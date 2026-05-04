import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

export class PoseEstimator {
  constructor() {
    this.detector = null;
    this.isReady = false;
    this.modelLoaded = false;
  }

  async init() {
    try {
      await tf.ready();
      console.log('TensorFlow.js 已就绪');

      const modelConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
        enableSmoothing: true
      };

      const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING };
      
      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      this.isReady = true;
      this.modelLoaded = true;
      console.log('MoveNet 模型加载完成');
      return true;
    } catch (error) {
      console.error('模型加载失败:', error);
      throw error;
    }
  }

  async estimatePose(videoElement) {
    if (!this.isReady || !this.detector) {
      throw new Error('姿态估计器未初始化');
    }

    try {
      const poses = await this.detector.estimatePoses(videoElement);
      
      if (poses && poses.length > 0) {
        return this.processPose(poses[0]);
      }
      
      return null;
    } catch (error) {
      console.error('姿态估计出错:', error);
      return null;
    }
  }

  processPose(pose) {
    const keypoints = pose.keypoints;
    const processedKeypoints = {};

    keypoints.forEach(kp => {
      processedKeypoints[kp.name] = {
        x: kp.x,
        y: kp.y,
        score: kp.score,
        name: kp.name
      };
    });

    return {
      keypoints: processedKeypoints,
      rawKeypoints: keypoints,
      score: pose.score
    };
  }

  isReady() {
    return this.isReady && this.modelLoaded;
  }

  dispose() {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
    }
    this.isReady = false;
    this.modelLoaded = false;
  }
}

export const KEYPOINT_NAMES = {
  NOSE: 'nose',
  LEFT_EYE: 'left_eye',
  RIGHT_EYE: 'right_eye',
  LEFT_EAR: 'left_ear',
  RIGHT_EAR: 'right_ear',
  LEFT_SHOULDER: 'left_shoulder',
  RIGHT_SHOULDER: 'right_shoulder',
  LEFT_ELBOW: 'left_elbow',
  RIGHT_ELBOW: 'right_elbow',
  LEFT_WRIST: 'left_wrist',
  RIGHT_WRIST: 'right_wrist',
  LEFT_HIP: 'left_hip',
  RIGHT_HIP: 'right_hip',
  LEFT_KNEE: 'left_knee',
  RIGHT_KNEE: 'right_knee',
  LEFT_ANKLE: 'left_ankle',
  RIGHT_ANKLE: 'right_ankle'
};

export const CONNECTED_PAIRS = [
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['right_shoulder', 'right_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['right_hip', 'right_knee'],
  ['left_knee', 'left_ankle'],
  ['right_knee', 'right_ankle']
];
