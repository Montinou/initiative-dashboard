const { chromium } = require('playwright');

async function inspectSIGA() {
  console.log('🚀 Starting SIGA platform inspection...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📄 Navigating to https://siga-turismo.vercel.app...');
    await page.goto('https://siga-turismo.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take screenshot
    await page.screenshot({ 
      path: '/mnt/e/Projects/Mariana projectos/Mariana/siga-homepage.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved: siga-homepage.png');
    
    // Get page info
    const title = await page.title();
    const url = page.url();
    
    console.log(`📋 Page Title: ${title}`);
    console.log(`🔗 Current URL: ${url}`);
    
    // Check for key elements
    const hasLogin = await page.locator('input[type="email"], input[type="password"], [data-testid*="login"]').count();
    const hasNavigation = await page.locator('nav, [role="navigation"]').count();
    const hasTheme = await page.evaluate(() => {
      const computedStyle = window.getComputedStyle(document.body);
      return {
        backgroundColor: computedStyle.backgroundColor,
        color: computedStyle.color
      };
    });
    
    console.log(`🔐 Login elements found: ${hasLogin}`);
    console.log(`🧭 Navigation elements found: ${hasNavigation}`);
    console.log(`🎨 Theme colors:`, hasTheme);
    
    // Check for SIGA branding
    const sigaElements = await page.locator('text=/SIGA|siga/i').count();
    const stratixElements = await page.locator('text=/Stratix|stratix/i').count();
    
    console.log(`🟢 SIGA branding elements: ${sigaElements}`);
    console.log(`🔵 Stratix branding elements: ${stratixElements}`);
    
    // Get console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait a bit for any async loading
    await page.waitForTimeout(3000);
    
    console.log(`❌ Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Error details:', consoleErrors);
    }
    
    // Try to interact with the page
    const interactionTest = await page.evaluate(() => {
      return {
        hasReact: typeof window.React !== 'undefined',
        hasNext: typeof window.__NEXT_DATA__ !== 'undefined',
        readyState: document.readyState,
        bodyContent: document.body.innerText.substring(0, 500)
      };
    });
    
    console.log('🔧 Page interaction test:', interactionTest);
    
  } catch (error) {
    console.error('❌ Error during inspection:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Inspection complete!');
  }
}

inspectSIGA().catch(console.error);