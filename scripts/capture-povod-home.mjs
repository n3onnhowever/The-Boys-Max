import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { launchPovodBrowser } from './lib/povod-browser.mjs';
const options = Object.fromEntries(process.argv.slice(2).map(argument => { const [key, ...value] = argument.replace(/^--/, '').split('='); return [key, value.join('=')]; }));
const design = options.design || 'home';
const suffix = options.suffix || '';
if (suffix && !/^-[a-z0-9-]+$/.test(suffix)) throw new Error('Capture suffix must be lowercase kebab-case beginning with a dash.');
const widths = (options.widths || process.env.POVOD_CAPTURE_WIDTHS || '360,390,430').split(',').map(Number).filter(width => Number.isInteger(width) && width > 0);
const target = process.env.POVOD_CAPTURE_URL ?? ('http://127.0.0.1:4173/?design=' + encodeURIComponent(design));
const output = path.resolve(options.output || process.env.POVOD_CAPTURE_DIR || ('artifacts/ui-povod-v1/' + design));
await mkdir(output, { recursive: true });
const browser = await launchPovodBrowser();
try {
  for (const width of widths) {
    const page = await browser.open(target, width);
    await browser.capture(page, path.join(output, width + suffix + '.png'));
    await browser.closePage(page);
    process.stdout.write('captured ' + width + 'x844\n');
  }
} finally { await browser.close(); }
