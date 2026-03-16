// js/notifications.js
// نظام الإشعارات

let notificationsListener = null;

// تحميل الإشعارات
async function loadNotifications() {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    
    const container = document.getElementById('notifications-container');
    const noNot = document.getElementById('no-not');
    
    container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
    
    try {
        const notificationsRef = database.ref(`notifications/${user.uid}`)
            .orderByChild('timestamp')
            .limitToLast(30);
        
        // الاستماع للتغييرات في الوقت الفعلي
        if (notificationsListener) {
            notificationsRef.off('value', notificationsListener);
        }
        
        notificationsListener = notificationsRef.on('value', async (snapshot) => {
            const notifications = [];
            snapshot.forEach((child) => {
                notifications.push({ id: child.key, ...child.val() });
            });
            
            // عكس الترتيب (الأحدث أولاً)
            notifications.reverse();
            
            if (notifications.length === 0) {
                container.innerHTML = '';
                noNot.style.display = 'block';
                return;
            }
            
            noNot.style.display = 'none';
            container.innerHTML = '';
            
            for (const not of notifications) {
                const element = await createNotificationElement(not);
                container.appendChild(element);
            }
            
            // تحديث النقطة الحمراء
            updateNotificationDot();
        });
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = '<div class="empty-state">خطأ في تحميل الإشعارات</div>';
    }
}

// إنشاء عنصر إشعار
async function createNotificationElement(notification) {
    const div = document.createElement('a');
    div.href = notification.postId ? `main.html?post=${notification.postId}` : '#';
    div.className = `not-item ${notification.read ? '' : 'unread'}`;
    
    try {
        // الحصول على بيانات المستخدم الذي قام بالإجراء
        const userSnapshot = await database.ref(`users/${notification.userId}`).once('value');
        const userData = userSnapshot.val() || {};
        
        // نص الإشعار حسب النوع
        let content = '';
        let icon = '';
        
        switch (notification.type) {
            case 'like':
                content = `أعجب بمنشورك`;
                icon = 'fa-heart';
                break;
            case 'comment':
                content = `علق على منشورك`;
                icon = 'fa-comment';
                break;
            case 'follow':
                content = `بدأ بمتابعتك`;
                icon = 'fa-user-plus';
                break;
            default:
                content = 'تفاعل معك';
                icon = 'fa-bell';
        }
        
        div.innerHTML = `
            <img src="${userData.avatar || 'images/profile.png'}" class="not-avatar">
            <div class="not-content">
                <b>${userData.displayName || userData.username || 'مستخدم'}</b> ${content}
                <span class="not-time">${formatTimeAgo(notification.timestamp)}</span>
            </div>
            <div class="not-type-icon">
                <i class="fa-solid ${icon}"></i>
            </div>
        `;
        
        // إذا كان الإشعار غير مقروء، نضيف حدث النقر لتحديث الحالة
        if (!notification.read) {
            div.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await database.ref(`notifications/${auth.currentUser.uid}/${notification.id}`).update({
                        read: true
                    });
                    window.location.href = div.href;
                } catch (error) {
                    console.error('Error marking notification as read:', error);
                }
            });
        }
        
    } catch (error) {
        console.error('Error creating notification element:', error);
        div.innerHTML = '<div class="not-content">خطأ في تحميل الإشعار</div>';
    }
    
    return div;
}

// تنسيق الوقت (منذ متى)
function formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `منذ ${days} يوم`;
    if (hours > 0) return `منذ ${hours} ساعة`;
    if (minutes > 0) return `منذ ${minutes} دقيقة`;
    return 'الآن';
}

// تحديث نقطة الإشعارات الحمراء
async function updateNotificationDot() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const snapshot = await database.ref(`notifications/${user.uid}`)
            .orderByChild('read')
            .equalTo(false)
            .limitToFirst(1)
            .once('value');
        
        const dot = document.getElementById('not-dot');
        if (dot) {
            dot.style.display = snapshot.exists() ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error updating notification dot:', error);
    }
}

// بدء التحميل
auth.onAuthStateChanged((user) => {
    if (user && window.location.pathname.includes('not.html')) {
        loadNotifications();
    }
});