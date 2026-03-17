// ==================== js/post.js ====================
// إنشاء المنشورات الجديدة مع رفع الوسائط إلى Cloudinary

let selectedFiles = [];
let audioBlob = null;
let mediaRecorder = null;
let recordingTimer = null;
let recordingSeconds = 0;

const postText = document.getElementById('post-text');
const publishBtn = document.getElementById('publish-btn');
const mediaPreview = document.getElementById('media-preview');
const imgInput = document.getElementById('img-input');
const videoInput = document.getElementById('video-input');
const recordBtn = document.getElementById('record-btn');
const recordTimer = document.getElementById('record-timer');

// إنشاء عناصر شريط التقدم
const progressDiv = document.createElement('div');
progressDiv.id = 'upload-progress';
progressDiv.style.display = 'none';
progressDiv.style.margin = '10px 0';
progressDiv.innerHTML = `
    <div style="background: #f0f0f0; border-radius: 10px; height: 20px; overflow: hidden;">
        <div id="progress-bar" style="background: var(--primary-color); width: 0%; height: 100%; transition: width 0.3s;"></div>
    </div>
    <div id="progress-text" style="text-align: center; font-size: 12px; color: var(--secondary-text); margin-top: 5px;">
        جاري التجهيز: 0%
    </div>
`;
mediaPreview.parentNode.insertBefore(progressDiv, mediaPreview.nextSibling);

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updatePublishButton() {
    const text = postText.value.trim();
    publishBtn.disabled = !(text.length > 0 || selectedFiles.length > 0 || audioBlob);
}

postText.addEventListener('input', updatePublishButton);

// ==================== معالجة الصور والفيديو ====================
imgInput.addEventListener('change', (e) => {
    handleSelectedFiles(e.target.files, 'image');
});

videoInput.addEventListener('change', (e) => {
    handleSelectedFiles(e.target.files, 'video');
});

async function handleSelectedFiles(files, type) {
    if (!files || files.length === 0) return;
    
    if (selectedFiles.length + files.length > 5) {
        Aulo.snackbar('يمكنك اختيار 5 ملفات كحد أقصى', { type: 'error' });
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
            if (file.size > 50 * 1024 * 1024) {
                Aulo.snackbar('الملف كبير جداً (الحد الأقصى 50 ميجابايت)', { type: 'error' });
                continue;
            }
            
            Aulo.snackbar('جاري معالجة الملف...');
            
            let processedFile;
            let previewUrl;
            let result;
            
            if (type === 'image') {
                result = await mediaProcessor.processImage(file, {
                    maxWidth: 1200,
                    maxHeight: 1200,
                    quality: 0.85,
                    format: 'image/webp'
                });
                
                processedFile = result.file;
                previewUrl = await mediaProcessor.getImagePreview(file);
                
                console.log(`تم ضغط الصورة بنسبة ${result.compressionRatio}%`);
                
            } else if (type === 'video') {
                Aulo.snackbar('جاري معالجة الفيديو... قد يستغرق هذا دقيقة');
                
                result = await mediaProcessor.processVideo(file, {
                    maxDuration: 60,
                    targetWidth: 480,
                    targetHeight: 640,
                    targetSize: 8 * 1024 * 1024
                });
                
                processedFile = result.file;
                previewUrl = URL.createObjectURL(file);
                
                Aulo.snackbar(`تم ضغط الفيديو بنسبة ${result.compressionRatio}%`);
            }
            
            const fileIndex = selectedFiles.length;
            selectedFiles.push({ file: processedFile, type, originalFile: file });
            
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.dataset.index = fileIndex;
            
            const media = document.createElement(type === 'video' ? 'video' : 'img');
            media.src = previewUrl;
            if (type === 'video') {
                media.controls = true;
                media.preload = 'metadata';
            }
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-media';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.onclick = () => removeFile(fileIndex);
            
            const infoSpan = document.createElement('div');
            infoSpan.style.cssText = `
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                background: rgba(0,0,0,0.7);
                color: white;
                font-size: 10px;
                padding: 2px 5px;
                text-align: center;
            `;
            infoSpan.textContent = `ضغط ${result.compressionRatio}%`;
            
            previewItem.appendChild(media);
            previewItem.appendChild(removeBtn);
            previewItem.appendChild(infoSpan);
            mediaPreview.appendChild(previewItem);
            
        } catch (error) {
            console.error('Error processing file:', error);
            Aulo.snackbar('فشل في معالجة الملف: ' + error.message, { type: 'error' });
        }
    }
    
    updatePublishButton();
}

window.removeFile = (index) => {
    selectedFiles.splice(index, 1);
    mediaPreview.innerHTML = '';
    selectedFiles.forEach((item, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.dataset.index = i;
            
            const media = document.createElement(item.type === 'video' ? 'video' : 'img');
            media.src = e.target.result;
            if (item.type === 'video') media.controls = true;
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-media';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.onclick = () => removeFile(i);
            
            previewItem.appendChild(media);
            previewItem.appendChild(removeBtn);
            mediaPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(item.originalFile);
    });
    updatePublishButton();
};

