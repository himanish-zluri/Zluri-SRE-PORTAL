// Mock the @slack/web-api module before importing SlackService
const mockPostMessage = jest.fn();
jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({
    chat: {
      postMessage: mockPostMessage,
    },
  })),
}));

// Set environment variables before importing
const originalEnv = process.env;

describe('SlackService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('when Slack is disabled', () => {
    beforeEach(() => {
      process.env.SLACK_ENABLED = 'false';
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
    });

    it('isEnabled should return false', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      expect(SlackService.isEnabled()).toBe(false);
    });

    it('notifyNewSubmission should not send message', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyNewSubmission({
        id: 'query-123',
        requesterName: 'Test User',
        requesterEmail: 'test@example.com',
        databaseName: 'test_db',
        instanceName: 'prod-pg',
        podId: 'pod-a',
        submissionType: 'QUERY',
        queryText: 'SELECT * FROM users',
      });

      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });

  describe('when Slack is enabled', () => {
    beforeEach(() => {
      process.env.SLACK_ENABLED = 'true';
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
    });

    it('isEnabled should return true', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      expect(SlackService.isEnabled()).toBe(true);
    });

    it('notifyNewSubmission should send message for QUERY', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyNewSubmission({
        id: 'query-12345678-abcd',
        requesterName: 'Test User',
        requesterEmail: 'test@example.com',
        databaseName: 'test_db',
        instanceName: 'prod-pg',
        podId: 'pod-a',
        submissionType: 'QUERY',
        queryText: 'SELECT * FROM users',
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C12345',
          text: expect.stringContaining('New QUERY submission'),
        })
      );
    });

    it('notifyNewSubmission should send message for SCRIPT', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyNewSubmission({
        id: 'query-12345678-abcd',
        requesterName: 'Test User',
        requesterEmail: 'test@example.com',
        databaseName: 'test_db',
        instanceName: 'prod-pg',
        podId: 'pod-a',
        submissionType: 'SCRIPT',
        scriptContent: 'console.log("hello");',
      });

      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'C12345',
          text: expect.stringContaining('New SCRIPT submission'),
        })
      );
    });

    it('notifyExecutionSuccess should send to channel and DM', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requesterSlackId: 'U12345',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
          queryText: 'SELECT * FROM users',
        },
        { rows: [{ id: 1 }], rowCount: 1 },
        'Admin User'
      );

      // Should send to channel and DM
      expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });

    it('notifyExecutionSuccess should only send to channel if no slack ID', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'SCRIPT',
        },
        { output: 'Script completed' },
        'Admin User'
      );

      // Should only send to channel
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
    });

    it('notifyExecutionFailure should send to channel and DM', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionFailure(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requesterSlackId: 'U12345',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        'Connection timeout',
        'Admin User'
      );

      expect(mockPostMessage).toHaveBeenCalledTimes(2);
    });

    it('notifyRejection should send DM only', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyRejection(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requesterSlackId: 'U12345',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
          queryText: 'DROP TABLE users',
        },
        'Dangerous operation',
        'Admin User'
      );

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'U12345', // DM to user
        })
      );
    });

    it('notifyRejection should not send if no slack ID', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyRejection(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        'Dangerous operation',
        'Admin User'
      );

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('should handle Slack API errors gracefully', async () => {
      mockPostMessage.mockRejectedValue(new Error('Slack API error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { SlackService } = await import('../../../src/services/slack.service');
      
      // Should not throw
      await expect(SlackService.notifyNewSubmission({
        id: 'query-12345678-abcd',
        requesterName: 'Test User',
        requesterEmail: 'test@example.com',
        databaseName: 'test_db',
        instanceName: 'prod-pg',
        podId: 'pod-a',
        submissionType: 'QUERY',
      })).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('sendDM should not send if no slack user ID', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.sendDM('', [], 'test');

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('sendDM should handle API error gracefully', async () => {
      mockPostMessage.mockRejectedValue(new Error('DM API error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await expect(SlackService.sendDM('U12345', [], 'test')).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to send Slack DM:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('result formatting', () => {
    beforeEach(() => {
      process.env.SLACK_ENABLED = 'true';
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
    });

    it('should format array results', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        { rows: [{ id: 1 }, { id: 2 }, { id: 3 }], rowCount: 3 },
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should format error results', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        { error: 'Something went wrong' },
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should format primitive results', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        'Simple string result' as any,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle null result', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        null as any,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle success object result', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        { rows: [], rowCount: 0 },
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle output result', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'SCRIPT',
        },
        { output: 'Script output here' },
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle direct array result (not wrapped in rows)', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'SCRIPT',
        },
        [{ id: 1 }, { id: 2 }] as any,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle success: true only object', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'SCRIPT',
        },
        { success: true } as any,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle number result', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        42 as any,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle boolean result', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        true as any,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle object with circular reference gracefully', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      // Create an object that will fail JSON.stringify
      const circularObj: any = { data: 'test' };
      circularObj.self = circularObj;
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        circularObj,
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should truncate very long text', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      const longText = 'x'.repeat(1000);
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        { output: longText },
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });

    it('should handle empty string text in truncate', async () => {
      mockPostMessage.mockResolvedValue({ ok: true });
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
          queryText: '',
        },
        { output: '' },
        'Admin'
      );

      expect(mockPostMessage).toHaveBeenCalled();
    });
  });

  describe('DM error handling', () => {
    beforeEach(() => {
      process.env.SLACK_ENABLED = 'true';
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
    });

    it('should handle DM API error gracefully', async () => {
      mockPostMessage
        .mockResolvedValueOnce({ ok: true }) // channel message succeeds
        .mockRejectedValueOnce(new Error('DM failed')); // DM fails
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await expect(SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requesterSlackId: 'U12345',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        { rows: [] },
        'Admin'
      )).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('when no approval channel configured', () => {
    beforeEach(() => {
      process.env.SLACK_ENABLED = 'true';
      process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
      process.env.SLACK_APPROVAL_CHANNEL = '';
    });

    it('isEnabled should return false', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      expect(SlackService.isEnabled()).toBe(false);
    });
  });

  describe('when no bot token configured', () => {
    beforeEach(() => {
      process.env.SLACK_ENABLED = 'true';
      process.env.SLACK_BOT_TOKEN = '';
      process.env.SLACK_APPROVAL_CHANNEL = 'C12345';
    });

    it('notifyExecutionSuccess should not send when no client', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionSuccess(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        { rows: [] },
        'Admin'
      );

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('notifyExecutionFailure should not send when no client', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyExecutionFailure(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        'Error message',
        'Admin'
      );

      expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('notifyRejection should not send when no client', async () => {
      const { SlackService } = await import('../../../src/services/slack.service');
      
      await SlackService.notifyRejection(
        {
          id: 'query-12345678-abcd',
          requesterName: 'Test User',
          requesterEmail: 'test@example.com',
          requesterSlackId: 'U12345',
          databaseName: 'test_db',
          instanceName: 'prod-pg',
          podId: 'pod-a',
          submissionType: 'QUERY',
        },
        'Reason',
        'Admin'
      );

      expect(mockPostMessage).not.toHaveBeenCalled();
    });
  });
});
