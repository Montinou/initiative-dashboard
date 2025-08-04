"use client";

import { useEffect } from 'react';
import { getThemeFromDomain } from '@/lib/theme-config';

export function DynamicTheme() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const theme = getThemeFromDomain(hostname);
      
      // Apply tenant-specific theme colors
      if (theme.tenantSlug === 'fema-electricidad') {
        const root = document.documentElement;
        
        // Convert hex colors to HSL for CSS variables
        // FEMA Blue #00539F → HSL(210, 100%, 31%)
        // Accent Yellow #FFC72C → HSL(45, 100%, 58%)
        // Light Gray #F0F2F5 → HSL(214, 20%, 95%)
        // Medium Gray #6C757D → HSL(210, 11%, 46%)
        // Dark Gray #212529 → HSL(210, 17%, 14%)
        
        // Apply FEMA theme colors
        root.style.setProperty('--primary', '210 100% 31%'); // FEMA Blue
        root.style.setProperty('--primary-foreground', '0 0% 100%'); // White
        root.style.setProperty('--secondary', '214 20% 95%'); // Light Gray
        root.style.setProperty('--secondary-foreground', '210 100% 31%'); // FEMA Blue text
        root.style.setProperty('--accent', '45 100% 58%'); // Accent Yellow
        root.style.setProperty('--accent-foreground', '210 17% 14%'); // Dark Gray text
        root.style.setProperty('--muted', '214 20% 95%'); // Light Gray
        root.style.setProperty('--muted-foreground', '210 11% 46%'); // Medium Gray
        root.style.setProperty('--border', '214 20% 95%'); // Light Gray
        root.style.setProperty('--input', '214 20% 95%'); // Light Gray
        root.style.setProperty('--ring', '210 100% 31%'); // FEMA Blue
        
        // Chart colors for FEMA
        root.style.setProperty('--chart-1', '210 100% 31%'); // FEMA Blue
        root.style.setProperty('--chart-2', '45 100% 58%'); // Accent Yellow
        root.style.setProperty('--chart-3', '210 11% 46%'); // Medium Gray
        root.style.setProperty('--chart-4', '214 20% 95%'); // Light Gray
        root.style.setProperty('--chart-5', '210 17% 14%'); // Dark Gray
        
        // Sidebar colors for FEMA
        root.style.setProperty('--sidebar-background', '210 100% 31%'); // FEMA Blue
        root.style.setProperty('--sidebar-foreground', '0 0% 100%'); // White
        root.style.setProperty('--sidebar-primary', '45 100% 58%'); // Accent Yellow
        root.style.setProperty('--sidebar-primary-foreground', '210 17% 14%'); // Dark Gray
        root.style.setProperty('--sidebar-accent', '210 100% 35%'); // Lighter FEMA Blue
        root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%'); // White
        root.style.setProperty('--sidebar-border', '210 100% 25%'); // Darker FEMA Blue
        root.style.setProperty('--sidebar-ring', '45 100% 58%'); // Accent Yellow
        
        // Dark mode specific updates for FEMA
        if (document.documentElement.classList.contains('dark')) {
          root.style.setProperty('--background', '210 17% 14%'); // Dark Gray
          root.style.setProperty('--foreground', '0 0% 100%'); // White
          root.style.setProperty('--card', '210 17% 18%'); // Slightly lighter dark gray
          root.style.setProperty('--card-foreground', '0 0% 100%'); // White
          root.style.setProperty('--popover', '210 17% 18%'); // Slightly lighter dark gray
          root.style.setProperty('--popover-foreground', '0 0% 100%'); // White
          root.style.setProperty('--secondary', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--secondary-foreground', '0 0% 100%'); // White
          root.style.setProperty('--muted', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--muted-foreground', '210 11% 70%'); // Lighter gray
          root.style.setProperty('--border', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--input', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--ring', '45 100% 58%'); // Accent Yellow
          root.style.setProperty('--chart-4', '214 20% 85%'); // Lighter gray for dark mode
          root.style.setProperty('--chart-5', '0 0% 100%'); // Pure White
        }
      } else if (theme.tenantSlug === 'siga-turismo') {
        const root = document.documentElement;
        
        // Convert hex colors to HSL for CSS variables
        // Vibrant Green #00A651 → HSL(147, 100%, 33%)
        // Action Yellow #FDC300 → HSL(48, 100%, 50%)
        // Light Gray #F8F9FA → HSL(210, 17%, 98%)
        // Medium Gray #6C757D → HSL(210, 11%, 46%)
        // Dark Text #212529 → HSL(210, 17%, 14%)
        
        // Apply SIGA theme colors
        root.style.setProperty('--primary', '147 100% 33%'); // Vibrant Green
        root.style.setProperty('--primary-foreground', '0 0% 100%'); // White
        root.style.setProperty('--secondary', '210 17% 98%'); // Light Gray
        root.style.setProperty('--secondary-foreground', '147 100% 33%'); // Vibrant Green text
        root.style.setProperty('--accent', '48 100% 50%'); // Action Yellow
        root.style.setProperty('--accent-foreground', '210 17% 14%'); // Dark Text
        root.style.setProperty('--muted', '210 17% 98%'); // Light Gray
        root.style.setProperty('--muted-foreground', '210 11% 46%'); // Medium Gray
        root.style.setProperty('--border', '210 17% 98%'); // Light Gray
        root.style.setProperty('--input', '210 17% 98%'); // Light Gray
        root.style.setProperty('--ring', '147 100% 33%'); // Vibrant Green
        
        // Chart colors for SIGA
        root.style.setProperty('--chart-1', '147 100% 33%'); // Vibrant Green
        root.style.setProperty('--chart-2', '48 100% 50%'); // Action Yellow
        root.style.setProperty('--chart-3', '210 11% 46%'); // Medium Gray
        root.style.setProperty('--chart-4', '210 17% 98%'); // Light Gray
        root.style.setProperty('--chart-5', '210 17% 14%'); // Dark Text
        
        // Sidebar colors for SIGA
        root.style.setProperty('--sidebar-background', '147 100% 33%'); // Vibrant Green
        root.style.setProperty('--sidebar-foreground', '0 0% 100%'); // White
        root.style.setProperty('--sidebar-primary', '48 100% 50%'); // Action Yellow
        root.style.setProperty('--sidebar-primary-foreground', '210 17% 14%'); // Dark Text
        root.style.setProperty('--sidebar-accent', '147 100% 37%'); // Lighter Vibrant Green
        root.style.setProperty('--sidebar-accent-foreground', '0 0% 100%'); // White
        root.style.setProperty('--sidebar-border', '147 100% 27%'); // Darker Vibrant Green
        root.style.setProperty('--sidebar-ring', '48 100% 50%'); // Action Yellow
        
        // Dark mode specific updates for SIGA
        if (document.documentElement.classList.contains('dark')) {
          root.style.setProperty('--background', '210 17% 14%'); // Dark background
          root.style.setProperty('--foreground', '0 0% 100%'); // White
          root.style.setProperty('--card', '210 17% 18%'); // Slightly lighter dark
          root.style.setProperty('--card-foreground', '0 0% 100%'); // White
          root.style.setProperty('--popover', '210 17% 18%'); // Slightly lighter dark
          root.style.setProperty('--popover-foreground', '0 0% 100%'); // White
          root.style.setProperty('--secondary', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--secondary-foreground', '0 0% 100%'); // White
          root.style.setProperty('--muted', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--muted-foreground', '210 11% 70%'); // Lighter gray
          root.style.setProperty('--border', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--input', '210 11% 25%'); // Darker medium gray
          root.style.setProperty('--ring', '48 100% 50%'); // Action Yellow
          root.style.setProperty('--chart-4', '210 17% 85%'); // Lighter gray for dark mode
          root.style.setProperty('--chart-5', '0 0% 100%'); // Pure White
        }
      }
    }
  }, []);

  return null;
}