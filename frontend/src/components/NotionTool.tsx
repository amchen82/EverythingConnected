import { Box, Stack, Typography, Button } from "@mui/material";

const NotionTool: Tool = {
  label: 'Notion',
  type: 'action',
  actions: ['create_page', 'update_page'],
  authComponent: ({ user, onSignOut }) => (
    <Box mt={2} p={2} borderRadius={1} bgcolor={user ? "success.light" : "grey.100"}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: user ? "success.main" : "grey.400",
          }}
        />
        <Typography variant="body2">
          {user ? <>Connected as <b>{user}</b></> : "Not connected to Notion"}
        </Typography>
        {user && (
          <Button
            size="small"
            color="error"
            variant="outlined"
            sx={{ ml: 2 }}
            onClick={onSignOut}
          >
            Sign out
          </Button>
        )}
      </Stack>
      {!user && (
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            window.location.href = "http://localhost:8000/notion/oauth/start";
          }}
        >
          Connect Notion
        </Button>
      )}
    </Box>
  ),
  initialize: () => {
    console.log("Initializing Notion tool...");
  },
  authenticate: () => {
    console.log("Authenticating Notion...");
  },
  revokeAuthentication: () => {
    console.log("Revoking Notion authentication...");
  },
  apiHandler: async (action, params) => {
    console.log(`Handling Notion API call for action: ${action}`, params);
    return Promise.resolve({ success: true });
  },
};

export default NotionTool