/**
 * Generates a hand-laid-out Excalidraw scene for the tech stack diagram.
 * Run: bun run scripts/generate-tech-stack-excalidraw.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_SRC = join(import.meta.dir, '../src/diagrams/tech-stack.excalidraw.json');
const OUTPUT_PUBLIC = join(import.meta.dir, '../public/diagrams/tech-stack.excalidraw.json');
const CODEBERG = 'https://codeberg.org/ScottyLabs';

/** Vertical gap between stacked boxes */
const ROW_GAP = 14;
/** Default box height */
const BOX_H = 40;
/** Horizontal gap between grid columns */
const COL_GAP = 16;

type BoxOpts = {
  link?: string;
  metrics?: boolean;
  fill?: string;
  w?: number;
  h?: number;
  fontSize?: number;
};

type Box = {
  rectId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  bottom: number;
  right: number;
};

const elements: Record<string, unknown>[] = [];
let seed = 1;

function uid(prefix: string) {
  return `${prefix}-${seed++}`;
}

function base(id: string) {
  return {
    id,
    angle: 0,
    groupIds: [] as string[],
    frameId: null,
    index: 'a0' as const,
    roundness: { type: 3 },
    isDeleted: false,
    boundElements: [] as { id: string; type: string }[],
    updated: 1,
    version: 1,
    versionNonce: seed,
    locked: false,
  };
}

function defaultBoxWidth(label: string, fontSize = 16): number {
  const charWidth = fontSize * 0.58;
  return Math.min(320, Math.max(168, Math.ceil(label.length * charWidth) + 28));
}

function box(x: number, y: number, label: string, opts: BoxOpts = {}): Box {
  const fontSize = opts.fontSize ?? 16;
  const w = opts.w ?? defaultBoxWidth(label, fontSize);
  const h = opts.h ?? BOX_H;
  const rectId = uid('rect');
  const textId = uid('text');
  const stroke = opts.metrics ? '#c2410c' : '#1e1e1e';
  const strokeWidth = opts.metrics ? 3 : 2;

  elements.push({
    ...base(rectId),
    type: 'rectangle',
    x,
    y,
    width: w,
    height: h,
    strokeColor: stroke,
    backgroundColor: opts.fill ?? 'transparent',
    fillStyle: 'solid',
    strokeWidth,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    link: opts.link ?? null,
    boundElements: [{ type: 'text', id: textId }],
  });

  elements.push({
    ...base(textId),
    type: 'text',
    x: x + 8,
    y: y + h / 2 - (opts.fontSize ?? 16) / 2,
    width: w - 16,
    height: opts.fontSize ?? 16,
    strokeColor: '#1e1e1e',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    text: label,
    fontSize: opts.fontSize ?? 16,
    fontFamily: 1,
    textAlign: 'center',
    verticalAlign: 'middle',
    containerId: rectId,
    originalText: label,
    autoResize: true,
    lineHeight: 1.25,
  });

  return { rectId, x, y, w, h, cx: x + w / 2, cy: y + h / 2, bottom: y + h, right: x + w };
}

function frame(x: number, y: number, w: number, h: number, label: string) {
  const id = uid('frame');
  elements.push({
    ...base(id),
    type: 'rectangle',
    x,
    y,
    width: w,
    height: h,
    strokeColor: '#868e96',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'dashed',
    roughness: 0,
    opacity: 100,
    link: null,
  });
  elements.push({
    ...base(uid('label')),
    type: 'text',
    x: x + 8,
    y: y - 22,
    width: w,
    height: 20,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    text: label,
    fontSize: 18,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: label,
    autoResize: true,
    lineHeight: 1.25,
  });
}

function arrowBetween(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  from: Box,
  to: Box,
  dashed = false,
) {
  const id = uid('arrow');
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  elements.push({
    ...base(id),
    type: 'arrow',
    x,
    y,
    width,
    height,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roughness: 0,
    opacity: 100,
    points: [
      [startX - x, startY - y],
      [endX - x, endY - y],
    ],
    startBinding: { elementId: from.rectId, focus: 0, gap: 4 },
    endBinding: { elementId: to.rectId, focus: 0, gap: 4 },
    startArrowhead: null,
    endArrowhead: 'arrow',
    link: null,
  });
}

function downArrow(from: Box, to: Box, dashed = false) {
  arrowBetween(from.cx, from.bottom, to.cx, to.y, from, to, dashed);
}

function rightArrow(from: Box, to: Box, dashed = false) {
  arrowBetween(from.right, from.cy, to.x, to.cy, from, to, dashed);
}

function stackStep(h: number = BOX_H): number {
  return h + ROW_GAP;
}

function note(x: number, y: number, text: string, w = 320) {
  const lineCount = text.split('\n').length;
  const height = Math.max(48, lineCount * 20 + 8);
  elements.push({
    ...base(uid('note')),
    type: 'text',
    x,
    y,
    width: w,
    height: height,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 1,
    strokeStyle: 'solid',
    roughness: 0,
    opacity: 100,
    text,
    fontSize: 14,
    fontFamily: 1,
    textAlign: 'left',
    verticalAlign: 'top',
    containerId: null,
    originalText: text,
    autoResize: true,
    lineHeight: 1.35,
  });
}

