// Edge Runtime compatible authentication utilities
// This replaces bcryptjs with Web Crypto API for Edge Runtime compatibility

import { createClient } from '@supabase/supabase-js';

// Superadmin-specific Supabase client with service role
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface SuperadminSession {
  superadmin_id: string;
  name: string;
  email: string;
  session_token: string;
  expires_at: string;
}

export interface SuperadminUser {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  last_login: string | null;
}

// Edge Runtime compatible password hashing using Web Crypto API
class EdgeCompatibleAuth {
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // IP whitelist (move to environment variable in production)
  private readonly ALLOWED_IPS = process.env.SUPERADMIN_IP_WHITELIST?.split(',') || ['127.0.0.1', '::1'];

  /**
   * Hash password using Web Crypto API (Edge Runtime compatible)
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    
    // Generate a random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Use PBKDF2 for password hashing
    const key = await crypto.subtle.importKey(
      'raw',
      data,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      key,
      256
    );

    // Combine salt and hash
    const hashArray = new Uint8Array(derivedBits);
    const combined = new Uint8Array(salt.length + hashArray.length);
    combined.set(salt);
    combined.set(hashArray, salt.length);
    
    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Verify password using Web Crypto API
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      
      // Decode the stored hash
      const combined = new Uint8Array(atob(hash).split('').map(c => c.charCodeAt(0)));
      const salt = combined.slice(0, 16);
      const storedHash = combined.slice(16);
      
      // Hash the provided password with the same salt
      const key = await crypto.subtle.importKey(
        'raw',
        data,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        key,
        256
      );

      const hashArray = new Uint8Array(derivedBits);
      
      // Compare hashes
      if (hashArray.length !== storedHash.length) {
        return false;
      }
      
      for (let i = 0; i < hashArray.length; i++) {
        if (hashArray[i] !== storedHash[i]) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Authenticate superadmin with email and password
   */
  async authenticate(
    email: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<SuperadminSession> {
    try {
      console.log('Authentication attempt:', { email, ipAddress, userAgent });
      
      // Check IP whitelist
      if (!this.isIPAllowed(ipAddress)) {
        console.error('IP not whitelisted:', ipAddress);
        throw new Error('Access denied: IP not whitelisted');
      }

      // Get superadmin by email
      console.log('Searching for superadmin with email:', email);
      const { data: superadmin, error } = await supabaseAdmin
        .from('superadmins')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      console.log('Superadmin query result:', { 
        found: !!superadmin, 
        error: error?.message,
        superadminId: superadmin?.id 
      });

      if (error || !superadmin) {
        console.error('Superadmin not found or error:', error);
        throw new Error('Invalid credentials');
      }

      // Verify password
      console.log('Verifying password for superadmin:', superadmin.id);
      const isValidPassword = await this.verifyPassword(password, superadmin.password_hash);
      console.log('Password verification result:', isValidPassword);
      
      if (!isValidPassword) {
        console.error('Password verification failed');
        throw new Error('Invalid credentials');
      }

      // Generate session token
      const sessionToken = this.generateSessionToken();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      // Create session
      const { error: sessionError } = await supabaseAdmin
        .from('superadmin_sessions')
        .insert({
          superadmin_id: superadmin.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (sessionError) {
        throw new Error('Failed to create session');
      }

      // Log the login
      await this.logAction(
        superadmin.id,
        'SUPERADMIN_LOGIN',
        'authentication',
        null,
        { ip_address: ipAddress, user_agent: userAgent }
      );

      return {
        superadmin_id: superadmin.id,
        name: superadmin.name,
        email: superadmin.email,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
      };
    } catch (error) {
      console.error('Superadmin authentication error:', error);
      throw error;
    }
  }

  /**
   * Validate session token and return superadmin info
   */
  async validateSession(sessionToken: string): Promise<SuperadminUser | null> {
    try {
      const { data: session, error } = await supabaseAdmin
        .from('superadmin_sessions')
        .select(`
          *,
          superadmins (*)
        `)
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !session || !session.superadmins) {
        return null;
      }

      const superadmin = Array.isArray(session.superadmins) 
        ? session.superadmins[0] 
        : session.superadmins;

      return {
        id: superadmin.id,
        email: superadmin.email,
        name: superadmin.name,
        is_active: superadmin.is_active,
        last_login: superadmin.last_login,
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(
    sessionToken: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<void> {
    try {
      // Get session info for logging
      const { data: session } = await supabaseAdmin
        .from('superadmin_sessions')
        .select('superadmin_id')
        .eq('session_token', sessionToken)
        .single();

      // Delete session
      await supabaseAdmin
        .from('superadmin_sessions')
        .delete()
        .eq('session_token', sessionToken);

      // Log the logout
      if (session) {
        await this.logAction(
          session.superadmin_id,
          'SUPERADMIN_LOGOUT',
          'authentication',
          null,
          { ip_address: ipAddress, user_agent: userAgent }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error for logout - best effort
    }
  }

  /**
   * Create new superadmin user (only for initial setup)
   */
  async createSuperadmin(
    email: string, 
    name: string, 
    password: string
  ): Promise<string> {
    try {
      const passwordHash = await this.hashPassword(password);
      
      const { data, error } = await supabaseAdmin
        .from('superadmins')
        .insert({
          email,
          name,
          password_hash: passwordHash,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create superadmin: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Create superadmin error:', error);
      throw error;
    }
  }

  /**
   * Change superadmin password
   */
  async changePassword(
    superadminId: string, 
    oldPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      // Get current password hash
      const { data: superadmin, error: fetchError } = await supabaseAdmin
        .from('superadmins')
        .select('password_hash')
        .eq('id', superadminId)
        .single();

      if (fetchError || !superadmin) {
        throw new Error('Superadmin not found');
      }

      // Verify old password
      const isValidPassword = await this.verifyPassword(oldPassword, superadmin.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid current password');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      const { error: updateError } = await supabaseAdmin
        .from('superadmins')
        .update({ 
          password_hash: newPasswordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', superadminId);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      // Invalidate all sessions for this superadmin
      await supabaseAdmin
        .from('superadmin_sessions')
        .delete()
        .eq('superadmin_id', superadminId);

    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Log superadmin action
   */
  private async logAction(
    superadminId: string,
    action: string,
    targetType: string,
    targetId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await supabaseAdmin
        .from('superadmin_audit_log')
        .insert({
          superadmin_id: superadminId,
          action,
          target_type: targetType,
          target_id: targetId,
          details,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to log superadmin action:', error);
    }
  }

  /**
   * Check if IP address is allowed
   */
  private isIPAllowed(_ipAddress: string): boolean {
    // Disable IP whitelisting for now - allow all IPs
    // TODO: Enable IP whitelist in production via environment variables when needed
    return true;
  }

  /**
   * Get audit log entries
   */
  async getAuditLog(
    superadminId?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<any[]> {
    try {
      let query = supabaseAdmin
        .from('superadmin_audit_log')
        .select(`
          id,
          action,
          target_type,
          target_id,
          details,
          ip_address,
          created_at,
          superadmins!inner(name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (superadminId) {
        query = query.eq('superadmin_id', superadminId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch audit log: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get audit log error:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await supabaseAdmin
        .from('superadmin_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (error) {
        console.error('Cleanup sessions error:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Cleanup sessions error:', error);
      return 0;
    }
  }
}

export const edgeCompatibleAuth = new EdgeCompatibleAuth();
export default edgeCompatibleAuth;