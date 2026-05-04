import { CONNECTED_PAIRS } from './poseEstimator.js';

export class PoseRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.scaleX = 1;
    this.scaleY = 1;
  }

  setVideoSize(width, height) {
    this.videoWidth = width;
    this.videoHeight = height;
    this.updateCanvasSize();
  }

  updateCanvasSize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    if (this.videoWidth > 0 && this.videoHeight > 0) {
      this.scaleX = this.canvas.width / this.videoWidth;
      this.scaleY = this.canvas.height / this.videoHeight;
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawPose(pose, evaluationResult = null) {
    if (!pose || !pose.rawKeypoints) return;

    this.clear();

    const keypoints = pose.rawKeypoints;
    const minConfidence = 0.3;

    for (const pair of CONNECTED_PAIRS) {
      const kp1 = keypoints.find(kp => kp.name === pair[0]);
      const kp2 = keypoints.find(kp => kp.name === pair[1]);

      if (kp1 && kp2 && kp1.score > minConfidence && kp2.score > minConfidence) {
        this.drawConnection(kp1, kp2, evaluationResult);
      }
    }

    for (const keypoint of keypoints) {
      if (keypoint.score > minConfidence) {
        this.drawKeypoint(keypoint, evaluationResult);
      }
    }

    if (evaluationResult) {
      this.drawEvaluationOverlay(evaluationResult);
    }
  }

  drawConnection(kp1, kp2, evaluationResult) {
    const x1 = kp1.x * this.scaleX;
    const y1 = kp1.y * this.scaleY;
    const x2 = kp2.x * this.scaleX;
    const y2 = kp2.y * this.scaleY;

    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);

    let strokeColor = '#6366f1';
    let lineWidth = 3;

    if (evaluationResult) {
      if (evaluationResult.status === 'good') {
        strokeColor = '#22c55e';
      } else if (evaluationResult.status === 'warning') {
        strokeColor = '#f59e0b';
      } else if (evaluationResult.status === 'error') {
        strokeColor = '#ef4444';
      }
    }

    this.ctx.strokeStyle = strokeColor;
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
  }

  drawKeypoint(keypoint, evaluationResult) {
    const x = keypoint.x * this.scaleX;
    const y = keypoint.y * this.scaleY;

    let fillColor = '#6366f1';
    let radius = 6;

    const keyJoints = [
      'left_shoulder', 'right_shoulder',
      'left_elbow', 'right_elbow',
      'left_hip', 'right_hip',
      'left_knee', 'right_knee',
      'left_ankle', 'right_ankle'
    ];

    if (keyJoints.includes(keypoint.name)) {
      radius = 8;
    }

    if (evaluationResult && evaluationResult.mistakes) {
      for (const mistake of evaluationResult.mistakes) {
        if (this.isKeypointRelatedToMistake(keypoint.name, mistake.id)) {
          fillColor = '#ef4444';
          radius = 10;
          break;
        }
      }
    }

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = fillColor;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius + 2, 0, 2 * Math.PI);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  isKeypointRelatedToMistake(keypointName, mistakeId) {
    const mistakeKeypointMap = {
      'knee_over_toe': ['left_knee', 'right_knee', 'left_ankle', 'right_ankle'],
      'knee_valgus': ['left_knee', 'right_knee'],
      'leaning_forward': ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'],
      'not_deep_enough': ['left_knee', 'right_knee'],
      'sagging_hips': ['left_hip', 'right_hip'],
      'elevated_hips': ['left_hip', 'right_hip'],
      'elbows_flared': ['left_elbow', 'right_elbow', 'left_shoulder', 'right_shoulder'],
      'not_low_enough': ['left_elbow', 'right_elbow'],
      'head_hanging': ['nose', 'left_eye', 'right_eye'],
      'front_knee_over_toe': ['left_knee', 'right_knee'],
      'back_knee_too_low': ['left_knee', 'right_knee']
    };

    const relatedKeypoints = mistakeKeypointMap[mistakeId] || [];
    return relatedKeypoints.includes(keypointName);
  }

  drawEvaluationOverlay(evaluationResult) {
    const padding = 20;
    const startY = this.canvas.height - padding;

    if (evaluationResult.phase) {
      this.ctx.font = 'bold 16px sans-serif';
      this.ctx.textAlign = 'left';
      
      let phaseColor = '#6366f1';
      if (evaluationResult.status === 'good') phaseColor = '#22c55e';
      else if (evaluationResult.status === 'warning') phaseColor = '#f59e0b';
      else if (evaluationResult.status === 'error') phaseColor = '#ef4444';

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(padding - 10, startY - 35, 200, 35);

      this.ctx.fillStyle = phaseColor;
      this.ctx.fillText(`阶段: ${evaluationResult.phase}`, padding, startY - 12);
    }

    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'right';
    
    let scoreColor = '#22c55e';
    if (evaluationResult.overallScore < 50) scoreColor = '#ef4444';
    else if (evaluationResult.overallScore < 80) scoreColor = '#f59e0b';

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(this.canvas.width - padding - 120, padding - 10, 120, 50);

    this.ctx.fillStyle = scoreColor;
    this.ctx.fillText(`${evaluationResult.overallScore}`, this.canvas.width - padding - 10, padding + 25);

    this.ctx.font = '12px sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText('分数', this.canvas.width - padding - 10, padding + 10);
  }

  drawAngleLabels(angles, keypoints) {
    if (!angles || !keypoints) return;

    const anglePositions = [
      { angle: angles.leftKnee, point1: 'left_hip', point2: 'left_knee', point3: 'left_ankle', label: '左膝' },
      { angle: angles.rightKnee, point1: 'right_hip', point2: 'right_knee', point3: 'right_ankle', label: '右膝' },
      { angle: angles.leftHip, point1: 'left_shoulder', point2: 'left_hip', point3: 'left_knee', label: '左髋' },
      { angle: angles.rightHip, point1: 'right_shoulder', point2: 'right_hip', point3: 'right_knee', label: '右髋' },
      { angle: angles.leftElbow, point1: 'left_shoulder', point2: 'left_elbow', point3: 'left_wrist', label: '左肘' },
      { angle: angles.rightElbow, point1: 'right_shoulder', point2: 'right_elbow', point3: 'right_wrist', label: '右肘' }
    ];

    for (const angleInfo of anglePositions) {
      if (angleInfo.angle !== null) {
        const kp2 = keypoints[angleInfo.point2];
        if (kp2 && kp2.score > 0.3) {
          this.drawAngleLabel(angleInfo.angle, kp2, angleInfo.label);
        }
      }
    }
  }

  drawAngleLabel(angle, keypoint, label) {
    const x = keypoint.x * this.scaleX;
    const y = keypoint.y * this.scaleY;

    let bgColor = 'rgba(99, 102, 241, 0.8)';
    let textColor = 'white';

    this.ctx.font = 'bold 12px sans-serif';
    this.ctx.textAlign = 'center';

    const text = `${angle}°`;
    const textWidth = this.ctx.measureText(text).width;

    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.roundRect(x - textWidth / 2 - 8, y - 30, textWidth + 16, 24, 4);
    this.ctx.fill();

    this.ctx.fillStyle = textColor;
    this.ctx.fillText(text, x, y - 13);
  }

  drawNoPoseMessage() {
    this.ctx.font = 'bold 20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillText('未检测到人体姿态', this.canvas.width / 2, this.canvas.height / 2);
    
    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.fillText('请确保全身在摄像头范围内', this.canvas.width / 2, this.canvas.height / 2 + 30);
  }
}
