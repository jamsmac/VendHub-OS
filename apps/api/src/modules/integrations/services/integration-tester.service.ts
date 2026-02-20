import { Injectable, Logger } from '@nestjs/common';
import { Integration } from '../entities/integration.entity';
import { PaymentExecutorService, CreatePaymentRequest } from './payment-executor.service';
import { IntegrationService } from './integration.service';
import {
  IntegrationTestCase,
  TestResult,
  TestAssertion,
  IntegrationStatus,
  HttpMethod,
} from '../types/integration.types';

export interface TestSuiteResult {
  integrationId: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: TestResult[];
  summary: string;
}

@Injectable()
export class IntegrationTesterService {
  private readonly logger = new Logger(IntegrationTesterService.name);

  constructor(
    private paymentExecutor: PaymentExecutorService,
    private integrationService: IntegrationService,
  ) {}

  // ============================================
  // Test Execution
  // ============================================

  /**
   * Run full test suite for an integration
   */
  async runTestSuite(integration: Integration): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    // Get test cases
    const testCases = this.generateTestCases(integration);

    for (const testCase of testCases) {
      const result = await this.runTestCase(integration, testCase);
      results.push(result);
    }

    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;

    // Update integration status based on results
    const newStatus = passedTests === testCases.length
      ? IntegrationStatus.TESTING
      : IntegrationStatus.ERROR;

    await this.integrationService.update(
      integration.id,
      integration.organizationId,
      {
        status: newStatus,
        lastTestedAt: new Date(),
        lastError: failedTests > 0
          ? `${failedTests} tests failed`
          : undefined,
      },
      'system',
    );

