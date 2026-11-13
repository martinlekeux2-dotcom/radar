export function renderInlineMarkdown(text) {
  return text.split(/(!\[[^\]]*\]\(https?:\/\/[^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/gi).map((part, index) => {
    const image = part.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/i);
    if (image) {
      return <img alt={image[1]} decoding="async" key={index} loading="lazy" src={image[2]} />;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export default function ArticleContent({ content }) {
  const blocks = [];
  let paragraph = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  }

  for (const line of String(content ?? "").split(/\r?\n/)) {
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/i);
    if (heading) {
      flushParagraph();
      blocks.push({ type: `h${heading[1].length}`, text: heading[2] });
    } else if (image) {
      flushParagraph();
      blocks.push({ type: "image", alt: image[1], src: image[2] });
    } else if (line.startsWith(">")) {
      flushParagraph();
      blocks.push({ type: "quote", text: line.replace(/^>\s?/, "") });
    } else {
      paragraph.push(line.trim());
    }
  }
  flushParagraph();

  return (
    <div className="article-body">
      {blocks.map((block, index) => {
        if (block.type === "image") {
          return (
            <figure className="article-image" key={index}>
              <img alt={block.alt} decoding="async" loading="lazy" src={block.src} />
              {block.alt && <figcaption>{block.alt}</figcaption>}
            </figure>
          );
        }
        if (block.type === "quote") return <blockquote key={index}>{renderInlineMarkdown(block.text)}</blockquote>;
        if (block.type === "h1") return <h2 key={index}>{renderInlineMarkdown(block.text)}</h2>;
        if (block.type === "h2") return <h3 key={index}>{renderInlineMarkdown(block.text)}</h3>;
        if (block.type === "h3") return <h4 key={index}>{renderInlineMarkdown(block.text)}</h4>;
        return <p key={index}>{renderInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}
