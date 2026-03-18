// js/chat.js
// نظام المحادثات الفورية

let currentChatUser = null;
let currentChatId = null;
let messagesListener = null;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;

const chatBox = document.getElementById('chat-box');
const chatInput = document.getElementById('chat-input-text');
const sendIcon = document.getElementById('send-icon');
const micIcon = document.getElementById('mic-icon');
const recordIndicator = document.getElementById('record-indicator');
const chatTimer = document.getElementById('chat-record-timer');
const chatMainAction = document.getElementById('chat-main-action');
const mediaInput = document.getElementById('chat-media-input');

// تحميل معلومات المستخدم في الشات
async function loadChatUserInfo() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    if (!userId) {
        showMessage('لم يتم تحديد مستخدم', true);
        window.location.href = 'find.html';
        return;
    }
    
    const user = auth.currentUser;
    if (!user) return;
    
    if (user.uid === userId) {
        showMessage('لا يمكنك الدردشة مع نفسك', true);
        window.location.href = 'main.html';
        return;
    }
    
    currentChatUser = userId;
    
    try {
        // الحصول على بيانات المستخدم الآخر
        const userSnapshot = await database.ref(`users/${userId}`).once('value');
        const userData = userSnapshot.val();
        
        if (!userData) {
            showMessage('المستخدم غير موجود', true);
            window.location.href = 'find.html';
            return;
        }
        
        document.getElementById('chat-display-name').textContent = userData.displayName || userData.username;
        document.getElementById('chat-avatar').src = userData.avatar || 'images/profile.png';
        
        // إنشاء أو الحصول على معرف المحادثة
        const chatId = [user.uid, userId].sort().join('_');
        currentChatId = chatId;
        
        // التأكد من وجود المحادثة في قاعدة البيانات
        await database.ref(`chats/${chatId}`).set({
            participants: {
                [user.uid]: true,
                [userId]: true
            },
            lastMessage: '',
            lastMessageTime: Date.now(),
            createdAt: Date.now()
        });
        
        // تحميل الرسائل
        loadMessages();
        
        // تحديث حالة القراءة
        markMessagesAsRead(chatId);
        
    } catch (error) {
        console.error('Error loading chat user:', error);
        showMessage('خطأ في تحميل معلومات المستخدم', true);
    }
}

// تحميل الرسائل
function loadMessages() {
    if (!currentChatId || !auth.currentUser) return;
    
    if (messagesListener) {
        database.ref(`messages/${currentChatId}`).off('value', messagesListener);
    }
    
    messagesListener = database.ref(`messages/${currentChatId}`)
        .orderByChild('timestamp')
        .limitToLast(50)
        .on('value', (snapshot) => {
            chatBox.innerHTML = '';
            
            const messages = [];
            snapshot.forEach((child) => {
                messages.push({ id: child.key, ...child.val() });
            });
            
            // عرض الرسائل
            messages.forEach(message => {
                appendMessage(message);
            });
            
            // التمرير إلى الأسفل
            chatBox.scrollTop = chatBox.scrollHeight;
            
            // تحديث حالة القراءة
            markMessagesAsRead(currentChatId);
        });
}

// إضافة رسالة إلى الواجهة
function appendMessage(message) {
    const user = auth.currentUser;
    const isSent = message.senderId === user.uid;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;
    
    let contentHTML = '';
    
    if (message.type === 'text') {
        contentHTML = message.content;
    } else if (message.type === 'image') {
        contentHTML = `
            <div class="chat-media" onclick="openMediaViewer('${message.content}', 'image')">
                <img src="${message.content}" alt="صورة">
                <div class="play-overlay"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
            </div>
        `;
    } else if (message.type === 'video') {
        contentHTML = `
            <div class="chat-media" onclick="playVideo(this, '${message.content}')">
                <video src="${message.content}" preload="metadata"></video>
                <div class="play-overlay"><i class="fa-solid fa-circle-play"></i></div>
            </div>
        `;
    } else if (message.type === 'audio') {
        contentHTML = `
            <div class="chat-audio">
                <i class="fa-solid fa-circle-play audio-icon" onclick="this.nextElementSibling.play()"></i>
                <audio src="${message.content}" preload="none"></audio>
                <span>تسجيل صوتي</span>
            </div>
        `;
    }
    
    messageDiv.innerHTML = `
        ${contentHTML}
        <span class="message-time">${formatTime(message.timestamp)}</span>
    `;
    
    chatBox.appendChild(messageDiv);
}

// تشغيل الفيديو يدوياً
window.playVideo = (element, src) => {
    const video = document.createElement('video');
    video.src = src;
    video.controls = true;
    video.autoplay = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    
    element.innerHTML = '';
    element.appendChild(video);
};

