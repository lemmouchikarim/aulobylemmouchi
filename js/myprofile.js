// js/myprofile.js
// الملف الشخصي للمستخدم الحالي مع إمكانية التعديل

let currentUserData = null;

// تحميل الملف الشخصي للمستخدم الحالي
async function loadMyProfile() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const userSnapshot = await database.ref(`users/${user.uid}`).once('value');
        currentUserData = userSnapshot.val() || {};
        
        // تحديث الواجهة
        document.getElementById('my-avatar').src = currentUserData.avatar || 'images/profile.png';
        document.getElementById('my-display-name').textContent = currentUserData.displayName || currentUserData.username;
        document.getElementById('my-username').textContent = `@${currentUserData.username}`;
        document.getElementById('my-bio').textContent = currentUserData.bio || 'لا يوجد نبذة شخصية حالياً.';
        
        // تنسيق تاريخ الميلاد
        if (currentUserData.birthdate) {
            const date = new Date(currentUserData.birthdate);
            document.getElementById('my-dob').textContent = date.toLocaleDateString('ar-SA');
        }
        
        // الجنس
        const genderSpan = document.getElementById('my-gender');
        const genderIcon = document.getElementById('gender-icon');
        
        if (currentUserData.gender === 'male') {
            genderSpan.textContent = 'ذكر';
            genderIcon.className = 'fa-solid fa-mars';
        } else if (currentUserData.gender === 'female') {
            genderSpan.textContent = 'أنثى';
            genderIcon.className = 'fa-solid fa-venus';
        }
        
        // تحميل منشورات المستخدم
        loadMyPosts();
        
        // ملء نموذج التعديل
        document.getElementById('edit-display-name').value = currentUserData.displayName || currentUserData.username;
        document.getElementById('edit-bio').value = currentUserData.bio || '';
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('خطأ في تحميل الملف الشخصي', true);
    }
}

// تحميل منشوراتي
async function loadMyPosts() {
    const user = auth.currentUser;
    const feed = document.getElementById('my-posts-feed');
    
    try {
        const postsRef = database.ref('posts')
            .orderByChild('userId')
            .equalTo(user.uid)
            .limitToLast(10);
        
        const snapshot = await postsRef.once('value');
        const posts = [];
        
        snapshot.forEach((child) => {
            posts.push({ id: child.key, ...child.val() });
        });
        
        posts.reverse();
        
        if (posts.length === 0) {
            feed.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--secondary-text);">لم تنشر أي شيء بعد</div>';
            return;
        }
        
        feed.innerHTML = '';
        
        for (const post of posts) {
            feed.appendChild(createMyPostElement(post));
        }
        
    } catch (error) {
        console.error('Error loading posts:', error);
        feed.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--error-color);">خطأ في تحميل المنشورات</div>';
    }
}

// إنشاء عنصر منشور مع زر حذف
function createMyPostElement(post) {
    const postCard = document.createElement('div');
    postCard.className = 'post-card';
    postCard.dataset.postId = post.id;
    
    const contentHTML = post.text ? `<div class="post-content">${post.text}</div>` : '';
    
    let mediaHTML = '';
    if (post.media && post.media.length > 0) {
        const gridClass = `media-grid-${Math.min(post.media.length, 5)}`;
        mediaHTML = `<div class="post-media-container ${gridClass}">`;
        
        post.media.forEach((media) => {
            if (media.type === 'image') {
                mediaHTML += `<img src="${media.url}" alt="صورة" loading="lazy">`;
            } else if (media.type === 'video') {
                mediaHTML += `
                    <div class="video-wrapper">
                        <video src="${media.url}" preload="metadata"></video>
                    </div>
                `;
            } else if (media.type === 'audio') {
                mediaHTML += `
                    <div class="audio-player">
                        <i class="fa-solid fa-circle-play audio-icon"></i>
                        <span>تسجيل صوتي</span>
                    </div>
                `;
            }
        });
        
        mediaHTML += '</div>';
    }
    
    postCard.innerHTML = `
        <div class="post-header">
            <img src="${currentUserData.avatar || 'images/profile.png'}" class="user-avatar">
            <div class="post-info">
                <span class="display-name">${currentUserData.displayName || currentUserData.username}</span>
                <span class="post-time">${formatDate(post.timestamp)}</span>
            </div>
            <button class="delete-post-btn" onclick="deletePost('${post.id}', this)">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
        ${contentHTML}
        ${mediaHTML}
        <div class="post-actions">
            <button class="like-btn active" disabled>
                <i class="fa-solid fa-heart"></i>
            </button>
            <span class="like-count">${post.likes || 0}</span>
        </div>
    `;
    
    return postCard;
}

// حذف منشور
window.deletePost = async (postId, btn) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // حذف المنشور
        await database.ref(`posts/${postId}`).remove();
        
        // حذف الإعجابات المرتبطة
        await database.ref(`likes/${postId}`).remove();
        
        // تحديث عدد المنشورات
        await database.ref(`users/${user.uid}`).update({
            postsCount: (currentUserData.postsCount || 1) - 1
        });
        
        // إزالة العنصر من الواجهة
        btn.closest('.post-card').remove();
        
        showMessage('تم حذف المنشور');
        
    } catch (error) {
        console.error('Error deleting post:', error);
        showMessage('خطأ في حذف المنشور', true);
    }
};

// فتح نافذة التعديل
window.openEditModal = () => {
    document.getElementById('edit-modal').style.display = 'block';
};

// إغلاق نافذة التعديل
window.closeEditModal = () => {
    document.getElementById('edit-modal').style.display = 'none';
};

// حفظ التعديلات
window.saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    const displayName = document.getElementById('edit-display-name').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    
    try {
        await database.ref(`users/${user.uid}`).update({
            displayName: displayName || currentUserData.username,
            bio: bio
        });
        
        // تحديث الواجهة
        document.getElementById('my-display-name').textContent = displayName || currentUserData.username;
        document.getElementById('my-bio').textContent = bio || 'لا يوجد نبذة شخصية حالياً.';
        
        closeEditModal();
        showMessage('تم تحديث الملف الشخصي');
        
    } catch (error) {
        console.error('Error updating profile:', error);
        showMessage('خطأ في تحديث الملف', true);
    }
};

// تغيير الصورة الشخصية
document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        // رفع الصورة إلى Cloudinary
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uwConfig.uploadPreset);
        formData.append('folder', `${uwConfig.folder}/avatars`);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${uwConfig.cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        // تحديث الصورة في قاعدة البيانات
        await database.ref(`users/${user.uid}`).update({
            avatar: data.secure_url
        });
        
        // تحديث الواجهة
        document.getElementById('my-avatar').src = data.secure_url;
        
        showMessage('تم تحديث الصورة الشخصية');
        
    } catch (error) {
        console.error('Error uploading avatar:', error);
        showMessage('خطأ في رفع الصورة', true);
    }
});

// بدء التحميل
auth.onAuthStateChanged((user) => {
    if (user) {
        loadMyProfile();
    } else {
        window.location.href = 'index.html';
    }
});