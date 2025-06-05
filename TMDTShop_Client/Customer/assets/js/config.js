// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDE2e4kVbx-FI1bZqNFPH7gPfyUHreYlgM",
    authDomain: "shopx-a9954.firebaseapp.com",
    projectId: "shopx-a9954",
    storageBucket: "shopx-a9954.firebasestorage.app",
    messagingSenderId: "318593412881",
    appId: "1:318593412881:web:3f785d1d6ea2325bece6b0",
    measurementId: "G-P5V81N7HY8"
  };

export { firebaseConfig }; 

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================
window.CLOUDINARY_CONFIG = {
  // ✅ THAY ĐỔI THÔNG TIN CLOUDINARY CỦA BẠN
  cloudName: 'dgewgggyd',     // Thay bằng cloud name thực
  apiKey: 'your-api-ke286925478745232',           // Thay bằng API key thực
  apiSecret: 'v7rdGpsuoyUbOday1v2VEPaLB5s',     // Chỉ dùng server-side
  uploadPreset: 'MinhVid',     // Tạo unsigned upload preset
  
  // Video transformation presets
  videoTransforms: {
    thumbnail: 'w_280,h_160,c_fill,q_auto,f_auto,so_3',
    preview: 'w_400,h_225,c_fill,q_auto,f_auto,so_3',
    small: 'w_640,h_360,q_auto,f_auto',
    medium: 'w_1280,h_720,q_auto,f_auto', 
    large: 'w_1920,h_1080,q_auto,f_auto',
    hd: 'w_1920,h_1080,q_auto,f_auto,br_3000k',
    auto: 'q_auto,f_auto'
  },
  
  // Quality presets
  qualityPresets: {
    'auto': { transform: 'q_auto,f_auto', bitrate: 'auto' },
    '1080p': { transform: 'q_auto,f_auto,h_1080', bitrate: '3000k' },
    '720p': { transform: 'q_auto,f_auto,h_720', bitrate: '2000k' },
    '480p': { transform: 'q_auto,f_auto,h_480', bitrate: '1000k' },
    '360p': { transform: 'q_auto,f_auto,h_360', bitrate: '500k' }
  },
  
  // Auto optimization settings
  autoOptimize: true,
  adaptiveStreaming: true,
  secureDelivery: true,
  
  // CDN settings
  cdnSubdomain: true,
  privateCdn: false,
  
  // Analytics & tracking
  analytics: {
    enabled: true,
    trackViews: true,
    trackClicks: true,
    trackShares: true
  }
};

// ============================================
// VIDEO DATA CONFIGURATION
// ============================================
window.VIDEO_DATA_CONFIG = {
  // ✅ CHANGE TO 'direct' 
  dataSource: 'direct', // 'api' | 'static' | 'cloudinary' | 'direct'
  
  // API endpoints
  apiEndpoints: {
    videos: '/api/Media/videos',
    analytics: '/api/Analytics/video-events',
    userViews: '/api/Analytics/user-video-views'
  },
  
  // ✅ THÊM DIRECT VIDEOS
  directVideos: [
    {
      id: 'QC_ra3szr',
      title: 'Video Quảng Cáo Siêu Sale 2024',
      description: 'Khuyến mãi lớn nhất năm với hàng ngàn sản phẩm giảm giá sâu. Đừng bỏ lỡ cơ hội tuyệt vời này!',
      badge: 'HOT SALE',
      features: [
        'Giảm giá đến 70%',
        'Miễn phí vận chuyển toàn quốc',
        'Bảo hành chính hãng 12 tháng',
        'Đổi trả miễn phí trong 30 ngày',
        'Hỗ trợ trả góp 0%'
      ],
      ctaText: 'Mua ngay',
      ctaLink: '#featuredProductsContainer',
      
      // ✅ DIRECT URL
      directUrl: 'https://res.cloudinary.com/dgewgggyd/video/upload/v1748334856/QC_ra3szr.mp4',
      
      // ✅ MULTIPLE SOURCES
      sources: {
        auto: 'https://res.cloudinary.com/dgewgggyd/video/upload/q_auto,f_auto/v1748334856/QC_ra3szr',
        '1080p': 'https://res.cloudinary.com/dgewgggyd/video/upload/q_auto,f_auto,h_1080/v1748334856/QC_ra3szr',
        '720p': 'https://res.cloudinary.com/dgewgggyd/video/upload/q_auto,f_auto,h_720/v1748334856/QC_ra3szr',
        '480p': 'https://res.cloudinary.com/dgewgggyd/video/upload/q_auto,f_auto,h_480/v1748334856/QC_ra3szr',
        '360p': 'https://res.cloudinary.com/dgewgggyd/video/upload/q_auto,f_auto,h_360/v1748334856/QC_ra3szr'
      },
      
      // ✅ THUMBNAIL
      thumbnail: 'https://res.cloudinary.com/dgewgggyd/video/upload/w_280,h_160,c_fill,q_auto,f_auto,so_3/v1748334856/QC_ra3szr.jpg',
      
      duration: 30,
      views: 1500,
      priority: 1,
      active: true
    }
  ],
  
};

