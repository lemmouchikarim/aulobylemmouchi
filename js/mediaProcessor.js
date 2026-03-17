// ==================== js/mediaProcessor.js ====================
// معالج الوسائط المتكامل - ضغط وتحسين الصور والفيديوهات قبل الرفع

class MediaProcessor {
    constructor() {
        this.maxImageWidth = 1200;
        this.maxImageHeight = 1200;
        this.imageQuality = 0.85;
        this.maxVideoDuration = 60; // ثانية
        this.maxVideoSize = 25 * 1024 * 1024; // 25 ميجابايت
        this.supportedImageFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        this.supportedVideoFormats = ['video/mp4', 'video/webm', 'video/quicktime'];
    }

    // ==================== معالجة الصور ====================
    async processImage(file, options = {}) {
        const {
            maxWidth = this.maxImageWidth,
            maxHeight = this.maxImageHeight,
            quality = this.imageQuality,
            format = 'image/webp'
        } = options;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                
                img.onload = () => {
                    // حساب الأبعاد الجديدة مع الحفاظ على النسبة
                    let { width, height } = this.calculateDimensions(img.width, img.height, maxWidth, maxHeight);
                    
                    // إنشاء Canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    // رسم الصورة بالأبعاد الجديدة
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // تحويل إلى الصيغة المطلوبة
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('فشل في معالجة الصورة'));
                            return;
                        }
                        
                        // إنشاء ملف جديد
                        const processedFile = new File([blob], this.generateFileName(file.name, 'webp'), {
                            type: format,
                            lastModified: Date.now()
                        });
                        
                        resolve({
                            file: processedFile,
                            originalSize: file.size,
                            processedSize: blob.size,
                            compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1),
                            width,
                            height,
                            format: format
                        });
                    }, format, quality);
                };
                
                img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
            };
            
            reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
        });
    }

    // ==================== معالجة الفيديو (باستخدام MediaRecorder) ====================
    async processVideo(file, options = {}) {
        const {
            maxDuration = this.maxVideoDuration,
            targetSize = this.maxVideoSize,
            targetWidth = 720,
            targetHeight = 1280
        } = options;

        // التحقق من المدة
        const duration = await this.getVideoDuration(file);
        if (duration > maxDuration) {
            throw new Error(`مدة الفيديو تتجاوز ${maxDuration} ثانية`);
        }

        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.muted = true;
            video.crossOrigin = 'anonymous';
            
            video.onloadedmetadata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                const stream = canvas.captureStream(30);
                
                // التقاط الصوت إذا وجد
                if (video.mozHasAudio || video.webkitAudioDecodedByteCount) {
                    try {
                        const audioStream = video.captureStream();
                        if (audioStream.getAudioTracks().length > 0) {
                            stream.addTrack(audioStream.getAudioTracks()[0]);
                        }
                    } catch (e) {
                        console.log('No audio track captured');
                    }
                }
                
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp8,opus',
                    videoBitsPerSecond: this.calculateBitrate(targetSize, duration)
                });
                
                const chunks = [];
                
                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        chunks.push(e.data);
                    }
                };
                
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    
                    const processedFile = new File([blob], this.generateFileName(file.name, 'webm'), {
                        type: 'video/webm',
                        lastModified: Date.now()
                    });
                    
                    URL.revokeObjectURL(video.src);
                    
                    resolve({
                        file: processedFile,
                        originalSize: file.size,
                        processedSize: blob.size,
                        compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1),
                        format: 'video/webm',
                        duration: duration
                    });
                };
                
                mediaRecorder.onerror = (e) => {
                    reject(new Error('فشل في معالجة الفيديو'));
                };
                
                // تشغيل الفيديو والتسجيل
                video.play().then(() => {
                    mediaRecorder.start();
                    
                    // تسجيل لمدة الفيديو
                    setTimeout(() => {
                        mediaRecorder.stop();
                        video.pause();
                    }, duration * 1000);
                    
                }).catch(e => {
                    reject(new Error('فشل في تشغيل الفيديو'));
                });
            };
            
            video.onerror = () => reject(new Error('فشل في تحميل الفيديو'));
        });
    }

    // ==================== معالجة الصوت ====================
    async processAudio(file, options = {}) {
        const {
            targetBitrate = 96000,
            format = 'audio/webm'
        } = options;

        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const audioData = await audioContext.decodeAudioData(e.target.result);
                    
                    const destination = audioContext.createMediaStreamDestination();
                    const source = audioContext.createBufferSource();
                    source.buffer = audioData;
                    source.connect(destination);
                    
                    const mediaRecorder = new MediaRecorder(destination.stream, {
                        mimeType: 'audio/webm;codecs=opus',
                        audioBitsPerSecond: targetBitrate
                    });
                    
                    const chunks = [];
                    
                    mediaRecorder.ondataavailable = (e) => {
                        if (e.data.size > 0) {
                            chunks.push(e.data);
                        }
                    };
                    
                    mediaRecorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'audio/webm' });
                        
                        const processedFile = new File([blob], this.generateFileName(file.name, 'webm'), {
                            type: 'audio/webm',
                            lastModified: Date.now()
                        });
                        
                        audioContext.close();
                        
                        resolve({
                            file: processedFile,
                            originalSize: file.size,
                            processedSize: blob.size,
                            compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1),
                            format: 'audio/webm',
                            duration: audioData.duration
                        });
                    };
                    
                    source.start();
                    mediaRecorder.start();
                    
                    setTimeout(() => {
                        mediaRecorder.stop();
                        source.stop();
                    }, audioData.duration * 1000);
                    
                } catch (error) {
                    reject(new Error('فشل في معالجة الصوت'));
                }
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // ==================== دوال مساعدة ====================
    calculateDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        let width = originalWidth;
        let height = originalHeight;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }

    calculateBitrate(targetSize, duration) {
        const targetBits = targetSize * 8 * 0.8;
        return Math.round(targetBits / duration);
    }

    getVideoDuration(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            video.onerror = () => reject(new Error('فشل في قراءة مدة الفيديو'));
            video.src = URL.createObjectURL(file);
        });
    }

    generateFileName(originalName, newExtension) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || 'file';
        return `${nameWithoutExt}_${timestamp}_${random}.${newExtension}`;
    }

    getImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('فشل في إنشاء المعاينة'));
            reader.readAsDataURL(file);
        });
    }

    isFormatSupported(file, type = 'image') {
        const formats = type === 'image' ? this.supportedImageFormats : this.supportedVideoFormats;
        return formats.includes(file.type);
    }
}

// إنشاء نسخة عامة
const mediaProcessor = new MediaProcessor();