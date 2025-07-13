import { Box, Stack, Typography, Button } from "@mui/material";
import { Tool } from "./ToolInterface";
const GmailTool: Tool = {
  label: 'Gmail',
  type: 'trigger',
  actions: ['new_email', 'send_email'],
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
          {user ? <>Logged in as <b>{user}</b></> : "Not connected to Gmail"}
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
            window.google.accounts.oauth2.initCodeClient({
              client_id: "YOUR_CLIENT_ID",
              scope: "https://www.googleapis.com/auth/gmail.readonly",
              ux_mode: "popup",
              callback: (response: any) => {
                console.log("Gmail authenticated:", response);
              },
            }).requestCode();
          }}
        >
          Connect Gmail
        </Button>
      )}
    </Box>
  ),
  initialize: () => {
    console.log("Initializing Gmail tool...");
  },
  authenticate: () => {
    console.log("Authenticating Gmail...");
  },
  revokeAuthentication: () => {
    console.log("Revoking Gmail authentication...");
  },
  apiHandler: async (action, params) => {
    console.log(`Handling Gmail API call for action: ${action}`, params);
    return Promise.resolve({ success: true });
  },
};

export default GmailTool;