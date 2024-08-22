import React, { useState, ChangeEvent } from 'react';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import {
  Box,
  Paper,
  Alert,
  TextField,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Radio,
  RadioGroup
} from '@mui/material';
import { useAuthContext } from 'context';

export interface ProjectFormData {
  urls: string[]; // Updated to support multiple URLs
  orgNames: string[];
}

interface ProjectCreateProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

const ProjectCreate: React.FC<ProjectCreateProps> = ({
  open,
  onClose,
  onSubmit
}) => {
  const { currentOrganization } = useAuthContext();
  const [formData, setFormData] = useState<ProjectFormData>({
    urls: [''], // Initialize with an empty string for the URL input
    orgNames: currentOrganization ? [currentOrganization.name] : ['']
  });
  const [inputType, setInputType] = useState<'url' | 'csv'>('url'); // Track whether to use URL input or CSV upload
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle change in user input.
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (name === 'orgName' && index !== undefined) {
      // Update the specific index in the orgNames array
      const newOrgNames = [...formData.orgNames];
      newOrgNames[index] = value;
      setFormData((prev) => ({
        ...prev,
        orgNames: newOrgNames
      }));
    } else if (name === 'url') {
      // Handling for URL input
      const newUrls = [...formData.urls];
      newUrls[index!] = value;
      setFormData({
        ...formData,
        urls: newUrls
      });
    }
  };

  // Handling for CSV upload
  const handleCSVUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvContent = event.target?.result as string;
        const urls = csvContent
          .split('\n')
          .map((url) => url.trim())
          .filter(Boolean);
        setFormData({
          ...formData,
          urls
        });
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read the CSV file');
      };
      reader.readAsText(file);
    }
  };

  // Handling for adding organizations.
  const handleAddOrgName = () => {
    setFormData((prev) => ({
      ...prev,
      orgNames: [...prev.orgNames, '']
    }));
  };

  // Handling for removing organizations.
  const handleRemoveOrgName = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      orgNames: prev.orgNames.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Create New Project</DialogTitle>
      <DialogContent>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <Box
          component="form"
          sx={{ '& .MuiTextField-root': { m: 1, width: '25ch' } }}
          noValidate
          autoComplete="off"
          onSubmit={handleSubmit}
        >
          <Paper elevation={3} sx={{ padding: 2, margin: 2 }}>
            <RadioGroup
              row
              name="inputType"
              value={inputType}
              onChange={(e) => setInputType(e.target.value as 'url' | 'csv')}
            >
              <FormControlLabel
                value="url"
                control={<Radio />}
                label="Enter URL"
              />
              <FormControlLabel
                value="csv"
                control={<Radio />}
                label="Upload CSV"
              />
            </RadioGroup>

            {inputType === 'url' ? (
              <TextField
                required
                name="url"
                label="URL"
                value={formData.urls[0]}
                onChange={(e) => handleChange(e, 0)}
              />
            ) : (
              <Button variant="contained" component="label">
                Upload CSV
                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleCSVUpload}
                />
              </Button>
            )}

            {formData.orgNames.map((orgName, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                <TextField
                  required
                  name="orgName"
                  label={`Organization ${index + 1}`}
                  value={orgName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleChange(e, index)
                  }
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
            <Button variant="contained" type="submit" sx={{ mt: 2 }}>
              Submit
            </Button>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProjectCreate;
