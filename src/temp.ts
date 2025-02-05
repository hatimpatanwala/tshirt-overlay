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
