// js/auth.js
// نظام المصادقة وإنشاء الحسابات

// دالة تسجيل الدخول
window.login = async (username, password) => {
    try {
        // البحث عن المستخدم بواسطة اسم المستخدم (username)
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
        
        let userEmail = null;
        let userId = null;
        
        snapshot.forEach((child) => {
            userEmail = child.val().email;
            userId = child.key;
        });
        
        if (!userEmail) {
            throw new Error('اسم المستخدم غير موجود');
        }
        
        // تسجيل الدخول باستخدام البريد الإلكتروني
        const userCredential = await auth.signInWithEmailAndPassword(userEmail, password);
        
        // تشغيل صوت الترحيب
        playSound('not');
        
        // تحديث آخر ظهور
        await database.ref(`users/${userCredential.user.uid}`).update({
            lastSeen: Date.now(),
            online: true
        });
        
        window.location.href = 'main.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('خطأ في تسجيل الدخول: ' + error.message, true);
    }
};

// دالة إنشاء حساب جديد
window.signup = async (username, password, birthdate, gender, displayName, bio, avatarFile) => {
    try {
        // التحقق من عدم تكرار اسم المستخدم
        const usersRef = database.ref('users');
        const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
        
        if (snapshot.exists()) {
            throw new Error('اسم المستخدم موجود بالفعل');
        }
        
        // إنشاء بريد إلكتروني وهمي باستخدام اسم المستخدم
        const email = `${username}@aulobylemouchi.app`;
        
        // إنشاء حساب في Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // رفع الصورة الشخصية إذا وجدت
        let avatarUrl = 'images/profile.png'; // الصورة الافتراضية
        
        if (avatarFile) {
            try {
                const formData = new FormData();
                formData.append('file', avatarFile);
                formData.append('upload_preset', uwConfig.uploadPreset);
                formData.append('folder', uwConfig.folder);
                
                const response = await fetch(`https://api.cloudinary.com/v1_1/${uwConfig.cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                avatarUrl = data.secure_url;
            } catch (uploadError) {
                console.error('Error uploading avatar:', uploadError);
            }
        }
        
        // حفظ بيانات المستخدم في Realtime Database
        await database.ref(`users/${user.uid}`).set({
            uid: user.uid,
            username: username,
            email: email,
            displayName: displayName || username,
            bio: bio || '',
            gender: gender,
            birthdate: birthdate,
            avatar: avatarUrl,
            createdAt: Date.now(),
            lastSeen: Date.now(),
            online: true,
            postsCount: 0,
            likesCount: 0
        });
        
        // تشغيل صوت الترحيب
        playSound('not');
        
        showMessage('تم إنشاء الحساب بنجاح');
        window.location.href = 'main.html';
        
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('خطأ في إنشاء الحساب: ' + error.message, true);
    }
};

// دالة تسجيل الخروج
window.logout = async () => {
    try {
        const user = auth.currentUser;
        if (user) {
            await database.ref(`users/${user.uid}/online`).set(false);
            await database.ref(`users/${user.uid}/lastSeen`).set(Date.now());
        }
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('خطأ في تسجيل الخروج', true);
    }
};