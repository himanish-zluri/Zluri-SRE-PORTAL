import { WebClient } from '@slack/web-api';

// Slack configuration from environment
const SLACK_ENABLED = process.env.SLACK_ENABLED === 'true';
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_APPROVAL_CHANNEL = process.env.SLACK_APPROVAL_CHANNEL;

// Initialize Slack client
const slackClient = SLACK_BOT_TOKEN ? new WebClient(SLACK_BOT_TOKEN) : null;

// Types for message building
interface QueryInfo {
  id: string;
  requesterName: string;
  requesterEmail: string;
  requesterSlackId?: string;
  databaseName: string;
  instanceName: string;
  podId: string;
  submissionType: 'QUERY' | 'SCRIPT';
  queryText?: string;
  scriptContent?: string;
  comments?: string;
}

interface ExecutionResult {
  rowCount?: number;
  rows?: any[];
  output?: string;
  error?: string;
}

// Helper to truncate text
function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Helper to format query preview
function formatQueryPreview(query: QueryInfo): string {
  if (query.submissionType === 'SCRIPT') {
    return truncate(query.scriptContent || '[Script]', 100);
  }
  return truncate(query.queryText || '', 100);
}

// Helper to format execution result
function formatExecutionResult(result: any): string {
  if (!result) {
    return 'Execution completed successfully';
  }

  // Handle error case
  if (result.error) {
    return `Error: ${truncate(String(result.error), 500)}`;
  }
  
  // Handle script output (stdout/stderr format)
  if (result.output) {
    return truncate(String(result.output), 500);
  }

  // Handle query result with rows array
  if (result.rows && Array.isArray(result.rows)) {
    const rowCount = result.rowCount || result.rows.length;
    const preview = JSON.stringify(result.rows.slice(0, 3), null, 2);
    return `${rowCount} row(s) returned\n${truncate(preview, 400)}`;
  }

  // Handle direct array result (common for scripts)
  if (Array.isArray(result)) {
    const preview = JSON.stringify(result.slice(0, 3), null, 2);
    return `${result.length} item(s) returned\n${truncate(preview, 400)}`;
  }

  // Handle object with success flag (script result)
  if (typeof result === 'object') {
    // Check if it's a simple success object
    if (Object.keys(result).length === 1 && result.success === true) {
      return 'Execution completed successfully';
    }
    
    // Try to stringify the object
    try {
      const preview = JSON.stringify(result, null, 2);
      return truncate(preview, 500);
    } catch {
      return 'Execution completed successfully';
    }
  }

  // Handle primitive results
  if (typeof result === 'string' || typeof result === 'number' || typeof result === 'boolean') {
    return String(result);
  }
  
  return 'Execution completed successfully';
}

export class SlackService {
  /**
   * Check if Slack integration is enabled and configured
   */
  static isEnabled(): boolean {
    return SLACK_ENABLED && !!slackClient && !!SLACK_APPROVAL_CHANNEL;
  }

  /**
   * Send message to the approval channel
   */
  static async sendToChannel(blocks: any[], text: string): Promise<void> {
    if (!this.isEnabled()) return;
    
    try {
      await slackClient!.chat.postMessage({
        channel: SLACK_APPROVAL_CHANNEL!,
        blocks,
        text, // Fallback text for notifications
      });
    } catch (error) {
      console.error('Failed to send Slack channel message:', error);
    }
  }

  /**
   * Send DM to a user by their Slack ID
   */
  static async sendDM(slackUserId: string, blocks: any[], text: string): Promise<void> {
    if (!SLACK_ENABLED || !slackClient || !slackUserId) return;
    
    try {
      await slackClient.chat.postMessage({
        channel: slackUserId, // DM by user ID
        blocks,
        text,
      });
    } catch (error) {
      console.error('Failed to send Slack DM:', error);
    }
  }

