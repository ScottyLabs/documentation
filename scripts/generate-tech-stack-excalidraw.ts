/**
 * Generates a hand-laid-out Excalidraw scene for the tech stack diagram.
 * Run: bun run scripts/generate-tech-stack-excalidraw.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUTPUT_SRC = join(import.meta.dir, '../src/diagrams/tech-stack.excalidraw.json');
const OUTPUT_PUBLIC = join(import.meta.dir, '../public/diagrams/tech-stack.excalidraw.json');
const CODEBERG = 'https://codeberg.org/ScottyLabs';

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

function box(x: number, y: number, label: string, opts: BoxOpts = {}): Box {
  const w = opts.w ?? 168;
  const h = opts.h ?? 40;
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

function downArrow(from: Box, to: Box, dashed = false) {
  const id = uid('arrow');
  const dx = to.cx - from.cx;
  const dy = to.y - from.bottom;
  elements.push({
    ...base(id),
    type: 'arrow',
    x: from.cx,
    y: from.bottom,
    width: dx,
    height: dy,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roughness: 0,
    opacity: 100,
    points: [
      [0, 0],
      [dx, dy],
    ],
    startBinding: { elementId: from.rectId, focus: 0, gap: 4 },
    endBinding: { elementId: to.rectId, focus: 0, gap: 4 },
    startArrowhead: null,
    endArrowhead: 'arrow',
    link: null,
  });
}

function rightArrow(from: Box, to: Box, dashed = false) {
  const id = uid('arrow');
  const dx = to.x - from.right;
  const dy = to.cy - from.cy;
  elements.push({
    ...base(id),
    type: 'arrow',
    x: from.right,
    y: from.cy,
    width: dx,
    height: dy,
    strokeColor: '#495057',
    backgroundColor: 'transparent',
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: dashed ? 'dashed' : 'solid',
    roughness: 0,
    opacity: 100,
    points: [
      [0, 0],
      [dx, dy],
    ],
    startBinding: { elementId: from.rectId, focus: 0, gap: 4 },
    endBinding: { elementId: to.rectId, focus: 0, gap: 4 },
    startArrowhead: null,
    endArrowhead: 'arrow',
    link: null,
  });
}

function note(x: number, y: number, text: string, w = 320) {
  elements.push({
    ...base(uid('note')),
    type: 'text',
    x,
    y,
    width: w,
    height: 80,
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
let gy = 72;

frame(GOV_X - 12, 40, 220, 500, 'Governance');

const gov = repo(GOV_X, gy, 'governance', { w: 180 });
gy += 52;
const tofu = box(GOV_X, gy, 'OpenTofu · Atlantis', { w: 180 });
gy += 52;
box(GOV_X, gy, 'Keycloak · Forgejo · GitHub · …', { w: 180, h: 56, fontSize: 14 });
gy += 68;
const obsRepo = repo(GOV_X, gy, 'observability');
gy += 48;
const docsRepo = repo(GOV_X, gy, 'documentation');
gy += 48;
const infraRepo = repo(GOV_X, gy, 'infrastructure', { w: 180 });
gy += 48;
const kennelRepo = repo(GOV_X, gy, 'kennel');
gy += 48;
const devenvRepo = repo(GOV_X, gy, 'devenv');
gy += 48;
const keycloakThemeRepo = repo(GOV_X, gy, 'keycloak-theme', { w: 180 });
gy += 48;
const iaRepo = repo(GOV_X, gy, 'internet-archive', { w: 180 });

downArrow(gov, tofu);

// --- infra-01 ---

const INFRA_X = 320;
frame(INFRA_X - 12, 40, 720, 900, 'infra-01');

let iy = 72;
const tailInfra = box(INFRA_X, iy, 'Tailscale client', { w: 200 });
const hostExpInfra = box(INFRA_X + 220, iy, 'Host exporters · node · systemd · cAdvisor · comin', {
  w: 460,
  h: 40,
  fontSize: 14,
});
iy += 56;
const caddyPubInfra = box(INFRA_X, iy, 'Caddy · public', { w: 200, fill: '#e7f5ff' });
iy += 56;

const svcY = iy;
const col = (offset: number) => INFRA_X + offset;
const idKeycloak = box(col(0), svcY, 'Keycloak · IdP*', { metrics: true });
box(col(0), svcY + 48, 'OpenBao · native OIDC*', { metrics: true });
box(col(0), svcY + 96, 'Vaultwarden');

const docsHost = box(col(180), svcY + 48, 'docs site');
box(col(180), svcY, 'Forgejo CI');
box(col(180), svcY + 96, 'Matrix · Synapse*', { metrics: true });

box(col(360), svcY, 'Garage*', { metrics: true });
box(col(360), svcY + 48, 'Garage WebAdmin', { w: 168, h: 48, fontSize: 14 });
box(col(360), svcY + 108, 'Caddy OIDC proxy', { w: 168, h: 36, fontSize: 13 });

const obsY = svcY + 168;
box(col(0), obsY, 'Grafana · native OIDC*', { metrics: true });
const promScraper = box(col(0), obsY + 48, 'Prometheus scraper*', { metrics: true, w: 180 });
box(col(0), obsY + 96, 'Loki* · Tempo* · Uptime Kuma*', { metrics: true, w: 180, h: 40, fontSize: 14 });

box(col(180), obsY, 'LiteLLM · native OIDC*', { metrics: true });
box(col(180), obsY + 48, 'cli-proxy-api');

box(col(360), obsY, 'Headplane · native OIDC');
box(col(360), obsY + 48, 'Headscale server*', { metrics: true });

iy = svcY + 300;
note(INFRA_X, iy, 'Public: Caddy → service\nTailnet: Tailscale → Caddy · tailnet → pgAdmin', 280);

const tailCaddyInfra = box(INFRA_X + 300, iy + 8, 'Caddy · tailnet', { w: 160, fill: '#fff3bf' });
const pgInfra = box(INFRA_X + 300, iy + 60, 'pgAdmin', { w: 160 });

downArrow(tailInfra, tailCaddyInfra);
downArrow(tailCaddyInfra, pgInfra);
downArrow(caddyPubInfra, idKeycloak);

// --- deploy-01 ---

const DEP_X = 1080;
frame(DEP_X - 12, 40, 680, 900, 'deploy-01');

let dy = 72;
const tailDeploy = box(DEP_X, dy, 'Tailscale client', { w: 200 });
const hostExpDeploy = box(DEP_X + 220, dy, 'Host exporters · node · systemd · cAdvisor · comin', {
  w: 420,
  h: 40,
  fontSize: 14,
});
dy += 56;
const caddyDeploy = box(DEP_X, dy, 'Caddy · public', { w: 200, fill: '#e7f5ff' });
dy += 56;

const kennelSvc = box(DEP_X, dy, 'kennel · platform*', { metrics: true, w: 180, fill: '#fff0f6' });
dy += 52;

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

let kx = DEP_X;
let ky = dy;
for (const [label, slug] of kennelRepos) {
  repo(kx, ky, label, { link: `${CODEBERG}/${slug}`, w: 150, h: 36, fontSize: 14 });
  kx += 158;
  if (kx > DEP_X + 480) {
    kx = DEP_X;
    ky += 44;
  }
}

downArrow(caddyDeploy, kennelSvc);

const tailCaddyDeploy = box(DEP_X + 500, dy, 'Caddy · tailnet', { w: 150, fill: '#fff3bf' });
const pgDeploy = box(DEP_X + 500, dy + 52, 'pgAdmin', { w: 150 });
const iaBatch = box(DEP_X + 500, dy + 120, 'internet-archive · batch job', { w: 150, h: 48, fontSize: 13 });

downArrow(tailDeploy, tailCaddyDeploy);
downArrow(tailCaddyDeploy, pgDeploy);

// Cross-host / repo links
rightArrow(infraRepo, tailInfra);
rightArrow(infraRepo, tailDeploy);
rightArrow(obsRepo, promScraper, true);
rightArrow(docsRepo, docsHost, true);
rightArrow(keycloakThemeRepo, idKeycloak, true);
rightArrow(kennelRepo, kennelSvc, true);
rightArrow(devenvRepo, kennelSvc, true);
rightArrow(iaRepo, iaBatch, true);
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
  },
  files: {},
};

const sceneJson = JSON.stringify(scene, null, 2);
await writeFile(OUTPUT_SRC, sceneJson);
await writeFile(OUTPUT_PUBLIC, sceneJson);
console.log(`Wrote ${OUTPUT_SRC} and ${OUTPUT_PUBLIC} (${elements.length} elements)`);
