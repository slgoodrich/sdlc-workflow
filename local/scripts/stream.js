#!/usr/bin/env node
/**
 * Stream management CLI for the sdlc-local plugin.
 *
 * Manages .workflow/streams/ directories that hold cross-phase state
 * (plan.md, design.md, spec.md) for each work item. Pure filesystem,
 * no external dependencies.
 *
 * Usage: node stream.js <command> [args]
 *
 *   create <name> [--parent <id>]  Create a new stream
 *   list [--archived]              List all streams
 *   archive <id>                   Archive a stream
 *   read <id> <file>               Read plan|design|spec|meta from a stream
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
} from 'node:fs';
import { join } from 'node:path';

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const workflowDir = join(projectDir, '.workflow');
const streamsDir = join(workflowDir, 'streams');
const statePath = join(workflowDir, 'state.json');

// --- State helpers ---

function readState() {
  if (!existsSync(statePath)) {
    return { next_id: 1 };
  }
  return JSON.parse(readFileSync(statePath, 'utf8'));
}

function writeState(state) {
  const tmp = statePath + '.tmp';
  writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n');
  renameSync(tmp, statePath);
}

// --- Stream helpers ---

function streamDir(id) {
  return join(streamsDir, String(id));
}

function readStreamMeta(id) {
  const metaPath = join(streamDir(id), 'stream.json');
  if (!existsSync(metaPath)) return null;
  return JSON.parse(readFileSync(metaPath, 'utf8'));
}

function writeStreamMeta(id, meta) {
  const metaPath = join(streamDir(id), 'stream.json');
  const tmp = metaPath + '.tmp';
  writeFileSync(tmp, JSON.stringify(meta, null, 2) + '\n');
  renameSync(tmp, metaPath);
}

function nextChildId(parentId) {
  // Find existing children: 1a, 1b, 1c, ...
  if (!existsSync(streamsDir)) return `${parentId}a`;

  const existing = readdirSync(streamsDir)
    .filter((name) => {
      const re = new RegExp(`^${parentId}([a-z])$`);
      return re.test(name);
    })
    .sort();

  if (existing.length === 0) return `${parentId}a`;

  const lastLetter = existing[existing.length - 1].slice(String(parentId).length);
  const nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);

  if (nextLetter > 'z') {
    console.error(`[stream] Parent ${parentId} has too many children (max 26)`);
    process.exit(1);
  }

  return `${parentId}${nextLetter}`;
}

// --- Commands ---

function cmdCreate(name, parentId) {
  if (!name) {
    console.error('[stream] Usage: stream create <name> [--parent <id>]');
    process.exit(1);
  }

  let id;

  if (parentId) {
    // Verify parent exists
    if (!existsSync(streamDir(parentId))) {
      console.error(`[stream] Parent stream ${parentId} not found`);
      process.exit(1);
    }
    id = nextChildId(parentId);
  } else {
    const state = readState();
    id = state.next_id;
    state.next_id = id + 1;
    writeState(state);
  }

  const dir = streamDir(id);
  mkdirSync(dir, { recursive: true });

  const meta = {
    id,
    name,
    status: 'active',
    created_at: new Date().toISOString(),
  };

  if (parentId) {
    meta.parent_id = parentId;
  }

  writeStreamMeta(id, meta);

  // Create empty phase files
  writeFileSync(join(dir, 'plan.md'), '');
  writeFileSync(join(dir, 'design.md'), '');
  writeFileSync(join(dir, 'spec.md'), '');

  console.error(`[stream] Created stream ${id}: ${name}`);
}

function cmdList(includeArchived) {
  if (!existsSync(streamsDir)) {
    console.log('No streams found.');
    return;
  }

  const entries = readdirSync(streamsDir)
    .map((name) => readStreamMeta(name))
    .filter(Boolean);

  // Sort: numeric parents first, then children grouped under parents
  entries.sort((a, b) => {
    const aStr = String(a.id);
    const bStr = String(b.id);
    // Extract numeric prefix for sorting
    const aNum = parseInt(aStr, 10);
    const bNum = parseInt(bStr, 10);
    if (aNum !== bNum) return aNum - bNum;
    // Same numeric prefix, sort by suffix ('' before 'a' before 'b')
    const aSuffix = aStr.replace(/^\d+/, '');
    const bSuffix = bStr.replace(/^\d+/, '');
    return aSuffix.localeCompare(bSuffix);
  });

  const filtered = includeArchived
    ? entries
    : entries.filter((e) => e.status !== 'archived');

  if (filtered.length === 0) {
    console.log('No streams found.');
    return;
  }

  for (const s of filtered) {
    const indent = s.parent_id ? '  ' : '';
    console.log(`${indent}${s.id}\t${s.name}\t${s.status}`);
  }
}

function cmdArchive(idArg) {
  if (!idArg || !existsSync(streamDir(idArg))) {
    console.error(`[stream] Stream ${idArg} not found`);
    process.exit(1);
  }

  const meta = readStreamMeta(idArg);
  meta.status = 'archived';
  writeStreamMeta(idArg, meta);

  console.error(`[stream] Archived stream ${idArg}: ${meta.name}`);
}

function cmdRead(idArg, file) {
  const validFiles = ['plan', 'design', 'spec', 'meta'];
  if (!idArg || !validFiles.includes(file)) {
    console.error(`[stream] Usage: stream read <id> <${validFiles.join('|')}>`);
    process.exit(1);
  }

  if (!existsSync(streamDir(idArg))) {
    console.error(`[stream] Stream ${idArg} not found`);
    process.exit(1);
  }

  const dir = streamDir(idArg);
  const filename = file === 'meta' ? 'stream.json' : `${file}.md`;
  const filePath = join(dir, filename);

  if (!existsSync(filePath)) {
    console.error(`[stream] File not found: ${filename}`);
    process.exit(1);
  }

  console.log(readFileSync(filePath, 'utf8'));
}

// --- Main ---

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'create': {
    const parentIdx = args.indexOf('--parent');
    let parentId = null;
    let nameArgs = args.slice(1);

    if (parentIdx !== -1) {
      parentId = args[parentIdx + 1];
      nameArgs = [...args.slice(1, parentIdx), ...args.slice(parentIdx + 2)];
    }

    cmdCreate(nameArgs.join(' '), parentId);
    break;
  }
  case 'list':
    cmdList(args.includes('--archived'));
    break;
  case 'archive':
    cmdArchive(args[1]);
    break;
  case 'read':
    cmdRead(args[1], args[2]);
    break;
  default:
    console.error('Usage: stream <create|list|archive|read> [args]');
    process.exit(1);
}
