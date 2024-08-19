import React, { useEffect, useState, ChangeEvent } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Checkbox,
  FormControlLabel,
  FormGroup
} from '@mui/material';
import { Project as ProjectInterface } from 'types/project';
import { useProjectApi } from 'hooks/useProjectApi';

export const Project: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectInterface | undefined | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false); // For modal dialog
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]); // For selected organizations
  const [deleteAll, setDeleteAll] = useState<boolean>(false); // For delete all option
  const { fetchProjectById, delProjectById } = useProjectApi();
  const history = useHistory();

  useEffect(() => {
    if (projectId) {
      const fetchProject = async () => {
        try {
          const data = await fetchProjectById(projectId);
          setProject(data);
        } catch (error) {
          console.error('Failed to fetch project:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchProject();
    } else {
      console.error('Project ID is undefined');
      setLoading(false);
    }
  }, [projectId, fetchProjectById]);

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const orgId = event.target.name;
    setSelectedOrgs((prev) =>
      event.target.checked
        ? [...prev, orgId]
        : prev.filter((id) => id !== orgId)
    );
  };

  const handleDelete = async () => {
    if (projectId && project) {
      const orgsToDelete = deleteAll
        ? project.organizations
        : project.organizations.filter((org) => selectedOrgs.includes(org.id));
      try {
        for (const org of orgsToDelete) {
          const response = await delProjectById(projectId, org.id);
          if (response === undefined) {
            console.error(
              `Failed to delete project from organization ${org.name}:`
            );
          }
        }

        // After deletion, check if the project still exists
        try {
          const updatedProject = await fetchProjectById(projectId);
          if (updatedProject) {
            setProject(updatedProject); // If the project still exists, update the state
            history.push(`/inventory/projects/${projectId}`); // Redirect back to the project page
          } else {
            history.push('/inventory/projects'); // If the project no longer exists, redirect to the projects list
          }
        } catch (error) {
          console.error(
            'An error occurred while checking the project existence:',
            error
          );
          history.push('/inventory/projects'); // In case of an error, redirect to the projects list
        }
      } catch (error) {
        console.error('An error occurred while deleting the project:', error);
      }
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleConfirmDelete = () => {
    handleDelete();
    setOpen(false);
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (!project) {
    return <Typography variant="h6">Project not found</Typography>;
  }

  return (
    <Box sx={{ padding: 2 }}>
      <Paper elevation={3} sx={{ padding: 2 }}>
        <Typography variant="h4" gutterBottom>
          <a href={project.url}> {project.name} </a>
        </Typography>
        <Typography variant="body1">
          <strong>Created At:</strong>{' '}
          {new Date(project.createdAt).toLocaleString()}
        </Typography>
        <Typography variant="body1">
          <strong>Updated At:</strong>{' '}
          {new Date(project.updatedAt).toLocaleString()}
        </Typography>
        <Typography variant="body1">
          <strong>Organizations:</strong>{' '}
          {project.organizations.map((org) => org.name).join(', ')}
        </Typography>
        <Typography variant="body1">
          <strong>Hipcheck Scan Results:</strong>{' '}
          {JSON.stringify(project.hipcheckResults)}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleClickOpen}
          sx={{ marginTop: 2 }}
        >
          Delete Project
        </Button>
      </Paper>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{'Confirm Delete'}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {deleteAll
              ? 'Are you sure you want to delete the project from all organizations? This action cannot be undone.'
              : 'Select the organizations you would like to delete the project from:'}
          </DialogContentText>
          {!deleteAll && (
            <FormGroup>
              {project.organizations.map((org) => (
                <FormControlLabel
                  key={org.id}
                  control={
                    <Checkbox
                      checked={selectedOrgs.includes(org.id)}
                      onChange={handleCheckboxChange}
                      name={org.id}
                    />
                  }
                  label={org.name}
                />
              ))}
            </FormGroup>
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteAll}
                onChange={() => setDeleteAll(!deleteAll)}
                color="secondary"
              />
            }
            label="Delete from all organizations"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="secondary" autoFocus>
            Yes, Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
