// ============================================
// SIMPLE VIDEO PLAYER COMPONENT
// ============================================
function simpleVideoPlayer() {
    return {
      // State
      isPlaying: false,
      isLoading: true,
      hasError: false,
      isMuted: true,
      hasStartedPlaying: false,
      currentTime: 0,
      duration: 0,
      progress: 0,
      errorMessage: '',
      
      // Video data
      currentVideo: {
        id: 'QC_ra3szr',
        title: 'Video Quảng Cáo Siêu Sale 2024',
        description: 'Khuyến mãi lớn nhất năm với hàng ngàn sản phẩm giảm giá sâu. Đừng bỏ lỡ cơ hội tuyệt vời này!',
        badge: 'HOT DEAL',
        ctaText: 'Mua ngay',
        ctaLink: '#featuredProductsContainer',
        directUrl: 'https://res.cloudinary.com/dgewgggyd/video/upload/v1748334856/QC_ra3szr.mp4',
        thumbnail: 'https://res.cloudinary.com/dgewgggyd/video/upload/w_1200,h_675,c_fill,q_auto,f_auto,so_3/v1748334856/QC_ra3szr.jpg'
      },
  
      // ============================================
      // INITIALIZATION
      // ============================================
      init() {
        console.log('🎬 Simple Video Player initializing...');
        this.setupVideo();
        this.setupEvents();
      },
  
      setupVideo() {
        const video = this.$refs.videoPlayer;
        if (!video) {
          console.error('❌ Video element not found');
          return;
        }
  
        // Clear existing sources
        video.innerHTML = '';
        
        // Add video source
        const source = document.createElement('source');
        source.src = this.currentVideo.directUrl;
        source.type = 'video/mp4';
        video.appendChild(source);
        
        // Set video properties
        video.muted = this.isMuted;
        video.playsInline = true;
        video.preload = 'metadata';
        
        // Load video
        video.load();
        
        console.log('✅ Video setup completed');
      },
  
      setupEvents() {
        const video = this.$refs.videoPlayer;
        if (!video) return;
  
        // Update progress
        video.addEventListener('timeupdate', () => {
          if (video.duration) {
            this.currentTime = video.currentTime;
            this.duration = video.duration;
            this.progress = (video.currentTime / video.duration) * 100;
          }
        });
  
        // Error handling
        video.addEventListener('error', (e) => {
          console.error('❌ Video error:', e);
          this.hasError = true;
          this.isLoading = false;
          this.errorMessage = 'Không thể tải video. Vui lòng thử lại.';
        });
      },
  
      // ============================================
      // EVENT HANDLERS
      // ============================================
      onVideoLoaded() {
        console.log('✅ Video loaded successfully');
        this.isLoading = false;
        this.hasError = false;
        this.duration = this.$refs.videoPlayer.duration;
      },
  
      onVideoEnded() {
        console.log('🔚 Video ended');
        this.isPlaying = false;
        // Reset to show overlay again
        setTimeout(() => {
          this.hasStartedPlaying = false;
        }, 1000);
      },
  
      onVideoError() {
        console.error('❌ Video error occurred');
        this.hasError = true;
        this.isLoading = false;
        this.errorMessage = 'Không thể phát video. Vui lòng kiểm tra kết nối mạng.';
      },
  
      updateProgress() {
        const video = this.$refs.videoPlayer;
        if (video && video.duration) {
          this.currentTime = video.currentTime;
          this.duration = video.duration;
          this.progress = (video.currentTime / video.duration) * 100;
        }
      },
  
      // ============================================
      // CONTROLS
      // ============================================
      async togglePlayPause() {
        const video = this.$refs.videoPlayer;
        if (!video) return;
  
        try {
          if (this.isPlaying) {
            video.pause();
            this.isPlaying = false;
          } else {
            await video.play();
            this.isPlaying = true;
            this.hasStartedPlaying = true;
          }
        } catch (error) {
          console.warn('⚠️ Play/pause failed:', error);
          if (error.name === 'NotAllowedError') {
            alert('Vui lòng bấm vào video để phát.');
          }
        }
      },
  
      toggleMute() {
        const video = this.$refs.videoPlayer;
        if (!video) return;
        
        video.muted = !video.muted;
        this.isMuted = video.muted;
      },
  
      seekTo(event) {
        const video = this.$refs.videoPlayer;
        if (!video || !video.duration) return;
        
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const percent = (event.clientX - rect.left) / rect.width;
        const seekTime = percent * video.duration;
        
        video.currentTime = seekTime;
      },
  
      toggleFullscreen() {
        const videoContainer = this.$refs.videoPlayer.closest('section');
        
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          videoContainer.requestFullscreen().catch(err => {
            console.warn('Fullscreen not supported:', err);
          });
        }
      },
  
      retryVideo() {
        console.log('🔄 Retrying video...');
        this.hasError = false;
        this.errorMessage = '';
        this.isLoading = true;
        this.setupVideo();
      },
  
      // ============================================
      // UTILITIES
      // ============================================
      formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
      }
    }
  }
  