#!/usr/bin/env node
// Generate source images for `npx capacitor-assets generate --android`
// from the existing web icons (512px) and logo. Sky #8ed4f7 matches the game.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const SKY = '#8ed4f7';
const root = new URL('..', import.meta.url).pathname;
const out = root + 'resources/';
mkdirSync(out, { recursive: true });

const upscale = (src, dest, size) =>
  sharp(root + src).resize(size, size, { kernel: 'lanczos3' }).png().toFile(out + dest);

await upscale('assets/icon-512.png', 'icon-only.png', 1024);
await upscale('assets/icon-maskable-512.png', 'icon-foreground.png', 1024);

await sharp({ create: { width: 1024, height: 1024, channels: 4, background: SKY } })
  .png().toFile(out + 'icon-background.png');

const logo = await sharp(root + 'assets/logo.png').resize(1100, null).png().toBuffer();
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: SKY } })
    .composite([{ input: logo, gravity: 'center' }])
    .png().toFile(out + name);
}
console.log('resources/ written');
