/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookmarkTabs from '../BookmarkTabs';
import { renderWithIntl } from '../../../__tests__/test-utils';

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
});

const bookmarks: Array<{
  id: string;
  title: string;
  titleAr: string | null;
  titleEn: string | null;
  url: string;
  topic: string;
  priority: 'high' | 'medium' | 'low';
  contentType: string;
  content: string;
  createdAt: string;
}> = [
  { id: '1', title: 'First Bookmark', titleAr: null, titleEn: 'First Bookmark', url: 'https://a.com', topic: 'tech', priority: 'high', contentType: 'article', content: '', createdAt: '' },
  { id: '2', title: 'Second Bookmark', titleAr: null, titleEn: 'Second Bookmark', url: 'https://b.com', topic: 'design', priority: 'medium', contentType: 'video', content: '', createdAt: '' },
  { id: '3', title: 'A Very Long Bookmark Title That Should Be Truncated Someday', titleAr: null, titleEn: 'A Very Long Bookmark Title That Should Be Truncated Someday', url: 'https://c.com', topic: 'science', priority: 'low', contentType: 'article', content: '', createdAt: '' },
];

describe('BookmarkTabs', () => {
  it('renders nothing when no open bookmarks', () => {
    const { container } = renderWithIntl(
      <BookmarkTabs openBookmarks={[]} activeBookmarkId={null} onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders tabs for open bookmarks', () => {
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    expect(screen.getByText('First Bookmark')).toBeDefined();
    expect(screen.getByText('Second Bookmark')).toBeDefined();
  });

  it('truncates long titles beyond 32 chars', () => {
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const longTab = screen.getAllByRole('tab')[2];
    expect(longTab.textContent).toContain('A Very Long Bookmark Title');
    expect(longTab.textContent!.length).toBeLessThan(bookmarks[2].title.length);
  });

  it('calls onTabSelect when tab is clicked', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    await user.click(screen.getByText('Second Bookmark'));
    expect(onTabSelect).toHaveBeenCalledWith('2');
  });

  it('calls onTabClose when close button is clicked', async () => {
    const onTabClose = vi.fn();
    const user = userEvent.setup();
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
    );
    const closeButtons = screen.getAllByRole('button');
    await user.click(closeButtons[0]);
    expect(onTabClose).toHaveBeenCalledWith('1');
  });

  it('marks active tab with aria-selected', () => {
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="2" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('applies active class to active tab', () => {
    renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].className).toContain('active');
    expect(tabs[1].className).not.toContain('active');
  });

  it('applies rtl class when dir=rtl', () => {
    const { container } = renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} dir="rtl" />
    );
    const tabBar = container.querySelector('[role="tablist"]');
    expect(tabBar?.className).toContain('rtl');
    expect(tabBar?.getAttribute('dir')).toBe('rtl');
  });

  it('does not apply rtl class when dir=ltr', () => {
    const { container } = renderWithIntl(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} dir="ltr" />
    );
    const tabBar = container.querySelector('[role="tablist"]');
    expect(tabBar?.className).not.toContain('rtl');
    expect(tabBar?.getAttribute('dir')).toBe('ltr');
  });

  describe('drag-to-edge', () => {
    it('sets draggable attribute on tabs', () => {
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          columnId="col-1"
        />
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0].getAttribute('draggable')).toBe('true');
      expect(tabs[1].getAttribute('draggable')).toBe('true');
    });

    it('does not set draggable when columnId is not provided', () => {
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
        />
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0].getAttribute('draggable')).not.toBe('true');
    });

    it('sets bookmark ID and column ID in dataTransfer on dragStart', () => {
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          columnId="col-1"
        />
      );
      const tabs = screen.getAllByRole('tab');
      const dragStartEvent = new Event('dragstart', { bubbles: true });
      const dataTransfer = { setData: vi.fn(), clearData: vi.fn() };
      Object.defineProperty(dragStartEvent, 'dataTransfer', { value: dataTransfer });
      tabs[0].dispatchEvent(dragStartEvent);
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/tab-bookmark-id', '1');
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/tab-column-id', 'col-1');
    });

    it('clears dataTransfer on dragEnd', () => {
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          columnId="col-1"
        />
      );
      const tabs = screen.getAllByRole('tab');
      const dragEndEvent = new Event('dragend', { bubbles: true });
      const dataTransfer = { setData: vi.fn(), clearData: vi.fn() };
      Object.defineProperty(dragEndEvent, 'dataTransfer', { value: dataTransfer });
      tabs[0].dispatchEvent(dragEndEvent);
      expect(dataTransfer.clearData).toHaveBeenCalled();
    });

    it('applies dragging class during drag', () => {
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          columnId="col-1"
        />
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0].className).not.toContain('dragging');
    });
  });

  describe('context menu', () => {
    it('opens context menu on right-click', () => {
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      expect(screen.getByRole('menu')).toBeTruthy();
      expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
    });

    it('closes context menu on Escape', async () => {
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      expect(screen.getByRole('menu')).toBeTruthy();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('calls onTabClose for close menu item', async () => {
      const onTabClose = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await user.click(screen.getByText('Close'));
      expect(onTabClose).toHaveBeenCalledWith('2');
    });

    it('calls onTabCloseBatch for close all when prop provided', async () => {
      const onTabCloseBatch = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          onTabCloseBatch={onTabCloseBatch}
        />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await user.click(screen.getByText('Close All'));
      expect(onTabCloseBatch).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('calls onTabCloseBatch for close to right when prop provided', async () => {
      const onTabCloseBatch = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          onTabCloseBatch={onTabCloseBatch}
        />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await user.click(screen.getByText('Close to Right'));
      expect(onTabCloseBatch).toHaveBeenCalledWith(['3']);
    });

    it('calls onTabCloseBatch for close to left when prop provided', async () => {
      const onTabCloseBatch = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          onTabCloseBatch={onTabCloseBatch}
        />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await user.click(screen.getByText('Close to Left'));
      expect(onTabCloseBatch).toHaveBeenCalledWith(['1']);
    });

    it('calls onTabCloseBatch for close others when prop provided', async () => {
      const onTabCloseBatch = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          onTabCloseBatch={onTabCloseBatch}
        />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await user.click(screen.getByText('Close Others'));
      expect(onTabCloseBatch).toHaveBeenCalledWith(['1', '3']);
    });

    it('focuses first menu item when menu opens', async () => {
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      const menuItems = screen.getAllByRole('menuitem');
      expect(document.activeElement).toBe(menuItems[0]);
    });

    it('ArrowDown moves focus to next menu item', async () => {
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      await user.keyboard('{ArrowDown}');
      const menuItems = screen.getAllByRole('menuitem');
      expect(document.activeElement).toBe(menuItems[1]);
    });

    it('ArrowUp wraps from first to last menu item', async () => {
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      await user.keyboard('{ArrowUp}');
      const menuItems = screen.getAllByRole('menuitem');
      expect(document.activeElement).toBe(menuItems[menuItems.length - 1]);
    });

    it('Escape closes the context menu via keyboard', async () => {
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      expect(screen.getByRole('menu')).toBeTruthy();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('Enter activates the focused menu item', async () => {
      const onTabClose = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      fireEvent.contextMenu(screen.getByText('Second Bookmark'));
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      await user.keyboard('{Enter}');
      expect(onTabClose).toHaveBeenCalledWith('2');
    });
  });

  describe('keyboard navigation', () => {
    it('arrow right moves to next tab', async () => {
      const onTabSelect = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
      );
      await user.tab();
      await user.keyboard('{ArrowRight}');
      expect(onTabSelect).toHaveBeenCalledWith('2');
    });

    it('arrow left moves to previous tab and wraps around', async () => {
      const onTabSelect = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
      );
      await user.tab();
      await user.keyboard('{ArrowLeft}');
      expect(onTabSelect).toHaveBeenCalledWith('3');
    });

    it('Home moves to first tab', async () => {
      const onTabSelect = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="3" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
      );
      await user.tab();
      await user.keyboard('{Home}');
      expect(onTabSelect).toHaveBeenCalledWith('1');
    });

    it('End moves to last tab', async () => {
      const onTabSelect = vi.fn();
      const user = userEvent.setup();
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
      );
      await user.tab();
      await user.keyboard('{End}');
      expect(onTabSelect).toHaveBeenLastCalledWith('3');
    });
  });

  describe('focus management', () => {
    it('moves focus to next tab after closing current tab', async () => {
      const onTabClose = vi.fn();
      const user = userEvent.setup();
      const { rerender } = renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      const closeButtons = screen.getAllByRole('button', { name: /Close/ });
      await user.click(closeButtons[0]);
      // Simulate the parent removing the bookmark from openBookmarks
      const remaining = bookmarks.filter((b) => b.id !== '1');
      rerender(
        <BookmarkTabs openBookmarks={remaining} activeBookmarkId="2" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      const tabs = screen.getAllByRole('tab');
      expect(document.activeElement).toBe(tabs[0]);
    });

    it('moves focus to previous tab when closing last tab', async () => {
      const onTabClose = vi.fn();
      const user = userEvent.setup();
      const twoBookmarks = bookmarks.slice(0, 2);
      const { rerender } = renderWithIntl(
        <BookmarkTabs openBookmarks={twoBookmarks} activeBookmarkId="2" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      const closeButtons = screen.getAllByRole('button', { name: /Close/ });
      await user.click(closeButtons[1]);
      const remaining = twoBookmarks.filter((b) => b.id !== '2');
      rerender(
        <BookmarkTabs openBookmarks={remaining} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      const tabs = screen.getAllByRole('tab');
      expect(document.activeElement).toBe(tabs[0]);
    });

    it('focuses reopen button when last tab is closed', async () => {
      const onTabClose = vi.fn();
      const user = userEvent.setup();
      const singleBookmark = bookmarks.slice(0, 1);
      const { rerender } = renderWithIntl(
        <BookmarkTabs openBookmarks={singleBookmark} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      const closeButtons = screen.getAllByRole('button', { name: /Close/ });
      await user.click(closeButtons[0]);
      rerender(
        <BookmarkTabs openBookmarks={[]} activeBookmarkId={null} onTabSelect={vi.fn()} onTabClose={onTabClose} />
      );
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      await act(async () => {
        await new Promise((r) => requestAnimationFrame(r));
      });
      const reopenBtn = screen.getByRole('button', { name: /Reopen/ });
      expect(reopenBtn).toBeDefined();
    });
  });

  describe('auto-scroll', () => {
    it('each tab has data-bookmark-id attribute', () => {
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      const tabs = screen.getAllByRole('tab');
      expect(tabs[0].getAttribute('data-bookmark-id')).toBe('1');
      expect(tabs[1].getAttribute('data-bookmark-id')).toBe('2');
      expect(tabs[2].getAttribute('data-bookmark-id')).toBe('3');
    });
  });

  describe('ARIA attributes', () => {
    it('tablist has aria-orientation="horizontal"', () => {
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      const tablist = screen.getByRole('tablist');
      expect(tablist.getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('tablist has i18n aria-label', () => {
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      const tablist = screen.getByRole('tablist');
      expect(tablist.getAttribute('aria-label')).toBe('Open bookmarks');
    });

    it('close button has i18n aria-label with bookmark title', () => {
      renderWithIntl(
        <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
      );
      const closeButtons = screen.getAllByRole('button', { name: /Close .* Bookmark/ });
      expect(closeButtons.length).toBe(3);
      expect(closeButtons[0].getAttribute('aria-label')).toBe('Close First Bookmark');
    });

    it('split button has i18n aria-label with bookmark title', () => {
      renderWithIntl(
        <BookmarkTabs
          openBookmarks={bookmarks}
          activeBookmarkId="1"
          onTabSelect={vi.fn()}
          onTabClose={vi.fn()}
          onSplitColumn={vi.fn()}
        />
      );
      const splitButtons = screen.getAllByRole('button', { name: /Open .* in new column/ });
      expect(splitButtons.length).toBe(3);
      expect(splitButtons[0].getAttribute('aria-label')).toBe('Open First Bookmark in new column');
    });
  });
});
