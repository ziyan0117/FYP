/**
 * Hand-drawn icon set matching the design's inline SVGs exactly (same path
 * data, square line caps, 2.2-3px strokes) rather than substituting a
 * generic icon library's closest match.
 */
// The signal/wifi/battery glyphs from the design's mocked-up status bar are
// deliberately not reproduced -- that row was device chrome for the
// prototype, not app UI; the real app uses the OS status bar instead.
import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

export function ArrowRightIcon({ size = 20, color = '#f3f2f2', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h13M12 5l7 7-7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 20, color = '#f3f2f2', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H6M12 5l-7 7 7 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
    </Svg>
  );
}

export function ArrowDownIcon({ size = 18, color = '#f3f2f2', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v13M5 12l7 7 7-7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 18, color = '#f3f2f2', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 5l14 14M19 5L5 19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 12, color = '#f3f2f2', strokeWidth = 4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12l6 6L20 5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="square"
      />
    </Svg>
  );
}

export function SearchIcon({ size = 16, color = '#9b9797', strokeWidth = 2.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M16 16l5 5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
    </Svg>
  );
}

export function BookmarkIcon({
  size = 18,
  color = '#f3f2f2',
  strokeWidth = 2.2,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path d="M6 3h12v18l-6-5-6 5z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
    </Svg>
  );
}

export function AlertIcon({ size = 22, color = '#ec3013', strokeWidth = 3 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 6v8M12 17.5v.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="square" />
    </Svg>
  );
}

export function TabTodayIcon({ size = 20, color = '#f3f2f2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20V9M9 20V4M15 20v-8M21 20v-5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="square"
      />
    </Svg>
  );
}

export function TabListIcon({ size = 20, color = '#f3f2f2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M3 12h18M3 18h11" stroke={color} strokeWidth={2.2} strokeLinecap="square" />
    </Svg>
  );
}

export function TabTrendingIcon({ size = 20, color = '#f3f2f2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l6-7 4 3 8-9" stroke={color} strokeWidth={2.2} strokeLinecap="square" />
      <Path d="M17 4h4v4" stroke={color} strokeWidth={2.2} strokeLinecap="square" />
    </Svg>
  );
}

export function TabPulseIcon({ size = 20, color = '#f3f2f2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12h4l3-7 4 14 3-7h6" stroke={color} strokeWidth={2.2} strokeLinecap="square" />
    </Svg>
  );
}

export function TabYouIcon({ size = 20, color = '#f3f2f2' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c0-4 3.6-6 8-6s8 2 8 6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="square"
      />
    </Svg>
  );
}
