const fs = require('fs');
const path = require('path');

// Dynamically import pg so it doesn't break if not pre-installed
let Client;
try {
  Client = require('pg').Client;
} catch (e) {
  console.error("Error: The 'pg' package is required to run this script.");
  console.error("Please install it first by running: npm install pg");
  process.exit(1);
}

// Read Connection URI from environment or CLI argument
const databaseUrl = process.env.DATABASE_URL || process.argv[2];

if (!databaseUrl) {
  console.error("Error: Please provide your Supabase Connection String (URI).");
  console.error("Usage: DATABASE_URL=postgresql://postgres:[password]@...:6543/postgres node migrate.js");
  console.error("Or: node migrate.js postgresql://postgres:[password]@...:6543/postgres");
  process.exit(1);
}

const sqlPath = path.join(__dirname, 'schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.error(`Error: Could not locate schema file at ${sqlPath}`);
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false // Required for secure SSL handshakes with Supabase
  }
});

async function run() {
  try {
    console.log("📡 Connecting to Supabase PostgreSQL server...");
    await client.connect();
    console.log("🔌 Connection established successfully.");
    console.log("⚡ Executing database migrations from schema.sql statement-by-statement...");

    // Split SQL file by semicolons
    const rawStatements = sqlContent.split(';');
    let successCount = 0;

    for (let i = 0; i < rawStatements.length; i++) {
      const raw = rawStatements[i];
      // Remove single-line comments (starting with --) and multi-line comments
      const cleanQuery = raw
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();

      if (cleanQuery.length === 0) {
        continue; // Skip empty blocks to avoid "syntax error at end of input"
      }

      try {
        await client.query(cleanQuery);
        successCount++;
      } catch (err) {
        console.error(`❌ Statement #${i + 1} failed:`);
        console.error(`SQL Snippet: "${cleanQuery.substring(0, 120)}..."`);
        console.error(`Error message: ${err.message}\n`);
        throw err; // Hault on failure
      }
    }
    
    console.log(`🚀 Supabase Database migration finished successfully!`);
    console.log(`Executed ${successCount} distinct query statements.`);
  } catch (err) {
    console.error("❌ Migration aborted due to execution error.");
  } finally {
    await client.end();
  }
}

run();
