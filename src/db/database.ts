import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'mcp_distribution.db');
const db = new Database(dbPath);

// Initialize Schema
function initDb() {
  db.pragma('journal_mode = WAL');
  
  // Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // Members table
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      FOREIGN KEY(team_id) REFERENCES teams(id),
      UNIQUE(team_id, email)
    );
  `);

  // Templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      subject_template TEXT,
      body_template TEXT,
      doc_template TEXT
    );
  `);

  // Optional: Seed some default data if empty
  const teamCount = db.prepare('SELECT count(*) as count FROM teams').get() as { count: number };
  if (teamCount.count === 0) {
    const insertTeam = db.prepare('INSERT INTO teams (name) VALUES (?)');
    const insertMember = db.prepare('INSERT INTO members (team_id, email) VALUES (?, ?)');
    
    // Create product team
    const productInfo = insertTeam.run('product');
    insertMember.run(productInfo.lastInsertRowid, 'pm1@example.com');
    
    // Create engineering team
    const engInfo = insertTeam.run('engineering');
    insertMember.run(engInfo.lastInsertRowid, 'eng1@example.com');
  }
}

initDb();

export function getTeamEmails(teamName: string): string[] {
  const stmt = db.prepare(`
    SELECT members.email 
    FROM members 
    JOIN teams ON teams.id = members.team_id 
    WHERE teams.name LIKE '%' || ? || '%'
  `);
  const rows = stmt.all(teamName) as { email: string }[];
  return rows.map(r => r.email);
}

export function getAllTeams(): string[] {
  const stmt = db.prepare('SELECT name FROM teams');
  const rows = stmt.all() as { name: string }[];
  return rows.map(r => r.name);
}

export default db;
