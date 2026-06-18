const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const choice = process.argv[2];
if (!choice || !["postgres", "mysql", "mariadb"].includes(choice)) {
  console.error("Usage: node scripts/setup-db.js <postgres|mysql|mariadb>");
  process.exit(1);
}

const templatesDir = path.join(__dirname, "../src/db/templates", choice);
const targetDbDir = path.join(__dirname, "../src/db");
const rootDir = path.join(__dirname, "..");

console.log(`Setting up database files for: ${choice}...`);

if (!fs.existsSync(templatesDir)) {
  console.error(`Template directory not found: ${templatesDir}`);
  process.exit(1);
}

// Copy Schema
fs.copyFileSync(
  path.join(templatesDir, "schema.ts"),
  path.join(targetDbDir, "schema.ts")
);

// Copy Client
fs.copyFileSync(
  path.join(templatesDir, "client.ts"),
  path.join(targetDbDir, "client.ts")
);

// Copy Drizzle Config to Root
fs.copyFileSync(
  path.join(templatesDir, "drizzle.config.ts"),
  path.join(rootDir, "drizzle.config.ts")
);

console.log("Config files copied. Installing drivers...");

// Determine NPM command based on platform
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

// Install Driver
try {
  if (choice === "postgres") {
    execSync(`${npmCmd} install pg && ${npmCmd} install -D @types/pg`, { stdio: "inherit" });
  } else {
    // mysql2 driver works for both mysql and mariadb templates
    execSync(`${npmCmd} install mysql2`, { stdio: "inherit" });
  }
} catch (error) {
  console.error("Failed to install database driver dependencies.", error);
  process.exit(1);
}

// Create Env template if it doesn't exist
const envPath = path.join(rootDir, ".env.local");
if (!fs.existsSync(envPath)) {
  const defaultUrl = choice === "postgres" 
    ? "postgresql://postgres:postgres@localhost:5432/nextsaas"
    : "mysql://root:password@localhost:3306/nextsaas";
  fs.writeFileSync(envPath, `DATABASE_URL="${defaultUrl}"\n`);
  console.log(`.env.local file created with default url: ${defaultUrl}`);
}

console.log("Database environment set up successfully!");
