/**
 * Device Compatibility Utilities
 * Ensures consistent UI appearance across all devices
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMac: boolean;
  isLinux: boolean;
  hasTouch: boolean;
  pixelRatio: number;
}

/**
 * Detect device information
 */
export function getDeviceInfo(): DeviceInfo {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  // Detect operating system
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isWindows = /Win/.test(platform);
  const isMac = /Mac/.test(platform);
  const isLinux = /Linux/.test(platform);
  
  // Detect touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Get pixel ratio for high-DPI displays
  const pixelRatio = window.devicePixelRatio || 1;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isWindows,
    isMac,
    isLinux,
    hasTouch,
    pixelRatio
  };
}

/**
 * Get device-specific CSS classes
 */
export function getDeviceClasses(): string[] {
  const device = getDeviceInfo();
  const classes: string[] = [];
  
  if (device.isMobile) {
    classes.push('device-mobile');
  }
  
  if (device.isTablet) {
    classes.push('device-tablet');
  }
  
  if (device.isDesktop) {
    classes.push('device-desktop');
  }
  
  if (device.isIOS) {
    classes.push('device-ios');
  }
  
  if (device.isAndroid) {
    classes.push('device-android');
  }
  
  if (device.hasTouch) {
    classes.push('device-touch');
  }
  
  return classes;
}

/**
 * Apply device-specific styles
 */
export function applyDeviceStyles(): void {
  const device = getDeviceInfo();
  const root = document.documentElement;
  
  // Set CSS custom properties for device-specific styling
  root.style.setProperty('--device-type', device.isMobile ? 'mobile' : device.isTablet ? 'tablet' : 'desktop');
  root.style.setProperty('--has-touch', device.hasTouch ? '1' : '0');
  root.style.setProperty('--pixel-ratio', device.pixelRatio.toString());
  
  // Add device classes to body
  const deviceClasses = getDeviceClasses();
  document.body.classList.add(...deviceClasses);
}

/**
 * Get device-optimized icon size
 */
export function getIconSize(baseSize: number = 20): number {
  const device = getDeviceInfo();
  
  if (device.isMobile) {
    return Math.round(baseSize * 1.2); // Slightly larger on mobile for touch
  }
  
  if (device.isTablet) {
    return Math.round(baseSize * 1.1); // Slightly larger on tablet
  }
  
  return baseSize; // Default size for desktop
}

/**
 * Get device-optimized spacing
 */
export function getSpacing(baseSpacing: number = 4): number {
  const device = getDeviceInfo();
  
  if (device.isMobile) {
    return Math.round(baseSpacing * 1.5); // More spacing on mobile for touch
  }
  
  return baseSpacing;
}

/**
 * Initialize device compatibility
 */
export function initDeviceCompatibility(): void {
  // Apply device styles on load
  applyDeviceStyles();
  
  // Reapply on resize (for orientation changes)
  window.addEventListener('resize', () => {
    setTimeout(applyDeviceStyles, 100);
  });
  
  // Reapply on orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(applyDeviceStyles, 100);
  });
}

/**
 * Check if device supports specific features
 */
export function supportsFeature(feature: string): boolean {
  const device = getDeviceInfo();
  
  switch (feature) {
    case 'backdrop-blur':
      return CSS.supports('backdrop-filter', 'blur(10px)') || 
             CSS.supports('-webkit-backdrop-filter', 'blur(10px)');
    
    case 'css-grid':
      return CSS.supports('display', 'grid');
    
    case 'flexbox':
      return CSS.supports('display', 'flex');
    
    case 'touch':
      return device.hasTouch;
    
    case 'high-dpi':
      return device.pixelRatio > 1;
    
    default:
      return false;
  }
}

/**
 * Get fallback styles for unsupported features
 */
export function getFallbackStyles(feature: string): Record<string, string> {
  switch (feature) {
    case 'backdrop-blur':
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'none'
      };
    
    case 'css-grid':
      return {
        display: 'flex',
        flexDirection: 'column'
      };
    
    default:
      return {};
  }
}
