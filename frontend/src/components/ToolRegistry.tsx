import GmailTool from './GmailTool';
import NotionTool from './NotionTool';
import { Tool } from './ToolInterface';
const toolRegistry: Record<string, Tool> = {
  gmail: GmailTool,
  notion: NotionTool,
  // Add more tools here...
};

export default toolRegistry;