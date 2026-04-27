import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { PieSegment } from '../utils/finance';

interface Props {
  segments: PieSegment[];
  size?: number;
  strokeWidth?: number;
}

export default function PieChart({ segments, size = 200, strokeWidth = 36 }: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]} testID="pie-chart-empty">
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
        </Svg>
      </View>
    );
  }

  let cumulative = 0;
  return (
    <View style={[styles.container, { width: size, height: size }]} testID="dashboard-pie-chart">
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {segments.map((seg) => {
            if (seg.value <= 0) return null;
            const fraction = seg.value / total;
            const dash = circumference * fraction;
            const gap = circumference - dash;
            const offset = circumference * (1 - cumulative / total);
            cumulative += seg.value;
            return (
              <Circle
                key={seg.key}
                cx={center}
                cy={center}
                r={radius}
                stroke={seg.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
