// ==================== js/chatMediaProcessor.js ====================
// معالج وسائط الدردشة - ضغط وتحسين الصور والفيديوهات للمحادثات

class ChatMediaProcessor {
    constructor() {
        // أحجام أصغر للدردشة
        this.maxImageWidth = 800;
        this.maxImageHeight = 800;
        this.imageQuality = 0.75; // جودة أقل للدردشة
        this.maxVideoDuration = 30; // 30 ثانية حد أقصى للدردشة
        this.maxVideoSize = 10 * 1024 * 1024; // 10 ميجابايت
        this.maxAudioDuration = 120; // دقيقتين حد أقصى للتسجيل الصوتي
        this.supportedFormats = {
            image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            video: ['video/mp4', 'video/webm', 'video/quicktime'],
            audio: ['audio/webm', 'audio/mp3', 'audio/wav']
        };
    }

    // ==================== معالجة صور الدردشة ====================
    async processChatImage(file, options = {}) {
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
                    // حساب الأبعاد الجديدة
                    let { width, height } = this.calculateDimensions(img.width, img.height, maxWidth, maxHeight);
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('فشل في معالجة الصورة'));
                            return;
                        }
                        
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
                            height
                        });
                    }, format, quality);
                };
                
                img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
            };
            
            reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
        });
    }

    // ==================== معالجة فيديوهات الدردشة (قصيرة) ====================
    async processChatVideo(file, options = {}) {
        const {
            maxDuration = this.maxVideoDuration,
            targetSize = this.maxVideoSize,
            targetWidth = 480, // دقة أقل للدردشة
            targetHeight = 640
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
            
            video.onloadedmetadata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                
                const ctx = canvas.getContext('2d');
                const stream = canvas.captureStream(15); // 15 إطار في الثانية للدردشة
                
                // التقاط الصوت
                try {
                    const audioStream = video.captureStream();
                    if (audioStream.getAudioTracks().length > 0) {
                        stream.addTrack(audioStream.getAudioTracks()[0]);
                    }
                } catch (e) {
                    console.log('No audio track');
                }
                
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'video/webm;codecs=vp8,opus',
                    videoBitsPerSecond: this.calculateBitrate(targetSize, duration, 0.7) // 70% من الحجم المستهدف
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
                        duration: duration
                    });
                };
                
                video.play().then(() => {
                    mediaRecorder.start();
                    
                    setTimeout(() => {
                        mediaRecorder.stop();
                        video.pause();
                    }, duration * 1000);
                    
                }).catch(reject);
            };
            
            video.onerror = () => reject(new Error('فشل في تحميل الفيديو'));
        });
    }

    // ==================== معالجة التسجيلات الصوتية للدردشة ====================
    async processChatAudio(file, options = {}) {
        const {
            targetBitrate = 64000, // 64 kbps للدردشة
            maxDuration = this.maxAudioDuration,
            format = 'audio/webm'
        } = options;

        return new Promise((resolve, reject) => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const audioData = await audioContext.decodeAudioData(e.target.result);
                    
                    if (audioData.duration > maxDuration) {
                        throw new Error(`مدة التسجيل تتجاوز ${maxDuration} ثانية`);
                    }
                    
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
                        
                        const processedFile = new File([blob], this.generateFileName('voice', 'webm'), {
                            type: 'audio/webm',
                            lastModified: Date.now()
                        });
                        
                        audioContext.close();
                        
                        resolve({
                            file: processedFile,
                            originalSize: file.size,
                            processedSize: blob.size,
                            compressionRatio: ((file.size - blob.size) / file.size * 100).toFixed(1),
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
                    reject(error);
                }
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    // ==================== إنشاء صورة مصغرة للفيديو ====================
    async generateVideoThumbnail(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.currentTime = 1; // الإطار الأول
            
            video.onloadeddata = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 160;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(video.src);
                    resolve(URL.createObjectURL(blob));
                }, 'image/jpeg', 0.7);
            };
            
            video.onerror = reject;
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

    calculateBitrate(targetSize, duration, factor = 0.8) {
        const targetBits = targetSize * 8 * factor;
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

    generateFileName(originalName, extension) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `chat_${timestamp}_${random}.${extension}`;
    }

    getImagePreview(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('فشل في إنشاء المعاينة'));
            reader.readAsDataURL(file);
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
}

// إنشاء نسخة عامة
const chatMediaProcessor = new ChatMediaProcessor();