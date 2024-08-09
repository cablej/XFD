import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useHistory } from 'react-router-dom';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { ChevronLeft, OpenInNew } from '@mui/icons-material';
import {
  AppBar,
  Box,
  Grid,
  IconButton,
  Link as LinkMui,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
} from '@mui/material';
import { tableCellClasses } from '@mui/material/TableCell';
import { getSeverityColor } from 'pages/Risk/utils';
import { useAuthContext } from 'context';
// import { XpanseSection } from './XpanseSection';

export const Project: React.FC = () => {
  return (
    <Box sx={{ padding: 2 }}>
      <Paper elevation={3} sx={{ padding: 2 }}>
        <h1>Welcome to the project page!</h1>
      </Paper>
    </Box>
  );
};
