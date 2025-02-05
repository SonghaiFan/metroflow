// Base style constants
const DEFAULT_STYLES = {
  fillColor: "white",
  strokeWidth: 8,
  get stationRadius() {
    return this.strokeWidth;
  },
  selectionColor: "#006400", // rgb(0, 100, 0)
};

export class StyleUtils {
  static componentToHex(c) {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }

  static rgbToHex(r, g, b) {
    return (
      "#" +
      this.componentToHex(r) +
      this.componentToHex(g) +
      this.componentToHex(b)
    );
  }
}

export class Styles {
  static SegmentStyle = {
    strokeColor: StyleUtils.rgbToHex(255, 0, 0),
    strokeWidth: DEFAULT_STYLES.strokeWidth,
    selectionColor: DEFAULT_STYLES.selectionColor,
    fullySelected: false,
  };

  static StationStyle = {
    strokeColor: StyleUtils.rgbToHex(0, 0, 0),
    strokeWidth: DEFAULT_STYLES.strokeWidth / 2,
    fillColor: DEFAULT_STYLES.fillColor,
    stationRadius: DEFAULT_STYLES.stationRadius,
    selectionColor: DEFAULT_STYLES.selectionColor,
    fullySelected: false,
  };

  static StationMinorStyle = {
    strokeColor: this.SegmentStyle.strokeColor,
    strokeWidth: this.SegmentStyle.strokeWidth,
    selectionColor: DEFAULT_STYLES.selectionColor,
    minorStationSize: this.SegmentStyle.strokeWidth * 2.0,
    fullySelected: false,
  };

  static createStyle(baseStyle) {
    return { ...baseStyle };
  }

  static createStationStyle() {
    return this.createStyle(this.StationStyle);
  }

  static createStationMinorStyle() {
    return this.createStyle(this.StationMinorStyle);
  }

  static createSegmentStyle() {
    return this.createStyle(this.SegmentStyle);
  }

  static applyTheme(theme = "default") {
    switch (theme) {
      case "dark":
        this.StationStyle.fillColor = "#2c2c2c";
        this.StationStyle.strokeColor = "#ffffff";
        break;
      case "light":
        this.StationStyle.fillColor = "#ffffff";
        this.StationStyle.strokeColor = "#000000";
        break;
      default:
        this.StationStyle.fillColor = DEFAULT_STYLES.fillColor;
        this.StationStyle.strokeColor = StyleUtils.rgbToHex(0, 0, 0);
    }
  }
}

// Export utility functions
export const { rgbToHex } = StyleUtils;
