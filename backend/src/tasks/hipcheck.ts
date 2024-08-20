import { OpenSourceProject } from '../models';
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { CommandOptions } from './ecs-client';
import getProjects from './helpers/getProjects';
import { getRepository } from 'typeorm';
import * as path from 'path';

const OUT_PATH = path.join(__dirname, 'out-' + Math.random() + '.json');

const shouldRunScan = (project: OpenSourceProject): boolean => {
  if (!project.lastScannedAt) {
    return true;
  }

  const curDate = new Date();
  const nextScanDate = new Date(project.lastScannedAt);
  nextScanDate.setDate(nextScanDate.getDate() + project.scanFrequency);

  return curDate >= nextScanDate;
};

export const handler = async (commandOptions: CommandOptions) => {
  const { organizationId, organizationName, scanId } = commandOptions;

  const projects = await getProjects();
  for (const project of projects) {
    if (!shouldRunScan(project)) {
      continue;
    }

    try {
      const args = [
        'check',
        '--target',
        'repo',
        '--format',
        'json',
        '-v',
        'quiet',
        project.url
      ];
      console.log('Running Hipcheck scan with args', args);

      const hcPath = path.resolve(process.env.HOME || '', '.cargo/bin/hc');

      const output = spawnSync(hcPath, args, { stdio: 'pipe' });

      if (output.error) {
        throw output.error;
      }

      console.log('JSON String:', output.stdout.toString());
      let parsedData;
      try {
        parsedData = JSON.parse(output.stdout.toString());
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        parsedData = {};
      }

      project.hipcheckResults = parsedData;
      project.lastScannedAt = new Date();
      await project.save();

      console.log(`Hipcheck completed for project: ${project.name}`);
    } catch (e) {
      console.error('Error running Hipcheck:', e);
      continue;
    }
  }
};
