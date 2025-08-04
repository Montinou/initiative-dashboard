/**
 * Responsive File Upload Trigger
 * Adaptive component that shows different upload UIs based on screen size and device capabilities
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Upload, Plus, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { FileUploadDropzone } from './FileUploadDropzone';
import { MobileFileUpload } from './MobileFileUpload';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ResponsiveFileUploadTriggerProps {
  // Configuration
  areaId?: string;
  initiativeId?: string;
  userRole?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  
  // UI Customization
  variant?: 'default' | 'outline' | 'ghost' | 'fab' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  icon?: React.ElementType;
  className?: string;
  disabled?: boolean;
  
  // Responsive behavior
  forceMobile?: boolean;
  forceDesktop?: boolean;
  
  // Event handlers
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (errors: string[]) => void;
  onFilesSelected?: (files: File[]) => void;
}

// ============================================================================
// HOOK FOR DEVICE DETECTION
// ============================================================================

function useDeviceDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');

  useEffect(() => {
    const checkDevice = () => {
      // Check if it's a mobile device
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      // Check if it's a touch device
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check screen size
      const width = window.innerWidth;
      let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
      if (width < 640) size = 'sm';
      else if (width < 768) size = 'md';
      else if (width < 1024) size = 'lg';
      else size = 'xl';

      setIsMobile(mobile);
      setIsTouchDevice(touch);
      setScreenSize(size);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTouchDevice, screenSize };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ResponsiveFileUploadTrigger: React.FC<ResponsiveFileUploadTriggerProps> = ({
  areaId,
  initiativeId,
  userRole = 'Analyst',
  maxFiles = 5,
  acceptedTypes = ['.xlsx', '.xls', '.csv', '.pdf', '.jpg', '.png'],
  variant = 'default',
  size = 'md',
  label,
  icon: IconComponent = Upload,
  className,
  disabled = false,
  forceMobile = false,
  forceDesktop = false,
  onUploadComplete,
  onUploadError,
  onFilesSelected
}) => {
  const { isMobile, isTouchDevice, screenSize } = useDeviceDetection();
  const [showMobileUpload, setShowMobileUpload] = useState(false);
  const [showDesktopDialog, setShowDesktopDialog] = useState(false);

  // Determine which UI to show
  const shouldShowMobile = forceMobile || (!forceDesktop && (isMobile || isTouchDevice || screenSize === 'sm'));

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleTriggerClick = () => {
    if (disabled) return;
    
    if (shouldShowMobile) {
      setShowMobileUpload(true);
    } else {
      setShowDesktopDialog(true);
    }
  };

  const handleUploadComplete = (results: any[]) => {
    onUploadComplete?.(results);
    setShowMobileUpload(false);
    setShowDesktopDialog(false);
  };

  const handleUploadError = (errors: string[]) => {
    onUploadError?.(errors);
  };

  // ============================================================================
  // BUTTON VARIANTS
  // ============================================================================

  const getButtonProps = () => {
    const baseProps = {
      disabled,
      onClick: handleTriggerClick,
      className: cn(className)
    };

    switch (variant) {
      case 'fab':
        return {
          ...baseProps,
          className: cn(
            'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-30',
            'bg-primary hover:bg-primary/90 text-white',
            'md:h-12 md:w-12 md:bottom-8 md:right-8',
            className
          ),
          children: <IconComponent className="h-6 w-6" />
        };

      case 'minimal':
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size: 'sm' as const,
          className: cn('text-gray-400 hover:text-white', className),
          children: <IconComponent className="h-4 w-4" />
        };

      case 'outline':
        return {
          ...baseProps,
          variant: 'outline' as const,
          size,
          className: cn('border-white/20 text-white hover:bg-white/10', className),
          children: (
            <>
              <IconComponent className={cn(
                size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
                label && 'mr-2'
              )} />
              {label && <span className={cn(screenSize === 'sm' && 'hidden sm:inline')}>{label}</span>}
            </>
          )
        };

      case 'ghost':
        return {
          ...baseProps,
          variant: 'ghost' as const,
          size,
          className: cn('text-white hover:bg-white/10', className),
          children: (
            <>
              <IconComponent className={cn(
                size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
                label && 'mr-2'
              )} />
              {label && <span className={cn(screenSize === 'sm' && 'hidden sm:inline')}>{label}</span>}
            </>
          )
        };

      default: // 'default'
        return {
          ...baseProps,
          variant: 'default' as const,
          size,
          children: (
            <>
              <IconComponent className={cn(
                size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4',
                label && 'mr-2'
              )} />
              {label && <span className={cn(screenSize === 'sm' && 'hidden sm:inline')}>{label}</span>}
            </>
          )
        };
    }
  };

  const buttonProps = getButtonProps();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Trigger Button */}
      <Button {...buttonProps} />

      {/* Mobile Upload Modal */}
      <MobileFileUpload
        isOpen={showMobileUpload}
        onClose={() => setShowMobileUpload(false)}
        areaId={areaId}
        initiativeId={initiativeId}
        userRole={userRole}
        maxFiles={maxFiles}
        acceptedTypes={acceptedTypes}
        onUploadComplete={handleUploadComplete}
        onUploadError={handleUploadError}
      />

      {/* Desktop Upload Dialog */}
      <Dialog open={showDesktopDialog} onOpenChange={setShowDesktopDialog}>
        <DialogContent className={cn(
          'max-w-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700',
          'border border-white/20 text-white'
        )}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Files className="h-5 w-5 text-primary" />
              Upload Files
              {areaId && <span className="text-sm text-gray-400">to area</span>}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <FileUploadDropzone
              areaId={areaId}
              initiativeId={initiativeId}
              userRole={userRole}
              maxFiles={maxFiles}
              acceptedTypes={acceptedTypes}
              showPreview={true}
              showProgress={true}
              onFilesSelected={onFilesSelected}
              onUploadComplete={(fileId, result) => handleUploadComplete([result])}
              onUploadError={(fileId, error) => handleUploadError([error])}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ============================================================================
