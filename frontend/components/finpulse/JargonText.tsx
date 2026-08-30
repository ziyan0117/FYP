import { Text, TextStyle } from 'react-native';

import { Colors } from '@/constants/finpulse-theme';
import { GLOSSARY } from '@/constants/glossary';

const TERMS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length); // longest-match-first
const PATTERN =
  TERMS.length > 0
    ? new RegExp(`\\b(${TERMS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi')
    : null;

/**
 * Renders `text`, underlining any word/phrase that's in the static
 * glossary and wiring it to `onTermPress` -- the "tap an underlined term
 * for plain English" affordance. Falls back to plain text when the
 * beginner-mode setting is off, or nothing in the glossary matches.
 */
export function JargonText({
  text,
  style,
  enabled,
  onTermPress,
}: {
  text: string;
  style?: TextStyle | TextStyle[];
  enabled: boolean;
  onTermPress: (key: string) => void;
}) {
  if (!enabled || !PATTERN) {
    return <Text style={style}>{text}</Text>;
  }

  const parts: { text: string; term?: string }[] = [];
  let lastIndex = 0;
  PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index) });
    }
    parts.push({ text: match[0], term: match[0].toLowerCase() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }

  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.term ? (
          <Text
            key={i}
            onPress={() => onTermPress(p.term!)}
            style={{
              color: Colors.accentText,
              textDecorationLine: 'underline',
              textDecorationStyle: 'dotted',
              textDecorationColor: Colors.accent,
            }}>
            {p.text}
          </Text>
        ) : (
          <Text key={i}>{p.text}</Text>
        )
      )}
    </Text>
  );
}
