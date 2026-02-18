/**
 * Manual mock for @aws-sdk/s3-request-presigner
 */
export const getSignedUrl = jest
  .fn()
  .mockResolvedValue("https://mock-presigned-url.s3.amazonaws.com/test");
