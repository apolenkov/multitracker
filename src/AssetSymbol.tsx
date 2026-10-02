import './list-identity.css';

export function AssetSymbol({ symbol }: Readonly<{ symbol: string }>) {
  const tone = ['BTC', 'MSFT', 'TWT'].includes(symbol) ? symbol.toLowerCase() : 'neutral';
  return (
    <span className={`asset-symbol ${tone}`} aria-hidden="true">
      {symbol.slice(0, 1)}
    </span>
  );
}
