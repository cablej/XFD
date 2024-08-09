import React, { useCallback, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { Subnav } from 'components';
import { Query } from 'types';
import { useAuthContext } from 'context';
import { Project } from 'types/project';
import { Box, Stack } from '@mui/system';
import {
  Alert,
  Button,
  Icon,
  Menu,
  IconButton,
  Paper,
  TextField,
  MenuItem,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import CustomToolbar from 'components/DataGrid/CustomToolbar';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useProjectApi } from 'hooks/useProjectApi';
import { Organization } from 'types';
import { ProjectCreate } from '../ProjectCreate/index'; // Adjust the import path as needed
import { ProjectFormData } from 'pages/ProjectCreate/ProjectCreate';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const PAGE_SIZE = 15;

const Projects: React.FC = () => {
  const { currentOrganization, apiPost, apiGet, apiPut, showAllOrganizations } =
    useAuthContext();
  const { fetchProjectsByOrg, createProject, error } = useProjectApi();
  const [projects, setProjects] = useState<Project[]>([]);
  const [initialProjects, setInitialProjects] = useState<Project[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const history = useHistory();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [anchorEls, setAnchorEls] = useState<{
    [key: string]: HTMLElement | null;
  }>({});
  const [projectsLoaded, setProjectsLoaded] = useState(false);

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);

  // Handle submit form for creating new Project.
  const handleFormSubmit = async (data: ProjectFormData) => {
    const orgs: Organization[] = [];
    try {
      for (const name of data.orgNames) {
        // Get organizations objects from user-submitted organization names.
        const matchedOrg = organizations.find((org) => org.name === name);
        if (matchedOrg) {
          orgs.push(matchedOrg);
        } else {
          setErrorMessage('Entered invalid organization name.');
          handleCloseModal();
          return;
        }
      }

      // API call
      if (data.url) {
        await createProject(data.url, orgs);
        handleCloseModal();
        return;
      } else {
        setErrorMessage('Please enter a valid URL.');
        handleCloseModal();
        return;
      }
    } catch (e: any) {
      setErrorMessage(error);
      handleCloseModal();
      return;
    }
  };

  // Fetch all organizations.
  const fetchOrganizations = useCallback(async () => {
    setErrorMessage(null);
    try {
      const rows = await apiGet<Organization[]>('/v2/organizations/');
      setOrganizations(rows);
    } catch (e: any) {
      if (e.response && e.response.status === 404) {
        setErrorMessage(`Unable to load organizations.`);
      }
    }
  }, [apiGet]);

  // Fetch all projects.
  const loadProjects = useCallback(async () => {
    setErrorMessage(null);
    try {
      const allProjects: Project[] = [];
      if (!organizations || organizations.length === 0) {
        setErrorMessage('No organizations available');
        return;
      }
      for (const org of organizations) {
        const orgProjects = await fetchProjectsByOrg(org.id);
        if (orgProjects) {
          for (const orgProject of orgProjects) {
            const existingProjectIndex = allProjects.findIndex(
              (p) => p.id === orgProject.id
            );
            if (existingProjectIndex !== -1) {
              // Project already exists in allProjects, add the organization to the project's organizations list
              allProjects[existingProjectIndex].organizations.push(org);
            } else {
              // Project does not exist in allProjects, append the new project with the organization
              allProjects.push({
                ...orgProject,
                organizations: [...(orgProject.organizations || []), org],
              });
            }
          }
        }
      }
      // }

      setInitialProjects(allProjects);
      setTotalResults(allProjects.length);
      setErrorMessage(null);
      setProjectsLoaded(true);
    } catch (e: any) {
      if (!e.message.includes('not found')) {
        setErrorMessage('An error occurred while loading projects');
      }
    }
  }, [fetchProjectsByOrg, organizations, currentOrganization]);

  const filter = useCallback(() => {
    // currentOrganization might be undefined.
    if (
      currentOrganization &&
      currentOrganization.id != '9d33744f-50fd-4d14-a961-4b3edfb8f2a2'
    ) {
      const filteredProjects = initialProjects.filter((project) =>
        project.organizations.some((org) => org.id === currentOrganization.id)
      );
      setProjects(filteredProjects);
    } else {
      setProjects(initialProjects);
    }
  }, [currentOrganization, initialProjects]);

  // Fetch organizations on mount
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Fetch projects once organizations are loaded
  useEffect(() => {
    loadProjects();
  }, [organizations]);

  // Filter projects if currentOrganization changes.
  useEffect(() => {
    if (projectsLoaded) {
      filter();
    }
  }, [initialProjects, currentOrganization, filter]);

  // Handle retry button.
  const handleRetry = async () => {
    setErrorMessage(null);
    setLoading(true);
    await loadProjects();
    setLoading(false);
  };

  // Function to handle the click event to show the dropdown
  const handleClick = (
    event: React.MouseEvent<HTMLElement>,
    projectId: string
  ) => {
    setAnchorEls((prevState) => ({
      ...prevState,
      [projectId]: event.currentTarget,
    }));
  };

  const handleClose = (projectId: string) => {
    setAnchorEls((prevState) => ({ ...prevState, [projectId]: null }));
  };

  // Code for new table
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: PAGE_SIZE,
    pageCount: 0,
    sort: [],
    filters: [],
  });

  const projectRows = projects.map((project) => ({
    id: project.id,
    url: project.url,
    name: project.name,
    updatedAt: `${differenceInCalendarDays(new Date(), project.updatedAt)} days ago`,
    createdAt: `${differenceInCalendarDays(new Date(), project.createdAt)} days ago`,
    hipcheck: project.hipcheck,
    organizations: (
      <div>
        <Button
          aria-controls={`simple-menu-${project.id}`}
          aria-haspopup="true"
          onClick={(event) => handleClick(event, project.id)}
          endIcon={<ExpandMoreIcon />}
        >
          See orgs
        </Button>
        <Menu
          id={`simple-menu-${project.id}`}
          anchorEl={anchorEls[project.id]}
          keepMounted
          open={Boolean(anchorEls[project.id])}
          onClose={() => handleClose(project.id)}
        >
          {project.organizations && project.organizations.length > 0 ? (
            project.organizations.map((org) => (
              <MenuItem key={org.id} onClick={() => handleClose(project.id)}>
                {org.name}
              </MenuItem>
            ))
          ) : (
            <MenuItem onClick={() => handleClose(project.id)}>
              No organization available
            </MenuItem>
          )}
        </Menu>
      </div>
    ),
  }));

  const projectCols: GridColDef[] = [
    { field: 'id', headerName: 'ID', minWidth: 100, flex: 1.5 },
    { field: 'url', headerName: 'URL', minWidth: 100, flex: 3 },
    { field: 'name', headerName: 'Name', minWidth: 100, flex: 1 },
    { field: 'createdAt', headerName: 'Created At', minWidth: 75, flex: 1 },
    { field: 'updatedAt', headerName: 'Updated At', minWidth: 75, flex: 1 },
    { field: 'hipcheck', headerName: 'Hipcheck Score', minWidth: 100, flex: 1 },
    {
      field: 'organizations',
      headerName: 'Organizations',
      width: 100,
      renderCell: (params) => params.value,
    },
    {
      field: 'view',
      headerName: 'Details',
      minWidth: 100,
      flex: 0.5,
      renderCell: (cellValues: GridRenderCellParams) => {
        return (
          <IconButton
            aria-label={`View details for ${cellValues.row.name}`}
            tabIndex={cellValues.tabIndex}
            color="primary"
            onClick={() =>
              history.push('/inventory/project/' + cellValues.row.id)
            }
          >
            <OpenInNewIcon />
          </IconButton>
        );
      },
    },
  ];

  return (
    <div>
      <Subnav
        items={[
          { title: 'Search Results', path: '/inventory', exact: true },
          { title: 'All Domains', path: '/inventory/domains' },
          { title: 'All Vulnerabilities', path: '/inventory/vulnerabilities' },
          { title: 'OSS Projects', path: '/inventory/projects' },
        ]}
      ></Subnav>

      <br></br>

      <Box mb={3} mt={3} display="flex" justifyContent="center">
        {loading ? (
          <Alert severity="info">Loading...</Alert>
        ) : error ? (
          <Stack direction="row" spacing={2}>
            <Paper elevation={2}>
              <Alert severity="error">{error}</Alert>
            </Paper>
            <Button onClick={handleRetry} variant="contained" color="primary">
              Retry
            </Button>
          </Stack>
        ) : (
          <Paper elevation={2} sx={{ width: '90%' }}>
            <DataGrid
              rows={projectRows}
              rowCount={totalResults}
              columns={projectCols}
              paginationMode="server"
              pageSizeOptions={[15, 30, 50, 100]}
            />
          </Paper>
        )}
      </Box>

      {errorMessage && (
        <Box mb={3} mt={3} display="flex" justifyContent="center">
          <Alert severity="error">
            {errorMessage || 'An unknown error occurred.'}
          </Alert>
        </Box>
      )}

      <Box sx={{ width: '95%', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          aria-label="Create new project"
          color="primary"
          variant="contained"
          onClick={handleOpenModal}
        >
          Create new project
        </Button>
        <ProjectCreate
          open={modalOpen}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      </Box>
    </div>
  );
};

export default Projects;
