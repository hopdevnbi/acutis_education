export interface AuthenticatedUser {
  readonly userId: string;
  readonly sessionId: string;
}

export interface RequestWithAuthenticatedUser {
  authenticatedUser?: AuthenticatedUser;
}
