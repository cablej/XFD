import { useCallback, useState } from 'react';
import { Project } from 'types/project';
import { useAuthContext } from 'context';
import { Organization } from 'types';

export const useProjectApi = () => {
  const { currentOrganization, apiPost, apiPut, apiGet } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrapper for listByOrg call.
  const fetchProjectsByOrg = useCallback(
    async (orgId: string) => {
      setLoading(true);
      setError(null);
      try {
        const response: Project[] = await apiGet<Project[]>(
          `/projects?orgId=${orgId}`
        );
        return response;
      } catch (err: any) {
        if (err.response && err.response.status === 404) {
          setError(`Projects for organization ID ${orgId} not found`);
        } else {
          setError('Failed to fetch projects');
        }
      } finally {
        setLoading(false);
      }
    },
    [apiGet]
  );

  // Wrapper for create_proj call.
  const createProject = useCallback(
    async (url: string, organizations: Organization[]) => {
      setLoading(true);
      // setError(null);

      try {
        // Call the API for each organization the project belongs to.
        const createdProjects: Project[] = [];
        for (const org of organizations) {
          const response = await apiPost<Project>('/projects', {
            body: {
              url: url,
              hipcheckResults: {},
              orgId: org.id,
            },
          });
          createdProjects.push(response);
        }
        return createdProjects;
      } catch (err: any) {
        if (err.response && err.response.status === 403) {
          setError(
            `403 - Forbidden Error. Permission not granted to make this request.`
          );
          throw err;
        } else if (err.response && err.response.status === 500) {
          setError(`500 - Error. Tip: Confirm that URL is valid.`);
          throw err;
        } else {
          setError(err.message);
          throw err;
        }
      } finally {
        setLoading(false);
      }
    },
    [apiPost]
  );

  return {
    fetchProjectsByOrg,
    createProject,
    loading,
    error,
  };
};
