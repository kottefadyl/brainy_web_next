// T52: collaborators (personal link, acceptance, list, end of collaboration).
import { request } from "./api";

export type Collaborator = { userId: string; name: string; email: string; since: string; hasPhoto: boolean };
export type CollaborationInvitePreview = { inviterName: string; isSelf: boolean; alreadyCollaborator: boolean };

/** Kept while a person without a session signs in or creates an account, then reopened. */
export const PENDING_INVITE_KEY = "brainy.pendingInvite";

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite/${encodeURIComponent(token)}`;
}

export const collaboratorsApi = {
  async inviteToken() { return (await request<{ collaborationInviteToken: string }>("query{collaborationInviteToken}")).collaborationInviteToken; },
  async regenerate() { return (await request<{ regenerateCollaborationInvite: string }>("mutation{regenerateCollaborationInvite}")).regenerateCollaborationInvite; },
  async preview(token: string) { return (await request<{ collaborationInvite: CollaborationInvitePreview }>("query($token:String!){collaborationInvite(token:$token){inviterName isSelf alreadyCollaborator}}", { token })).collaborationInvite; },
  async accept(token: string) { return (await request<{ acceptCollaboration: Collaborator }>("mutation($token:String!){acceptCollaboration(token:$token){userId name email since hasPhoto}}", { token })).acceptCollaboration; },
  async list() { return (await request<{ collaborators: Collaborator[] }>("query{collaborators{userId name email since hasPhoto}}")).collaborators; },
  async photo(userId: string) { return (await request<{ collaboratorPhoto: string | null }>("query($userId:String!){collaboratorPhoto(userId:$userId)}", { userId })).collaboratorPhoto; },
  async end(userId: string) { return (await request<{ endCollaboration: boolean }>("mutation($userId:String!){endCollaboration(userId:$userId)}", { userId })).endCollaboration; },
};
