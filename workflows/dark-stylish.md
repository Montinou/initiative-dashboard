<task name="Dark Stylish Theme Redesign">

<task_objective>
Transform the InsAIght application from its current cyan/yellow color scheme to a sophisticated dark theme with emerald accents. The workflow will redesign the hero landing page with a dark background, white text, emerald particles floating and glowing randomly, and ensure the entire application maintains visual consistency. The output will be a fully modified application with updated CSS/Tailwind configuration files, modified component files (.tsx), enhanced animations using the best available libraries, and a summary report of all changes made. The theme emphasizes sober elegance with dark backgrounds, white text for proper contrast, glowing emerald accents and button borders on hover, while maintaining simplicity with detailed animations.
</task_objective>

<detailed_sequence_steps>
# Dark Stylish Theme Redesign Process - Detailed Sequence of Steps

## 1. Analyze Current Design System and Color Usage

1. **Audit Existing Color Palette**
   - Use the `grep` command to search for all cyan color references (bg-cyan, border-cyan, text-cyan, #00FFFF)
   - Use the `grep` command to search for all yellow color references (#FBD024, yellow classes)
   - Use the `read_file` command to examine color variables in `/app/globals.css` and `/tailwind.config.ts`
   - Document all components using these colors for systematic replacement

2. **Identify Components and Files for Modification**
   - Map all files containing color-specific styling
   - Document DiagonalWave component animations using cyan
   - Identify hardcoded color values in component files
   - Create comprehensive list of files requiring updates

3. **Document Current Theme Structure**
   - Analyze existing CSS variable system
   - Map current light/dark mode implementation
   - Identify theme switching mechanisms
   - Document any existing animation libraries in use

## 2. Clean Up Old Theme Remnants

1. **Remove Cyan Color References**
   - Use the `edit_file` command to remove all cyan CSS overrides in `globals.css`
   - Remove cyan variables from `tailwind.config.ts`
   - Clean up any hardcoded cyan color values (`#00FFFF`, `rgba(0, 255, 255)`)
   - Remove cyan-specific utility classes

2. **Clean DiagonalWave Component**
   - Remove cyan particle animations from existing DiagonalWave component
   - Clear any cyan glow effects or borders
   - Remove cyan-specific animation keyframes
   - Prepare component structure for emerald replacement

3. **Eliminate Yellow Theme Remnants**
   - Remove any remaining yellow color references (#FBD024)
   - Clean up yellow-based chart colors
   - Remove unused yellow utilities from Tailwind config
   - Ensure no color conflicts remain for emerald implementation

## 3. Update Global Styles and Tailwind Configuration with Emerald Theme

1. **Configure Emerald Color Palette**
   - Add complete emerald color palette (50-900 shades) to `tailwind.config.ts`
   - Set emerald (#10B981) as primary color variable
   - Create emerald gradient utilities for buttons and accents
   - Add emerald glow drop shadow effects for hover states

2. **Implement Dark Background System**
   - Update CSS variables to use dark backgrounds (gray-900, black)
   - Create dark background utilities (dark-bg-900, dark-bg-800, dark-bg-700)
   - Set white text as default for dark backgrounds
   - Ensure proper contrast ratios for accessibility

3. **Create Emerald Glow Effects**
   - Add `.emerald-glow` and `.emerald-glow-lg` utility classes
   - Implement emerald border glow effects for buttons
   - Create emerald focus ring utilities for form elements
   - Add emerald accent utilities for interactive elements

4. **Update Component-Specific Variables**
   - Modify card backgrounds to dark with emerald accents
   - Update form input styling for dark theme
   - Transform navigation components to dark theme
   - Create glass morphism effects adapted for dark backgrounds

## 4. Create Emerald Particle Animation Component

1. **Design Particle System Architecture**
   - Replace DiagonalWave with new EmeraldParticles component
   - Choose optimal animation library (Framer Motion for performance)
   - Design particle count, sizes, and movement patterns
   - Plan multiple particle layers for visual depth

2. **Implement Floating Particles**
   - Create main floating particles (20-30 particles) with size range 2-6px
   - Implement random movement patterns with 20-50px range
   - Add pulsing animation with opacity variation (0.2-0.6)
   - Create 6-10 second animation cycles with random delays

3. **Add Accent Particles and Effects**
   - Implement larger accent particles (6-9px) with enhanced glow
   - Add rotating inner cores with counter-rotation effects
   - Create background energy fields with radial gradients
   - Add breathing animation effects with subtle opacity changes

4. **Optimize Performance and Integration**
   - Ensure SSR compatibility with mounted state
   - Use hardware-accelerated CSS transforms
   - Add pointer-events-none for non-interference
   - Implement responsive percentage-based positioning

## 5. Transform Hero Landing Page

1. **Update Page Background**
   - Replace current background with dark gradient (gray-900 to black)
   - Add emerald accent overlays with radial gradients
   - Create atmospheric effects with multiple gradient layers
   - Ensure smooth transitions and professional appearance

2. **Transform Typography for Dark Theme**
   - Change hero title to white-to-emerald gradient text
   - Add emerald glow effects to main headings
   - Update subtitle to light gray (#e2e8f0) with text shadows
   - Ensure high contrast ratios for readability

3. **Redesign Interactive Elements**
   - Transform primary buttons to emerald gradient backgrounds
   - Add emerald glow effects on button hover
   - Update ghost buttons with emerald borders
   - Implement scale, glow, and transform hover animations

4. **Integrate Particle System**
   - Replace DiagonalWave import with EmeraldParticles
   - Ensure proper z-index layering with content
   - Test particle visibility against dark background
   - Verify smooth performance across devices

## 6. Update All Components to Match New Dark Theme

1. **Transform Navigation Components**
   - Update sidebar to dark theme with emerald accents
   - Change navigation items to white text on dark backgrounds
   - Add emerald active states and hover effects
   - Implement emerald glow for selected navigation items

2. **Redesign Form Components**
   - Update all input fields to dark backgrounds with white text
   - Add emerald focus rings and border highlights
   - Transform buttons to match emerald theme
   - Ensure form validation styling works with dark theme

3. **Update Card and Layout Components**
   - Change card backgrounds to dark with emerald borders
   - Update modal and dialog components for dark theme
   - Transform data visualization components
   - Ensure table and list styling matches dark theme

4. **Modernize Charts and Data Visualization**
   - Replace yellow chart colors with emerald variants
   - Update chart backgrounds for dark theme
   - Ensure data remains readable with white text
   - Add emerald accent colors for highlighted data

## 7. Ensure Text Contrast and Accessibility

1. **Implement White Text Standards**
   - Ensure all text is white when background is dark
   - Check contrast ratios meet WCAG AA standards (4.5:1 minimum)
   - Add text shadows where needed for better readability
   - Test with different screen brightness levels

2. **Optimize Emerald Accent Accessibility**
   - Verify emerald colors provide sufficient contrast
   - Test emerald glow effects for visibility
   - Ensure interactive elements are clearly distinguishable
   - Add alternative indicators for colorblind users

3. **Test Focus and Interactive States**
   - Verify keyboard navigation visibility on dark backgrounds
   - Ensure focus indicators use emerald accents appropriately
   - Test hover states for sufficient visual feedback
   - Validate form error states work with dark theme

## 8. Test and Refine Animations/Interactions

1. **Performance Testing**
   - Test particle animations across different devices
   - Verify 60fps performance for all animations
   - Check memory usage with continuous particle effects
   - Optimize animation timing and easing functions

2. **Cross-Browser Compatibility**
   - Test emerald glow effects across browsers
   - Verify dark theme rendering consistency
   - Check animation compatibility (Chrome, Firefox, Safari, Edge)
   - Ensure graceful fallbacks for older browsers

3. **Mobile and Responsive Testing**
   - Test particle system on mobile devices
   - Verify touch interactions work with new theme
   - Check responsive design with dark backgrounds
   - Ensure emerald accents remain visible on small screens

4. **User Experience Validation**
   - Test all user workflows with new dark theme
   - Verify no functionality is broken by visual changes
   - Check that emerald accents enhance rather than distract
   - Ensure loading states and transitions are smooth

## 9. Final Quality Assurance and Documentation

1. **Comprehensive Visual Review**
   - Review all pages for consistent dark theme application
   - Verify emerald accents are applied consistently
   - Check that white text is used appropriately throughout
   - Ensure no remnants of old cyan/yellow theme remain

2. **Functionality Testing**
   - Test all form submissions and data processing
   - Verify authentication flows work with new theme
   - Check file upload and analysis functionality
   - Ensure navigation and routing remain functional

3. **Create Implementation Documentation**
   - Document new emerald color palette and usage guidelines
   - Create component style guide for dark theme
   - Provide migration notes for future developers
   - Update project documentation with new design system

4. **Generate Summary Report**
   - List all modified files and components
   - Document performance improvements or impacts
   - Provide before/after comparison of key pages
   - Include accessibility compliance verification

</detailed_sequence_steps>

</task>