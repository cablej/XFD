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
  FormGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { Project as ProjectInterface } from 'types/project';
import { useProjectApi } from 'hooks/useProjectApi';
import { styled } from '@mui/material/styles';

const PREFIX = 'ProjectDetails';

const classes = {
  root: `${PREFIX}-root`,
  title: `${PREFIX}-title`,
  section: `${PREFIX}-section`,
  subtitle: `${PREFIX}-subtitle`,
  inner: `${PREFIX}-inner`
};

const StyledPaper = styled(Paper)(({ theme }) => ({
  [`& .${classes.root}`]: {
    border: `2px solid ${theme.palette.primary.main}`,
    boxShadow: '0px 1px 6px rgba(0, 0, 0, 0.25)',
    marginBottom: '1rem',
    '& *:focus': {
      outline: 'none !important'
    }
  },

  [`& .${classes.title}`]: {
    backgroundColor: theme.palette.primary.main,
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    fontSize: '2rem',
    textDecoration: 'none',

    '& > h4': {
      wordBreak: 'break-all',
      paddingRight: '2rem',
      margin: '0'
    },

    '& > a, & > h4 a': {
      color: 'white',
      textDecoration: 'none'
    }
  },

  [`& .${classes.section}`]: {
    marginBottom: '1.5rem'
  },

  [`& .${classes.subtitle}`]: {
    margin: 0,
    padding: '0 0 0.2rem 0',
    fontSize: '1.2rem',
    fontWeight: 500,
    color: '#3D4551'
  },

  [`& .${classes.inner}`]: {
    padding: '1.5rem'
  }
}));

const HipcheckResultsTable: React.FC<{ hipcheckResults?: any }> = ({
  hipcheckResults
}) => {
  if (!hipcheckResults || Object.keys(hipcheckResults).length === 0) {
    return (
      <StyledPaper>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Field</strong>
                </TableCell>
                <TableCell>
                  <strong>Value</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={2}>No Hipcheck Results Available</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </StyledPaper>
    );
  }

  const {
    repo_head,
    repo_name,
    analyzed_at,
    recommendation,
    hipcheck_version
  } = hipcheckResults;

  interface AnalysisItem {
    analysis: string;
    value: number;
    threshold: number;
    concerns?: Array<{
      contributor?: string;
      count?: number;
      commit_hash?: string;
      score?: number;
      threshold?: number;
    }>;
  }

  interface AnalysisResult {
    name: string;
    status: string;
  }

  const extractAnalyses = (hipcheckResults: any): AnalysisResult[] => {
    const analyses: AnalysisResult[] = [];

    // Helper function to add analyses from a given category
    const addAnalysesFromCategory = (
      category: AnalysisItem[],
      status: string
    ) => {
      category.forEach((item) => {
        analyses.push({ name: item.analysis, status });
      });
    };

    // Add analyses from each category
    addAnalysesFromCategory(hipcheckResults.errored, 'errored');
    addAnalysesFromCategory(hipcheckResults.failing, 'failing');
    addAnalysesFromCategory(hipcheckResults.passing, 'passing');

    return analyses;
  };

  const analyses = extractAnalyses(hipcheckResults);

  const analysisDescriptions: Map<string, string> = new Map([
    [
      'Activity',
      'Measures the level of activity or contribution in the codebase. High activity indicates frequent changes or updates.'
    ],
    [
      'Binary',
      'Checks for binary files or non-text files within the repository. Such files are often excluded from text-based analysis.'
    ],
    [
      'Entropy',
      'Assesses the randomness or complexity of the code. Higher entropy suggests more complex or less predictable code.'
    ],
    [
      'Typo',
      'Detects spelling mistakes or typographical errors in the codebase. These errors can impact readability and professionalism.'
    ],
    [
      'Affiliation',
      'Evaluates the association between code changes and specific contributors or teams. Helps identify code ownership and contributions.'
    ],
    [
      'Identity',
      'Analyzes the consistency and uniqueness of author identities within the codebase. Ensures that contributions are properly attributed.'
    ],
    [
      'Churn',
      'Measures the rate of changes or modifications in the codebase over time. High churn may indicate instability or frequent changes.'
    ],
    [
      'Fuzz',
      'Performs fuzz testing to identify potential vulnerabilities or edge cases in the code. Helps in uncovering hidden issues.'
    ],
    [
      'Review',
      'Analyzes the code review process, including review frequency, comments, and approval metrics. Ensures code quality and team collaboration.'
    ]
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'errored':
        return '#f44336'; // Red for errored
      case 'failing':
        return '#ff9800'; // Orange for failing
      case 'passing':
        return '#4caf50'; // Green for passing
      default:
        return '#000'; // Default color
    }
  };

  return (
    <StyledPaper>
      <Typography
        variant="h5"
        component="div"
        gutterBottom
        style={{ marginBottom: '16px', marginTop: '32px' }}
      >
        <strong>Hipcheck Results:</strong>
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <strong>Repo Name</strong>
              </TableCell>
              <TableCell>{repo_name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Repo Head</strong>
              </TableCell>
              <TableCell>{repo_head}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Analyzed At</strong>
              </TableCell>
              <TableCell>{new Date(analyzed_at).toLocaleString()}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Hipcheck Version</strong>
              </TableCell>
              <TableCell>{hipcheck_version}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Recommendation Kind</strong>
              </TableCell>
              <TableCell>{recommendation.kind}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Risk Score</strong>
              </TableCell>
              <TableCell>{recommendation.risk_score}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>
                <strong>Risk Threshold</strong>
              </TableCell>
              <TableCell>{recommendation.risk_threshold}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography
        variant="h5"
        component="div"
        gutterBottom
        style={{ marginBottom: '16px', marginTop: '32px' }}
      >
        <strong>Details:</strong>
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <strong>Analysis</strong>
              </TableCell>
              <TableCell>
                <strong>Status</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {analyses.map((analysis, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Typography
                    variant="h6"
                    component="div"
                    style={{ fontWeight: 'bold', fontSize: '1.2rem' }}
                  >
                    {analysis.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    component="div"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {analysisDescriptions.get(analysis.name)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body1"
                    style={{
                      backgroundColor: getStatusColor(analysis.status),
                      color: '#fff',
                      padding: '8px',
                      borderRadius: '4px'
                    }}
                  >
                    {analysis.status.charAt(0).toUpperCase() +
                      analysis.status.slice(1)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </StyledPaper>
  );
};

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
      <StyledPaper classes={{ root: classes.root }}>
        <div className={classes.title}>
          <h4>
            <a href={project.url}>{project.name}</a>
          </h4>
        </div>
        <div className={classes.inner}>
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
            <strong>Hipcheck Results:</strong>
          </Typography>
          <HipcheckResultsTable hipcheckResults={project.hipcheckResults} />
          <Button
            variant="contained"
            color="secondary"
            onClick={handleClickOpen}
            sx={{ marginTop: 2 }}
          >
            Delete Project
          </Button>
        </div>
      </StyledPaper>

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