// PREDEFINED VARIANTS
// ============================================================================

/**
 * Floating Action Button for mobile-first upload
 */
export const FileUploadFAB: React.FC<Omit<ResponsiveFileUploadTriggerProps, 'variant'>> = (props) => (
  <ResponsiveFileUploadTrigger {...props} variant="fab" />
);

/**
 * Header upload button with responsive behavior
 */
export const HeaderUploadButton: React.FC<Omit<ResponsiveFileUploadTriggerProps, 'variant' | 'size'>> = (props) => (
  <ResponsiveFileUploadTrigger 
    {...props} 
    variant="outline" 
    size="sm" 
    label={props.label || 'Upload'}
  />
);

/**
 * Inline upload trigger for cards and sections
 */
export const InlineUploadTrigger: React.FC<Omit<ResponsiveFileUploadTriggerProps, 'variant'>> = (props) => (
  <ResponsiveFileUploadTrigger 
    {...props} 
    variant="ghost" 
    icon={Plus}
  />
);

/**
 * Minimal upload icon for compact spaces
 */
export const MinimalUploadIcon: React.FC<Omit<ResponsiveFileUploadTriggerProps, 'variant' | 'size'>> = (props) => (
  <ResponsiveFileUploadTrigger 
    {...props} 
    variant="minimal" 
    size="sm"
  />
);

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

/**
 * Screen reader friendly upload component
 */
export const AccessibleFileUpload: React.FC<ResponsiveFileUploadTriggerProps> = (props) => (
  <ResponsiveFileUploadTrigger
    {...props}
    className={cn(
      'focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-900',
      'aria-label="Upload files"',
      props.className
    )}
    label={props.label || 'Upload Files'}
  />
);

// ============================================================================
// USAGE EXAMPLES (FOR DOCUMENTATION)
// ============================================================================

/*
// Basic usage - adapts automatically to device
<ResponsiveFileUploadTrigger
  areaId="area-123"
  label="Upload Files"
  onUploadComplete={(results) => console.log(results)}
/>

// Floating action button for mobile
<FileUploadFAB
  areaId="area-123"
  onUploadComplete={(results) => console.log(results)}
/>

// Header button that hides label on small screens
<HeaderUploadButton
  areaId="area-123"
  label="Upload"
  onUploadComplete={(results) => console.log(results)}
/>

// Force mobile UI even on desktop
<ResponsiveFileUploadTrigger
  areaId="area-123"
  forceMobile={true}
  onUploadComplete={(results) => console.log(results)}
/>

// Minimal icon for toolbars
<MinimalUploadIcon
  areaId="area-123"
  onUploadComplete={(results) => console.log(results)}
/>
*/