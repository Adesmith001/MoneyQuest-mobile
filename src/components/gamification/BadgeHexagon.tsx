import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

interface BadgeHexagonProps {
  size: number;
  fill: string;
  borderColor: string;
  children?: React.ReactElement | null;
}

const BadgeHexagon: React.FC<BadgeHexagonProps> = ({
  size,
  fill,
  borderColor,
  children,
}) => (
  <View style={{ width: size, height: size }}>
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <Polygon
        points="50,2 93,26 93,74 50,98 7,74 7,26"
        fill="#FFFFFF"
        stroke={borderColor}
        strokeWidth="3"
      />
      <Polygon
        points="50,8 87,29 87,71 50,92 13,71 13,29"
        fill={fill}
        stroke={borderColor}
        strokeWidth="2"
      />
    </Svg>
    <View style={styles.content}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  content: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default BadgeHexagon;