  /**
   * 1) New Submission - Send to common channel
   */
  static async notifyNewSubmission(query: QueryInfo): Promise<void> {
    if (!this.isEnabled()) return;

    const typeEmoji = query.submissionType === 'SCRIPT' ? '📜' : '🔍';
    const preview = formatQueryPreview(query);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${typeEmoji} New ${query.submissionType} Submission`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n\`${query.id.substring(0, 8)}...\``,
          },
          {
            type: 'mrkdwn',
            text: `*Requester:*\n${query.requesterName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Database:*\n${query.instanceName} / ${query.databaseName}`,
          },
          {
            type: 'mrkdwn',
            text: `*POD:*\n${query.podId}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Preview:*\n\`\`\`${preview}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Submitted at <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} {time}|${new Date().toISOString()}>`,
          },
        ],
      },
    ];

    const text = `New ${query.submissionType} submission from ${query.requesterName} for ${query.databaseName}`;
    await this.sendToChannel(blocks, text);
  }

  /**
   * 2) Approval + Success - Send to channel AND requester DM
   */
  static async notifyExecutionSuccess(
    query: QueryInfo,
    result: ExecutionResult,
    approverName: string
  ): Promise<void> {
    if (!SLACK_ENABLED || !slackClient) return;

    const resultPreview = formatExecutionResult(result);
    const typeLabel = query.submissionType === 'SCRIPT' ? 'Script' : 'Query';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `✅ ${typeLabel} Executed Successfully`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n\`${query.id.substring(0, 8)}...\``,
          },
          {
            type: 'mrkdwn',
            text: `*Approved by:*\n${approverName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Database:*\n${query.instanceName} / ${query.databaseName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Type:*\n${query.submissionType}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Result:*\n\`\`\`${resultPreview}\`\`\``,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '📋 View full results in the portal',
          },
        ],
      },
    ];

    const text = `${typeLabel} ${query.id.substring(0, 8)} executed successfully`;

    // Send to channel
    if (SLACK_APPROVAL_CHANNEL) {
      await this.sendToChannel(blocks, text);
    }

    // Send DM to requester
    if (query.requesterSlackId) {
      const dmBlocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `✅ Your ${typeLabel} Was Executed Successfully!`,
            emoji: true,
          },
        },
        ...blocks.slice(1),
      ];
      await this.sendDM(query.requesterSlackId, dmBlocks, text);
    }
  }

  /**
   * 3) Approval + Failure - Send to channel AND requester DM
   */
  static async notifyExecutionFailure(
    query: QueryInfo,
    error: string,
    approverName: string
  ): Promise<void> {
    if (!SLACK_ENABLED || !slackClient) return;

    const typeLabel = query.submissionType === 'SCRIPT' ? 'Script' : 'Query';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `❌ ${typeLabel} Execution Failed`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n\`${query.id.substring(0, 8)}...\``,
          },
          {
            type: 'mrkdwn',
            text: `*Approved by:*\n${approverName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Database:*\n${query.instanceName} / ${query.databaseName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Type:*\n${query.submissionType}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Error:*\n\`\`\`${truncate(error, 500)}\`\`\``,
        },
      },
    ];

    const text = `${typeLabel} ${query.id.substring(0, 8)} execution failed`;

    // Send to channel
    if (SLACK_APPROVAL_CHANNEL) {
      await this.sendToChannel(blocks, text);
    }

    // Send DM to requester
    if (query.requesterSlackId) {
      const dmBlocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `❌ Your ${typeLabel} Execution Failed`,
            emoji: true,
          },
        },
        ...blocks.slice(1),
      ];
      await this.sendDM(query.requesterSlackId, dmBlocks, text);
    }
  }

  /**
   * 4) Rejection - Send DM to requester only
   */
  static async notifyRejection(
    query: QueryInfo,
    rejectionReason: string | undefined,
    rejecterName: string
  ): Promise<void> {
    if (!SLACK_ENABLED || !slackClient || !query.requesterSlackId) return;

    const preview = formatQueryPreview(query);

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚫 Your Query Was Rejected',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Request ID:*\n\`${query.id.substring(0, 8)}...\``,
          },
          {
            type: 'mrkdwn',
            text: `*Rejected by:*\n${rejecterName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Database:*\n${query.instanceName} / ${query.databaseName}`,
          },
          {
            type: 'mrkdwn',
            text: `*Type:*\n${query.submissionType}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Query Preview:*\n\`\`\`${preview}\`\`\``,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Rejection Reason:*\n${rejectionReason || 'No reason provided'}`,
        },
      },
    ];

    const text = `Your query ${query.id.substring(0, 8)} was rejected`;
    await this.sendDM(query.requesterSlackId, blocks, text);
  }
}