// ==================== تسجيل الصوت ====================
recordBtn.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        recordBtn.classList.remove('record-active');
        recordTimer.style.display = 'none';
        clearInterval(recordingTimer);
        
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };
            
            mediaRecorder.onstop = async () => {
                const rawBlob = new Blob(chunks, { type: 'audio/webm' });
                
                try {
                    Aulo.snackbar('جاري معالجة التسجيل...');
                    
                    const result = await mediaProcessor.processAudio(
                        new File([rawBlob], 'recording.webm', { type: 'audio/webm' }),
                        { targetBitrate: 96000 }
                    );
                    
                    audioBlob = result.file;
                    
                    const previewItem = document.createElement('div');
                    previewItem.className = 'preview-item';
                    
                    const audioPreview = document.createElement('div');
                    audioPreview.className = 'audio-preview';
                    audioPreview.innerHTML = `
                        <i class="fa-solid fa-circle-play" style="color: var(--primary-color); font-size: 24px;"></i>
                        <span>تسجيل صوتي (${formatTime(recordingSeconds)}) - ضغط ${result.compressionRatio}%</span>
                    `;
                    
                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'remove-media';
                    removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    removeBtn.onclick = () => {
                        audioBlob = null;
                        previewItem.remove();
                        updatePublishButton();
                    };
                    
                    previewItem.appendChild(audioPreview);
                    previewItem.appendChild(removeBtn);
                    mediaPreview.appendChild(previewItem);
                    
                    Aulo.snackbar(`تم ضغط التسجيل بنسبة ${result.compressionRatio}%`);
                    
                } catch (error) {
                    console.error('Error processing audio:', error);
                    Aulo.snackbar('فشل في معالجة التسجيل', { type: 'error' });
                }
                
                recordingSeconds = 0;
                updatePublishButton();
            };
            
            mediaRecorder.start();
            recordBtn.classList.add('record-active');
            recordTimer.style.display = 'inline';
            recordingSeconds = 0;
            
            recordingTimer = setInterval(() => {
                recordingSeconds++;
                recordTimer.textContent = formatTime(recordingSeconds);
            }, 1000);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            Aulo.snackbar('لا يمكن الوصول إلى الميكروفون', { type: 'error' });
        }
    }
}

// ==================== رفع الملفات إلى Cloudinary ====================
async function uploadToCloudinary(file, type) {
    const resourceType = type === 'image' ? 'image' : 'video';
    
    return await uploadManager.uploadFile(file, {
        folder: `aulobylemmouchi/posts/${type}`,
        resourceType: resourceType,
        onProgress: (percent) => {
            // التقدم يتم التعامل معه في الدالة الرئيسية
        }
    });
}

// ==================== نشر المنشور ====================
publishBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    const text = postText.value.trim();
    if (!text && selectedFiles.length === 0 && !audioBlob) {
        Aulo.snackbar('الرجاء إدخال نص أو إضافة وسائط', { type: 'error' });
        return;
    }
    
    publishBtn.disabled = true;
    publishBtn.textContent = 'جاري التجهيز...';
    
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressDiv.style.display = 'block';
    
    try {
        const media = [];
        let processedCount = 0;
        const totalFiles = selectedFiles.length + (audioBlob ? 1 : 0);
        
        // معالجة ورفع الملفات
        for (const item of selectedFiles) {
            try {
                publishBtn.textContent = `جاري رفع ${processedCount + 1}/${totalFiles}`;
                
                const uploadedMedia = await uploadManager.uploadFile(item.file, {
                    folder: `aulobylemmouchi/posts/${item.type}`,
                    resourceType: item.type === 'image' ? 'image' : 'video',
                    onProgress: (percent) => {
                        const overallPercent = ((processedCount + (percent / 100)) / totalFiles) * 100;
                        progressBar.style.width = `${overallPercent}%`;
                        progressText.textContent = `جاري الرفع: ${Math.round(overallPercent)}%`;
                    }
                });
                
                media.push({
                    type: item.type,
                    url: uploadedMedia.secure_url,
                    publicId: uploadedMedia.public_id
                });
                
                processedCount++;
                
            } catch (uploadError) {
                console.error('Error uploading file:', uploadError);
                Aulo.snackbar(`خطأ في رفع الملف ${processedCount + 1}`, { type: 'error' });
            }
        }
        
        // رفع الصوت إذا وجد
        if (audioBlob) {
            try {
                publishBtn.textContent = `جاري رفع الصوت`;
                
                const uploadedAudio = await uploadManager.uploadFile(audioBlob, {
                    folder: 'aulobylemmouchi/posts/audio',
                    resourceType: 'video',
                    onProgress: (percent) => {
                        const overallPercent = ((processedCount + (percent / 100)) / totalFiles) * 100;
                        progressBar.style.width = `${overallPercent}%`;
                        progressText.textContent = `جاري الرفع: ${Math.round(overallPercent)}%`;
                    }
                });
                
                media.push({
                    type: 'audio',
                    url: uploadedAudio.secure_url,
                    publicId: uploadedAudio.public_id
                });
                
            } catch (uploadError) {
                console.error('Error uploading audio:', uploadError);
            }
        }
        
        progressBar.style.width = '100%';
        progressText.textContent = 'اكتمل الرفع!';
        
        // إنشاء المنشور
        const postRef = database.ref('posts').push();
        const postData = {
            id: postRef.key,
            userId: user.uid,
            text: text,
            media: media,
            timestamp: Date.now(),
            likes: 0,
            comments: 0
        };
        
        await postRef.set(postData);
        
        const userRef = database.ref(`users/${user.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val() || {};
        await userRef.update({
            postsCount: (userData.postsCount || 0) + 1
        });
        
        Aulo.snackbar('تم النشر بنجاح', { type: 'success' });
        
        setTimeout(() => {
            window.location.href = 'main.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error publishing post:', error);
        Aulo.snackbar('حدث خطأ في النشر', { type: 'error' });
        publishBtn.disabled = false;
        publishBtn.textContent = 'نشر';
        progressDiv.style.display = 'none';
    }
});

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
    } else {
        window.location.href = 'index.html';
    }
});