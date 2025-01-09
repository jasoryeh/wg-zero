'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const debug = require('debug')('wgeasy:Util');

module.exports = class Util {

  static isValidIPv4(str) {
    const blocks = str.split('.');
    if (blocks.length !== 4) return false;

    for (let value of blocks) {
      value = parseInt(value, 10);
      if (Number.isNaN(value)) return false;
      if (value < 0 || value > 255) return false;
    }

    return true;
  }

  static exec(cmd, {
    log = true,
  } = {}) {
    if (typeof log === 'string') {
      // eslint-disable-next-line no-console
      debug(`$ ${log}`);
    } else if (log === true) {
      // eslint-disable-next-line no-console
      debug(`$ ${cmd}`);
    }

    if (process.platform !== 'linux') {
      return '';
    }

    let out = childProcess.execSync(cmd, {
      shell: 'bash',
      stdio: 'pipe',
    }).toString('utf8').trim();
    return out;
  }

};