    return {
      integrationId: integration.id,
      passed: failedTests === 0,
      totalTests: testCases.length,
      passedTests,
      failedTests,
      duration: Date.now() - startTime,
      results,
      summary: this.generateSummary(results),
    };
  }

  /**
   * Run a single test case
   */
  async runTestCase(integration: Integration, testCase: IntegrationTestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      let response: any;

      // Execute based on endpoint type
      switch (testCase.endpoint) {
        case 'createPayment':
          response = await this.paymentExecutor.createPayment(
            integration,
            testCase.requestData as CreatePaymentRequest,
          );
          break;

        case 'checkStatus':
          response = await this.paymentExecutor.checkPaymentStatus(
            integration,
            testCase.requestData.paymentId,
          );
          break;

        case 'cancelPayment':
          response = await this.paymentExecutor.cancelPayment(
            integration,
            testCase.requestData.paymentId,
          );
          break;

        default:
          throw new Error(`Unknown endpoint: ${testCase.endpoint}`);
      }

      // Run assertions
      const assertionResults = testCase.assertions.map(assertion => ({
        assertion,
        passed: this.checkAssertion(assertion, response),
        actual: this.getValueByPath(response, assertion.path),
      }));

      const passed = assertionResults.every(r => r.passed);

      return {
        testId: testCase.id,
        passed,
        duration: Date.now() - startTime,
        request: {
          url: testCase.endpoint,
          method: testCase.method,
          headers: {},
          body: testCase.requestData,
        },
        response: {
          status: 200,
          headers: {},
          body: response,
        },
        assertions: assertionResults,
      };
    } catch (error: any) {
      return {
        testId: testCase.id,
        passed: false,
        duration: Date.now() - startTime,
        request: {
          url: testCase.endpoint,
          method: testCase.method,
          headers: {},
          body: testCase.requestData,
        },
        response: {
          status: error.response?.status || 500,
          headers: {},
          body: error.response?.data || { error: error.message },
        },
        assertions: testCase.assertions.map(a => ({
          assertion: a,
          passed: false,
          actual: null,
        })),
        error: error.message,
      };
    }
  }

  /**
   * Quick connectivity test
   */
  async testConnectivity(integration: Integration): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    const startTime = Date.now();

    try {
      // Try a minimal request
      const testPayment: CreatePaymentRequest = {
        amount: 1000,
        currency: 'UZS',
        orderId: `test_${Date.now()}`,
        description: 'Connectivity test',
      };

      await this.paymentExecutor.createPayment(integration, testPayment);

      return {
        success: true,
        message: 'Connection successful',
        latency: Date.now() - startTime,
      };
    } catch (error: any) {
      // Check if it's an auth error (which means connectivity works)
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          success: true,
          message: 'Connection successful (authentication required)',
          latency: Date.now() - startTime,
        };
      }

      return {
        success: false,
        message: error.message || 'Connection failed',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate credentials
   */
  async validateCredentials(integration: Integration): Promise<{
    valid: boolean;
    message: string;
    missingCredentials?: string[];
  }> {
    const config = integration.config;
    const credentials = integration.sandboxMode
      ? integration.sandboxCredentials
      : integration.credentials;

    const missingCredentials: string[] = [];

    // Check required credentials
    for (const cred of config.credentials || []) {
      if (cred.required && !credentials?.[cred.name]) {
        missingCredentials.push(cred.displayName || cred.name);
      }
    }

    if (missingCredentials.length > 0) {
      return {
        valid: false,
        message: 'Missing required credentials',
        missingCredentials,
      };
    }

    // Try actual authentication
    try {
      const testPayment: CreatePaymentRequest = {
        amount: 100,
        currency: 'UZS',
        orderId: `auth_test_${Date.now()}`,
      };

      await this.paymentExecutor.createPayment(integration, testPayment);

      return {
        valid: true,
        message: 'Credentials validated successfully',
      };
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        return {
          valid: false,
          message: 'Invalid credentials',
        };
      }

      // Other errors might not be auth related
      return {
        valid: true,
        message: 'Credentials appear valid (non-auth error occurred)',
      };
    }
  }

  // ============================================
  // Test Case Generation
  // ============================================

  private generateTestCases(integration: Integration): IntegrationTestCase[] {
    const testCases: IntegrationTestCase[] = [];
    const config = integration.config;

    // Test 1: Create Payment
    if (config.endpoints.createPayment) {
      testCases.push({
        id: 'test_create_payment',
        name: 'Create Payment',
        description: 'Test payment creation endpoint',
        endpoint: 'createPayment',
        method: config.endpoints.createPayment.method,
        requestData: {
          amount: 10000,
          currency: 'UZS',
          orderId: `test_${Date.now()}`,
          description: 'Test payment',
        },
        expectedStatus: 200,
        assertions: [
          {
            type: 'exists',
            path: 'paymentId',
            expected: true,
            message: 'Payment ID should be returned',
          },
          {
            type: 'type',
            path: 'status',
            expected: 'string',
            message: 'Status should be a string',
          },
        ],
      });
    }

    // Test 2: Check Status
    if (config.endpoints.checkStatus) {
      testCases.push({
        id: 'test_check_status',
        name: 'Check Payment Status',
        description: 'Test payment status check endpoint',
        endpoint: 'checkStatus',
        method: config.endpoints.checkStatus.method,
        requestData: {
          paymentId: 'test_payment_id', // Will be replaced with actual ID
        },
        expectedStatus: 200,
        assertions: [
          {
            type: 'exists',
            path: 'status',
            expected: true,
            message: 'Status should be returned',
          },
        ],
      });
    }

    // Test 3: Amount validation
    testCases.push({
      id: 'test_min_amount',
      name: 'Minimum Amount Validation',
      description: 'Test minimum payment amount',
      endpoint: 'createPayment',
      method: HttpMethod.POST,
      requestData: {
        amount: config.minAmount || 100,
        currency: 'UZS',
        orderId: `test_min_${Date.now()}`,
      },
      expectedStatus: 200,
      assertions: [
        {
          type: 'exists',
          path: 'paymentId',
          expected: true,
          message: 'Minimum amount should be accepted',
        },
      ],
    });

    // Test 4: Invalid amount (below minimum)
    if (config.minAmount) {
      testCases.push({
        id: 'test_below_min_amount',
        name: 'Below Minimum Amount',
        description: 'Test rejection of amount below minimum',
        endpoint: 'createPayment',
        method: HttpMethod.POST,
        requestData: {
          amount: config.minAmount - 1,
          currency: 'UZS',
          orderId: `test_invalid_${Date.now()}`,
        },
        expectedStatus: 400,
        assertions: [
          {
            type: 'exists',
            path: 'error',
            expected: true,
            message: 'Error should be returned for invalid amount',
          },
        ],
      });
    }

    return testCases;
  }

  // ============================================
  // Assertion Checking
  // ============================================

  private checkAssertion(assertion: TestAssertion, response: any): boolean {
    const actual = this.getValueByPath(response, assertion.path);

    switch (assertion.type) {
      case 'equals':
        return actual === assertion.expected;

      case 'contains':
        if (typeof actual === 'string') {
          return actual.includes(assertion.expected);
        }
        if (Array.isArray(actual)) {
          return actual.includes(assertion.expected);
        }
        return false;

      case 'exists':
        return assertion.expected ? actual !== undefined && actual !== null : actual === undefined || actual === null;

      case 'type':
        return typeof actual === assertion.expected;

      case 'regex':
        return new RegExp(assertion.expected).test(String(actual));

      default:
        return false;
    }
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  // ============================================
  // Reporting
  // ============================================

  private generateSummary(results: TestResult[]): string {
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);

    let summary = `Test Results: ${passed.length}/${results.length} passed\n\n`;

    if (passed.length > 0) {
      summary += '✅ Passed:\n';
      for (const result of passed) {
        summary += `  - ${result.testId}\n`;
      }
    }

    if (failed.length > 0) {
      summary += '\n❌ Failed:\n';
      for (const result of failed) {
        summary += `  - ${result.testId}`;
        if (result.error) {
          summary += `: ${result.error}`;
        }
        summary += '\n';

        // Show failed assertions
        const failedAssertions = result.assertions.filter(a => !a.passed);
        for (const a of failedAssertions) {
          summary += `    └─ ${a.assertion.message} (expected: ${a.assertion.expected}, got: ${a.actual})\n`;
        }
      }
    }

    return summary;
  }
}
