/**
 * Tiny leveled logger.
 *
 * The brief requires no stray console.log statements in the delivered code.
 * Routing all intentional output through this module keeps that rule easy to
 * enforce: a bare console.* anywhere else is by definition debug residue.
 */

const timestamp = () => new Date().toISOString();

const write = (stream, level, args) => {
  stream(`${timestamp()} [${level}]`, ...args);
};

export const logger = {
  info: (...args) => write(console.info, 'info', args),
  warn: (...args) => write(console.warn, 'warn', args),
  error: (...args) => write(console.error, 'error', args),
};
