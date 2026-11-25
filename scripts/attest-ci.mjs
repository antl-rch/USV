import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createCiBundle } from './ci-bundle.mjs';

if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Only main CI can attest');
const url = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);
url.searchParams.set('audience', 'https://api.antl.fr/antl-release');
const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}` } });
if (!response.ok) throw new Error(`OIDC failed: ${response.status}`);
const { value } = await response.json();
const repository = process.env.GITHUB_REPOSITORY.split('/')[1];
if (!['USV', 'script'].includes(repository) || !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA)) throw new Error('Unexpected component');
const source = fs.readFileSync('src/utils/scripts/leadContactOrigin.ts', 'utf8');
const origins = JSON.parse(source.match(/OPTIONS = ([\s\S]*?);/)[1]);
const { archive, build } = createCiBundle(repository, process.env.GITHUB_SHA);
const ssh = ['-i', process.env.DEPLOY_KEY_PATH, '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=yes', '-o', `UserKnownHostsFile=${process.env.DEPLOY_KNOWN_HOSTS}`, 'antl-deploy@46.225.98.62'];
execFileSync('ssh', [...ssh, `upload-build ${repository} ${process.env.GITHUB_SHA} ${build.digest}`], { input: archive, stdio: ['pipe', 'inherit', 'inherit'] });
execFileSync('ssh', [...ssh, `verify-component ${repository} ${process.env.GITHUB_SHA}`], { input: JSON.stringify({ token: value, origins, build }), stdio: ['pipe', 'inherit', 'inherit'] });
