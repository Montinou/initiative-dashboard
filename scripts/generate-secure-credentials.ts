#!/usr/bin/env ts-node

import crypto from 'crypto';

/**
 * Generate secure credentials for production use
 * Run this script to replace hardcoded test credentials
 */

interface SecureCredential {
  email: string;
  password: string;
  role: string;
}

class SecureCredentialGenerator {
  /**
   * Generate a cryptographically secure password
   */
  private generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(charset.length);
      password += charset[randomIndex];
    }
    
    // Ensure password meets complexity requirements
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
    
    if (hasLower && hasUpper && hasNumber && hasSymbol) {
      return password;
    }
    
    // Regenerate if doesn't meet requirements
    return this.generateSecurePassword(length);
  }

  /**
   * Generate secure credentials for all test users
   */
  generateCredentials(): SecureCredential[] {
    const users = [
      { email: 'ceo_siga@example.com', role: 'CEO' },
      { email: 'admin_siga@example.com', role: 'Admin' },
      { email: 'manager_adm@siga.com', role: 'Manager' },
      { email: 'manager_ch@siga.com', role: 'Manager' },
      { email: 'manager_com@siga.com', role: 'Manager' },
      { email: 'manager_prod@siga.com', role: 'Manager' },
      { email: 'ceo_fema@example.com', role: 'CEO' },
      { email: 'admin_fema@example.com', role: 'Admin' },
      { email: 'manager_adm@fema.com', role: 'Manager' },
      { email: 'manager_ch@fema.com', role: 'Manager' },
      { email: 'manager_com@fema.com', role: 'Manager' },
      { email: 'manager_prod@fema.com', role: 'Manager' }
    ];

    return users.map(user => ({
      ...user,
      password: this.generateSecurePassword()
    }));
  }

  /**
   * Generate environment-specific credentials
   */
  generateForEnvironment(env: 'development' | 'staging' | 'production'): SecureCredential[] {
    const credentials = this.generateCredentials();
    
    console.log(`\n🔐 Generated secure credentials for ${env.toUpperCase()} environment:`);
    console.log('=' .repeat(60));
    
    credentials.forEach(cred => {
      console.log(`Email: ${cred.email}`);
      console.log(`Role: ${cred.role}`);
      console.log(`Password: ${cred.password}`);
      console.log('-'.repeat(40));
    });
    
    console.log('\n⚠️  SECURITY NOTICE:');
    console.log('1. Store these credentials securely (e.g., password manager, env vars)');
    console.log('2. Never commit these to version control');
    console.log('3. Rotate credentials regularly');
    console.log('4. Use different credentials for each environment');
    
    return credentials;
  }

  /**
   * Generate .env template with secure credentials
   */
  generateEnvTemplate(credentials: SecureCredential[]): string {
    let envTemplate = '# Secure Test Credentials - DO NOT COMMIT TO GIT\n';
    envTemplate += '# Generated on: ' + new Date().toISOString() + '\n\n';
    
    credentials.forEach((cred, index) => {
      const envKey = `TEST_USER_${index + 1}_EMAIL`;
      const passKey = `TEST_USER_${index + 1}_PASSWORD`;
      const roleKey = `TEST_USER_${index + 1}_ROLE`;
      
      envTemplate += `${envKey}="${cred.email}"\n`;
      envTemplate += `${passKey}="${cred.password}"\n`;
      envTemplate += `${roleKey}="${cred.role}"\n\n`;
    });
    
    return envTemplate;
  }
}

// Main execution
if (require.main === module) {
  const generator = new SecureCredentialGenerator();
  const env = (process.argv[2] as 'development' | 'staging' | 'production') || 'development';
  
  const credentials = generator.generateForEnvironment(env);
  const envTemplate = generator.generateEnvTemplate(credentials);
  
  console.log('\n📄 .env template:');
  console.log('=' .repeat(60));
  console.log(envTemplate);
  
  console.log('\n🚀 Next steps:');
  console.log('1. Copy the credentials to your password manager');
  console.log('2. Add the .env variables to your local environment');
  console.log('3. Update your test files to use environment variables');
  console.log('4. Remove hardcoded passwords from the codebase');
}

export { SecureCredentialGenerator };