// ==================== js/uploadManager.js ====================
// مدير رفع متقدم مع شريط تقدم وإمكانية الإلغاء

class UploadManager {
    constructor() {
        this.activeUploads = new Map();
        this.maxConcurrent = 3;
    }
    
    // رفع ملف واحد مع تتبع التقدم
    async uploadFile(file, options = {}) {
        const {
            cloudName = 'daxh9u5dc',
            uploadPreset = 'aulobylemmouchi',
            folder = 'aulobylemmouchi/general',
            resourceType = 'auto',
            onProgress,
            onComplete,
            onError,
            signal
        } = options;
        
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
        
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);
            formData.append('folder', folder);
            
            const xhr = new XMLHttpRequest();
            const uploadId = Date.now() + Math.random().toString(36).substring(2);
            
            // حفظ المرجع للإلغاء
            this.activeUploads.set(uploadId, xhr);
            
            if (signal) {
                signal.addEventListener('abort', () => {
                    xhr.abort();
                    this.activeUploads.delete(uploadId);
                });
            }
            
            // تتبع التقدم
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percent = (e.loaded / e.total) * 100;
                    onProgress(percent);
                }
            });
            
            xhr.onload = () => {
                this.activeUploads.delete(uploadId);
                
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (onComplete) onComplete(response);
                        resolve(response);
                    } catch (e) {
                        const error = new Error('فشل في تحليل الاستجابة');
                        if (onError) onError(error);
                        reject(error);
                    }
                } else {
                    const error = new Error(`فشل الرفع: ${xhr.status}`);
                    if (onError) onError(error);
                    reject(error);
                }
            };
            
            xhr.onerror = () => {
                this.activeUploads.delete(uploadId);
                const error = new Error('فشل الاتصال بالسيرفر');
                if (onError) onError(error);
                reject(error);
            };
            
            xhr.ontimeout = () => {
                this.activeUploads.delete(uploadId);
                const error = new Error('انتهت مهلة الرفع');
                if (onError) onError(error);
                reject(error);
            };
            
            xhr.open('POST', url, true);
            xhr.send(formData);
        });
    }
    
    // رفع مجموعة ملفات
    async uploadMultiple(files, options = {}) {
        const {
            folder,
            resourceType = 'auto',
            onFileProgress,
            onOverallProgress,
            onFileComplete,
            concurrency = this.maxConcurrent
        } = options;
        
        const results = [];
        let completed = 0;
        const total = files.length;
        
        for (let i = 0; i < files.length; i += concurrency) {
            const batch = files.slice(i, i + concurrency);
            const batchPromises = batch.map(async (file, index) => {
                try {
                    const result = await this.uploadFile(file, {
                        folder,
                        resourceType,
                        onProgress: (percent) => {
                            if (onFileProgress) {
                                onFileProgress(file.name, percent, i + index);
                            }
                        }
                    });
                    
                    completed++;
                    if (onOverallProgress) {
                        onOverallProgress((completed / total) * 100);
                    }
                    if (onFileComplete) {
                        onFileComplete(result, i + index);
                    }
                    
                    return { status: 'fulfilled', value: result, index: i + index };
                } catch (error) {
                    completed++;
                    if (onOverallProgress) {
                        onOverallProgress((completed / total) * 100);
                    }
                    return { status: 'rejected', reason: error, index: i + index };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }
    
    // إلغاء رفع معين
    abortUpload(uploadId) {
        const xhr = this.activeUploads.get(uploadId);
        if (xhr) {
            xhr.abort();
            this.activeUploads.delete(uploadId);
            return true;
        }
        return false;
    }
    
    // إلغاء جميع الرفعات
    abortAll() {
        this.activeUploads.forEach(xhr => xhr.abort());
        this.activeUploads.clear();
    }
    
    // الحصول على عدد الرفعات النشطة
    getActiveCount() {
        return this.activeUploads.size;
    }
}

// إنشاء نسخة عامة
const uploadManager = new UploadManager();