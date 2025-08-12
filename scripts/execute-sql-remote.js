const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSqlFile(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`Executing SQL from ${filePath}...`);
    
    // Split SQL by DO blocks and execute separately
    const statements = sql.split(/(?=DO\s+\$\$)|(?=SELECT\s+)/gi).filter(s => s.trim());
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      console.log(`Executing statement: ${statement.substring(0, 50)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).single();
      
      if (error) {
        console.error('Error executing statement:', error);
      } else {
        console.log('Statement executed successfully');
        if (data) console.log('Result:', data);
      }
    }
    
    console.log(`Completed executing ${filePath}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function main() {
  // Execute scripts in order
  await executeSqlFile('scripts/create-quarters-only.sql');
  await executeSqlFile('scripts/link-objectives-initiatives.sql');
  await executeSqlFile('scripts/link-objectives-quarters.sql');
  
  console.log('All scripts executed');
}

main().catch(console.error);