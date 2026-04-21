#!/usr/bin/env node
/**
 * SDLC Local plugin setup script.
 *
 * Invoked manually via the /setup-local command. Copies bundled templates
 * into the project's .claude/ and project root directories, and
 * initializes the .workflow/ stream state directory.
 * Idempotent -- never overwrites existing files. Safe to re-run.
 *
 * Reads CLAUDE_PROJECT_DIR from the environment, or falls back to
 * process.cwd() when invoked directly from a shell.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  copyFileSync,
  statSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(import.meta.dirname, '..');

try {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!projectDir) {
    console.error('[setup] No project directory available, aborting');
    process.exit(1);
  }

  // --- Copy templates ---

  const templateDirs = [
    { src: join(ROOT, 'templates', 'commands'), dest: join(projectDir, '.claude', 'commands') },
    { src: join(ROOT, 'templates', 'rules'),    dest: join(projectDir, '.claude', 'rules') },
    { src: join(ROOT, 'templates', 'claude'),   dest: join(projectDir, '.claude') },
    { src: join(ROOT, 'templates', 'root'),     dest: projectDir },
  ];

  for (const { src, dest } of templateDirs) {
    if (!existsSync(src)) continue;
    mkdirSync(dest, { recursive: true });

    for (const file of readdirSync(src)) {
      const srcPath = join(src, file);
      if (!statSync(srcPath).isFile()) continue;
      const destPath = join(dest, file);
      if (existsSync(destPath)) continue;
      copyFileSync(srcPath, destPath);
      console.error(`[setup] Copied template: ${file} -> ${dest}`);
    }
  }

  // --- Initialize .workflow/ ---

  const workflowDir = join(projectDir, '.workflow');
  const streamsDir = join(workflowDir, 'streams');
  const statePath = join(workflowDir, 'state.json');

  mkdirSync(streamsDir, { recursive: true });

  // --- Copy stream.js (overwrite; internal tooling, not user-editable) ---

  const binDir = join(workflowDir, 'bin');
  mkdirSync(binDir, { recursive: true });
  const streamSrc = join(ROOT, 'scripts', 'stream.js');
  const streamDest = join(binDir, 'stream.js');
  copyFileSync(streamSrc, streamDest);
  // Declare stream.js as ESM so node doesn't walk up to the project's
  // package.json (which may be missing or set to CommonJS).
  writeFileSync(join(binDir, 'package.json'), '{"type":"module"}\n');
  console.error(`[setup] Copied stream.js -> ${binDir}`);

  if (!existsSync(statePath)) {
    const initialState = {
      next_id: 1,
    };
    writeFileSync(statePath, JSON.stringify(initialState, null, 2) + '\n');
    console.error('[setup] Initialized .workflow/state.json');
  }

  // --- Ensure .workflow/ is gitignored ---

  const gitignorePath = join(projectDir, '.gitignore');
  let gitignoreContent = '';
  if (existsSync(gitignorePath)) {
    gitignoreContent = readFileSync(gitignorePath, 'utf8');
  }

  if (!gitignoreContent.includes('.workflow/')) {
    const line = gitignoreContent.endsWith('\n') || gitignoreContent === ''
      ? '.workflow/\n'
      : '\n.workflow/\n';
    appendFileSync(gitignorePath, line);
    console.error('[setup] Added .workflow/ to .gitignore');
  }

} catch (e) {
  console.error(`[setup] Setup failed: ${e.message}`);
  process.exit(1);
}
