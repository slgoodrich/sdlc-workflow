#!/usr/bin/env node
/**
 * Scaffold plugin setup script.
 *
 * Invoked manually via the /scaffold command. Copies bundled templates
 * into the project's .claude/, .ao/, and project root directories.
 * Idempotent — never overwrites existing files. Safe to re-run.
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
} from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(import.meta.dirname, '..');

try {
  // CLAUDE_PROJECT_DIR is set in hook context. Fall back to cwd when
  // invoked manually via /scaffold (where cwd is the project root).
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  if (!projectDir) {
    console.error('[scaffold] No project directory available, aborting');
    process.exit(1);
  }

  const templateDirs = [
    { src: join(ROOT, 'templates', 'commands'), dest: join(projectDir, '.claude', 'commands') },
    { src: join(ROOT, 'templates', 'rules'),    dest: join(projectDir, '.claude', 'rules') },
    { src: join(ROOT, 'templates', 'ao'),       dest: join(projectDir, '.ao') },
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
      console.error(`[scaffold] Copied template: ${file} -> ${dest}`);
    }
  }
} catch (e) {
  console.error(`[scaffold] Template copy failed: ${e.message}`);
  // Don't exit(1) — let the session continue even if template copy fails
}
