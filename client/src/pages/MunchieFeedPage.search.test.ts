import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(import.meta.dirname, 'MunchieFeedPage.tsx'), 'utf8');

describe('Munchie Feed user search', () => {
  it('opens the search field from a header icon and debounces name or handle search', () => {
    expect(source).toContain("const [searchOpen, setSearchOpen] = useState(false)");
    expect(source).toContain("aria-label={searchOpen ? 'Close people search' : 'Open people search'}");
    expect(source).toContain('{searchOpen && <div className="relative mt-3">');
    expect(source).toContain('Search name or @username');
    expect(source).toContain('window.setTimeout(() => setSearchTerm');
    expect(source).toContain('useUserSearch(searchTerm, canSearch)');
  });

  it('opens profiles and reuses the shared follow control', () => {
    expect(source).toContain("navigate(user.is_self ? '/profile' : `/profile/${user.id}`)");
    expect(source).toContain('<FollowButton userId={user.id} initialFollowing={user.is_following} />');
    expect(source).toContain('My profile');
  });

  it('starts with food filters collapsed and keeps them next to user search', () => {
    expect(source).toContain("const [showFilters, setShowFilters] = useState(false)");
    expect(source).toContain('aria-label="Show filters"');
    expect(source).toContain('{!searchActive && <AnimatePresence');
    expect(source).toContain('{showFilters && (');
  });
});
