import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Tablet } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    // Check if user has dismissed this prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Check if already installed previously
    const wasInstalled = localStorage.getItem('pwa-installed');
    if (wasInstalled) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show the prompt after a delay
      setTimeout(() => {
        if (!checkIfInstalled()) {
          setIsVisible(true);
        }
      }, 3000); // Show after 3 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      localStorage.setItem('pwa-installed', 'true');
      
      // Show success message
      showInstallSuccessMessage();
    };

    // Check if already installed on load
    if (!checkIfInstalled()) {
      // Show manual install prompt for mobile devices after 5 seconds
      setTimeout(() => {
        if (!isInstalled && !isDismissed && !deferredPrompt) {
          const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            setIsVisible(true);
          }
        }
      }, 5000);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, isDismissed, deferredPrompt]);

  const showInstallSuccessMessage = () => {
    // Create a success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4caf50, #45a049);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
      z-index: 10001;
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 20px;">🎉</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">App Installed!</div>
          <div style="font-size: 14px; opacity: 0.9;">REC Kiosk is now on your home screen</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 5000);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setIsVisible(false);
          localStorage.setItem('pwa-installed', 'true');
        }
      } catch (error) {
        console.error('Installation failed:', error);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      // Manual install instructions for mobile
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    let instructions = '';
    let title = 'Install REC Kiosk App';
    
    if (isIOS) {
      if (isSafari) {
        instructions = `
📱 Safari on iOS:
1. Tap the Share button (📤) at the bottom
2. Scroll down and tap "Add to Home Screen"
3. Tap "Add" to install the app

💡 Tip: You can also use other browsers like Chrome
        `;
      } else {
        instructions = `
📱 ${isChrome ? 'Chrome' : 'Browser'} on iOS:
1. Tap the menu button (⋮) in the address bar
2. Tap "Add to Home Screen"
3. Tap "Add" to install the app

💡 Tip: Safari provides the best experience
        `;
      }
    } else if (isAndroid) {
      if (isChrome) {
        instructions = `
📱 Chrome on Android:
1. Tap the menu button (⋮) in the address bar
2. Tap "Add to Home screen"
3. Tap "Add" to install the app
        `;
      } else if (isFirefox) {
        instructions = `
📱 Firefox on Android:
1. Tap the menu button (☰) in the address bar
2. Tap "Add to Home Screen"
3. Tap "Add" to install the app
        `;
      } else if (isEdge) {
        instructions = `
📱 Edge on Android:
1. Tap the menu button (⋮) in the address bar
2. Tap "Add to Home screen"
3. Tap "Add" to install the app
        `;
      } else {
        instructions = `
📱 Browser on Android:
1. Tap the menu button in your browser
2. Look for "Add to Home screen" or "Install app"
3. Tap "Add" to install the app
        `;
      }
    } else {
      instructions = `
💻 Desktop Browser:
1. Look for the install icon (📱) in your browser's address bar
2. Or use the browser menu to find "Install" option
3. Click "Install" to add the app

💡 Tip: Works best in Chrome, Edge, or Firefox
        `;
    }
    
    // Create a more user-friendly modal instead of alert
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    `;
    
    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #6a1b9a, #8e24aa); border-radius: 12px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px;">📱</div>
        <h3 style="margin: 0; color: #333; font-size: 18px; font-weight: 600;">${title}</h3>
      </div>
      <div style="color: #666; line-height: 1.6; font-size: 14px; white-space: pre-line;">${instructions}</div>
      <div style="margin-top: 24px; text-align: center;">
        <button id="close-install-modal" style="background: #6a1b9a; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500;">Got it!</button>
      </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside or on close button
    const closeModal = () => {
      document.body.removeChild(modal);
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    
    content.querySelector('#close-install-modal')?.addEventListener('click', closeModal);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const handleDismissForSession = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  if (isInstalled || isDismissed || !isVisible) {
    return null;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-gradient-to-br from-purple-500/95 to-purple-600/95 backdrop-blur-md border border-purple-400/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
        {/* Animated header bar */}
        <div className="h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-pulse" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-full flex items-center justify-center">
                  <Download size={20} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Install REC Kiosk</h3>
                <p className="text-purple-200 text-sm">Get the app experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-purple-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Device-specific content */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center space-x-2 text-purple-200 text-sm">
              {isMobile ? (
                <>
                  {isIOS ? <Smartphone size={16} /> : isAndroid ? <Smartphone size={16} /> : <Tablet size={16} />}
                  <span>Install on your {isIOS ? 'iPhone' : isAndroid ? 'Android' : 'mobile'} device</span>
                </>
              ) : (
                <>
                  <Monitor size={16} />
                  <span>Install on your desktop</span>
                </>
              )}
            </div>
            
            <p className="text-gray-300 text-sm leading-relaxed">
              Install REC Kiosk for a better experience with offline access, 
              faster loading, and app-like features.
            </p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span>Offline Access</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span>Fast Loading</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span>App-like UI</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleDismissForSession}
              className="flex-1 px-3 py-2 text-xs bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors duration-200"
            >
              Maybe Later
            </button>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 px-3 py-2 text-xs bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1"
            >
              {isInstalling ? (
                <>
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Install App</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
        <div className="absolute bottom-4 right-6 w-1 h-1 bg-pink-400 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
