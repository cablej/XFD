import { Organization } from './organization';

export interface Hipcheck {
  errored: Object;
  failing: Object;
  passing: Object;
  repo_head: string;
  repo_name: string;
  analyzed_at: string;
  recommendation: {
    kind: string;
    risk_score: number;
    risk_threshold: number;
  };
  hipcheck_version: string;
}

export interface Project {
  id: string;
  purl: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  hipcheckResults: Hipcheck; // This should be a json object.
  organizations: Organization[];
}
