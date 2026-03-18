// ==================== js/ui.js ====================
// نظام متكامل للـ Popups و Dropdowns و Snackbars

class AuloUI {
    constructor() {
        this.init();
    }

    init() {
        this.createSnackbarContainer();
        this.createModalContainer();
        this.createDropdownContainer();
        this.createPopupContainer();
        this.addStyles();
    }

    createSnackbarContainer() {
        if (!document.getElementById('aulo-snackbar-container')) {
            const container = document.createElement('div');
            container.id = 'aulo-snackbar-container';
            container.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                pointer-events: none;
                width: 90%;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
    }

    createModalContainer() {
        if (!document.getElementById('aulo-modal-container')) {
            const container = document.createElement('div');
            container.id = 'aulo-modal-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    createDropdownContainer() {
        if (!document.getElementById('aulo-dropdown-container')) {
            const container = document.createElement('div');
            container.id = 'aulo-dropdown-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9998;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    createPopupContainer() {
        if (!document.getElementById('aulo-popup-container')) {
            const container = document.createElement('div');
            container.id = 'aulo-popup-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .aulo-snackbar {
                background: #333;
                color: white;
                padding: 12px 24px;
                border-radius: 30px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideUp 0.3s ease;
                pointer-events: auto;
                width: fit-content;
                max-width: 100%;
                direction: rtl;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
            }

            .aulo-snackbar.success { background: #4caf50; }
            .aulo-snackbar.error { background: #ff3b30; }
            .aulo-snackbar.warning { background: #ff9800; }
            .aulo-snackbar.info { background: #2196f3; }

            .aulo-snackbar i { font-size: 18px; }
            .aulo-snackbar .close-btn {
                margin-right: auto;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .aulo-snackbar .close-btn:hover { opacity: 1; }

            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .aulo-modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                backdrop-filter: blur(5px);
                animation: fadeIn 0.2s ease;
                pointer-events: auto;
            }

            .aulo-modal {
                background: white;
                border-radius: 20px;
                padding: 25px;
                max-width: 90%;
                width: 400px;
                max-height: 90vh;
                overflow-y: auto;
                position: relative;
                animation: scaleIn 0.3s ease;
                pointer-events: auto;
                direction: rtl;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }

            .aulo-modal.small { width: 300px; }
            .aulo-modal.large { width: 600px; }
            .aulo-modal.full { width: 95%; height: 90vh; }

            .aulo-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid var(--border-color);
            }

            .aulo-modal-header h3 {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-color);
            }

            .aulo-modal-close {
                background: none;
                border: none;
                font-size: 22px;
                cursor: pointer;
                color: var(--secondary-text);
                transition: color 0.2s;
            }

            .aulo-modal-close:hover { color: var(--error-color); }

            .aulo-dropdown {
                position: absolute;
                background: white;
                border-radius: 12px;
                box-shadow: 0 5px 25px rgba(0,0,0,0.15);
                min-width: 200px;
                max-width: 300px;
                animation: scaleIn 0.15s ease;
                pointer-events: auto;
                direction: rtl;
                overflow: hidden;
                z-index: 9999;
                border: 1px solid var(--border-color);
            }

            .aulo-dropdown-item {
                padding: 12px 16px;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid var(--border-color);
            }

            .aulo-dropdown-item:last-child { border-bottom: none; }
            .aulo-dropdown-item:hover { background: #f8f8f8; }
            .aulo-dropdown-item:active { background: #f0f0f0; }
            .aulo-dropdown-item i { width: 20px; color: var(--primary-color); }
            .aulo-dropdown-item.danger { color: var(--error-color); }
            .aulo-dropdown-item.danger i { color: var(--error-color); }

            .aulo-popup-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.3);
                animation: fadeIn 0.2s ease;
                pointer-events: auto;
            }

            .aulo-popup {
                background: white;
                border-radius: 20px;
                padding: 20px;
                max-width: 90%;
                width: 350px;
                position: relative;
                animation: popIn 0.3s ease;
                pointer-events: auto;
                direction: rtl;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                text-align: center;
            }

            .aulo-popup-icon {
                width: 70px;
                height: 70px;
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
            }

            .aulo-popup-icon.success { background: #4caf50; color: white; }
            .aulo-popup-icon.error { background: #ff3b30; color: white; }
            .aulo-popup-icon.warning { background: #ff9800; color: white; }
            .aulo-popup-icon.info { background: #2196f3; color: white; }
            .aulo-popup-icon.confirm { background: var(--primary-color); color: white; }

            .aulo-popup h4 {
                font-size: 20px;
                margin-bottom: 10px;
                color: var(--text-color);
            }

            .aulo-popup p {
                color: var(--secondary-text);
                margin-bottom: 25px;
                line-height: 1.6;
            }

            .aulo-popup-buttons {
                display: flex;
                gap: 10px;
                justify-content: center;
            }

            .aulo-popup-buttons button {
                padding: 10px 25px;
                border-radius: 25px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: opacity 0.2s;
            }

            .aulo-popup-buttons .confirm-btn {
                background: var(--primary-color);
                color: white;
                flex: 1;
            }

            .aulo-popup-buttons .cancel-btn {
                background: #f1f1f1;
                color: var(--text-color);
                flex: 1;
            }

            .aulo-popup-buttons button:hover { opacity: 0.9; }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }

            @keyframes popIn {
                0% { transform: scale(0.7); opacity: 0; }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); opacity: 1; }
            }

            .aulo-loading {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255,255,255,0.8);
                backdrop-filter: blur(3px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10004;
                direction: rtl;
            }

            .aulo-loading-spinner {
                width: 50px;
                height: 50px;
                border: 4px solid var(--border-color);
                border-top-color: var(--primary-color);
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    snackbar(message, options = {}) {
        const {
            type = 'info',
            duration = 3000,
            showIcon = true,
            showClose = true,
            onClick = null
        } = options;

        const container = document.getElementById('aulo-snackbar-container');
        
        const snackbar = document.createElement('div');
        snackbar.className = `aulo-snackbar ${type}`;
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';
        if (type === 'warning') icon = 'fa-triangle-exclamation';
        
        let html = '';
        if (showIcon) html += `<i class="fa-solid ${icon}"></i>`;
        html += `<span>${message}</span>`;
        if (showClose) html += `<span class="close-btn" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></span>`;
        
        snackbar.innerHTML = html;
        
        if (onClick) {
            snackbar.style.cursor = 'pointer';
            snackbar.onclick = onClick;
        }
        
        container.appendChild(snackbar);
        
        if (duration > 0) {
            setTimeout(() => snackbar.remove(), duration);
        }
        
        return snackbar;
    }

    modal(content, options = {}) {
        const {
            title = '',
            size = 'medium',
            showClose = true,
            closeOnOverlay = true,
            onClose = null
        } = options;

        const container = document.getElementById('aulo-modal-container');
        
        const overlay = document.createElement('div');
        overlay.className = 'aulo-modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = `aulo-modal ${size}`;
        
        if (title || showClose) {
            const header = document.createElement('div');
            header.className = 'aulo-modal-header';
            header.innerHTML += title ? `<h3>${title}</h3>` : '<div></div>';
            if (showClose) header.innerHTML += `<button class="aulo-modal-close"><i class="fa-solid fa-xmark"></i></button>`;
            modal.appendChild(header);
        }
        
        const body = document.createElement('div');
        body.className = 'aulo-modal-body';
        
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else {
            body.appendChild(content);
        }
        
        modal.appendChild(body);
        overlay.appendChild(modal);
        container.appendChild(overlay);
        
        const closeBtn = modal.querySelector('.aulo-modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                overlay.remove();
                if (onClose) onClose();
            };
        }
        
        if (closeOnOverlay) {
            overlay.onclick = (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    if (onClose) onClose();
                }
            };
        }
        
        return { close: () => overlay.remove(), element: modal };
    }

    popup(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            confirmText = 'نعم',
            cancelText = 'إلغاء',
            onConfirm = null,
            onCancel = null
        } = options;

        const container = document.getElementById('aulo-popup-container');
        
        const overlay = document.createElement('div');
        overlay.className = 'aulo-popup-overlay';
        
        const popup = document.createElement('div');
        popup.className = 'aulo-popup';
        
        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-exclamation';
        if (type === 'warning') icon = 'fa-triangle-exclamation';
        if (type === 'confirm') icon = 'fa-question';
        
        popup.innerHTML = `
            <div class="aulo-popup-icon ${type}">
                <i class="fa-solid ${icon}"></i>
            </div>
            <h4>${title}</h4>
            <p>${message}</p>
            <div class="aulo-popup-buttons">
                ${type === 'confirm' ? 
                    `<button class="cancel-btn">${cancelText}</button>
                     <button class="confirm-btn">${confirmText}</button>` : 
                    `<button class="confirm-btn">حسناً</button>`
                }
            </div>
        `;
        
        overlay.appendChild(popup);
        container.appendChild(overlay);
        
        const confirmBtn = popup.querySelector('.confirm-btn');
        const cancelBtn = popup.querySelector('.cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                overlay.remove();
                if (onConfirm) onConfirm();
            };
        }
        
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                overlay.remove();
                if (onCancel) onCancel();
            };
        }
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (type !== 'confirm' && onCancel) onCancel();
            }
        };
        
        return { close: () => overlay.remove() };
    }

