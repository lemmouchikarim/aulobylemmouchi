// ==================== js/cloudinaryConfig.js ====================
// إعدادات Cloudinary المتقدمة للتحسين التلقائي

const cloudinaryConfig = {
    cloudName: "daxh9u5dc",
    uploadPreset: "aulobylemmouchi",
    
    // إعدادات تحسين الصور
    imageTransformation: {
        quality: "auto:good",
        fetch_format: "auto",
        dpr: "auto",
        flags: "lossy",
        crop: "limit",
        width: 1200,
        height: 1200
    },
    
    // إعدادات تحسين الفيديو
    videoTransformation: {
        quality: "auto",
        fetch_format: "auto",
        flags: "lossy",
        width: 720,
        height: 1280,
        video_codec: "h264",
        audio_codec: "aac",
        bit_rate: "800k"
    },
    
    // إعدادات الصور الشخصية
    avatarTransformation: {
        quality: "auto",
        fetch_format: "auto",
        width: 200,
        height: 200,
        crop: "thumb",
        gravity: "face",
        radius: "max"
    },
    
    // إعدادات صور المنشورات
    postImageTransformation: {
        quality: "auto:good",
        fetch_format: "auto",
        width: 800,
        height: 800,
        crop: "limit",
        flags: "lossy"
    },
    
    // إعدادات فيديوهات المنشورات
    postVideoTransformation: {
        quality: "auto",
        fetch_format: "auto",
        width: 480,
        height: 640,
        video_codec: "h264",
        audio_codec: "aac",
        bit_rate: "500k"
    },
    
    // إعدادات وسائط الدردشة
    chatMediaTransformation: {
        quality: "auto",
        fetch_format: "auto",
        width: 400,
        height: 400,
        crop: "limit",
        flags: "lossy"
    },
    
    // دوال لتوليد روابط محسنة
    getOptimizedImageUrl(publicId, options = {}) {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/`;
        const transformations = { ...this.imageTransformation, ...options };
        
        const transString = Object.entries(transformations)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}_${value}`)
            .join(',');
        
        return `${baseUrl}${transString}/${publicId}`;
    },
    
    getOptimizedVideoUrl(publicId, options = {}) {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/video/upload/`;
        const transformations = { ...this.videoTransformation, ...options };
        
        const transString = Object.entries(transformations)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}_${value}`)
            .join(',');
        
        return `${baseUrl}${transString}/${publicId}`;
    },
    
    getOptimizedAvatarUrl(publicId) {
        return this.getOptimizedImageUrl(publicId, this.avatarTransformation);
    },
    
    getOptimizedPostImageUrl(publicId) {
        return this.getOptimizedImageUrl(publicId, this.postImageTransformation);
    },
    
    getOptimizedPostVideoUrl(publicId) {
        return this.getOptimizedVideoUrl(publicId, this.postVideoTransformation);
    },
    
    getOptimizedChatMediaUrl(publicId, type = 'image') {
        if (type === 'image') {
            return this.getOptimizedImageUrl(publicId, this.chatMediaTransformation);
        } else {
            return this.getOptimizedVideoUrl(publicId, this.chatMediaTransformation);
        }
    },
    
    // الحصول على صورة مصغرة للفيديو
    getVideoThumbnail(publicId, options = {}) {
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/video/upload/`;
        const transformations = {
            width: 300,
            height: 300,
            crop: 'fill',
            format: 'jpg'
        };
        
        const transString = Object.entries(transformations)
            .map(([key, value]) => `${key}_${value}`)
            .join(',');
        
        return `${baseUrl}${transString}/${publicId}.jpg`;
    }
};