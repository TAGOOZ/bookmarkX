import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Bookmark, FilterState } from '../App';

interface BookmarkListProps {
  selectedBookmark: Bookmark | null;
  onBookmarkSelect: (bookmark: Bookmark) => void;
  filters: FilterState;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  refreshKey?: number;
}

const BookmarkList: React.FC<BookmarkListProps> = ({
  selectedBookmark,
  onBookmarkSelect,
  filters,
  searchQuery,
  onSearchChange,
  refreshKey = 0,
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mockBookmarks: Bookmark[] = [
    {
      id: '1',
      title: 'Introducing Command A+: Making sovereign agentic capabilities available to all',
      url: 'https://cohere.com/blog/command-a-plus',
      topic: 'تكنولوجيا',
      priority: 'high',
      contentType: 'article',
      content: `Our fastest and most powerful language model yet. Command A+ is an open-source enterprise workhorse built for complex reasoning, multimodal and multilingual agentic tasks — all while running on as little as two H100 GPUs.

Today, we're releasing Command A+ open-source. A mixture-of-experts (MoE) model, Command A+ is an efficient, versatile, and privately deployable LLM built for high-performance agentic tasks with minimal compute overhead.

Born from a year of deploying North with our customers, it surpasses every previous generation in the Command series and unifies their capabilities into a single scalable model.

Now freely available under an Apache 2.0 license, Command A+ advances Cohere's mission to make sovereign AI a technological reality — giving developers direct access to enterprise-grade agentic capabilities across experimentation, deployment, and production workflows.

Snapshot

Model: command-a-plus-05-2026
License: Apache 2.0
Architecture: Sparse / MoE
Model size: 218B total; 25B active
Context length: 128K input context; 64K max generation
Input modalities: Text, image, tool use
Output modalities: Text, reasoning, tool use
Languages: Supports 48 languages
Optimized for: Reasoning, agentic workflows, RAG, multilingual, multimodal document processing

Northwards

For the past year, North — Cohere's integrated enterprise workspace for building and deploying agentic AI — has been the driving force behind much of our innovation. Through that work, we set out to build a unified model for customers that simplifies deployment, can run locally, and synthesizes capabilities from across the Command family.

The work is already paying off. Read how our customers have been using North to transform their operations.

However, sovereign AI is much bigger than Cohere. Empowering engineers with models that they can run, control, and adapt themselves is the most acute challenge facing this generation of AI.

We've optimized Command A+ for practical, developer-focused use, including support for low-bit quantization, efficient inference, and integration across open inference frameworks. AI independence for all.

We can't wait to see what the community builds.

Command, consolidated

Command A+ outperforms previous Command A models in key dimensions of enterprise workloads, including multimodal understanding, retrieval, long-horizon, and complex reasoning.

Performance comparison:

| Feature | Command A+ | Command A | Command A Reasoning | Command A Vision | Command A Translate |
|---|---|---|---|---|---|
| Size | 218B A25B | 111B | 111B | 112B | 111B |
| Reasoning | ✓ | — | ✓ | — | — |
| Multimodal | ✓ | — | — | ✓ | — |
| Tool use | ✓ | ✓ | — | — | — |
| Multilingual | 48 | 23 | 23 | 6 | 23 |

Built for agentic tasks

Command A+ is purpose-built for the kinds of tasks that matter most in enterprise AI deployments: complex reasoning chains, tool calling, retrieval-augmented generation, and multilingual document understanding.

The model's mixture-of-experts architecture means it can handle diverse workloads efficiently — routing different parts of a query to specialized expert networks, achieving higher quality output with less compute.

Key capabilities:

1. Advanced reasoning: Command A+ excels at multi-step reasoning tasks, breaking down complex problems into manageable steps and arriving at well-supported conclusions.

2. Tool use and agentic workflows: With native support for tool calling, Command A+ can interact with external APIs, databases, and services as part of autonomous agent pipelines.

3. Multimodal understanding: Beyond text, Command A+ can process images and other visual inputs, making it suitable for document analysis, visual question answering, and multimodal retrieval tasks.

4. Multilingual support: With coverage of 48 languages, Command A+ serves global enterprises without the need for separate language-specific models.

5. Efficient deployment: The sparse MoE architecture with only 25B active parameters out of 218B total means Command A+ can run on as few as two H100 GPUs while delivering performance that previously required much larger compute budgets.

Deployment options

Command A+ is designed for flexibility in deployment:

- On-premise: Deploy behind your firewall for maximum data sovereignty
- Cloud: Run on any major cloud provider with GPU instances
- Edge: With low-bit quantization support, run optimized versions on smaller hardware
- API: Use Cohere's managed inference for zero-infrastructure deployment

Fujitsu believes Command A+ mixture-of-experts architecture and strong agentic performance align well with our commitment to deliver innovative, sovereign AI solutions through Takane and the Kozuchi Enterprise AI Factory. We look forward to leveraging its capabilities to accelerate secure, scalable AI adoption for our customers.

— Vivek Mahajan, Corporate Executive Officer, Corporate Vice President, CTO, in charge of System Platform, Fujitsu Limited

Getting started

Visit Hugging Face to download the weights — available in several near lossless quantizations — and read our implementation guides. For a dedicated, managed inference environment, deploy Command A+ in Model Vault today.

The release of Command A+ represents a significant step toward our vision of sovereign AI — where organizations can deploy, control, and adapt state-of-the-art AI models on their own terms, with their own data, and within their own infrastructure.`,
      createdAt: '2026-06-01T10:00:00Z',
    },
    {
      id: '2',
      title: 'The Future of AI in Software Development',
      url: 'https://example.com/ai-future-dev',
      topic: 'تكنولوجيا',
      priority: 'high',
      contentType: 'article',
      content: 'How artificial intelligence is transforming the way we write and maintain code.',
      createdAt: '2026-06-02T14:30:00Z',
    },
    {
      id: '3',
      title: 'Minimal Design Principles for Clean UIs',
      url: 'https://example.com/minimal-design',
      topic: 'تصميم',
      priority: 'medium',
      contentType: 'article',
      content: 'Exploring minimalism in digital design and how less can truly be more.',
      createdAt: '2026-06-03T09:15:00Z',
    },
    {
      id: '4',
      title: 'Understanding Venture Capital Funding Rounds',
      url: 'https://example.com/vc-funding',
      topic: 'أعمال',
      priority: 'medium',
      contentType: 'article',
      content: 'A breakdown of seed, Series A, B, C and what each round means for startups.',
      createdAt: '2026-06-03T11:00:00Z',
    },
    {
      id: '5',
      title: 'Quantum Computing Explained in 10 Minutes',
      url: 'https://example.com/quantum-101',
      topic: 'علوم',
      priority: 'low',
      contentType: 'video',
      content: 'A quick visual introduction to quantum computing concepts.',
      createdAt: '2026-06-04T16:45:00Z',
    },
    {
      id: '6',
      title: 'Thread: How to Build habits that stick',
      url: 'https://x.com/user/status/123456',
      topic: 'علوم',
      priority: 'high',
      contentType: 'link',
      content: 'A thread about neuroscience-backed strategies for building lasting habits.',
      createdAt: '2026-06-04T18:20:00Z',
    },
    {
      id: '7',
      title: 'React Server Components — A Deep Dive',
      url: 'https://example.com/rsc-deep-dive',
      topic: 'تكنولوجيا',
      priority: 'medium',
      contentType: 'article',
      content: 'Understanding React Server Components, how they work, and when to use them.',
      createdAt: '2026-06-05T08:00:00Z',
    },
    {
      id: '8',
      title: 'The Psychology of Color in UI Design',
      url: 'https://example.com/color-psychology',
      topic: 'تصميم',
      priority: 'low',
      contentType: 'image',
      content: 'How color choices affect user perception and behavior in digital interfaces.',
      createdAt: '2026-06-05T12:30:00Z',
    },
    {
      id: '9',
      title: 'Stripe CEO on Scaling a Fintech Company',
      url: 'https://example.com/stripe-scaling',
      topic: 'أعمال',
      priority: 'high',
      contentType: 'video',
      content: 'Patrick Collison shares insights on building and scaling Stripe.',
      createdAt: '2026-06-06T09:00:00Z',
    },
    {
      id: '10',
      title: 'New Breakthrough in CRISPR Gene Editing',
      url: 'https://example.com/crispr-2026',
      topic: 'علوم',
      priority: 'medium',
      contentType: 'article',
      content: 'Scientists achieve precision gene editing with zero off-target effects.',
      createdAt: '2026-06-06T14:15:00Z',
    },
  ];

  const fetchBookmarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dbBookmarks, classifications] = await Promise.all([
        window.api.getBookmarks(),
        window.api.getClassifications(),
      ]);

      const classificationMap = new Map(
        classifications.map(c => [c.bookmark_id, c])
      );

      const mappedBookmarks: Bookmark[] = dbBookmarks.map(dbBookmark => {
        const classification = classificationMap.get(dbBookmark.id);
        return {
          id: dbBookmark.id,
          title: dbBookmark.title || dbBookmark.tweet_text || 'Untitled',
          url: dbBookmark.url,
          topic: classification?.priority || 'medium',
          priority: (classification?.priority as 'high' | 'medium' | 'low') || 'medium',
          contentType: dbBookmark.content_type,
          content: dbBookmark.tweet_text || '',
          createdAt: dbBookmark.fetched_at,
        };
      });

      setBookmarks(mappedBookmarks.length > 0 ? mappedBookmarks : mockBookmarks);
    } catch {
      setBookmarks(mockBookmarks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [refreshKey]);

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (filters.priority && bookmark.priority !== filters.priority) {
      return false;
    }
    if (filters.topic && bookmark.topic !== filters.topic) {
      return false;
    }
    if (filters.contentType && bookmark.contentType !== filters.contentType) {
      return false;
    }
    if (
      searchQuery &&
      !bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="bookmark-list">
        <div className="list-header">
          <FormattedMessage id="bookmarks" />
          <input
            type="text"
            className="search-input"
            placeholder="بحث..."
            aria-label="بحث في المفضلات"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookmark-list">
        <div className="list-header">
          <FormattedMessage id="bookmarks" />
          <input
            type="text"
            className="search-input"
            placeholder="بحث..."
            aria-label="بحث في المفضلات"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Failed to load bookmarks</div>
          <div className="empty-description">{error}</div>
          <button className="action-button primary-button" onClick={fetchBookmarks}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmark-list">
      <div className="list-header">
        <FormattedMessage id="bookmarks" />
        <input
            type="text"
            className="search-input"
            placeholder="بحث..."
            aria-label="بحث في المفضلات"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-title">
            <FormattedMessage id="noBookmarks" />
          </div>
          <div className="empty-description">
            <FormattedMessage id="noBookmarksDescription" />
          </div>
        </div>
      ) : (
        filteredBookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className={`bookmark-item ${
              selectedBookmark?.id === bookmark.id ? 'selected' : ''
            }`}
            role="button"
            tabIndex={0}
            aria-selected={selectedBookmark?.id === bookmark.id}
            onClick={() => onBookmarkSelect(bookmark)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onBookmarkSelect(bookmark))}
          >
            <div className="bookmark-title">{bookmark.title}</div>
            <div className="bookmark-url">{bookmark.url}</div>
            <div className="bookmark-meta">
              <span className={`priority-badge ${getPriorityClass(bookmark.priority)}`}>
                {bookmark.priority === 'high' && <FormattedMessage id="high" />}
                {bookmark.priority === 'medium' && <FormattedMessage id="medium" />}
                {bookmark.priority === 'low' && <FormattedMessage id="low" />}
              </span>
              <span>{bookmark.topic}</span>
              <span>{bookmark.contentType}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BookmarkList;
