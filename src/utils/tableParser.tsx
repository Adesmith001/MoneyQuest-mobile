import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';

interface TableRow {
  cells: string[];
  isHeader?: boolean;
}

interface ParsedContent {
  type: 'text' | 'table' | 'heading' | 'bullet' | 'numbered' | 'paragraph';
  content: string | TableRow[];
  level?: number; // For headings (1-3) and list depth
  index?: number; // For numbered lists
}

/**
 * Parse inline formatting (bold and italic)
 */
const parseInlineFormatting = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let currentText = text;
  let keyCounter = 0;

  // Match bold (**text**) and italic (*text* but not **)
  const regex = /(\*\*(.+?)\*\*)|(?<!\*)(\*(?!\*)(.+?)(?<!\*)\*)(?!\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(currentText)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(currentText.substring(lastIndex, match.index));
    }

    // Check if it's bold or italic
    if (match[1]) {
      // Bold text
      parts.push(
        <Text key={`bold-${keyCounter++}`} style={{ fontWeight: '700' }}>
          {match[2]}
        </Text>
      );
    } else if (match[3]) {
      // Italic text
      parts.push(
        <Text key={`italic-${keyCounter++}`} style={{ fontStyle: 'italic' }}>
          {match[4]}
        </Text>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < currentText.length) {
    parts.push(currentText.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

/**
 * Parse text content that may contain markdown-style tables, headings, lists, and inline formatting
 * Tables are identified by lines with pipe characters (|)
 * Headings are identified by # at the start
 * Bullet points are identified by -, *, or • at the start
 * Numbered lists are identified by numbers followed by . at the start
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
      const text = currentTextBlock.join('\n').trim();
      
      // Split by double newlines for paragraph separation
      const paragraphs = text.split(/\n\n+/);
      
      paragraphs.forEach(para => {
        const trimmed = para.trim();
        if (trimmed) {
          sections.push({
            type: 'paragraph',
            content: trimmed,
          });
        }
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
    
    // Check if line is a heading
    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      flushTextBlock();
      
      sections.push({
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length,
      });
      return;
    }
    
    // Check if line is a bullet point
    const bulletMatch = trimmedLine.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      flushTextBlock();
      
      sections.push({
        type: 'bullet',
        content: bulletMatch[1],
      });
      return;
    }
    
    // Check if line is a numbered list item
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (inTable) {
        flushTable();
        inTable = false;
      }
      flushTextBlock();
      
      sections.push({
        type: 'numbered',
        content: numberedMatch[2],
        index: parseInt(numberedMatch[1], 10),
      });
      return;
    }
    
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
 * Render parsed content with proper formatting for tables, headings, lists, and inline formatting
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
        // Heading
        if (section.type === 'heading') {
          const headingLevel = section.level || 1;
          let headingStyle: TextStyle = styles.heading1;
          
          if (headingLevel === 2) {
            headingStyle = styles.heading2;
          } else if (headingLevel === 3) {
            headingStyle = styles.heading3;
          }
          
          return (
            <Text key={`heading-${index}`} style={[headingStyle, textStyle]}>
              {parseInlineFormatting(section.content as string)}
            </Text>
          );
        }

        // Bullet point
        if (section.type === 'bullet') {
          return (
            <View key={`bullet-${index}`} style={styles.bulletContainer}>
              <Text style={[styles.bulletSymbol, textStyle]}>•</Text>
              <Text style={[styles.bulletText, textStyle]}>
                {parseInlineFormatting(section.content as string)}
              </Text>
            </View>
          );
        }

        // Numbered list item
        if (section.type === 'numbered') {
          return (
            <View key={`numbered-${index}`} style={styles.bulletContainer}>
              <Text style={[styles.bulletSymbol, textStyle]}>
                {section.index}.
              </Text>
              <Text style={[styles.bulletText, textStyle]}>
                {parseInlineFormatting(section.content as string)}
              </Text>
            </View>
          );
        }

        // Paragraph
        if (section.type === 'paragraph') {
          return (
            <Text key={`paragraph-${index}`} style={[styles.paragraph, textStyle]}>
              {parseInlineFormatting(section.content as string)}
            </Text>
          );
        }

        // Plain text (legacy support)
        if (section.type === 'text') {
          return (
            <Text key={`text-${index}`} style={[styles.text, textStyle]}>
              {parseInlineFormatting(section.content as string)}
            </Text>
          );
        }

        // Table
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
  // Paragraph styles
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
  
  // Heading styles
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
    marginTop: 4,
    lineHeight: 32,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 6,
    marginTop: 4,
    lineHeight: 28,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
    marginTop: 2,
    lineHeight: 26,
  },
  
  // List styles
  bulletContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 0,
    alignItems: 'flex-start',
  },
  bulletSymbol: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginRight: 8,
    minWidth: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  
  // Table styles
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
