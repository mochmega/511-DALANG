export function highlightText(text, query) {
  if (!query || !text) return text;
  
  const textStr = String(text);
  const regex = new RegExp(`(${query})`, 'gi');
  const parts = textStr.split(regex);
  
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-yellow-500/80 text-black px-1 rounded-sm font-bold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
