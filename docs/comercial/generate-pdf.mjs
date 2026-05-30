/**
 * Genera PDF desde propuesta-svm-erp.html
 * Uso: node generate-pdf.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, 'propuesta-svm-erp.html');
const pdfPath = path.join(__dirname, 'propuesta-svm-erp.pdf');
const htmlUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;

async function tryPuppeteer() {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(htmlUrl, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  await browser.close();
  return true;
}

function tryEdge() {
  const edgePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const browser = edgePaths.find((p) => fs.existsSync(p));
  if (!browser) return Promise.resolve(false);

  return new Promise((resolve) => {
    const proc = spawn(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        `--print-to-pdf=${pdfPath}`,
        '--no-pdf-header-footer',
        htmlUrl,
      ],
      { stdio: 'inherit' }
    );
    proc.on('close', (code) => resolve(code === 0 && fs.existsSync(pdfPath)));
    proc.on('error', () => resolve(false));
  });
}

async function main() {
  if (!fs.existsSync(htmlPath)) {
    console.error('No se encontró:', htmlPath);
    process.exit(1);
  }

  console.log('Generando PDF...');

  try {
    if (await tryPuppeteer()) {
      console.log('OK (Puppeteer):', pdfPath);
      return;
    }
  } catch (e) {
    console.log('Puppeteer no disponible:', e.message);
  }

  if (await tryEdge()) {
    console.log('OK (Edge/Chrome headless):', pdfPath);
    return;
  }

  console.log('\nNo se pudo generar el PDF automáticamente.');
  console.log('Abra en el navegador y use Imprimir → Guardar como PDF:');
  console.log(htmlPath);
  process.exit(1);
}

main();
