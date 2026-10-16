import { PresenceService } from './presence.service';

describe('PresenceService', () => {
  let presence: PresenceService;

  beforeEach(() => {
    presence = new PresenceService();
  });

  it('reports online only for the first socket and offline only for the last', () => {
    expect(presence.connect('u1')).toBe(true); // first tab: came online
    expect(presence.connect('u1')).toBe(false); // second tab: already online

    expect(presence.disconnect('u1')).toBe(false); // one tab still open
    expect(presence.disconnect('u1')).toBe(true); // last tab closed: went offline
  });

  it('filters a list of users down to the online ones', () => {
    presence.connect('u1');
    presence.connect('u3');
    expect(presence.filterOnline(['u1', 'u2', 'u3'])).toEqual(['u1', 'u3']);
  });
});
