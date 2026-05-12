export type SignedReceiptMetadata = {
  signatureVersion: string;
  signatureAlgorithm: "ed25519";
  signedAt: string;
  keyId: string;
  publicKeyFingerprint: string;
  canonicalReceiptHash: string;
  signature: string;
};

export type SigningKeyMetadata = {
  keyId: string;
  algorithm: "ed25519";
  publicKeyFingerprint: string;
  createdAt: string;
  publicKeyPath?: string;
  privateKeyPath?: string;
};

export type SignedReceiptVerificationResult = {
  valid: boolean;
  receiptPath: string;
  keyId?: string;
  algorithm?: string;
  signaturePresent: boolean;
  publicKeyFound: boolean;
  canonicalReceiptHashMatches: boolean;
  signatureValid: boolean;
  issues: string[];
};
