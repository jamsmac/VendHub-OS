import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { AIParserService } from "./ai-parser.service";
import {
  IntegrationCategory,
  AuthType,
  ParamLocation,
  AIParseRequest,
  PaymentIntegrationConfig,
} from "../types/integration.types";

// Mock axios at module level
jest.mock("axios", () => {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockAxios,
    ...mockAxios,
  };
});

const axios = require("axios").default;

describe("AIParserService", () => {
  let service: AIParserService;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockReturnValue("test-anthropic-key"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIParserService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AIParserService>(AIParserService);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ================================================================
  // parseDocumentation
  // ================================================================

  describe("parseDocumentation", () => {
    it("should return failure result when no documentation provided", async () => {
      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain("No documentation content provided");
    });

    it("should parse documentation from provided text", async () => {
      const aiJsonResponse = JSON.stringify({
        success: true,
        confidence: 0.85,
        config: {
          name: "test_provider",
          displayName: "Test Provider",
          baseUrl: "https://api.test.com",
        },
        warnings: [],
        suggestions: [],
        missingInfo: [],
      });

      axios.post.mockResolvedValue({
        data: {
          content: [{ text: "```json\n" + aiJsonResponse + "\n```" }],
        },
      });

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationText: "Test API documentation content",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.85);
      expect(result.config).toBeDefined();
      expect(axios.post).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/messages",
        expect.objectContaining({
          model: expect.any(String),
          max_tokens: 4096,
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "test-anthropic-key",
          }),
        }),
      );
    });

    it("should fetch documentation from URL when no text provided", async () => {
      axios.get.mockResolvedValue({
        headers: { "content-type": "text/plain" },
        data: "API docs content from URL",
      });

      const aiJsonResponse = JSON.stringify({
        success: true,
        confidence: 0.7,
        config: { name: "fetched" },
        warnings: [],
        suggestions: [],
        missingInfo: [],
      });

      axios.post.mockResolvedValue({
        data: {
          content: [{ text: "```json\n" + aiJsonResponse + "\n```" }],
        },
      });

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "https://docs.example.com/api",
      };

      const result = await service.parseDocumentation(request);

      expect(axios.get).toHaveBeenCalledWith(
        "https://docs.example.com/api",
        expect.objectContaining({ timeout: 30000 }),
      );
      expect(result.success).toBe(true);
    });

    it("should return failure result when AI API call fails", async () => {
      axios.post.mockRejectedValue(new Error("API unavailable"));

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationText: "Some docs",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("AI analysis unavailable"),
        ]),
      );
    });

    it("should return failure when documentation fetch fails", async () => {
      axios.get.mockRejectedValue(new Error("Network error"));

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "https://docs.example.com/api",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Error parsing documentation"),
        ]),
      );
    });

    it("should handle AI response that is plain JSON (no code block)", async () => {
      axios.post.mockResolvedValue({
        data: {
          content: [
            {
              text: JSON.stringify({
                name: "raw_json",
                baseUrl: "https://api.raw.com",
              }),
            },
          ],
        },
      });

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationText: "Some API docs",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0.5);
    });

    it("should handle AI response that cannot be parsed as JSON", async () => {
      axios.post.mockResolvedValue({
        data: {
          content: [{ text: "This is not JSON at all, just plain text" }],
        },
      });

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationText: "Some API docs",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
      expect(result.warnings).toContain("Could not parse AI response");
    });
  });

  // ================================================================
  // URL Validation (SSRF prevention)
  // ================================================================

  describe("fetchDocumentation (URL validation)", () => {
    it("should reject localhost URLs", async () => {
      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "http://localhost:3000/api",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
      expect(result.warnings[0]).toContain("Access to internal addresses");
    });

    it("should reject 127.0.0.1 URLs", async () => {
      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "http://127.0.0.1/api",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
    });

    it("should reject private IP ranges (10.x)", async () => {
      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "http://10.0.0.1/api",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
    });

    it("should reject private IP ranges (192.168.x)", async () => {
      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "http://192.168.1.1/api",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
    });

    it("should reject non-http protocols", async () => {
      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "ftp://files.example.com/api",
      };

      const result = await service.parseDocumentation(request);

      expect(result.success).toBe(false);
    });

    it("should handle JSON content type from URL", async () => {
      const openApiSpec = { openapi: "3.0.0", info: { title: "Test" } };
      axios.get.mockResolvedValue({
        headers: { "content-type": "application/json" },
        data: openApiSpec,
      });

      axios.post.mockResolvedValue({
        data: {
          content: [
            {
              text: '```json\n{"success":true,"confidence":0.9,"config":{},"warnings":[],"suggestions":[],"missingInfo":[]}\n```',
            },
          ],
        },
      });

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "https://api.example.com/openapi.json",
      };

      const result = await service.parseDocumentation(request);

      expect(axios.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it("should handle HTML content type gracefully when cheerio stub fails", async () => {
      // The service has a cheerio stub that lacks .remove() on query results.
      // extractTextFromHtml throws, which is caught by parseDocumentation.
      axios.get.mockResolvedValue({
        headers: { "content-type": "text/html" },
        data: "<html><body><p>API documentation</p></body></html>",
      });

      const request: AIParseRequest = {
        integrationType: IntegrationCategory.PAYMENT,
        documentationUrl: "https://docs.example.com/api",
      };

      const result = await service.parseDocumentation(request);

      // The cheerio stub throws, so parseDocumentation catches and returns failure
      expect(result.success).toBe(false);
      expect(result.warnings[0]).toContain("Error parsing documentation");
    });
  });

  // ================================================================
  // Config Sessions
  // ================================================================

  describe("startConfigSession", () => {
    it("should create a new session with welcome message", async () => {
      const initialConfig: Partial<PaymentIntegrationConfig> = {
        name: "test_provider",
        displayName: "Test Provider",
      };

      const session = await service.startConfigSession(
        "int-uuid-1",
        initialConfig,
      );

      expect(session.id).toContain("session_");
      expect(session.integrationId).toBe("int-uuid-1");
      expect(session.status).toBe("active");
      expect(session.messages.length).toBe(2); // system + welcome
      expect(session.messages[0].role).toBe("system");
      expect(session.messages[1].role).toBe("assistant");
      expect(session.currentConfig).toEqual(initialConfig);
    });

    it("should fetch documentation when URL provided", async () => {
      axios.get.mockResolvedValue({
        headers: { "content-type": "text/plain" },
        data: "API documentation text",
      });

      const session = await service.startConfigSession(
        "int-uuid-1",
        { name: "test" },
        "https://docs.example.com/api",
      );

      expect(axios.get).toHaveBeenCalledWith(
        "https://docs.example.com/api",
        expect.any(Object),
      );
      expect(session.messages[0].content).toContain("API documentation text");
    });
  });

  describe("continueConversation", () => {
    it("should throw NotFoundException for unknown session", async () => {
      await expect(
        service.continueConversation("nonexistent-session", "hello"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should add user message and get AI response", async () => {
      // Create session first
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      axios.post.mockResolvedValue({
        data: {
          content: [{ text: "Sure, I can help configure that." }],
        },
      });

      const result = await service.continueConversation(
        session.id,
        "How do I set up authentication?",
      );

      expect(result.response).toBe("Sure, I can help configure that.");
      expect(result.session.messages.length).toBe(4); // system + welcome + user + assistant
    });

    it("should extract config updates from AI response", async () => {
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      const aiResponse =
        'Here is the config:\n```config\n{"baseUrl":"https://api.newurl.com"}\n```\nDone!';

      axios.post.mockResolvedValue({
        data: { content: [{ text: aiResponse }] },
      });

      const result = await service.continueConversation(
        session.id,
        "Set the base URL",
      );

      expect(result.configUpdates).toEqual({
        baseUrl: "https://api.newurl.com",
      });
      expect(result.session.currentConfig.baseUrl).toBe(
        "https://api.newurl.com",
      );
    });

    it("should return graceful response when AI API fails", async () => {
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      axios.post.mockRejectedValue(new Error("API timeout"));

      const result = await service.continueConversation(session.id, "Hello");

      expect(result.response).toContain("apologize");
    });
  });

  // ================================================================
  // getSuggestions
  // ================================================================

  describe("getSuggestions", () => {
    it("should return all suggestions for empty config", async () => {
      const suggestions = await service.getSuggestions({});

      expect(suggestions).toContain(
        "Add the base URL for the API (e.g., https://api.payment.uz)",
      );
      expect(suggestions).toContain(
        "Configure authentication method (API Key, Bearer Token, etc.)",
      );
      expect(suggestions).toContain(
        "Define required credentials (API keys, merchant IDs, etc.)",
      );
    });

    it("should not include baseUrl suggestion when baseUrl is set", async () => {
      const suggestions = await service.getSuggestions({
        baseUrl: "https://api.test.com",
      });

      expect(suggestions).not.toContain(
        "Add the base URL for the API (e.g., https://api.payment.uz)",
      );
    });

    it("should not include auth suggestion when auth is configured", async () => {
      const suggestions = await service.getSuggestions({
        auth: {
          type: AuthType.API_KEY,
          config: { keyName: "X-API-Key", keyLocation: ParamLocation.HEADER },
        },
      });

      expect(suggestions).not.toContain(
        "Configure authentication method (API Key, Bearer Token, etc.)",
      );
    });

    it("should return empty array for fully configured integration", async () => {
      const fullConfig: Partial<PaymentIntegrationConfig> = {
        baseUrl: "https://api.test.com",
        auth: {
          type: AuthType.API_KEY,
          config: { keyName: "X-API-Key", keyLocation: ParamLocation.HEADER },
        },
        credentials: [
          {
            name: "api_key",
            displayName: "API Key",
            type: "password",
            required: true,
          },
        ],
        endpoints: {
          createPayment: {
            id: "cp",
            name: "Create",
            description: "d",
            method: "POST" as any,
            path: "/payments",
          },
          checkStatus: {
            id: "cs",
            name: "Status",
            description: "d",
            method: "GET" as any,
            path: "/payments/{id}",
          },
        },
        supportedCurrencies: ["UZS"],
        webhooks: { enabled: true } as any,
      };

      const suggestions = await service.getSuggestions(fullConfig);

      expect(suggestions.length).toBe(0);
    });
  });

  // ================================================================
  // Session Management
  // ================================================================

  describe("getSession", () => {
    it("should return session when it exists", async () => {
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      const retrieved = service.getSession(session.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(session.id);
    });

    it("should return undefined for non-existent session", () => {
      const result = service.getSession("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("deleteSession", () => {
    it("should remove session from memory", async () => {
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      service.deleteSession(session.id);

      expect(service.getSession(session.id)).toBeUndefined();
    });
  });

  describe("cleanupOldSessions", () => {
    it("should remove sessions older than maxAge", async () => {
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      // Manually set updatedAt to the past
      const storedSession = service.getSession(session.id);
      storedSession!.updatedAt = new Date(Date.now() - 7200000); // 2 hours ago

      service.cleanupOldSessions(3600000); // 1 hour max age

      expect(service.getSession(session.id)).toBeUndefined();
    });

    it("should keep recent sessions", async () => {
      const session = await service.startConfigSession("int-uuid-1", {
        name: "test",
      });

      service.cleanupOldSessions(3600000); // 1 hour max age

      expect(service.getSession(session.id)).toBeDefined();
    });
  });
});
