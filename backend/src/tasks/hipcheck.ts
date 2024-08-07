import { OpenSourceProject } from '../models';
import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import { CommandOptions } from './ecs-client';
import getProjects from './helpers/getProjects';
import { getRepository } from 'typeorm';
import * as path from 'path';

const OUT_PATH = path.join(__dirname, 'out-' + Math.random() + '.json');

export const handler = async (commandOptions: CommandOptions) => {
  const { organizationId, organizationName, scanId } = commandOptions;
  
  console.log('Running Hipcheck scan on hardcoded URL');

  // Hardcoded project URL for testing
  const hardcodedProject = {
    url: 'https://github.com/cablej/XFD',
    name: 'example-project',
    hipcheckResults: {},
    organization: { id: organizationId }
  };

  try {
    const args = [
      'check',
      '--target', 'repo',
      '--format', 'json',
      hardcodedProject.url,
    ];
    console.log('Running Hipcheck scan with args', args);

    const output = spawnSync('$HOME/.cargo/bin/hc', args, { stdio: 'pipe' });

    if (output.error) {
      throw output.error;
    }
    
    const result = JSON.parse(output.stdout.toString());
    hardcodedProject.hipcheckResults = result;

    const projectRepository = getRepository(OpenSourceProject); 
    await projectRepository.save(hardcodedProject);

    console.log(`Hipcheck completed for project: ${hardcodedProject.name}`);
  } catch (e) {
    console.error('Error running Hipcheck:', e);
  }

  //console.log('Running Hipcheck scan on organization', organizationName);
 
  // const projects = await getProjects(organizationId!);
  //const projectRepository = getRepository(OpenSourceProject); // Initialize the repository

  // for (const project of projects) {
  //   try {
  //     const args = [
  //       'check',
  //       '--target', 'repo',
  //       project.url,
  //       '--output', OUT_PATH,
  //       '--format', 'json'
  //     ];
  //     console.log('Running Hipcheck scan with args', args);
  //     spawnSync('hc', args, { stdio: 'pipe' });
      
  //     const output = String(readFileSync(OUT_PATH));
  //     const results = JSON.parse(output);
      
  //     project.hipcheckResults = results;
  //     await projectRepository.save(project);

  //     console.log(`Hipcheck completed for project: ${project.name}`);
  //   } catch (e) {
  //     console.error('Error reading or parsing the output file:', e);
  //     continue;
  //   } 
  // }
};
