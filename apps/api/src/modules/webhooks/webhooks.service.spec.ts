import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService, WebhookEvent } from './webhooks.service';
import * as crypto from 'crypto';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock setTimeout to execute immediately
jest.useFakeTimers();

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    mockFetch.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhooksService],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==========================================================================
  // SEND
  // ==========================================================================

  describe('send', () => {
    it('should send webhooks to all active endpoints that match the event', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const webhooks = [
        {
          url: 'https://hook1.example.com',
          events: [WebhookEvent.SALE_COMPLETED, WebhookEvent.TASK_CREATED],
          secret: 'secret1',
          isActive: true,
        },
        {
          url: 'https://hook2.example.com',
          events: [WebhookEvent.SALE_COMPLETED],
          secret: 'secret2',
          isActive: true,
        },
      ];

      await service.send(
        'org-1',
        WebhookEvent.SALE_COMPLETED,
        { amount: 50000 },
        webhooks,
      );

      // Allow async operations to complete
      await new Promise(process.nextTick);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should skip inactive webhooks', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const webhooks = [
        {
          url: 'https://hook1.example.com',
          events: [WebhookEvent.TASK_CREATED],
          secret: 'secret1',
          isActive: false,
        },
        {
          url: 'https://hook2.example.com',
          events: [WebhookEvent.TASK_CREATED],
          secret: 'secret2',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.TASK_CREATED, {}, webhooks);

      await new Promise(process.nextTick);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hook2.example.com',
        expect.any(Object),
      );
    });

    it('should skip webhooks that do not subscribe to the event', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const webhooks = [
        {
          url: 'https://hook1.example.com',
          events: [WebhookEvent.MACHINE_STATUS_CHANGED],
          secret: 'secret1',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.SALE_COMPLETED, {}, webhooks);

      await new Promise(process.nextTick);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should do nothing when webhooks array is empty', async () => {
      await service.send('org-1', WebhookEvent.TASK_COMPLETED, {}, []);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should send correct headers including signature and event', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const webhooks = [
        {
          url: 'https://hook.example.com',
          events: [WebhookEvent.PAYMENT_RECEIVED],
          secret: 'test-secret',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.PAYMENT_RECEIVED, { amount: 100 }, webhooks);

      await new Promise(process.nextTick);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://hook.example.com',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': WebhookEvent.PAYMENT_RECEIVED,
            'X-Webhook-Signature': expect.any(String),
          }),
        }),
      );
    });

    it('should include event, payload and timestamp in request body', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const payload = { machineId: 'm-1', status: 'offline' };
      const webhooks = [
        {
          url: 'https://hook.example.com',
          events: [WebhookEvent.MACHINE_STATUS_CHANGED],
          secret: 'secret',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.MACHINE_STATUS_CHANGED, payload, webhooks);

      await new Promise(process.nextTick);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.event).toBe(WebhookEvent.MACHINE_STATUS_CHANGED);
      expect(callBody.payload).toEqual(payload);
      expect(callBody.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // RETRY LOGIC
  // ==========================================================================

  describe('retry logic', () => {
    it('should retry on non-OK response', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const webhooks = [
        {
          url: 'https://hook.example.com',
          events: [WebhookEvent.INVENTORY_LOW],
          secret: 'secret',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.INVENTORY_LOW, {}, webhooks);

      await new Promise(process.nextTick);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Run first retry timer (1000ms)
      jest.advanceTimersByTime(1000);
      await new Promise(process.nextTick);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on network error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const webhooks = [
        {
          url: 'https://hook.example.com',
          events: [WebhookEvent.TASK_COMPLETED],
          secret: 'secret',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.TASK_COMPLETED, {}, webhooks);

      await new Promise(process.nextTick);

      // Run first retry timer (1000ms)
      jest.advanceTimersByTime(1000);
      await new Promise(process.nextTick);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after MAX_RETRIES', async () => {
      mockFetch.mockRejectedValue(new Error('Always fails'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const webhooks = [
        {
          url: 'https://hook.example.com',
          events: [WebhookEvent.SALE_COMPLETED],
          secret: 'secret',
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.SALE_COMPLETED, {}, webhooks);

      await new Promise(process.nextTick);

      // First retry (1000ms)
      jest.advanceTimersByTime(1000);
      await new Promise(process.nextTick);

      // Second retry (5000ms)
      jest.advanceTimersByTime(5000);
      await new Promise(process.nextTick);

      // Third retry (30000ms)
      jest.advanceTimersByTime(30000);
      await new Promise(process.nextTick);

      // Should not retry beyond MAX_RETRIES (3)
      expect(mockFetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // VERIFY SIGNATURE
  // ==========================================================================

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: 'value' });
      const secret = 'my-secret-key';

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const result = service.verifySignature(payload, expectedSignature, secret);

      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'my-secret';
      const wrongSignature = crypto
        .createHmac('sha256', 'wrong-secret')
        .update(payload)
        .digest('hex');

      const result = service.verifySignature(payload, wrongSignature, secret);

      expect(result).toBe(false);
    });

    it('should produce consistent signatures for same input', () => {
      const payload = '{"test":"data"}';
      const secret = 'consistent-secret';

      const sig1 = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const sig2 = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      expect(service.verifySignature(payload, sig1, secret)).toBe(true);
      expect(service.verifySignature(payload, sig2, secret)).toBe(true);
    });

    it('should fail when payload is tampered', () => {
      const originalPayload = JSON.stringify({ amount: 50000 });
      const secret = 'key';

      const signature = crypto
        .createHmac('sha256', secret)
        .update(originalPayload)
        .digest('hex');

      const tamperedPayload = JSON.stringify({ amount: 500000 });

      const result = service.verifySignature(tamperedPayload, signature, secret);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // WEBHOOK EVENT ENUM
  // ==========================================================================

  describe('WebhookEvent enum', () => {
    it('should have all expected event types', () => {
      expect(WebhookEvent.MACHINE_STATUS_CHANGED).toBe('machine.status.changed');
      expect(WebhookEvent.INVENTORY_LOW).toBe('inventory.low');
      expect(WebhookEvent.TASK_CREATED).toBe('task.created');
      expect(WebhookEvent.TASK_COMPLETED).toBe('task.completed');
      expect(WebhookEvent.SALE_COMPLETED).toBe('sale.completed');
      expect(WebhookEvent.PAYMENT_RECEIVED).toBe('payment.received');
    });
  });

  // ==========================================================================
  // SIGNATURE GENERATION
  // ==========================================================================

  describe('signature generation in send', () => {
    it('should generate HMAC-SHA256 signature for webhook body', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const secret = 'webhook-secret-key';
      const webhooks = [
        {
          url: 'https://hook.example.com',
          events: [WebhookEvent.SALE_COMPLETED],
          secret,
          isActive: true,
        },
      ];

      await service.send('org-1', WebhookEvent.SALE_COMPLETED, { id: 'sale-1' }, webhooks);
      await new Promise(process.nextTick);

      const callArgs = mockFetch.mock.calls[0];
      const sentBody = callArgs[1].body;
      const sentSignature = callArgs[1].headers['X-Webhook-Signature'];

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(sentBody)
        .digest('hex');

      expect(sentSignature).toBe(expectedSignature);
    });
  });
});
