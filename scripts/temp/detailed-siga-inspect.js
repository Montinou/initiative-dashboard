const { chromium } = require('playwright');

async function detailedSIGAInspection() {
  console.log('🔍 Starting detailed SIGA platform inspection...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📄 Navigating to SIGA platform...');
    await page.goto('https://siga-turismo.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for potential loading to complete
    await page.waitForTimeout(5000);
    
    // Take screenshot after loading
    await page.screenshot({ 
      path: '/mnt/e/Projects/Mariana projectos/Mariana/siga-loaded.png',
      fullPage: true 
    });
    console.log('📸 Full page screenshot saved: siga-loaded.png');
    
    // Get detailed page analysis
    const analysis = await page.evaluate(() => {
      return {
        title: document.title,
        url: location.href,
        bodyClasses: document.body.className,
        hasReact: typeof window.React !== 'undefined',
        hasNext: typeof window.__NEXT_DATA__ !== 'undefined',
        
        // Theme analysis
        darkModeActive: document.documentElement.classList.contains('dark'),
        themeColors: {
          background: getComputedStyle(document.body).backgroundColor,
          color: getComputedStyle(document.body).color
        },
        
        // Navigation analysis
        navigationElements: Array.from(document.querySelectorAll('nav, [role="navigation"]')).length,
        sidebarElements: Array.from(document.querySelectorAll('[data-testid*="sidebar"], .sidebar')).length,
        
        // Content analysis
        mainContent: document.querySelector('main, [role="main"]')?.innerText?.substring(0, 1000) || 'No main content found',
        errorMessages: Array.from(document.querySelectorAll('[class*="error"], .error')).map(el => el.innerText),
        loadingElements: Array.from(document.querySelectorAll('[class*="loading"], .loading')).length,
        
        // Branding analysis
        sigaBranding: Array.from(document.querySelectorAll('*')).filter(el => 
          el.innerText && el.innerText.toLowerCase().includes('siga')
        ).length,
        stratixBranding: Array.from(document.querySelectorAll('*')).filter(el => 
          el.innerText && el.innerText.toLowerCase().includes('stratix')
        ).length,
        
        // Interactive elements
        buttons: document.querySelectorAll('button').length,
        links: document.querySelectorAll('a').length,
        forms: document.querySelectorAll('form').length,
        inputs: document.querySelectorAll('input').length,
        
        // Data attributes for testing
        testIds: Array.from(document.querySelectorAll('[data-testid]')).map(el => el.getAttribute('data-testid')),
        
        // Full text content sample
        fullText: document.body.innerText.substring(0, 2000)
      };
    });
    
    console.log('📊 Detailed Analysis Results:');
    console.log('==========================================');
    console.log(`Title: ${analysis.title}`);
    console.log(`URL: ${analysis.url}`);
    console.log(`Dark Mode: ${analysis.darkModeActive}`);
    console.log(`React Detected: ${analysis.hasReact}`);
    console.log(`Next.js Detected: ${analysis.hasNext}`);
    console.log(`SIGA Branding Count: ${analysis.sigaBranding}`);
    console.log(`Stratix Branding Count: ${analysis.stratixBranding}`);
    console.log(`Navigation Elements: ${analysis.navigationElements}`);
    console.log(`Interactive Elements: ${analysis.buttons} buttons, ${analysis.links} links, ${analysis.forms} forms`);
    console.log(`Error Messages: ${analysis.errorMessages.length}`);
    console.log('==========================================');
    
    if (analysis.errorMessages.length > 0) {
      console.log('🚨 Error Messages Found:');
      analysis.errorMessages.forEach((error, i) => {
        console.log(`  ${i+1}. ${error}`);
      });
    }
    
    if (analysis.testIds.length > 0) {
      console.log('🧪 Test IDs Found:');
      analysis.testIds.forEach(id => console.log(`  - ${id}`));
    }
    
    console.log('📝 Page Content Preview:');
    console.log('------------------------------------------');
    console.log(analysis.fullText);
    console.log('------------------------------------------');
    
    // Try to interact with dashboard if possible
    const interactionResults = await page.evaluate(() => {
      const refreshButton = document.querySelector('button:has-text("Refresh"), [data-testid*="refresh"]');
      if (refreshButton) {
        refreshButton.click();
        return { refreshClicked: true };
      }
      return { refreshClicked: false };
    });
    
    console.log('🔄 Interaction Test:', interactionResults);
    
    // Final analysis
    console.log('✅ Detailed inspection complete!');
    return analysis;
    
  } catch (error) {
    console.error('❌ Error during detailed inspection:', error.message);
    return null;
  } finally {
    await browser.close();
  }
}

detailedSIGAInspection().catch(console.error);