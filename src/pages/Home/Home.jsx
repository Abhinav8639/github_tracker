import { Octokit } from '@octokit/core';
import { createElement as h, useState, useCallback } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Link,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

const ROWS_PER_PAGE = 10;

function Home() {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [issues, setIssues] = useState([]);
  const [prs, setPrs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(ROWS_PER_PAGE);
  const [issueFilter, setIssueFilter] = useState('all');
  const [prFilter, setPrFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!username || !token) return;

    setLoading(true);
    setError('');

    try {
      const octokit = new Octokit({ auth: token });

      // Helper function to fetch data with pagination
      const fetchAll = async (url, params) => {
        let page = 1;
        let results = [];
        let hasMore = true;

        while (hasMore) {
          const response = await octokit.request(url, { ...params, page });
          results = results.concat(response.data.items);

          // If fewer than 100 items are returned, we've reached the last page
          hasMore = response.data.items.length === 100;
          page++;
        }

        return results;
      };

      // Fetch all issues
      const issuesResponse = await fetchAll('GET /search/issues', {
        q: `author:${username} is:issue`,
        sort: 'created',
        order: 'desc',
        per_page: 100,
      });

      // Fetch all pull requests
      const prsResponse = await fetchAll('GET /search/issues', {
        q: `author:${username} is:pr`,
        sort: 'created',
        order: 'desc',
        per_page: 100,
      });

      setIssues(issuesResponse);
      setPrs(prsResponse);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username, token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filterData = (data, filterType) => {
    switch (filterType) {
      case 'open':
        return data.filter(item => item.state === 'open');
      case 'closed':
        return data.filter(item => item.state === 'closed' && !item.pull_request?.merged_at);
      case 'merged':
        return data.filter(item => item.pull_request?.merged_at);
      default:
        return data;
    }
  };

  const currentData = tab === 0
    ? filterData(issues, issueFilter)
    : filterData(prs, prFilter);

  const displayData = currentData.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  return h(Container, { maxWidth: 'lg', sx: { display: 'flex', flexDirection: 'column', minHeight: '78vh', mt: 4 } }, [
    h(Paper, { elevation: 1, sx: { p: 2, mb: 4 } }, [
    //  h(Typography, { variant: 'h4', component: 'h1', gutterBottom: true }, ''),
      h('form', { onSubmit: handleSubmit }, [
        h(Box, { sx: { display: 'flex', gap: 2 } }, [
          h(TextField, {
            label: 'GitHub Username',
            value: username,
            onChange: (e) => setUsername(e.target.value),
            required: true,
            sx: { flex: 1 },
          }),
          h(TextField, {
            label: 'Personal Access Token',
            value: token,
            onChange: (e) => setToken(e.target.value),
            type: 'password',
            required: true,
            sx: { flex: 1 },
          }),
          h(Button, {
            type: 'submit',
            variant: 'contained',
            sx: { minWidth: '120px' },
          }, 'Fetch Data'),
        ]),
      ]),

    ]),

    error && h(Alert, { severity: 'error', sx: { mb: 3 } }, error),

    loading ?
      h(Box, { display: 'flex', justifyContent: 'center', my: 4 }, h(CircularProgress)) :
      h(Box, null, [
        h(Box, { sx: { display: 'flex', alignItems: 'center', gap: 2, mb: 3 } }, [
          h(Tabs, {
            value: tab,
            onChange: (e, newValue) => setTab(newValue),
            sx: { flex: 1 },
          }, [
            h(Tab, { label: `Issues (${filterData(issues, issueFilter).length})` }),
            h(Tab, { label: `Pull Requests (${filterData(prs, prFilter).length})` }),
          ]),
          h(FormControl, { sx: { minWidth: 120 } }, [
            h(InputLabel, null, 'Filter'),
            h(Select, {
              value: tab === 0 ? issueFilter : prFilter,
              onChange: (e) => tab === 0 ? setIssueFilter(e.target.value) : setPrFilter(e.target.value),
              label: 'Filter',
            }, [
              h(MenuItem, { value: 'all' }, 'All'),
              h(MenuItem, { value: 'open' }, 'Open'),
              h(MenuItem, { value: 'closed' }, 'Closed'),
              ...(tab === 1 ? [h(MenuItem, { value: 'merged' }, 'Merged')] : []),
            ]),
          ]),
        ]),

        // Table with scrollable container
        h(Box, {
          sx: {
            maxHeight: '400px', // Set the max height for scrollable content
            overflowY: 'auto', // Enable vertical scrolling
            display: 'block', // Ensure it behaves like a block-level container
          }
        }, [
          h(TableContainer, { component: Paper }, [
            h(Table, null, [
              h(TableHead, null,
                h(TableRow, null, [
                  h(TableCell, { sx: { textAlign: 'left' } }, 'Title'),
                  h(TableCell, { sx: { textAlign: 'center' } }, 'Repository'),
                  h(TableCell, { sx: { textAlign: 'center' } }, 'State'),
                  h(TableCell, { sx: { textAlign: 'left' } }, 'Created'),
                ])
              ),
              h(TableBody, null,
                displayData.map((item) =>
                  h(TableRow, { key: item.id }, [
                    h(TableCell, { sx: { textAlign: 'left' } },
                      h(Link, {
                        href: item.html_url,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                      }, item.title)
                    ),
                    h(TableCell, { sx: { textAlign: 'center' } }, item.repository_url.split('/').slice(-1)[0]),
                    h(TableCell, { sx: { textAlign: 'center' } }, item.pull_request?.merged_at ? 'merged' : item.state),
                    h(TableCell, { sx: { textAlign: 'left' } }, formatDate(item.created_at)),
                  ])
                )
              ),
            ]),
            h(TablePagination, {
              component: 'div',
              count: currentData.length,
              page,
              onPageChange: handleChangePage,
              rowsPerPage,
              rowsPerPageOptions: [5],
            }),
          ]),
        ]),
      ]),

  ]);
}

export default Home;
