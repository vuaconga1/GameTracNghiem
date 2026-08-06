export type PlayerKind = 'guest' | 'authenticated';

export type PlayerDescriptor = {
  kind: PlayerKind;
};

export const GUEST_PLAYER: PlayerDescriptor = { kind: 'guest' };
export const AUTHENTICATED_PLAYER: PlayerDescriptor = { kind: 'authenticated' };

export function isGuestPlayer(player: PlayerDescriptor): boolean {
  return player.kind === 'guest';
}
