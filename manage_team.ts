import db from './src/db/database';

const args = process.argv.slice(2);
const action = args[0];

function printUsage() {
  console.log("Usage:");
  console.log("  npx.cmd ts-node manage_team.ts list                   - List all teams and members");
  console.log("  npx.cmd ts-node manage_team.ts add <team> <email>     - Add an email to a team (creates team if needed)");
  console.log("  npx.cmd ts-node manage_team.ts remove <team> <email>  - Remove an email from a team");
}

if (!action || action === 'help') {
  printUsage();
  process.exit(0);
}

if (action === 'list') {
  const teams = db.prepare('SELECT id, name FROM teams').all() as {id: number, name: string}[];
  console.log("--- Teams & Members ---");
  for (const team of teams) {
    console.log(`Team: ${team.name}`);
    const members = db.prepare('SELECT email FROM members WHERE team_id = ?').all(team.id) as {email: string}[];
    if (members.length === 0) {
      console.log("  (No members)");
    } else {
      for (const m of members) {
        console.log(`  - ${m.email}`);
      }
    }
  }
} else if (action === 'add') {
  const teamName = args[1];
  const email = args[2];
  if (!teamName || !email) {
    console.log("Error: Missing team or email.");
    printUsage();
    process.exit(1);
  }

  // Ensure team exists
  let team = db.prepare('SELECT id FROM teams WHERE name = ?').get(teamName) as {id: number} | undefined;
  if (!team) {
    const info = db.prepare('INSERT INTO teams (name) VALUES (?)').run(teamName);
    team = { id: info.lastInsertRowid as number };
    console.log(`Created new team '${teamName}'.`);
  }

  try {
    db.prepare('INSERT INTO members (team_id, email) VALUES (?, ?)').run(team.id, email);
    console.log(`Added ${email} to team '${teamName}'.`);
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log(`${email} is already in team '${teamName}'.`);
    } else {
      console.error(err);
    }
  }
} else if (action === 'remove') {
  const teamName = args[1];
  const email = args[2];
  if (!teamName || !email) {
    console.log("Error: Missing team or email.");
    printUsage();
    process.exit(1);
  }

  const team = db.prepare('SELECT id FROM teams WHERE name = ?').get(teamName) as {id: number} | undefined;
  if (!team) {
    console.log(`Team '${teamName}' not found.`);
    process.exit(1);
  }

  const info = db.prepare('DELETE FROM members WHERE team_id = ? AND email = ?').run(team.id, email);
  if (info.changes > 0) {
    console.log(`Removed ${email} from team '${teamName}'.`);
  } else {
    console.log(`${email} not found in team '${teamName}'.`);
  }
} else {
  console.log(`Unknown action: ${action}`);
  printUsage();
}
