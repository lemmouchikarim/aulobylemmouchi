// js/post.js
// إنشاء المنشورات الجديدة مع رفع الوسائط إلى Cloudinary

let selectedFiles = [];
let mediaPreviews = [];
let mediaUrls = [];
let audioBlob = null;
let audioTimer = null;
let audioSeconds = 0;
let mediaRecorder = null;

const postText = document.getElementById('post-text');
const publishBtn = document.getElementById('publish-btn');
const mediaPreview = document.getElementById('media-preview');
const imgInput = document.getElementById('img-input');
const videoInput = document.getElementById('video-input');
const recordBtn = document.getElementById('record-btn');
const recordTimer = document.getElementById('record-timer');

// اختيار الصور
imgInput.addEventListener('change', (e) => {
    handleFiles(e.target.files, 'image');
});

// اختيار الفيديو
videoInput.addEventListener('change', (e) => {
    handleFiles(e.target.files, 'video');
});

// معالجة الملفات المختارة
function handleFiles(files, type) {
    if (!files || files.length === 0) return;
    
    // حد أقصى 5 ملفات
    if (selectedFiles.length + files.length > 5) {
        showMessage('يمكنك اختيار 5 ملفات كحد أقصى', true);
        return;
    }
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // التحقق من الحجم (حد أقصى 10 ميجابايت)
        if (file.size > 10 * 1024 * 1024) {
            showMessage('الملف كبير جداً (الحد الأقصى 10 ميجابايت)', true);
            continue;
        }
        
        selectedFiles.push({ file, type });
        
        // إنشاء معاينة
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.style.position = 'relative';
            previewItem.style.display = 'inline-block';
            
            const media = document.createElement(type === 'video' ? 'video' : 'img');
            media.src = e.target.result;
            media.className = 'preview-item';
            if (type === 'video') media.controls = true;
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-media';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.onclick = () => removeFile(selectedFiles.length - 1);
            
            previewItem.appendChild(media);
            previewItem.appendChild(removeBtn);
            mediaPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    }
    
    updatePublishButton();
}

// إزالة ملف
window.removeFile = (index) => {
    selectedFiles.splice(index, 1);
    mediaPreview.innerHTML = '';
    
    // إعادة بناء المعاينات
    selectedFiles.forEach((item, i) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = document.createElement('div');
            previewItem.style.position = 'relative';
            previewItem.style.display = 'inline-block';
            
            const media = document.createElement(item.type === 'video' ? 'video' : 'img');
            media.src = e.target.result;
            media.className = 'preview-item';
            if (item.type === 'video') media.controls = true;
            
            const removeBtn = document.createElement('div');
            removeBtn.className = 'remove-media';
            removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            removeBtn.onclick = () => removeFile(i);
            
            previewItem.appendChild(media);
            previewItem.appendChild(removeBtn);
            mediaPreview.appendChild(previewItem);
        };
        reader.readAsDataURL(item.file);
    });
    
    updatePublishButton();
};

// تحديث زر النشر
function updatePublishButton() {
    const text = postText.value.trim();
    publishBtn.disabled = !(text.length > 0 || selectedFiles.length > 0 || audioBlob);
}

postText.addEventListener('input', updatePublishButton);

// تسجيل الصوت
recordBtn.addEventListener('click', toggleRecording);

async function toggleRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        // إيقاف التسجيل
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        recordBtn.classList.remove('record-active');
        recordTimer.style.display = 'none';
        clearInterval(audioTimer);
        
    } else {
        // بدء التسجيل
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            const chunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
                chunks.push(e.data);
            };
            
            mediaRecorder.onstop = () => {
                audioBlob = new Blob(chunks, { type: 'audio/webm' });
                
                // إضافة معاينة للتسجيل
                const previewItem = document.createElement('div');
                previewItem.style.position = 'relative';
                previewItem.style.display = 'inline-block';
                
                const audioPreview = document.createElement('div');
                audioPreview.className = 'audio-player';
                audioPreview.innerHTML = `
                    <i class="fa-solid fa-circle-play audio-icon"></i>
                    <span>تسجيل صوتي (${formatTime(audioSeconds)})</span>
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
                
                audioSeconds = 0;
                updatePublishButton();
            };
            
            mediaRecorder.start();
            recordBtn.classList.add('record-active');
            recordTimer.style.display = 'inline';
            audioSeconds = 0;
            
            audioTimer = setInterval(() => {
                audioSeconds++;
                recordTimer.textContent = formatTime(audioSeconds);
            }, 1000);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showMessage('لا يمكن الوصول إلى الميكروفون', true);
        }
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// نشر المنشور
publishBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    publishBtn.disabled = true;
    publishBtn.textContent = 'جاري النشر...';
    
    try {
        const media = [];
        
        // رفع الصور والفيديو إلى Cloudinary
        for (const item of selectedFiles) {
            try {
                const formData = new FormData();
                formData.append('file', item.file);
                formData.append('upload_preset', uwConfig.uploadPreset);
                formData.append('folder', uwConfig.folder);
                
                const response = await fetch(`https://api.cloudinary.com/v1_1/${uwConfig.cloudName}/${item.type === 'video' ? 'video' : 'image'}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                media.push({
                    type: item.type,
                    url: data.secure_url,
                    publicId: data.public_id
                });
            } catch (uploadError) {
                console.error('Error uploading:', uploadError);
                showMessage(`خطأ في رفع ${item.type === 'video' ? 'الفيديو' : 'الصورة'}`, true);
            }
        }
        
        // رفع التسجيل الصوتي إذا وجد
        if (audioBlob) {
            try {
                const formData = new FormData();
                formData.append('file', audioBlob);
                formData.append('upload_preset', uwConfig.uploadPreset);
                formData.append('folder', uwConfig.folder);
                formData.append('resource_type', 'video'); // لرفع الصوت كفيديو
                
                const response = await fetch(`https://api.cloudinary.com/v1_1/${uwConfig.cloudName}/video/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                media.push({
                    type: 'audio',
                    url: data.secure_url,
                    publicId: data.public_id
                });
            } catch (uploadError) {
                console.error('Error uploading audio:', uploadError);
            }
        }
        
        // إنشاء المنشور في Realtime Database
        const postRef = database.ref('posts').push();
        const postData = {
            id: postRef.key,
            userId: user.uid,
            text: postText.value.trim(),
            media: media,
            timestamp: Date.now(),
            likes: 0,
            comments: 0
        };
        
        await postRef.set(postData);
        
        // تحديث عدد منشورات المستخدم
        const userRef = database.ref(`users/${user.uid}`);
        const userSnapshot = await userRef.once('value');
        const userData = userSnapshot.val() || {};
        await userRef.update({
            postsCount: (userData.postsCount || 0) + 1
        });
        
        // تشغيل صوت الإشعار
        playSound('not');
        
        showMessage('تم النشر بنجاح');
        window.location.href = 'main.html';
        
    } catch (error) {
        console.error('Error publishing post:', error);
        showMessage('حدث خطأ في النشر', true);
        publishBtn.disabled = false;
        publishBtn.textContent = 'نشر';
    }
});