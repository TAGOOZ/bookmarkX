/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { LocaleContext } from '../../../App';
import SplitLayout from '../SplitLayout';
import SplitDivider from '../SplitDivider';
import type { SplitState } from '../types';

vi.mock('../../bookmark-detail/BookmarkDetail', () => ({
  default: ({ bookmark }: { bookmark: { title: string } | null }) => (
    <div data-testid="bookmark-detail">{bookmark?.title ?? 'empty'}</div>
  ),
}));

vi.mock('../../bookmark-detail/BookmarkTabs', () => ({
  default: ({ openBookmarks, onTabSelect }: { openBookmarks: Array<{ id: string; title: string }>; onTabSelect: (id: string) => void }) => (
    <div data-testid="bookmark-tabs">
      {openBookmarks.map(b => (
        <button key={b.id} onClick={() => onTabSelect(b.id)} data-testid={`tab-${b.id}`}>{b.title}</button>
      ))}
    </div>
  ),
}));

const messages = {
  openInNewColumn: 'Open in New Column',
  closeTab: 'Close',
};

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
  { id: '1', title: 'First', titleAr: null, titleEn: 'First', url: 'https://a.com', topic: 'tech', priority: 'high', contentType: 'article', content: '', createdAt: '' },
  { id: '2', title: 'Second', titleAr: null, titleEn: 'Second', url: 'https://b.com', topic: 'design', priority: 'medium', contentType: 'video', content: '', createdAt: '' },
];

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <LocaleContext.Provider value={{ locale: 'en', setLocale: vi.fn() }}>
        {ui}
      </LocaleContext.Provider>
    </IntlProvider>
  );

describe('SplitDivider', () => {
  it('renders a separator element', () => {
    const { container } = renderWithProviders(
      <SplitDivider onResize={vi.fn()} dir="ltr" />
    );
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
  });

  it('calls onResize with delta on pointer drag', () => {
    const onResize = vi.fn();
    const { container } = renderWithProviders(
      <SplitDivider onResize={onResize} dir="ltr" />
    );
    const separator = container.querySelector('[role="separator"]')!;

    // Mock setPointerCapture
    separator.setPointerCapture = vi.fn();

    const pointerDown = new PointerEvent('pointerdown', { clientX: 100, bubbles: true });
    Object.defineProperty(pointerDown, 'target', { value: separator });
    separator.dispatchEvent(pointerDown);

    const moveEvent = new PointerEvent('pointermove', { clientX: 120, bubbles: true });
    document.dispatchEvent(moveEvent);

    expect(onResize).toHaveBeenCalledWith(20);
  });
});

describe('SplitLayout', () => {
  const defaultProps = {
    openBookmarks: bookmarks,
    onSplitColumn: vi.fn(),
    onMergeColumn: vi.fn(),
    onColumnActive: vi.fn(),
    onColumnResize: vi.fn(),
    onBookmarkChange: vi.fn(),
    dir: 'ltr' as const,
  };

  it('renders a single column with no bookmark', () => {
    const state: SplitState = {
      columns: [{ id: 'col-1', bookmarkId: null, width: 1 }],
      activeColumnId: 'col-1',
    };
    const { container } = renderWithProviders(
      <SplitLayout {...defaultProps} splitState={state} />
    );
    expect(container.querySelector('[role="separator"]')).toBeNull();
    expect(screen.getByTestId('bookmark-detail').textContent).toBe('empty');
  });

  it('renders a single column with a bookmark', () => {
    const state: SplitState = {
      columns: [{ id: 'col-1', bookmarkId: '1', width: 1 }],
      activeColumnId: 'col-1',
    };
    renderWithProviders(
      <SplitLayout {...defaultProps} splitState={state} />
    );
    expect(screen.getByTestId('bookmark-detail').textContent).toBe('First');
  });

  it('renders two columns with a divider between them', () => {
    const state: SplitState = {
      columns: [
        { id: 'col-1', bookmarkId: '1', width: 1 },
        { id: 'col-2', bookmarkId: '2', width: 1 },
      ],
      activeColumnId: 'col-1',
    };
    const { container } = renderWithProviders(
      <SplitLayout {...defaultProps} splitState={state} />
    );
    const details = screen.getAllByTestId('bookmark-detail');
    expect(details).toHaveLength(2);
    expect(details[0].textContent).toBe('First');
    expect(details[1].textContent).toBe('Second');
    expect(container.querySelector('[role="separator"]')).toBeTruthy();
  });

  it('sets dir attribute on container', () => {
    const state: SplitState = {
      columns: [{ id: 'col-1', bookmarkId: null, width: 1 }],
      activeColumnId: 'col-1',
    };
    const { container } = renderWithProviders(
      <SplitLayout {...defaultProps} splitState={state} dir="rtl" />
    );
    expect((container.firstChild as HTMLElement).getAttribute('dir')).toBe('rtl');
  });

  describe('drag-to-edge drop zones', () => {
    it('renders left and right drop zones', () => {
      const state: SplitState = {
        columns: [{ id: 'col-1', bookmarkId: '1', width: 1 }],
        activeColumnId: 'col-1',
      };
      const { container } = renderWithProviders(
        <SplitLayout {...defaultProps} splitState={state} />
      );
      expect(container.querySelector('[data-drop-zone="left"]')).toBeTruthy();
      expect(container.querySelector('[data-drop-zone="right"]')).toBeTruthy();
    });

    it('calls onSplitColumn with position when drop occurs on left edge', () => {
      const onSplitColumn = vi.fn();
      const state: SplitState = {
        columns: [{ id: 'col-1', bookmarkId: '1', width: 1 }],
        activeColumnId: 'col-1',
      };
      const { container } = renderWithProviders(
        <SplitLayout {...defaultProps} splitState={state} onSplitColumn={onSplitColumn} />
      );
      const leftZone = container.querySelector('[data-drop-zone="left"]')!;
      fireEvent.drop(leftZone, { dataTransfer: { getData: vi.fn().mockReturnValue('bookmark-1') } });
      expect(onSplitColumn).toHaveBeenCalledWith('col-1', 'bookmark-1');
    });

    it('disables drop zones when max columns reached', () => {
      const state: SplitState = {
        columns: [
          { id: 'col-1', bookmarkId: '1', width: 0.5 },
          { id: 'col-2', bookmarkId: '2', width: 0.5 },
          { id: 'col-3', bookmarkId: null, width: 1 },
        ],
        activeColumnId: 'col-1',
      };
      const { container } = renderWithProviders(
        <SplitLayout {...defaultProps} splitState={state} />
      );
      const leftZone = container.querySelector('[data-drop-zone="left"]') as HTMLElement;
      expect(leftZone.getAttribute('aria-disabled')).toBe('true');
    });

    it('shows active state when dragging over drop zone', () => {
      const state: SplitState = {
        columns: [{ id: 'col-1', bookmarkId: '1', width: 1 }],
        activeColumnId: 'col-1',
      };
      const { container } = renderWithProviders(
        <SplitLayout {...defaultProps} splitState={state} />
      );
      const leftZone = container.querySelector('[data-drop-zone="left"]')!;
      fireEvent.dragOver(leftZone, { dataTransfer: { types: ['text/tab-bookmark-id'], dropEffect: '' } });
      expect(leftZone.className).toContain('dropZoneActive');
    });
  });
});