function repo(x: number, y: number, name: string, opts: BoxOpts = {}) {
  return box(x, y, name, { link: `${CODEBERG}/${name}`, ...opts });
}

// --- Governance column ---

const GOV_X = 40;
const GOV_W = 200;
let gy = 72;

const gov = repo(GOV_X, gy, 'governance', { w: GOV_W });
gy += stackStep();
const tofu = box(GOV_X, gy, 'OpenTofu · Atlantis', { w: GOV_W });
gy += stackStep();
box(GOV_X, gy, 'Keycloak · Forgejo · GitHub · …', { w: GOV_W, h: 52, fontSize: 13 });
gy += stackStep(52);
repo(GOV_X, gy, 'observability', { w: GOV_W });
gy += stackStep();
repo(GOV_X, gy, 'documentation', { w: GOV_W });
gy += stackStep();
repo(GOV_X, gy, 'infrastructure', { w: GOV_W });
gy += stackStep();
repo(GOV_X, gy, 'kennel', { w: GOV_W });
gy += stackStep();
repo(GOV_X, gy, 'devenv', { w: GOV_W });
gy += stackStep();
repo(GOV_X, gy, 'keycloak-theme', { w: GOV_W });
gy += stackStep();
const iaRepo = repo(GOV_X, gy, 'internet-archive', { w: GOV_W });
gy = iaRepo.bottom + ROW_GAP + 4;

const govNoteY = gy;
note(
  GOV_X,
  govNoteY,
  'Repos → hosts:\n• infrastructure → both NixOS columns\n• observability → Prometheus\n• documentation → docs site\n• kennel/devenv → kennel platform\n• internet-archive → batch job',
  GOV_W,
);
const govFrameH = govNoteY + 6 * 20 + 32;
frame(GOV_X - 12, 40, GOV_W + 24, govFrameH, 'Governance');

downArrow(gov, tofu);

// --- infra-01 ---

const INFRA_X = 320;
const INFRA_COL_W = 200;
const col = (index: number) => INFRA_X + index * (INFRA_COL_W + COL_GAP);

let iy = 72;
const tailInfra = box(INFRA_X, iy, 'Tailscale client', { w: INFRA_COL_W });
const hostExpInfra = box(INFRA_X + INFRA_COL_W + COL_GAP, iy, 'Host exporters · node · systemd · cAdvisor · comin', {
  w: INFRA_COL_W * 2 + COL_GAP,
  h: 44,
  fontSize: 13,
});
iy += stackStep(44);
const caddyPubInfra = box(INFRA_X, iy, 'Caddy · public', { w: INFRA_COL_W, fill: '#e7f5ff' });
iy += stackStep();

const svcY = iy;
const svcRowYs = [svcY, svcY + stackStep(), svcY + stackStep() + stackStep(44), svcY + stackStep() + stackStep(44) + stackStep(40)];

const idKeycloak = box(col(0), svcRowYs[0], 'Keycloak · IdP*', { w: INFRA_COL_W, metrics: true });
box(col(0), svcRowYs[1], 'OpenBao · native OIDC*', { w: INFRA_COL_W, metrics: true });
box(col(0), svcRowYs[2], 'Vaultwarden', { w: INFRA_COL_W });

const docsHost = box(col(1), svcRowYs[1], 'docs site', { w: INFRA_COL_W });
box(col(1), svcRowYs[0], 'Forgejo CI', { w: INFRA_COL_W });
box(col(1), svcRowYs[2], 'Matrix · Synapse*', { w: INFRA_COL_W, metrics: true });

box(col(2), svcRowYs[0], 'Garage*', { w: INFRA_COL_W, metrics: true });
box(col(2), svcRowYs[1], 'Garage WebAdmin', { w: INFRA_COL_W, h: 44, fontSize: 13 });
box(col(2), svcRowYs[2], 'Caddy OIDC proxy', { w: INFRA_COL_W, h: 40, fontSize: 13 });

const obsY = svcRowYs[3] + ROW_GAP + 8;
box(col(0), obsY, 'Grafana · native OIDC*', { w: INFRA_COL_W, metrics: true });
const promScraper = box(col(0), obsY + stackStep(), 'Prometheus scraper*', {
  w: INFRA_COL_W,
  metrics: true,
});
box(col(0), obsY + stackStep() * 2, 'Loki · Tempo · Uptime Kuma*', {
  w: INFRA_COL_W,
  h: 44,
  fontSize: 13,
  metrics: true,
});

box(col(1), obsY, 'LiteLLM · native OIDC*', { w: INFRA_COL_W, metrics: true });
box(col(1), obsY + stackStep(), 'cli-proxy-api', { w: INFRA_COL_W });

box(col(2), obsY, 'Headplane · native OIDC', { w: INFRA_COL_W });
box(col(2), obsY + stackStep(), 'Headscale server*', { w: INFRA_COL_W, metrics: true });

