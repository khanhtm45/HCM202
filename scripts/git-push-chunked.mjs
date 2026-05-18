/**
 * Push repo lớn lên GitHub theo nhiều commit nhỏ (tránh RPC timeout ~4GB một lần).
 *
 * Usage: node scripts/git-push-chunked.mjs [--dry-run] [--jpg-batch=3000]
 */
import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const ROOT = join(import.meta.dirname, '..');
const DRY = process.argv.includes('--dry-run');
const JPG_BATCH = Number(process.argv.find((a) => a.startsWith('--jpg-batch='))?.split('=')[1] || 500);
const RESHUFFLE = process.argv.includes('--reshuffle-pending');
const PUSH_RETRIES = 8;
const BRANCH = 'push-chunks';
const REMOTE = 'origin';
const TARGET = 'main';
const STATE_FILE = join(ROOT, '.git-push-chunked-state.json');
const GIT = (args, opts = {}) => {
  const readOnly = opts.readOnly === true;
  const cmd = `git ${args.join(' ')}`;
  if (DRY && !readOnly) {
    console.log('[dry-run]', cmd);
    return '';
  }
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: opts.inherit ? 'inherit' : 'pipe',
    ...opts,
  });
};

function sh(args, readOnly = false) {
  return GIT(args, { readOnly }).trim();
}

function gitPushArgs() {
  return [
    '-c',
    'http.postBuffer=524288000',
    '-c',
    'http.version=HTTP/1.1',
    '-c',
    'http.lowSpeedLimit=0',
    '-c',
    'http.lowSpeedTime=999999',
    'push',
    REMOTE,
    `${BRANCH}:${TARGET}`,
  ];
}

function push(retries = PUSH_RETRIES) {
  console.log('\n>>> git push');
  if (DRY) return;
  const args = gitPushArgs();
  for (let attempt = 1; attempt <= retries; attempt++) {
    const r = spawnSync('git', args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status === 0) return;
    if (attempt < retries) {
      const wait = 20 + attempt * 10;
      console.log(`Push failed (attempt ${attempt}/${retries}), retry in ${wait}s…`);
      try {
        execSync(`powershell -NoProfile -Command "Start-Sleep -Seconds ${wait}"`, {
          cwd: ROOT,
          stdio: 'ignore',
        });
      } catch {
        /* ignore */
      }
    } else {
      console.error(
        '\nPush failed (HTTP 408 / timeout). Thử:\n' +
          '  npm run push:chunked:finish\n' +
          '  hoặc SSH: git remote set-url origin git@github.com:khanhtm45/HCM202.git'
      );
      process.exit(r.status ?? 1);
    }
  }
}

/** Gỡ commit local chưa push (~72MB) → commit lại theo lô nhỏ hơn. */
function reshufflePendingCommits() {
  const ahead = Number(sh(['rev-list', '--count', `${REMOTE}/${TARGET}..${BRANCH}`], true) || 0);
  if (!ahead) return;
  console.log(`\n${ahead} commit local chưa lên — tách lại (reset --soft ${REMOTE}/${TARGET})…`);
  if (DRY) return;
  sh(['reset', '--soft', `${REMOTE}/${TARGET}`]);
  sh(['reset']);
}

function pushUnpushed() {
  const ahead = sh(['rev-list', '--count', `${REMOTE}/${TARGET}..${BRANCH}`], true);
  if (ahead && Number(ahead) > 0) {
    console.log(`\nCòn ${ahead} commit chưa push — đẩy trước…`);
    push();
  }
}

