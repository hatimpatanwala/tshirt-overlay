import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs';
import * as tf from '@tensorflow/tfjs';
@Component({
  selector: 'app-tshirt-overlay',
  templateUrl: './tshirt-overlay.component.html',
  styleUrl: './tshirt-overlay.component.scss',
})
export class TshirtOverlayComponent {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('debugCanvas') debugCanvas!: ElementRef<HTMLCanvasElement>;
  private detector!: poseDetection.PoseDetector;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private tshirtModel!: THREE.Group;
  tshirtColor: string = '#ffffff';
  private isStreamActive = false;
  private animationFrameId: number | null = null;
  private lastValidPosition = { x: 0, y: 0, scale: 0.5 };
  loading = true;
  private debugMode = false;
  private debugCtx!: CanvasRenderingContext2D;
  private readonly POSE_CONNECTIONS = [
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
    ['right_knee', 'right_ankle'],
  ];
  async ngOnInit() {
    try {
      await this.initializeTensorFlow();
      await this.setupPoseDetector();
      this.setupThreeJS();
      this.loadTshirtModel();
      this.loading = false;
    } catch (error) {
      console.error('Initialization error:', error);
      this.loading = false;
    }
  }
  ngAfterViewInit() {
    const canvas = this.debugCanvas.nativeElement;
    canvas.width = 640;
    canvas.height = 480;
    this.debugCtx = canvas.getContext('2d')!;
  }
  toggleDebug() {
    this.debugMode = !this.debugMode;
    this.debugCanvas.nativeElement.style.display = this.debugMode
      ? 'block'
      : 'none';
  }
  private drawSkeleton(pose: poseDetection.Pose) {
    if (!this.debugMode || !this.debugCtx) return;
    const ctx = this.debugCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw keypoints
    pose.keypoints.forEach((keypoint) => {
      if (keypoint.score && keypoint.score > 0.3 && keypoint.x && keypoint.y) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(0, 255, 0, ${keypoint.score})`;
        ctx.fill();

        // Draw keypoint name for debugging
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText(
          `${keypoint.name} (${Math.round(keypoint.score * 100)}%)`,
          keypoint.x + 5,
          keypoint.y - 5
        );
      }
    });

    // Draw connections
    ctx.strokeStyle = 'rgb(0, 255, 0)';
    ctx.lineWidth = 2;

    this.POSE_CONNECTIONS.forEach(([startPoint, endPoint]) => {
      const start = pose.keypoints.find((kp) => kp.name === startPoint);
      const end = pose.keypoints.find((kp) => kp.name === endPoint);

      if (
        start &&
        end &&
        start.score &&
        end.score &&
        start.score > 0.3 &&
        end.score > 0.3 &&
        start.x &&
        start.y &&
        end.x &&
        end.y
      ) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
    });

    // Draw confidence score
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`Pose Confidence: ${Math.round(pose.score! * 100)}%`, 10, 20);
  }

  private async startDetection() {
    if (!this.isStreamActive) return;

    try {
      const video = this.videoElement.nativeElement;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const poses = await this.detector.estimatePoses(video, {
          flipHorizontal: false,
          maxPoses: 1,
        });
        if (poses && poses.length > 0) {
          // Draw debug skeleton
          this.drawSkeleton(poses[0]);

          // Update t-shirt position
          this.updateTshirtPosition(poses[0]);
          // this.drawDebugInfo(poses[0]); // Add this line
        }
      }

      this.renderer.render(this.scene, this.camera);
      this.animationFrameId = requestAnimationFrame(() =>
        this.startDetection()
      );
    } catch (error) {
      console.error('Detection error:', error);
      this.animationFrameId = requestAnimationFrame(() =>
        this.startDetection()
      );
    }
  }
  private drawDebugInfo(pose: poseDetection.Pose) {
    const debugInfo = document.getElementById('debug-info');
    console.log(debugInfo);
    if (debugInfo) {
      debugInfo.innerHTML = `
        T-Shirt Position: ${this.tshirtModel.position
          .toArray()
          .map((v) => v.toFixed(2))}<br>
        T-Shirt Scale: ${this.tshirtModel.scale
          .toArray()
          .map((v) => v.toFixed(2))}<br>
        Shoulder Width: ${this.calculateDistance(
          pose.keypoints.find((p) => p.name === 'left_shoulder'),
          pose.keypoints.find((p) => p.name === 'right_shoulder')
        ).toFixed(2)}px
      `;
    }
  }
  private async initializeTensorFlow() {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('Using WebGL backend');
    } catch {
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('Fallback to CPU backend');
    }
  }

  private async setupPoseDetector() {
    const model = poseDetection.SupportedModels.BlazePose;
    const detectorConfig = {
      runtime: 'tfjs',
      modelType: 'lite',
      enableSmoothing: true,
      smoothSegmentation: true,
    };
    // this.detector = await poseDetection.createDetector(model, detectorConfig);
    this.detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet
    );
  }

  private setupThreeJS() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasElement.nativeElement,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(640, 480);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    this.scene.add(ambientLight, directionalLight);

    this.camera.position.z = 2;
    this.camera = new THREE.PerspectiveCamera(
      45, // Wider field of view
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 3);
    this.camera.lookAt(0, 0, 0);

    // Add coordinate system helper
    // const axesHelper = new THREE.AxesHelper(2);
    // this.scene.add(axesHelper);
    // const testCube = new THREE.Mesh(
    //   new THREE.BoxGeometry(0.5, 0.5, 0.5),
    //   new THREE.MeshBasicMaterial({ color: 0xff0000 })
    // );
    // this.scene.add(testCube);
  }

  private loadTshirtModel() {
    const loader = new GLTFLoader();
    loader.load(
      'tshirt.glb',
      (gltf) => {
        this.tshirtModel = gltf.scene;
        console.log('Model loaded successfully:', this.tshirtModel);
        // this.tshirtModel.position.set(0.7, -2, 0);
        // this.tshirtModel.scale.set(2, 2, 0.5);

        // this.scene.add(this.tshirtModel);
        // this.updateTshirtColor();
        // this.renderer.render(this.scene, this.camera);
        // this.tshirtModel.scale.set(0.5, 0.5, 0.5);
        // this.tshirtModel.position.set(0, 0, 0);
        // this.scene.add(this.tshirtModel);
        // this.updateTshirtColor();
        // this.renderer.render(this.scene, this.camera);
        this.tshirtModel.position.set(0, 0, 0);
        this.tshirtModel.scale.set(0.5, 0.5, 0.5);
        this.tshirtModel.visible = true;

        // Add bounding box visualization

        this.scene.add(this.tshirtModel);
        this.updateTshirtColor();
        this.renderer.render(this.scene, this.camera);
      },
      (progress) => {
        console.log(
          'Loading progress:',
          (progress.loaded / progress.total) * 100 + '%'
        );
      },
      (error) => {
        console.error('Error loading t-shirt model:', error);
      }
    );
  }

  async toggleCamera() {
    if (this.isStreamActive) {
      this.stopDetection();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
            frameRate: { ideal: 30 },
          },
        });
        this.videoElement.nativeElement.srcObject = stream;
        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.videoElement.nativeElement.play();
          this.isStreamActive = true;
          this.startDetection();
        };
      } catch (error) {
        console.error('Error accessing camera:', error);
      }
    }
  }

  private stopDetection() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const stream = this.videoElement.nativeElement.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    this.videoElement.nativeElement.srcObject = null;
    this.isStreamActive = false;
  }
  private convertVideoToThreeCoords(x: number, y: number): THREE.Vector3 {
    const vector = new THREE.Vector3();
    const width = this.videoElement.nativeElement.videoWidth;
    const height = this.videoElement.nativeElement.videoHeight;

    vector.x = (x / width) * 2 - 1; // Convert to [-1, 1] range
    vector.y = -(y / height) * 2 + 1; // Flip Y axis
    vector.z = 0; // Start at camera plane

    vector.unproject(this.camera);
    vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / vector.z;
    return this.camera.position.clone().add(vector.multiplyScalar(distance));
  }
  private updateTshirtPosition(pose: poseDetection.Pose) {
    // try {
    //   const video = this.videoElement.nativeElement;
    //   const leftShoulder = pose.keypoints.find(
    //     (p) => p.name === 'left_shoulder'
    //   );
    //   const rightShoulder = pose.keypoints.find(
    //     (p) => p.name === 'right_shoulder'
    //   );
    //   const leftHip = pose.keypoints.find((p) => p.name === 'left_hip');
    //   const rightHip = pose.keypoints.find((p) => p.name === 'right_hip');

    //   if (
    //     !leftShoulder?.score ||
    //     !rightShoulder?.score ||
    //     !leftHip?.score ||
    //     !rightHip?.score
    //   )
    //     return;
    //   if (
    //     leftShoulder.score < 0.5 ||
    //     rightShoulder.score < 0.5 ||
    //     leftHip.score < 0.5 ||
    //     rightHip.score < 0.5
    //   )
    //     return;

    //   // Calculate body measurements
    //   const shoulderWidth = this.calculateDistance(leftShoulder, rightShoulder);
    //   const torsoHeight =
    //     (this.calculateDistance(leftShoulder, leftHip) +
    //       this.calculateDistance(rightShoulder, rightHip)) /
    //     2;

    //   // Calculate center point between shoulders, slightly lower for better t-shirt placement
    //   const centerX = (leftShoulder.x + rightShoulder.x) / 2;
    //   const centerY =
    //     (leftShoulder.y + rightShoulder.y) / 2 + shoulderWidth * 0.2; // Offset slightly down

    //   // Convert to normalized device coordinates (-1 to 1)
    //   const ndcX = (centerX / video.videoWidth) * 2 - 1;
    //   const ndcY = -(centerY / video.videoHeight) * 2 + 1;

    //   // Calculate scaling factors
    //   // These values might need adjustment based on your specific t-shirt model
    //   const baseScale = Math.min(video.videoWidth, video.videoHeight) / 1000;
    //   const widthScale = (shoulderWidth / video.videoWidth) * 15;
    //   const heightScale = (torsoHeight / video.videoHeight) * 12;

    //   // Calculate rotation based on shoulder angle
    //   const angle = Math.atan2(
    //     rightShoulder.y - leftShoulder.y,
    //     rightShoulder.x - leftShoulder.x
    //   );

    //   // Apply transforms with smoothing
    //   // Position
    //   const targetPosition = new THREE.Vector3(
    //     ndcX * 2.5, // Adjust multiplier based on your scene scale
    //     ndcY * 2, // Adjust multiplier based on your scene scale
    //     -0.5 // Adjust depth - smaller absolute value brings t-shirt closer to camera
    //   );
    //   this.tshirtModel.position.lerp(targetPosition, 0.3);

    //   // Scale
    //   const targetScale = Math.max(widthScale, heightScale) * baseScale;
    //   const currentScale = this.tshirtModel.scale.x;
    //   const newScale = currentScale + (targetScale - currentScale) * 0.3;
    //   this.tshirtModel.scale.set(newScale * 1.2, newScale, newScale * 0.5);

    //   // Rotation
    //   const currentRotation = this.tshirtModel.rotation.z;
    //   const targetRotation = angle;
    //   this.tshirtModel.rotation.z =
    //     currentRotation + (targetRotation - currentRotation) * 0.3;

    //   // Adjust camera parameters if needed
    //   this.camera.position.z = 3; // Adjust based on your scene
    //   this.camera.lookAt(0, 0, 0);
    // } catch (error) {
    //   console.error('Error updating t-shirt position:', error);
    // }
    const leftShoulder = pose.keypoints.find(
      (k: any) => k.name === 'left_shoulder'
    );
    const rightShoulder = pose.keypoints.find(
      (k: any) => k.name === 'right_shoulder'
    );
    const leftHip = pose.keypoints.find((k: any) => k.name === 'left_hip');
    const rightHip = pose.keypoints.find((k: any) => k.name === 'right_hip');

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x) / 250;
      const torsoHeight = Math.abs(leftHip.y - leftShoulder.y) / 250;
      const centerX = (leftShoulder.x + rightShoulder.x) / 2;
      const centerY = (leftShoulder.y + leftHip.y) / 2;
      // console.log(shoulderWidth * 3, torsoHeight * 2);
      this.tshirtModel.scale.set(shoulderWidth * 4, torsoHeight * 2, 1);
      this.tshirtModel.position.set(
        (leftShoulder.x + rightShoulder.x) / 620 - 1,
        -(leftShoulder.y + leftHip.y) / 170 + 1,
        0
      );
    }
  }
  // private updateTshirtPosition(pose: poseDetection.Pose) {
  //   try {
  //     const video = this.videoElement.nativeElement;
  //     const leftShoulder = pose.keypoints.find(
  //       (p) => p.name === 'left_shoulder'
  //     );
  //     const rightShoulder = pose.keypoints.find(
  //       (p) => p.name === 'right_shoulder'
  //     );
  //     const leftHip = pose.keypoints.find((p) => p.name === 'left_hip');
  //     const rightHip = pose.keypoints.find((p) => p.name === 'right_hip');

  //     if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
  //       throw new Error('Required keypoints not found');
  //     }

  //     // Get original model dimensions (add these as class properties)
  //     const originalWidth = 1.0; // Measure your actual model width
  //     const originalHeight = 1.5; // Measure your actual model height

  //     // Calculate body measurements in pixels
  //     const shoulderWidth = this.calculateDistance(leftShoulder, rightShoulder);
  //     const torsoHeight = this.calculateDistance(leftShoulder, leftHip);
  //     const hipWidth = this.calculateDistance(leftHip, rightHip);

  //     // Convert measurements to Three.js scene scale
  //     const shoulderScale = (shoulderWidth / video.videoWidth) * 4; // Adjust multiplier based on your scene
  //     const heightScale = (torsoHeight / video.videoHeight) * 3; // Adjust multiplier based on your scene
  //     const hipScale = (hipWidth / video.videoWidth) * 4;

  //     // Apply scaling

  //     this.tshirtModel.scale.set(
  //       shoulderScale * 2,
  //       heightScale * 1.8,
  //       (shoulderScale + hipScale) / 2
  //     );

  //     // Convert keypoints to Three.js coordinates
  //     const midpoint = this.calculateMidpoint(leftShoulder, rightShoulder);
  //     const sceneX = this.convertVideoToSceneX(midpoint.x);
  //     const sceneY = this.convertVideoToSceneY(midpoint.y);
  //     console.log(
  //       (midpoint.x / this.videoElement.nativeElement.videoWidth) * 2,
  //       -(midpoint.y / this.videoElement.nativeElement.videoHeight) * 2 + 1
  //     );
  //     // Position the T-shirt
  //     // console.log(sceneX * 2, sceneY * 1.5);
  //     // this.tshirtModel.position.set(
  //     //   sceneX * 2, // Adjust based on your camera view
  //     //   sceneY * 1.5, // Adjust vertical positioning
  //     //   0 // Keep in front of camera
  //     // );
  //     this.tshirtModel.position.set(
  //       (midpoint.x / this.videoElement.nativeElement.videoWidth) * 2, // Adjust based on your camera view
  //       -2, // Adjust vertical positioning
  //       0 // Keep in front of camera
  //     );
  //     // Adjust camera position if needed
  //     this.camera.position.z = 3;
  //   } catch (error) {
  //     console.error('Error updating t-shirt position:', error);
  //   }
  // }
  private convertVideoToSceneX(x: number): number {
    return (x / this.videoElement.nativeElement.videoWidth) * 2 - 1;
  }

  private convertVideoToSceneY(y: number): number {
    return -(y / this.videoElement.nativeElement.videoHeight) * 2 + 1;
  }
  // Helper function to calculate distance between keypoints
  calculateDistance(
    a: poseDetection.Keypoint,
    b: poseDetection.Keypoint
  ): number {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2) +
        (a.z && b.z ? Math.pow(a.z - b.z, 2) : 0)
    );
  }

  // Helper function to calculate midpoint between keypoints
  calculateMidpoint(
    a: poseDetection.Keypoint,
    b: poseDetection.Keypoint
  ): { x: number; y: number; z: number } {
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: ((a.z || 0) + (b.z || 0)) / 2,
    };
  }
  // private updateTshirtPosition(pose: poseDetection.Pose) {
  //   if (!this.tshirtModel) return;

  //   const leftShoulder = pose.keypoints.find((p) => p.name === 'left_shoulder');
  //   const rightShoulder = pose.keypoints.find(
  //     (p) => p.name === 'right_shoulder'
  //   );
  //   const leftHip = pose.keypoints.find((p) => p.name === 'left_hip');
  //   const rightHip = pose.keypoints.find((p) => p.name === 'right_hip');

  //   if (leftShoulder && rightShoulder && leftHip && rightHip) {
  //     // Compute the middle of shoulders
  //     const midX = (leftShoulder.x + rightShoulder.x) / 2;
  //     const midY = (leftShoulder.y + leftHip.y) / 2; // Move slightly lower to align

  //     // Normalize coordinates
  //     const normalizedX =
  //       (midX / this.videoElement.nativeElement.videoWidth) * 2 - 1;
  //     const normalizedY =
  //       -(midY / this.videoElement.nativeElement.videoHeight) * 2 + 1;

  //     // Adjust Y further down to align with chest
  //     this.tshirtModel.position.set(
  //       normalizedX * 3,
  //       normalizedY * 3 - 0.5,
  //       -1.5
  //     );
  //   }
  // }

  updateTshirtColor() {
    if (this.tshirtModel) {
      this.tshirtModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(this.tshirtColor),
            roughness: 0.7,
            metalness: 0.1,
          });
        }
      });
    }
  }

  ngOnDestroy() {
    this.stopDetection();
  }
  // private async startDetection() {
  //   if (!this.isStreamActive) return;

  //   try {
  //     const video = this.videoElement.nativeElement;

  //     if (video.readyState === video.HAVE_ENOUGH_DATA) {
  //       const poses = await this.detector.estimatePoses(video, {
  //         flipHorizontal: false,
  //         maxPoses: 1,
  //       });

  //       if (poses && poses.length > 0) {
  //         this.updateTshirtPosition(poses[0]);
  //       }
  //     }

  //     this.renderer.render(this.scene, this.camera);
  //     this.animationFrameId = requestAnimationFrame(() =>
  //       this.startDetection()
  //     );
  //   } catch (error) {
  //     console.error('Detection error:', error);
  //     // Don't stop detection on error, just continue
  //     this.animationFrameId = requestAnimationFrame(() =>
  //       this.startDetection()
  //     );
  //   }
  // }

  // private updateTshirtPosition(pose: poseDetection.Pose) {
  //   if (!this.tshirtModel) return;

  //   const leftShoulder = pose.keypoints.find(
  //     (kp) => kp.name === 'left_shoulder'
  //   );
  //   const rightShoulder = pose.keypoints.find(
  //     (kp) => kp.name === 'right_shoulder'
  //   );

  //   if (
  //     leftShoulder &&
  //     rightShoulder &&
  //     leftShoulder.x != null &&
  //     leftShoulder.y != null &&
  //     rightShoulder.x != null &&
  //     rightShoulder.y != null &&
  //     leftShoulder.score &&
  //     rightShoulder.score &&
  //     leftShoulder.score > 0.5 &&
  //     rightShoulder.score > 0.5
  //   ) {
  //     const centerX = (leftShoulder.x + rightShoulder.x) / 2;
  //     const centerY = (leftShoulder.y + rightShoulder.y) / 2;

  //     // Convert to normalized coordinates (-1 to 1)
  //     const x = (centerX / video.width) * 2 - 1;
  //     const y = -(centerY / video.height) * 2 + 1;

  //     // Calculate shoulder width for scaling
  //     const shoulderWidth = Math.sqrt(
  //       Math.pow(rightShoulder.x - leftShoulder.x, 2) +
  //         Math.pow(rightShoulder.y - leftShoulder.y, 2)
  //     );
  //     const scale = shoulderWidth / 320;

  //     // Smooth transitions using lerp
  //     this.lastValidPosition.x = this.lerp(this.lastValidPosition.x, x, 0.3);
  //     this.lastValidPosition.y = this.lerp(this.lastValidPosition.y, y, 0.3);
  //     this.lastValidPosition.scale = this.lerp(
  //       this.lastValidPosition.scale,
  //       scale,
  //       0.3
  //     );

  //     // Update t-shirt position and scale
  //     this.tshirtModel.position.set(
  //       this.lastValidPosition.x,
  //       this.lastValidPosition.y,
  //       0
  //     );

  //     // Calculate and apply rotation
  //     const angle = Math.atan2(
  //       rightShoulder.y - leftShoulder.y,
  //       rightShoulder.x - leftShoulder.x
  //     );
  //     this.tshirtModel.rotation.z = this.lerp(
  //       this.tshirtModel.rotation.z,
  //       angle,
  //       0.3
  //     );

  //     const uniformScale = this.lastValidPosition.scale;
  //     this.tshirtModel.scale.set(uniformScale, uniformScale, uniformScale);
  //   }
  // }
  // private updateTshirtPosition(pose: poseDetection.Pose) {
  //   if (!this.tshirtModel || !this.videoElement?.nativeElement) return;

  //   const leftShoulder = pose.keypoints.find(
  //     (kp) => kp.name === 'left_shoulder'
  //   );
  //   const rightShoulder = pose.keypoints.find(
  //     (kp) => kp.name === 'right_shoulder'
  //   );

  //   if (
  //     leftShoulder &&
  //     rightShoulder &&
  //     leftShoulder.x != null &&
  //     leftShoulder.y != null &&
  //     rightShoulder.x != null &&
  //     rightShoulder.y != null &&
  //     leftShoulder.score &&
  //     rightShoulder.score &&
  //     leftShoulder.score > 0.5 &&
  //     rightShoulder.score > 0.5
  //   ) {
  //     const centerX = (leftShoulder.x + rightShoulder.x) / 2;
  //     const centerY = (leftShoulder.y + rightShoulder.y) / 2;

  //     // Convert to normalized coordinates (-1 to 1)
  //     const x = (centerX / this.videoElement.nativeElement.videoWidth) * 2 - 1;
  //     const y =
  //       -(centerY / this.videoElement.nativeElement.videoHeight) * 2 + 1;

  //     // Calculate shoulder width for scaling
  //     const shoulderWidth = Math.sqrt(
  //       Math.pow(rightShoulder.x - leftShoulder.x, 2) +
  //         Math.pow(rightShoulder.y - leftShoulder.y, 2)
  //     );
  //     const scale = shoulderWidth / 320;

  //     // Smooth transitions using lerp
  //     this.lastValidPosition.x = this.lerp(this.lastValidPosition.x, x, 0.3);
  //     this.lastValidPosition.y = this.lerp(this.lastValidPosition.y, y, 0.3);
  //     this.lastValidPosition.scale = this.lerp(
  //       this.lastValidPosition.scale,
  //       scale,
  //       0.3
  //     );

  //     // Update t-shirt position and scale
  //     this.tshirtModel.position.set(
  //       this.lastValidPosition.x,
  //       this.lastValidPosition.y,
  //       0
  //     );

  //     // Calculate and apply rotation
  //     const angle = Math.atan2(
  //       rightShoulder.y - leftShoulder.y,
  //       rightShoulder.x - leftShoulder.x
  //     );
  //     this.tshirtModel.rotation.z = this.lerp(
  //       this.tshirtModel.rotation.z,
  //       angle,
  //       0.3
  //     );

  //     const uniformScale = this.lastValidPosition.scale;
  //     this.tshirtModel.scale.set(uniformScale, uniformScale, uniformScale);
  //   }
  // }
  // private lerp(start: number, end: number, t: number): number {
  //   return start * (1 - t) + end * t;
  // }
}
