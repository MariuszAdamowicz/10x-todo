import { test as teardown } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Load .env.test with override to ensure it takes precedence
dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Users to preserve (seed users)
const KEEP_EMAILS = ['user1@kot.pl', 'dev@test.com'];

teardown('cleanup database', async () => {
  console.log('\n🔍 --- GLOBAL TEARDOWN START ---');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  // Mask key for logging
  const maskedKey = SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) + '...';
  console.log(`Connecting to Supabase at ${SUPABASE_URL} with key ${maskedKey}`);
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // 1. Fetch all users
    const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    
    if (listUsersError) {
      console.error('❌ Error listing users:', listUsersError);
      return; // Exit gracefully on connection error, don't fail the whole suite if cleanup fails
    }

    console.log(`Found ${users.length} users in database.`);

    // 2. Identify users to delete
    // SAFETY CHECK: STRICTLY only delete users created by the test suite (test-user-TIMESTAMP@example.com)
    // NEVER delete users based on an exclusion list (allowlist) as it is too risky.
    const usersToDelete = users.filter(user => 
      user.email && 
      user.email.startsWith('test-user-') && 
      user.email.endsWith('@example.com')
    );
    
    if (usersToDelete.length === 0) {
      console.log('✅ No test users found to cleanup.');
    } else {
      console.log(`🗑️  Found ${usersToDelete.length} users to delete.`);
      const userIdsToDelete = usersToDelete.map(u => u.id);

      // 3. Cleanup data (Projects)
      const { error: deleteProjectsError } = await supabase
        .from('projects')
        .delete()
        .in('user_id', userIdsToDelete);

      if (deleteProjectsError) {
        console.error('⚠️  Error deleting projects:', deleteProjectsError);
      } else {
        console.log('✅ Deleted projects for test users.');
      }

      // 4. Delete users
      let deletedCount = 0;
      for (const user of usersToDelete) {
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteUserError) {
          console.error(`❌ Failed to delete user ${user.email}:`, deleteUserError);
        } else {
          deletedCount++;
        }
      }
      console.log(`✅ Successfully deleted ${deletedCount} users.`);
    }

  } catch (error) {
    console.error('❌ Global teardown exception:', error);
  }
  console.log('🏁 --- GLOBAL TEARDOWN END ---\n');
});