// ============================================
// PLAYER CONFIGURATION
// ============================================
window.PLAYER_CONFIG = {
  // Autoplay settings
  autoplay: {
    enabled: true,
    delay: 1000,
    muted: true,
    playsinline: true
  },
  
  // Controls settings
  controls: {
    showPlayPause: true,
    showProgress: true,
    showVolume: true,
    showFullscreen: true,
    showQuality: true,
    showShare: true,
    showTimestamp: true
  },
  
  // Playlist settings
  playlist: {
    autoAdvance: true,
    loop: true,
    shuffleEnabled: false,
    advanceDelay: 2000
  },
  
  // Performance settings
  performance: {
    preload: 'metadata',
    bufferSize: '5MB',
    maxRetries: 3,
    retryDelay: 1000
  },
  
  // UI settings
  ui: {
    theme: 'dark',
    showViewCounter: true,
    showLiveBadge: true,
    animateProgress: true,
    fadeOverlay: true
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================
window.CloudinaryHelpers = {
  getDirectVideoSources(videoData, quality = 'auto') {
    console.log('🎬 Getting direct video sources for:', videoData.id, 'quality:', quality);
    
    if (videoData.sources && videoData.sources[quality]) {
      return {
        mp4: videoData.sources[quality] + '.mp4',
        webm: videoData.sources[quality] + '.webm'
      };
    }
    
    // Fallback to direct URL
    if (videoData.directUrl) {
      return {
        mp4: videoData.directUrl,
        webm: videoData.directUrl.replace('.mp4', '.webm')
      };
    }
    
    // Generate from public ID
    return this.getVideoSources(videoData.id, quality);
  },
  
  // ✅ NEW: Validate direct video URL
  validateVideoUrl(url) {
    return url && (url.includes('cloudinary.com') || url.includes('.mp4') || url.includes('.webm'));
  },
  // Generate video URL with transformations
  getVideoUrl(publicId, quality = 'auto', format = 'mp4') {
    const config = window.CLOUDINARY_CONFIG;
    const baseUrl = `https://res.cloudinary.com/${config.cloudName}/video/upload`;
    
    const qualityConfig = config.qualityPresets[quality] || config.qualityPresets['auto'];
    const transform = qualityConfig.transform;
    
    return `${baseUrl}/${transform}/${publicId}.${format}`;
  },
  
  // Generate thumbnail URL
  getThumbnailUrl(publicId, width = 280, height = 160, timeOffset = 3) {
    const config = window.CLOUDINARY_CONFIG;
    const baseUrl = `https://res.cloudinary.com/${config.cloudName}/video/upload`;
    
    return `${baseUrl}/w_${width},h_${height},c_fill,q_auto,f_auto,so_${timeOffset}/${publicId}.jpg`;
  },
  
  // Generate multiple video sources
  getVideoSources(publicId, quality = 'auto') {
    return {
      mp4: this.getVideoUrl(publicId, quality, 'mp4'),
      webm: this.getVideoUrl(publicId, quality, 'webm'),
      hls: this.getVideoUrl(publicId, quality, 'm3u8')
    };
  },
  
  // Check if Cloudinary is configured
  isConfigured() {
  const config = window.CLOUDINARY_CONFIG;
  return config.cloudName && config.cloudName === 'dgewgggyd';
},
  
  // Get secure delivery URL
  getSecureUrl(publicId, transform = '') {
    const config = window.CLOUDINARY_CONFIG;
    const protocol = config.secureDelivery ? 'https' : 'http';
    return `${protocol}://res.cloudinary.com/${config.cloudName}/video/upload/${transform}/${publicId}`;
  }
};

// ============================================
// VALIDATION & INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Validate configuration
  if (!window.CloudinaryHelpers.isConfigured()) {
    console.warn('⚠️ Cloudinary chưa được cấu hình. Vui lòng cập nhật CLOUDINARY_CONFIG trong config.js');
  } else {
    console.log('✅ Cloudinary configuration loaded successfully');
  }
  
  // Log configuration status
  console.log('📊 Video system configuration:', {
    cloudinary: window.CloudinaryHelpers.isConfigured(),
    videoData: !!window.VIDEO_DATA_CONFIG,
    playerConfig: !!window.PLAYER_CONFIG
  });
});

console.log('🔧 Config.js loaded successfully');