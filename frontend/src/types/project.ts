import { Organization } from './organization';

export interface Project {
  id: string;
  purl: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  hipcheck: string; // This should be a json object.
  organizations: Organization[];
}