// إرسال رسالة نصية
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text && !mediaInput.files.length && !audioChunks.length) return;
    
    const user = auth.currentUser;
    if (!user || !currentChatId) return;
    
    try {
        const messageRef = database.ref(`messages/${currentChatId}`).push();
        const messageData = {
            id: messageRef.key,
            senderId: user.uid,
            type: 'text',
            content: text,
            timestamp: Date.now(),
            read: false
        };
        
        await messageRef.set(messageData);
        
        // تحديث آخر رسالة في المحادثة
        await database.ref(`chats/${currentChatId}`).update({
            lastMessage: text,
            lastMessageTime: Date.now(),
            lastSenderId: user.uid
        });
        
        // إشعار للمستخدم الآخر
        const otherUserId = currentChatUser;
        await database.ref(`notifications/${otherUserId}`).push({
            type: 'chat',
            chatId: currentChatId,
            userId: user.uid,
            message: text,
            timestamp: Date.now(),
            read: false
        });
        
        // تفريغ حقل الإدخال
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendIcon.style.display = 'none';
        micIcon.style.display = 'block';
        
        // تشغيل صوت الإرسال
        playSound('not');
        
        // التمرير إلى الأسفل
        chatBox.scrollTop = chatBox.scrollHeight;
        
    } catch (error) {
        console.error('Error sending message:', error);
        showMessage('خطأ في إرسال الرسالة', true);
    }
}

// تسجيل الصوت
chatMainAction.addEventListener('click', async () => {
    if (chatInput.value.trim().length > 0) {
        // إرسال رسالة نصية
        sendMessage();
    } else {
        // تسجيل صوتي
        toggleAudioRecording();
    }
});

async function toggleAudioRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        // إيقاف التسجيل
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        clearInterval(recordingTimer);
        recordIndicator.style.display = 'none';
        
    } else {
        // بدء التسجيل
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                
                // رفع الصوت إلى Cloudinary
                try {
                    const formData = new FormData();
                    formData.append('file', audioBlob);
                    formData.append('upload_preset', uwConfig.uploadPreset);
                    formData.append('folder', `${uwConfig.folder}/audio`);
                    formData.append('resource_type', 'video');
                    
                    const response = await fetch(`https://api.cloudinary.com/v1_1/${uwConfig.cloudName}/video/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    
                    const data = await response.json();
                    
                    // إرسال الرسالة الصوتية
                    const user = auth.currentUser;
                    const messageRef = database.ref(`messages/${currentChatId}`).push();
                    await messageRef.set({
                        id: messageRef.key,
                        senderId: user.uid,
                        type: 'audio',
                        content: data.secure_url,
                        timestamp: Date.now(),
                        read: false
                    });
                    
                    await database.ref(`chats/${currentChatId}`).update({
                        lastMessage: '🎤 تسجيل صوتي',
                        lastMessageTime: Date.now(),
                        lastSenderId: user.uid
                    });
                    
                } catch (error) {
                    console.error('Error uploading audio:', error);
                    showMessage('خطأ في رفع التسجيل', true);
                }
            };
            
            mediaRecorder.start();
            recordIndicator.style.display = 'block';
            recordingSeconds = 0;
            chatTimer.textContent = '00:00';
            
            recordingTimer = setInterval(() => {
                recordingSeconds++;
                const mins = Math.floor(recordingSeconds / 60);
                const secs = recordingSeconds % 60;
                chatTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }, 1000);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showMessage('لا يمكن الوصول إلى الميكروفون', true);
        }
    }
}

// إرسال صورة أو فيديو
mediaInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const type = file.type.startsWith('image/') ? 'image' : 'video';
    
    try {
        // رفع إلى Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uwConfig.uploadPreset);
        formData.append('folder', `${uwConfig.folder}/chat`);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${uwConfig.cloudName}/${type === 'image' ? 'image' : 'video'}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // إرسال الرسالة
        const user = auth.currentUser;
        const messageRef = database.ref(`messages/${currentChatId}`).push();
        await messageRef.set({
            id: messageRef.key,
            senderId: user.uid,
            type: type,
            content: data.secure_url,
            timestamp: Date.now(),
            read: false
        });
        
        await database.ref(`chats/${currentChatId}`).update({
            lastMessage: type === 'image' ? '📷 صورة' : '🎥 فيديو',
            lastMessageTime: Date.now(),
            lastSenderId: user.uid
        });
        
        // إفراغ input
        mediaInput.value = '';
        
    } catch (error) {
        console.error('Error uploading media:', error);
        showMessage('خطأ في رفع الملف', true);
    }
});

// تحديث حالة القراءة
async function markMessagesAsRead(chatId) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const snapshot = await database.ref(`messages/${chatId}`)
            .orderByChild('read')
            .equalTo(false)
            .once('value');
        
        const updates = {};
        snapshot.forEach((child) => {
            const message = child.val();
            if (message.senderId !== user.uid) {
                updates[`messages/${chatId}/${child.key}/read`] = true;
            }
        });
        
        if (Object.keys(updates).length > 0) {
            await database.ref().update(updates);
        }
    } catch (error) {
        console.error('Error marking messages as read:', error);
    }
}

// بدء التحميل
auth.onAuthStateChanged((user) => {
    if (user) {
        loadChatUserInfo();
    } else {
        window.location.href = 'index.html';
    }
});

// تنظيف المستمعين عند المغادرة
window.addEventListener('beforeunload', () => {
    if (messagesListener && currentChatId) {
        database.ref(`messages/${currentChatId}`).off('value', messagesListener);
    }
});