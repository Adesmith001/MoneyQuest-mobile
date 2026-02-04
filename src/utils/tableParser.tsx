import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TableRow {
  cells: string[];
  isHeader?: boolean;
}

interface ParsedContent {
  type: 'text' | 'table';
  content: string | TableRow[];
}

/**
 * Parse text content that may contain markdown-style tables
 * Tables are identified by lines with pipe characters (|)
 */
export const parseTextWithTables = (content: string): ParsedContent[] => {
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

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Check if line looks like a table row (contains | characters)
    const isTableRow = trimmedLine.includes('|') && trimmedLine.split('|').length >= 3;
    
    // Check if line is a separator row (contains only -, |, and spaces)
    const isSeparatorRow = /^[\s|:-]+$/.test(trimmedLine) && trimmedLine.includes('|');

    if (isTableRow && !isSeparatorRow) {
      // Start or continue table
      if (!inTable) {
        flushTextBlock();
        inTable = true;
      }

      // Parse table row
      const cells = trimmedLine
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== ''); // Remove empty cells from start/end

      if (cells.length > 0) {
        // First row is header
        const isHeader = currentTableRows.length === 0;
        currentTableRows.push({ cells, isHeader });
      }
    } else if (isSeparatorRow) {
      // Skip separator rows, but keep us in table mode
      return;
    } else {
      // Not a table row
      if (inTable) {
        flushTable();
        inTable = false;
      }
      
      // Add to text block (preserve empty lines within text)
      currentTextBlock.push(line);
    }
  });

  // Flush remaining content
  if (inTable) {
    flushTable();
  } else {
    flushTextBlock();
  }

  return sections;
};

/**
 * Render parsed content with proper table formatting
 */
export const RenderContentWithTables: React.FC<{
  content: string;
  textStyle?: any;
  containerStyle?: any;
}> = ({ content, textStyle, containerStyle }) => {
  const sections = parseTextWithTables(content);

  return (
    <View style={containerStyle}>
      {sections.map((section, index) => {
        if (section.type === 'text') {
          return (
            <Text key={`text-${index}`} style={[styles.text, textStyle]}>
              {section.content as string}
            </Text>
          );
        }

        if (section.type === 'table') {
          const rows = section.content as TableRow[];
          return (
            <View key={`table-${index}`} style={styles.tableContainer}>
              {rows.map((row, rowIndex) => (
                <View
                  key={`row-${rowIndex}`}
                  style={[
                    styles.tableRow,
                    row.isHeader && styles.tableHeaderRow,
                    rowIndex === rows.length - 1 && styles.tableLastRow,
                  ]}
                >
                  {row.cells.map((cell, cellIndex) => (
                    <View
                      key={`cell-${cellIndex}`}
                      style={[
                        styles.tableCell,
                        { flex: 1 },
                        cellIndex !== row.cells.length - 1 && styles.tableCellBorder,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tableCellText,
                          row.isHeader && styles.tableHeaderText,
                          textStyle,
                        ]}
                      >
                        {cell}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
  tableContainer: {
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tableLastRow: {
    borderBottomWidth: 0,
  },
  tableHeaderRow: {
    backgroundColor: '#f5f5f5',
  },
  tableCell: {
    padding: 10,
    justifyContent: 'center',
  },
  tableCellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  tableCellText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  tableHeaderText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#000',
  },
});
