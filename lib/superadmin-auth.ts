import bcrypt from 'bcryptjs';
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

class SuperadminAuthService {
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  // IP whitelist (move to environment variable in production)
  private readonly ALLOWED_IPS = process.env.SUPERADMIN_IP_WHITELIST?.split(',') || ['127.0.0.1', '::1'];

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
      // Check IP whitelist
      if (!this.isIPAllowed(ipAddress)) {
        throw new Error('Access denied: IP not whitelisted');
      }

      // Call database function for authentication
      const { data, error } = await supabaseAdmin.rpc('superadmin_authenticate', {
        p_email: email,
        p_password: password,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        throw new Error('Authentication failed');
      }

      const sessionData = data[0];
      return {
        superadmin_id: sessionData.superadmin_id,
        name: sessionData.name,
        email: email,
        session_token: sessionData.session_token,
        expires_at: sessionData.expires_at
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
      const { data, error } = await supabaseAdmin.rpc('superadmin_validate_session', {
        p_session_token: sessionToken
      });

      if (error || !data || data.length === 0) {
        return null;
      }

      const userData = data[0];
      return {
        id: userData.superadmin_id,
        email: userData.email,
        name: userData.name,
        is_active: true,
        last_login: null // Could be enhanced to return this
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
      await supabaseAdmin.rpc('superadmin_logout', {
        p_session_token: sessionToken,
        p_ip_address: ipAddress,
        p_user_agent: userAgent
      });
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
      const passwordHash = await bcrypt.hash(password, 12);
      
      const { data, error } = await supabaseAdmin
        .from('superadmins')
        .insert({
          email,
          name,
          password_hash: passwordHash
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
      const isValidPassword = await bcrypt.compare(oldPassword, superadmin.password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid current password');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

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
      const { data, error } = await supabaseAdmin.rpc('cleanup_expired_superadmin_sessions');
      
      if (error) {
        console.error('Cleanup sessions error:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Cleanup sessions error:', error);
      return 0;
    }
  }

  /**
   * Check if IP address is allowed
   */
  private isIPAllowed(ipAddress: string): boolean {
    // In development, allow localhost
    if (process.env.NODE_ENV === 'development') {
      return true;
    }

    return this.ALLOWED_IPS.includes(ipAddress);
  }

  /**
   * Generate secure session token
   */
  private generateSessionToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Hash password securely
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

export const superadminAuth = new SuperadminAuthService();
export default superadminAuth;