function listFromMain() {
  const out = sh(['ls-tree', '-r', '--name-only', 'main'], true);
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

function listJpgsOnBranch(branch) {
  const out = sh(['ls-tree', '-r', '--name-only', branch], true);
  if (!out) return new Set();
  return new Set(out.split(/\r?\n/).filter((f) => /\.jpg$/i.test(f)));
}

function listTracked(ext) {
  const all = listFromMain();
  if (!ext) return all;
  const re = new RegExp(`${ext.replace('.', '\\.')}$`, 'i');
  return all.filter((f) => re.test(f));
}

function currentBranch() {
  return sh(['branch', '--show-current'], true);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function loadState() {
  if (!existsSync(STATE_FILE)) return { step: 0, jpgChunk: 0, jpgBatchSize: JPG_BATCH };
  return { jpgBatchSize: JPG_BATCH, ...JSON.parse(readFileSync(STATE_FILE, 'utf8')) };
}

function saveState(state) {
  if (!DRY) writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function ensureOrphanBranch() {
  if (currentBranch() === BRANCH) return;

  const branches = sh(['branch', '--list', BRANCH], true);
  if (branches.includes(BRANCH)) {
    sh(['checkout', BRANCH], true);
    return;
  }

  console.log('Tạo nhánh orphan', BRANCH, '(giữ file trên disk, chưa commit)');
  sh(['checkout', '--orphan', BRANCH]);
  sh(['reset']);
}

function gitAddFiles(files) {
  if (!files.length) return;
  if (DRY) {
    console.log(`[dry-run] git add (${files.length} files, batched)`);
    return;
  }
  const batchSize = 80;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const listFile = join(tmpdir(), `hcm202-git-add-${process.pid}-${i}.txt`);
    writeFileSync(listFile, batch.join('\n'), 'utf8');
    try {
      execSync(`git add --pathspec-from-file=${JSON.stringify(listFile)}`, {
        cwd: ROOT,
        stdio: 'pipe',
        maxBuffer: 64 * 1024 * 1024,
      });
    } finally {
      try {
        unlinkSync(listFile);
      } catch {
        /* ignore */
      }
    }
  }
}

function commitFiles(files, message) {
  if (!files.length) return false;
  console.log(`\nCommit: ${message} (${files.length} files)`);
  gitAddFiles(files);
  if (DRY) return true;
  execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: ROOT, stdio: 'pipe' });
  return true;
}

function main() {
  process.chdir(ROOT);
  const state = loadState();
  const allFiles = listTracked('');
  const jpgs = listTracked('.jpg').sort();
  const mp3s = listTracked('.mp3').sort();
  const core = allFiles.filter((f) => !/\.(jpg|mp3)$/i.test(f)).sort();

  console.log(`Files: core=${core.length}, mp3=${mp3s.length}, jpg=${jpgs.length}, batch=${JPG_BATCH}`);
  console.log(`Resume: step=${state.step}, jpgChunk=${state.jpgChunk}`);

  if (state.step === 0) {
    ensureOrphanBranch();
    state.step = 1;
    saveState(state);
  } else if (currentBranch() !== BRANCH) {
    ensureOrphanBranch();
  }

  ensureOrphanBranch();
  if (RESHUFFLE) reshufflePendingCommits();
  pushUnpushed();

  const onBranch = listJpgsOnBranch(BRANCH);
  const remainingJpgs = jpgs.filter((f) => !onBranch.has(f));
  const alreadyOnBranch = jpgs.length - remainingJpgs.length;
  const jpgChunks = chunk(remainingJpgs, JPG_BATCH);
  const globalJpgBase = Math.floor(alreadyOnBranch / JPG_BATCH);
  const totalJpgBatches = Math.ceil(jpgs.length / JPG_BATCH);

  console.log(`JPG on ${BRANCH}: ${alreadyOnBranch}/${jpgs.length}, còn ${remainingJpgs.length}`);

  if (!remainingJpgs.length) {
    console.log('\nĐã push đủ ảnh panorama.');
    console.log('  git branch -f main push-chunks && git checkout main');
    if (!DRY && existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
    return;
  }

  if (state.step < 3) state.step = 3;
  const jpgStepStart = 2;
  if (state.step > jpgStepStart + jpgChunks.length) {
    state.step = jpgStepStart;
    saveState(state);
  }

  const steps = [
    { name: 'core', files: core, msg: 'chore: core code, configs, shell assets (no panoramas)' },
    { name: 'mp3', files: mp3s, msg: 'assets: audio guides and background music' },
    ...jpgChunks.map((files, i) => ({
      name: `jpg-${globalJpgBase + i}`,
      files,
      msg: `assets: panorama tiles batch ${globalJpgBase + i + 1}/${totalJpgBatches} (${files.length} jpg)`,
    })),
  ];

  for (let si = state.step - 1; si < steps.length; si++) {
    const s = steps[si];

    const headMsg = DRY ? '' : sh(['log', '-1', '--format=%s', BRANCH], true);
    if (headMsg !== s.msg) {
      commitFiles(s.files, s.msg);
    } else {
      console.log(`\nSkip commit (đã có): ${s.msg}`);
    }
    push();

    if (s.name.startsWith('jpg-')) {
      state.jpgChunk = Number(s.name.split('-')[1]) + 1;
    }
    state.jpgBatchSize = JPG_BATCH;
    state.step = si + 2;
    saveState(state);
  }

  console.log('\nDone. Đặt main local = push-chunks:');
  console.log('  git branch -f main push-chunks && git checkout main');
  if (!DRY && existsSync(STATE_FILE)) {
    console.log('(Xóa .git-push-chunked-state.json nếu muốn chạy lại từ đầu)');
  }
}

main();
