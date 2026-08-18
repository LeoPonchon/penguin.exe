import { supabase } from '../supabase/client';

// Tables that need realtime enabled
const REALTIME_TABLES = ['friendships', 'channels', 'server_members', 'messages'];

export async function setupRealtime() {
  try {
    // Check if publication exists
    const { data: publications } = await supabase
      .rpc('exec', { sql: "SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime'" });

    if (!publications || publications.length === 0) {
      console.warn('supabase_realtime publication not found. Please enable Realtime in your Supabase project.');
      return { success: false, error: 'Publication not found' };
    }

    // Get tables already in publication
    const { data: existingTables } = await supabase
      .rpc('exec', {
        sql: `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public'`
      });

    const existingTableNames = existingTables?.map(t => t.tablename) || [];
    const tablesToAdd = REALTIME_TABLES.filter(table => !existingTableNames.includes(table));

    if (tablesToAdd.length === 0) {
      console.log('All required tables already have realtime enabled');
      return { success: true, message: 'Already configured' };
    }

    // Add missing tables
    for (const table of tablesToAdd) {
      const sql = `ALTER PUBLICATION supabase_realtime ADD TABLE ${table}`;
      await supabase.rpc('exec', { sql });
      console.log(`✓ Added realtime for ${table}`);
    }

    return { success: true, message: `Added realtime for ${tablesToAdd.length} tables` };
  } catch (err) {
    console.error('Failed to setup realtime:', err);
    return { success: false, error: err };
  }
}

// Simple SQL execution function
export async function executeSQL(sql) {
  try {
    // Use the Supabase REST API to execute SQL
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute SQL');
    }

    return await response.json();
  } catch (err) {
    console.error('SQL execution error:', err);
    throw err;
  }
}