    dropdown(triggerElement, items, options = {}) {
        const {
            position = 'bottom',
            align = 'start',
            onSelect = null
        } = options;

        const container = document.getElementById('aulo-dropdown-container');
        
        const dropdown = document.createElement('div');
        dropdown.className = 'aulo-dropdown';
        
        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = `aulo-dropdown-item ${item.danger ? 'danger' : ''}`;
            itemDiv.innerHTML = `
                <i class="fa-solid ${item.icon || 'fa-circle'}"></i>
                <span>${item.text}</span>
            `;
            
            itemDiv.onclick = (e) => {
                e.stopPropagation();
                dropdown.remove();
                if (item.onClick) item.onClick();
                if (onSelect) onSelect(item);
            };
            
            dropdown.appendChild(itemDiv);
        });
        
        container.appendChild(dropdown);
        
        const rect = triggerElement.getBoundingClientRect();
        let top, left;
        
        switch (position) {
            case 'bottom':
                top = rect.bottom + 5;
                left = align === 'start' ? rect.left : 
                       align === 'end' ? rect.right - dropdown.offsetWidth : 
                       rect.left + (rect.width / 2) - (dropdown.offsetWidth / 2);
                break;
            case 'top':
                top = rect.top - dropdown.offsetHeight - 5;
                left = align === 'start' ? rect.left : 
                       align === 'end' ? rect.right - dropdown.offsetWidth : 
                       rect.left + (rect.width / 2) - (dropdown.offsetWidth / 2);
                break;
        }
        
        dropdown.style.top = `${top}px`;
        dropdown.style.left = `${left}px`;
        
        const closeDropdown = (e) => {
            if (!dropdown.contains(e.target) && e.target !== triggerElement) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        };
        
        setTimeout(() => document.addEventListener('click', closeDropdown), 0);
        
        return dropdown;
    }

    confirm(message, options = {}) {
        const {
            title = 'تأكيد',
            confirmText = 'نعم',
            cancelText = 'إلغاء'
        } = options;

        return new Promise((resolve) => {
            this.popup({
                type: 'confirm',
                title: title,
                message: message,
                confirmText: confirmText,
                cancelText: cancelText,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }

    alert(message, options = {}) {
        const {
            title = 'تنبيه',
            type = 'info'
        } = options;

        return new Promise((resolve) => {
            this.popup({
                type: type,
                title: title,
                message: message,
                onConfirm: () => resolve(true)
            });
        });
    }

    showLoading(text = 'جاري التحميل...') {
        const existing = document.querySelector('.aulo-loading');
        if (existing) existing.remove();
        
        const loading = document.createElement('div');
        loading.className = 'aulo-loading';
        loading.innerHTML = `<div class="aulo-loading-spinner"></div><span style="margin-right: 10px;">${text}</span>`;
        document.body.appendChild(loading);
        return loading;
    }

    hideLoading() {
        const loading = document.querySelector('.aulo-loading');
        if (loading) loading.remove();
    }
}

const Aulo = new AuloUI();

window.showMessage = (message, isError = false) => {
    Aulo.snackbar(message, { type: isError ? 'error' : 'success' });
};