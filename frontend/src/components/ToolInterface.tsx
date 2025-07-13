export interface Tool {
  /** The name of the tool (e.g., "Gmail", "Notion", "Google Drive") */
  label: string;

  /** The type of the tool (e.g., "trigger" or "action") */
  type: 'trigger' | 'action';

  /** The list of actions supported by the tool */
  actions: string[];

  /** The authentication component for the tool */
  authComponent?: React.FC<{ user: string | null; onSignOut: () => void }>;

  /** Function to initialize the tool (e.g., OAuth setup) */
  initialize?: () => void;

  /** Function to handle authentication (e.g., OAuth flow) */
  authenticate?: () => void;

  /** Function to revoke authentication (e.g., sign out) */
  revokeAuthentication?: () => void;

  /** Optional function to handle tool-specific API calls */
  apiHandler?: (action: string, params: Record<string, any>) => Promise<any>;
}

export {};