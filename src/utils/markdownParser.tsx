import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TableRow {
  cells: string[];
}

interface ParsedContent {
  type: 'text' | 'table';
  content: string | TableRow[];
}

/**
 * Parse markdown content into sections (text and tables)
 */
export const parseMarkdownContent = (content: string): ParsedContent[] => {
  if (!content) return [];

  const lines = content.split('\n');
  const sections: ParsedContent[] = [];
  let currentTextBlock: string[] = [];
  let currentTableRows: TableRow[] = [];
  let inTable = false;

  const flushTextBlock = () => {
    if (currentTextBlock.length > 0) {
      sections.push({
        type: 'text',
        content: currentTextBlock.join('\n').trim(),
      });
      currentTextBlock = [];
    }
  };

  const flushTable = () => {
    if (currentTableRows.length > 0) {
      sections.push({
        type: 'table',
        content: currentTableRows,
      });
      currentTableRows = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a table row (contains pipes)
    const isTableRow = line.includes('|') && line.split('|').length > 2;
    const isSeparatorRow = /^\|?\s*[-:]+\s*\|/.test(line); // Matches | --- | --- | or |---|---|

    if (isTableRow) {
      // If we were building text, flush it
      if (!inTable && currentTextBlock.length > 0) {
        flushTextBlock();
      }

      inTable = true;

      // Skip separator rows (e.g., | --- | --- | --- |)
      if (!isSeparatorRow) {
        const cells = line
          .split('|')
          .map(cell => cell.trim())
          .filter(cell => cell.length > 0);

        if (cells.length > 0) {
          currentTableRows.push({ cells });
        }
      }
    } else {
      // Not a table row
      if (inTable) {
        // We were in a table, flush it
        flushTable();
        inTable = false;
      }

      // Add to text block
      if (line.length > 0 || currentTextBlock.length > 0) {
        currentTextBlock.push(line);
      }
    }
  }

  // Flush any remaining content
  if (inTable) {
    flushTable();
  } else {
    flushTextBlock();
  }

  return sections;
};

/**
 * Render parsed markdown content with proper table formatting
 */
export const renderMarkdownContent = (content: string, textStyle?: any): JSX.Element[] => {
  const sections = parseMarkdownContent(content);

  return sections.map((section, index) => {
    if (section.type === 'text') {
      return (
        <Text key={`text-${index}`} style={[styles.text, textStyle]}>
          {section.content as string}
        </Text>
      );
    } else {
      // Render table
      const rows = section.content as TableRow[];
      const isFirstRowHeader = rows.length > 0;

      return (
        <View key={`table-${index}`} style={styles.tableContainer}>
          {rows.map((row, rowIndex) => {
            const isHeader = isFirstRowHeader && rowIndex === 0;
            return (
              <View
                key={`row-${rowIndex}`}
                style={[
                  styles.tableRow,
                  isHeader && styles.tableHeaderRow,
                  rowIndex === rows.length - 1 && styles.tableLastRow,
                ]}
              >
                {row.cells.map((cell, cellIndex) => (
                  <View
                    key={`cell-${cellIndex}`}
                    style={[
                      styles.tableCell,
                      cellIndex !== row.cells.length - 1 && styles.tableCellBorder,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tableCellText,
                        isHeader && styles.tableHeaderText,
                        textStyle,
                      ]}
                    >
                      {cell}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      );
    }
  });
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
    marginBottom: 12,
  },
  tableContainer: {
    marginVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableHeaderRow: {
    backgroundColor: '#FF6B35',
  },
  tableLastRow: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  tableCellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  tableCellText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  tableHeaderText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});
