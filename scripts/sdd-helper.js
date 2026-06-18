const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const action = process.argv[2];

if (action === "brief") {
  const planFile = process.argv[3];
  const taskNum = process.argv[4];

  if (!planFile || !taskNum) {
    console.error("Usage: node scripts/sdd-helper.js brief <PLAN_FILE> <TASK_NUMBER>");
    process.exit(1);
  }

  if (!fs.existsSync(planFile)) {
    console.error(`Plan file not found: ${planFile}`);
    process.exit(1);
  }

  const sddDir = path.join(__dirname, "../.git/sdd");
  fs.mkdirSync(sddDir, { recursive: true });

  const content = fs.readFileSync(planFile, "utf-8");
  const lines = content.split(/\r?\n/);
  
  let inTask = false;
  let infence = false;
  const taskLines = [];

  const taskRegex = new RegExp(`^#+[ \\t]+Task[ \\t]+${taskNum}([^0-9]|$)`);
  const anyTaskRegex = /^#+[ \t]+Task[ \t]+[0-9]+/;

  for (const line of lines) {
    if (line.startsWith("```")) {
      infence = !infence;
    }
    if (!infence && anyTaskRegex.test(line)) {
      if (taskRegex.test(line)) {
        inTask = true;
      } else {
        inTask = false;
      }
    }
    if (inTask) {
      taskLines.push(line);
    }
  }

  if (taskLines.length === 0) {
    console.error(`Task ${taskNum} not found in ${planFile}`);
    process.exit(1);
  }

  const outFile = path.join(sddDir, `task-${taskNum}-brief.md`);
  fs.writeFileSync(outFile, taskLines.join("\n"), "utf-8");
  console.log(`Wrote ${outFile}`);

} else if (action === "package") {
  const base = process.argv[3];
  const head = process.argv[4];

  if (!base || !head) {
    console.error("Usage: node scripts/sdd-helper.js package <BASE> <HEAD>");
    process.exit(1);
  }

  const sddDir = path.join(__dirname, "../.git/sdd");
  fs.mkdirSync(sddDir, { recursive: true });

  // Get short hashes
  const shortBase = execSync(`git rev-parse --short ${base}`).toString().trim();
  const shortHead = execSync(`git rev-parse --short ${head}`).toString().trim();

  const outFile = path.join(sddDir, `review-${shortBase}..${shortHead}.diff`);

  const commits = execSync(`git log --oneline ${base}..${head}`).toString();
  const stat = execSync(`git diff --stat ${base}..${head}`).toString();
  const diff = execSync(`git diff -U10 ${base}..${head}`).toString();

  const packageContent = [
    `# Review package: ${base}..${head}`,
    "",
    "## Commits",
    commits,
    "",
    "## Files changed",
    stat,
    "",
    "## Diff",
    diff
  ].join("\n");

  fs.writeFileSync(outFile, packageContent, "utf-8");
  console.log(`Wrote ${outFile}`);
} else {
  console.error("Unknown action. Use 'brief' or 'package'");
  process.exit(1);
}
