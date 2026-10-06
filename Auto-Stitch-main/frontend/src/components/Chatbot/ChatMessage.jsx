import { parseChatBlocks, splitInline } from './formatChatMessage';

function InlineText({ text }) {
  return splitInline(text).map((part, index) => {
    const key = `${part.type}-${index}`;
    if (part.type === 'strong') return <strong key={key}>{part.value}</strong>;
    if (part.type === 'em') return <em key={key}>{part.value}</em>;
    if (part.type === 'code') return <code key={key}>{part.value}</code>;
    if (part.type === 'price') return <span key={key} className="chat-price">{part.value}</span>;
    if (part.type === 'link') {
      return (
        <a key={key} href={part.href} target="_blank" rel="noopener noreferrer">
          {part.value}
        </a>
      );
    }
    return <span key={key}>{part.value}</span>;
  });
}

function ListBlock({ block, index }) {
  const Tag = block.type === 'ol' ? 'ol' : 'ul';
  return (
    <Tag className={`chat-list${block.type === 'ol' ? ' ordered' : ''}`}>
      {block.items.map((item, itemIndex) => (
        <li key={`${index}-${itemIndex}`}>
          <InlineText text={item} />
        </li>
      ))}
    </Tag>
  );
}

export default function ChatMessage({ content }) {
  return parseChatBlocks(content).map((block, index) => {
    if (block.type === 'ul' || block.type === 'ol') {
      return <ListBlock key={`list-${index}`} block={block} index={index} />;
    }

    if (block.type === 'h') {
      return <p key={`h-${index}`} className="chat-heading">{block.text}</p>;
    }

    if (block.type === 'quote') {
      return (
        <blockquote key={`q-${index}`} className="chat-quote">
          <InlineText text={block.text} />
        </blockquote>
      );
    }

    if (block.type === 'code') {
      return <pre key={`code-${index}`} className="chat-code">{block.text}</pre>;
    }

    if (block.type === 'table') {
      return (
        <div key={`table-${index}`} className="chat-table-wrap">
          <table className="chat-table">
            <thead>
              <tr>
                {block.headers.map((header) => <th key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${cellIndex}`}><InlineText text={cell} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <p key={`p-${index}`}>
        <InlineText text={block.text} />
      </p>
    );
  });
}
