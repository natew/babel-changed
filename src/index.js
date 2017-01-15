#!/usr/bin/env node

import fileEntryCache from 'file-entry-cache';
import sum from 'hash-sum';
import uniq from 'lodash.uniq';
import glob from 'glob';
import pty from 'pty.js';
import {clearCacheById} from 'flat-cache';

const key = 'stat_'+sum(process.cwd());

const node = process.argv[0];
const runonly = process.argv[1];
const src = process.argv[2];

let path = '';
if (src == '--reset') {
  console.log('Clearing file stats so next run will include all files..');
  console.log(path);
  try {
    clearCacheById(key);
  } catch (e) {
    console.log('Problem clearing cache:',e);
    process.exit(0);
  }
  console.log('File entry Cache cleared.');
  process.exit(0);
}

const cmd = 'babel';
const options = process.argv.slice(3);

let files = glob.sync(`${src}/**/*.js*`);
if (!files.length) files = [files];

files = uniq(files);

const cache = fileEntryCache.create(key);

const updated = cache.getUpdatedFiles(files);

console.log(`${updated.length} modified files.`);

const newArgs = [src, '--only', updated.join(',')].concat(options);

console.log('> babel ' + newArgs.join(' '));

let fileCount = 0;

const term = pty.spawn(cmd, newArgs, {
  name: process.env.TERM,
  cols: 80,
  rows: 25,
  cwd: process.cwd(),
  env: process.env
});

term.on('data', data => {
  process.stdout.write(data);
});

term.on('exit', (code)  => {
  console.log('babel-changed detected exit code ',code);
  if (code === 0) cache.reconcile();
});
