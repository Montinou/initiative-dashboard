// New Supabase-based superadmin authentication
// Uses auth.users with user_profiles.role = 'superadmin'

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

// Regular Supabase client for authentication
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SuperadminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'superadmin';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export interface SuperadminSession {
  user: {
    id: string;
    email: string;
    full_name: string | null;
  };
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SuperadminAuthResult {
  session: SuperadminSession | null;
  profile: SuperadminProfile | null;
  error: string | null;
}

class SupabaseSuperadminAuth {
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

  /**
   * Authenticate superadmin using Supabase Auth
   */
  async authenticate(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SuperadminAuthResult> {
    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user || !authData.session) {
        throw new Error('Invalid credentials');
      }

      // 2. Check if user has superadmin role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .eq('role', 'superadmin')
        .eq('is_active', true)
        .single();

      if (profileError || !profile) {
        // User exists but is not a superadmin - sign them out
        await supabase.auth.signOut();
        throw new Error('Access denied: Superadmin privileges required');
      }

      // 3. Update last login
      await supabaseAdmin
        .from('user_profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', authData.user.id);

      // 4. Log the successful login
      await this.logAction(
        authData.user.id,
        'SUPERADMIN_LOGIN',
        'authentication',
        null,
        { 
          ip_address: ipAddress, 
          user_agent: userAgent,
          login_method: 'supabase_auth'
        }
      );

      // 5. Return session and profile
      return {
        session: {
          user: {
            id: authData.user.id,
            email: authData.user.email!,
            full_name: profile.full_name
          },
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at!
        },
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: 'superadmin',
          is_active: profile.is_active,
          last_login: profile.last_login,
          created_at: profile.created_at
        },
        error: null
      };

    } catch (error) {
      console.error('Superadmin authentication error:', error);
      
      // Log failed attempt
      try {
        await this.logAction(
          'unknown',
          'SUPERADMIN_LOGIN_FAILED',
          'authentication',
          null,
          { 
            email,
            ip_address: ipAddress, 
            user_agent: userAgent,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            login_method: 'supabase_auth'
          }
        );
      } catch (logError) {
        console.error('Failed to log authentication error:', logError);
      }

      return {
        session: null,
        profile: null,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Validate session token and return superadmin info
   */
  async validateSession(accessToken: string): Promise<SuperadminProfile | null> {
    try {
      // 1. Verify the JWT token with Supabase
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);

      if (authError || !user) {
        return null;
      }

      // 2. Check if user still has superadmin role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('role', 'superadmin')
        .eq('is_active', true)
        .single();

      if (profileError || !profile) {
        return null;
      }

      return {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: 'superadmin',
        is_active: profile.is_active,
        last_login: profile.last_login,
        created_at: profile.created_at
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Logout superadmin user
   */
  async logout(
    accessToken: string,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      // 1. Get user info for logging
      const { data: { user } } = await supabaseAdmin.auth.getUser(accessToken);

      // 2. Sign out from Supabase Auth
      await supabaseAdmin.auth.admin.signOut(accessToken);

      // 3. Log the logout
      if (user) {
        await this.logAction(
          user.id,
          'SUPERADMIN_LOGOUT',
          'authentication',
          null,
          { 
            ip_address: ipAddress, 
            user_agent: userAgent,
            logout_method: 'supabase_auth'
          }
        );
      }

    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error for logout - best effort
    }
  }

  /**
   * Create new superadmin user
   */
  async createSuperadmin(
    email: string,
    password: string,
    fullName: string,
    createdBy?: string
  ): Promise<{ userId: string; profileId: string }> {
    try {
      // 1. Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError || !authData.user) {
        throw new Error(`Failed to create user: ${authError?.message}`);
      }

      // 2. Create/update user profile with superadmin role
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email: email,
          full_name: fullName,
          role: 'superadmin',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (profileError) {
        // Rollback user creation if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // 3. Log the action
      if (createdBy) {
        await this.logAction(
          createdBy,
          'CREATE_SUPERADMIN',
          'user_profile',
          authData.user.id,
          {
            created_user_email: email,
            created_user_name: fullName
          }
        );
      }

      return {
        userId: authData.user.id,
        profileId: profile.id
      };

    } catch (error) {
      console.error('Create superadmin error:', error);
      throw error;
    }
  }

  /**
   * Promote existing user to superadmin
   */
  async promoteToSuperadmin(
    targetUserId: string,
    promotedBy: string
  ): Promise<void> {
    try {
      // Use the database function for promotion
      const { error } = await supabaseAdmin.rpc('promote_to_superadmin', {
        target_user_id: targetUserId,
        promoted_by_superadmin_id: promotedBy
      });

      if (error) {
        throw new Error(`Failed to promote user: ${error.message}`);
      }

    } catch (error) {
      console.error('Promote to superadmin error:', error);
      throw error;
    }
  }

  /**
   * Revoke superadmin privileges
   */
  async revokeSuperadmin(
    targetUserId: string,
    revokedBy: string,
    newRole: 'CEO' | 'Admin' | 'Manager' | 'Analyst' = 'Admin'
  ): Promise<void> {
    try {
      // Use the database function for revocation
      const { error } = await supabaseAdmin.rpc('revoke_superadmin', {
        target_user_id: targetUserId,
        revoked_by_superadmin_id: revokedBy,
        new_role: newRole
      });

      if (error) {
        throw new Error(`Failed to revoke superadmin: ${error.message}`);
      }

    } catch (error) {
      console.error('Revoke superadmin error:', error);
      throw error;
    }
  }

  /**
   * Get all superadmin users
   */
  async getSuperadmins(): Promise<SuperadminProfile[]> {
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('role', 'superadmin')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch superadmins: ${error.message}`);
      }

      return profiles.map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: 'superadmin',
        is_active: profile.is_active,
        last_login: profile.last_login,
        created_at: profile.created_at
      }));

    } catch (error) {
      console.error('Get superadmins error:', error);
      throw error;
    }
  }

  /**
   * Change superadmin password
   */
  async changePassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) {
        throw new Error(`Failed to change password: ${error.message}`);
      }

      // Log the action
      await this.logAction(
        userId,
        'CHANGE_PASSWORD',
        'authentication',
        userId,
        { changed_at: new Date().toISOString() }
      );

    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Check if user is superadmin
   */
  async isSuperadmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin.rpc('is_superadmin', {
        user_id: userId
      });

      if (error) {
        console.error('Check superadmin error:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Check superadmin error:', error);
      return false;
    }
  }

  /**
   * Log superadmin action to audit trail
   */
  private async logAction(
    superadminId: string,
    action: string,
    targetType: string,
    targetId?: string | null,
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
          details: details || {},
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log superadmin action:', error);
      // Don't throw - logging is best effort
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
          user_agent,
          created_at,
          user_profiles!inner(full_name, email)
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
   * Clean up expired sessions (handled by Supabase automatically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Supabase handles JWT token expiration automatically
    // This method is kept for compatibility but is essentially a no-op
    console.log('Session cleanup handled automatically by Supabase');
    return 0;
  }
}

export const supabaseSuperadminAuth = new SupabaseSuperadminAuth();
export default supabaseSuperadminAuth;