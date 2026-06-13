import React, { useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Plus } from 'lucide-react';

interface TopicCreateRowProps {
  onCreate: (name: string) => void;
}

const TopicCreateRow: React.FC<TopicCreateRowProps> = ({ onCreate }) => {
  const intl = useIntl();
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  const handleCreate = useCallback(() => {
    if (!newTopicName.trim()) return;
    onCreate(newTopicName.trim());
    setNewTopicName('');
    setShowCreateTopic(false);
  }, [newTopicName, onCreate]);

  if (showCreateTopic) {
    return (
      <div className="topic-create-row">
        <input
          className="topic-create-input"
          value={newTopicName}
          onChange={(e) => setNewTopicName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
            if (e.key === 'Escape') { setShowCreateTopic(false); setNewTopicName(''); }
          }}
          placeholder={intl.formatMessage({ id: 'topicName' })}
          autoFocus
        />
        <button className="topic-create-btn" onClick={handleCreate}>
          {intl.formatMessage({ id: 'createTopic' })}
        </button>
        <button
          className="topic-create-cancel"
          onClick={() => { setShowCreateTopic(false); setNewTopicName(''); }}
        >
          {intl.formatMessage({ id: 'cancel' })}
        </button>
      </div>
    );
  }

  return (
    <button
      className="topic-add-btn"
      onClick={() => setShowCreateTopic(true)}
    >
      <Plus size={14} />
      {intl.formatMessage({ id: 'addTopic' })}
    </button>
  );
};

export default TopicCreateRow;
