from abc import ABC, abstractmethod
from typing import Dict, Any

class ToolInterface(ABC):
    """Abstract class for backend tools"""

    @abstractmethod
    def get_oauth_config(self) -> Dict[str, Any]:
        """
        Returns the OAuth configuration for the tool.
        Example: client_id, client_secret, authorize_url, token_url, scopes.
        """
        pass

    @abstractmethod
    async def handle_oauth_callback(self, request: Any) -> Dict[str, Any]:
        """
        Handles the OAuth callback and returns the access token and user info.
        Args:
            request: The incoming request containing the OAuth callback data.
        Returns:
            A dictionary containing the access token and user information.
        """
        pass

    @abstractmethod
    def execute_action(self, action: str, params: Dict[str, Any]) -> Any:
        """
        Executes a specific action for the tool.
        Args:
            action: The action to perform (e.g., "send_email", "create_page").
            params: Parameters required for the action.
        Returns:
            The result of the action execution.
        """
        pass

    @abstractmethod
    def revoke_token(self, token: str) -> None:
        """
        Revokes the access token for the tool.
        Args:
            token: The access token to revoke.
        """
        pass