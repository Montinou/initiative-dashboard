"use client"

// Centralized export for all dialog components
// This provides a single import point for all dialog types

// Standard dialogs for simple use cases
export { 
  StandardDialog as default,
  ConfirmDialog,
  FormDialog 
} from "./standard-dialog"

// Complex dialogs for multi-step flows and tabs
export { 
  ComplexDialog,
  WizardDialog,
  MultiTabDialog 
} from "./complex-dialog"

// Drawer/sheet dialogs for mobile and side panels
export { 
  DrawerDialog,
  MobileDrawer,
  BottomSheet,
  SideNavigation 
} from "./drawer-dialog"

// Re-export base dialog primitives for advanced use cases
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog"

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog"

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet"

// Type exports for TypeScript users
export type { 
  StandardDialogProps,
  ConfirmDialogProps,
  FormDialogProps 
} from "./standard-dialog"

export type { 
  ComplexDialogProps,
  WizardDialogProps,
  MultiTabDialogProps 
} from "./complex-dialog"

export type { 
  DrawerDialogProps,
  MobileDrawerProps,
  BottomSheetProps,
  SideNavigationProps 
} from "./drawer-dialog"