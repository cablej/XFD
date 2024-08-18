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
  TextField,
  Checkbox,
  FormControlLabel,
  IconButton
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { Project as ProjectInterface } from 'types/project';
import { useProjectApi } from 'hooks/useProjectApi';

export const Project: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectInterface | undefined | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false); // For modal dialog
  const [formData, setFormData] = useState<{ orgNames: string[] }>({
    orgNames: ['']
  }); // For organization input
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

  const handleAddOrgName = () => {
    setFormData((prev) => ({
      ...prev,
      orgNames: [...prev.orgNames, '']
    }));
  };

  const handleRemoveOrgName = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      orgNames: prev.orgNames.filter((_, i) => i !== index)
    }));
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index?: number) => {
    const { name, value } = e.target;
    if (name === 'orgName' && index !== undefined) {
      const newOrgNames = [...formData.orgNames];
      newOrgNames[index] = value;
      setFormData((prev) => ({
        ...prev,
        orgNames: newOrgNames
      }));
    }
  };

  const handleDelete = async () => {
    if (projectId && project) {
      if (deleteAll) {
        // Delete from all organizations
        try {
          for (const org of project.organizations) {
            const response = await delProjectById(projectId, org.id);
            if (response === undefined) {
              console.error(
                `Failed to delete project from organization ${org.name}:`
              );
            }
          }
          history.push('/projects'); // Redirect to the projects list after deletion
        } catch (error) {
          console.error('An error occurred while deleting the project:', error);
        }
      } else {
        // Delete from specific organizations
        const orgNames = formData.orgNames.map((name) => name.trim());
        const orgsToDelete = project.organizations.filter((org) =>
          orgNames.includes(org.name)
        );

        if (orgsToDelete.length !== orgNames.length) {
          // Warning if any organization entered does not belong to the project
          alert(
            'One or more of the organizations you entered do not belong to this project.'
          );
          history.push(`/projects/${projectId}`);
          return;
        }

        try {
          for (const org of orgsToDelete) {
            const response = await delProjectById(projectId, org.id);
            if (response === undefined) {
              console.error(
                `Failed to delete project from organization ${org.name}`
              );
            }
          }
          history.push('/projects'); // Redirect to the projects list after deletion
        } catch (error) {
          console.error('An error occurred while deleting the project:', error);
        }
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
          {JSON.stringify(project.hipcheck)}
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
              : 'Enter the names of the organizations you would like to delete the project from:'}
          </DialogContentText>
          {!deleteAll && (
            <Box>
              {formData.orgNames.map((orgName, index) => (
                <Box
                  key={index}
                  sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                >
                  <TextField
                    required
                    name="orgName"
                    label={`Organization ${index + 1}`}
                    value={orgName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      handleChange(e, index)
                    }
                    fullWidth
                  />
                  <IconButton onClick={handleAddOrgName} color="primary">
                    <AddCircleIcon />
                  </IconButton>
                  {formData.orgNames.length > 1 && (
                    <IconButton
                      onClick={() => handleRemoveOrgName(index)}
                      color="secondary"
                    >
                      <RemoveCircleIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
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
