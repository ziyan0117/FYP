/**
 * A small static financial-jargon glossary. The design's own example
 * ("guidance", "gross margin") ties the "why it matters" line to the exact
 * wording of one specific demo headline -- that's generated copy the real
 * pipeline doesn't produce. This is the honest real-app equivalent: a
 * fixed set of common terms with a generic (but genuinely useful) "why it
 * matters" line, matched against whatever headline/snippet text actually
 * contains them, rather than an invented per-article explanation.
 */
export type GlossaryEntry = { term: string; body: string; why: string };

export const GLOSSARY: Record<string, GlossaryEntry> = {
  guidance: {
    term: 'Guidance',
    body: "A company's own forecast for a future quarter's revenue or profit. It's a promise-shaped number, so markets often react to it harder than to results that already happened.",
    why: 'A cautious or better-than-expected forecast can move a stock more than the quarter it just reported.',
  },
  'gross margin': {
    term: 'Gross Margin',
    body: 'What is left of each dollar of sales after the direct cost of making the product. A falling margin means growth is getting more expensive to buy.',
    why: 'Watch this alongside revenue growth -- fast growth with shrinking margin is a different story than fast growth with steady margin.',
  },
  buyback: {
    term: 'Buyback',
    body: 'A company spending its own cash to repurchase its shares, which reduces the share count and can lift earnings-per-share without the business actually growing.',
    why: "A buyback announcement is often read as management signalling confidence, or as a sign they don't have a better use for the cash.",
  },
  'market cap': {
    term: 'Market Cap',
    body: "A company's total value on the stock market -- share price multiplied by the number of shares outstanding.",
    why: 'Bigger market caps tend to move less on any single headline; smaller ones can swing hard on the same news.',
  },
  capex: {
    term: 'Capex',
    body: 'Capital expenditure -- money spent building or buying long-lived things like data centres, factories, or equipment, rather than day-to-day operating costs.',
    why: 'Rising capex across a sector (like AI data centres) is often read as a bet on future demand, which is one reason "capex" shows up so often in tech headlines.',
  },
  dividend: {
    term: 'Dividend',
    body: 'A cash payment a company makes to shareholders out of its profits, usually on a regular schedule.',
    why: 'A cut or suspended dividend is often read as a warning sign about a company’s cash position, even outside the sentiment of the headline itself.',
  },
  antitrust: {
    term: 'Antitrust',
    body: 'Laws and regulatory action aimed at stopping companies from abusing market dominance -- blocking mergers, or penalising anti-competitive behaviour.',
    why: 'An antitrust ruling can force a company to change how it operates, sell off part of the business, or pay a fine, regardless of how the underlying business is doing.',
  },
  tariff: {
    term: 'Tariff',
    body: 'A tax a government charges on goods crossing its border, usually imports.',
    why: 'Tariffs raise costs for companies that import parts or sell into the country enacting them, which is why trade-policy headlines move stocks with global supply chains.',
  },
  'short seller': {
    term: 'Short Seller',
    body: 'An investor who borrows and sells a stock, betting its price will fall so they can buy it back cheaper later.',
    why: "A short seller's report is a bet against the stock, so its claims are worth reading critically -- but they've also been right often enough that markets rarely ignore them.",
  },
  volatility: {
    term: 'Volatility',
    body: "How much and how fast a stock's price swings, in either direction -- not, on its own, a measure of whether the news is good or bad.",
    why: 'High volatility means the same headline can move the price further than it would for a calmer stock.',
  },
};