const infraNoteY = obsY + stackStep() * 2 + stackStep(44) + ROW_GAP;
note(INFRA_X, infraNoteY, 'Public: Caddy → service\nTailnet: Tailscale → Caddy · tailnet → pgAdmin', 280);

const tailCaddyInfra = box(INFRA_X + INFRA_COL_W + COL_GAP + 40, infraNoteY + 4, 'Caddy · tailnet', {
  w: 168,
  fill: '#fff3bf',
});
const pgInfra = box(INFRA_X + INFRA_COL_W + COL_GAP + 40, infraNoteY + stackStep(), 'pgAdmin', {
  w: 168,
});

const infraFrameH = pgInfra.bottom - 40 + 24;
frame(INFRA_X - 12, 40, INFRA_COL_W * 3 + COL_GAP * 2 + 24, infraFrameH, 'infra-01');

downArrow(tailInfra, tailCaddyInfra);
downArrow(tailCaddyInfra, pgInfra);
downArrow(caddyPubInfra, idKeycloak);

// --- deploy-01 ---

const DEP_X = 1080;
const DEP_COL_W = 158;
const DEP_GRID_COLS = 4;

let dy = 72;
const tailDeploy = box(DEP_X, dy, 'Tailscale client', { w: 200 });
const hostExpDeploy = box(DEP_X + 220, dy, 'Host exporters · node · systemd · cAdvisor · comin', {
  w: DEP_COL_W * DEP_GRID_COLS + COL_GAP * (DEP_GRID_COLS - 1),
  h: 44,
  fontSize: 13,
});
dy += stackStep(44);
const caddyDeploy = box(DEP_X, dy, 'Caddy · public', { w: 200, fill: '#e7f5ff' });
dy += stackStep();

const kennelSvc = box(DEP_X, dy, 'kennel · platform*', { metrics: true, w: 200, fill: '#fff0f6' });
dy += stackStep();

const kennelRepos: [string, string][] = [
  ['kennel docs', 'kennel'],
  ['courses', 'courses'],
  ['quest', 'quest'],
  ['housing', 'housing'],
  ['tartan-vote', 'tartan-vote'],
  ['bus-sign', 'bus-sign'],
  ['dalmatian', 'dalmatian'],
  ['discord-verify', 'discord-verify'],
  ['cmugpt-surface', 'cmugpt-surface'],
  ['cmugpt-agent', 'cmugpt-agent'],
  ['mcp-server', 'mcp-server'],
  ['sms-surface', 'sms-surface'],
  ['components', 'components'],
];

const GRID_BOX_H = 38;
let kx = DEP_X;
let ky = dy;
let gridCol = 0;
for (const [label, slug] of kennelRepos) {
  repo(kx, ky, label, {
    link: `${CODEBERG}/${slug}`,
    w: DEP_COL_W,
    h: GRID_BOX_H,
    fontSize: 13,
  });
  gridCol += 1;
  if (gridCol >= DEP_GRID_COLS) {
    gridCol = 0;
    kx = DEP_X;
    ky += stackStep(GRID_BOX_H);
  } else {
    kx += DEP_COL_W + COL_GAP;
  }
}
const gridBottom = ky + GRID_BOX_H;

downArrow(caddyDeploy, kennelSvc);

const rightColX = DEP_X + DEP_COL_W * DEP_GRID_COLS + COL_GAP * (DEP_GRID_COLS - 1) + 24;
const rightColY = gridBottom + ROW_GAP + 8;
const tailCaddyDeploy = box(rightColX, rightColY, 'Caddy · tailnet', { w: 168, fill: '#fff3bf' });
const pgDeploy = box(rightColX, rightColY + stackStep(), 'pgAdmin', { w: 168 });
const iaBatch = box(rightColX, rightColY + stackStep() * 2, 'internet-archive · batch job', {
  w: 168,
  h: 44,
  fontSize: 12,
});

const depFrameH = iaBatch.bottom - 40 + 24;
frame(DEP_X - 12, 40, rightColX + 168 - DEP_X + 24, depFrameH, 'deploy-01');

downArrow(tailDeploy, tailCaddyDeploy);
downArrow(tailCaddyDeploy, pgDeploy);

// Short in-host links only (long cross-column arrows blow up Excalidraw's canvas).
rightArrow(promScraper, hostExpInfra, true);

await mkdir(join(import.meta.dir, '../src/diagrams'), { recursive: true });
await mkdir(join(import.meta.dir, '../public/diagrams'), { recursive: true });

const scene = {
  type: 'excalidraw',
  version: 2,
  source: `${CODEBERG}/documentation`,
  elements,
  appState: {
    viewBackgroundColor: '#ffffff',
    gridSize: 20,
    zoom: { value: 0.85 },
    scrollX: 60,
    scrollY: 20,
  },
  files: {},
};

const sceneJson = JSON.stringify(scene, null, 2);
await writeFile(OUTPUT_SRC, sceneJson);
await writeFile(OUTPUT_PUBLIC, sceneJson);
console.log(`Wrote ${OUTPUT_SRC} and ${OUTPUT_PUBLIC} (${elements.length} elements)`);
