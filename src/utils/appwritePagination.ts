export type CursorDocument = {
  $id: string;
};

export const collectCursorPages = async <T extends CursorDocument>(
  fetchPage: (cursor: string | null) => Promise<T[]>,
  pageSize: number
): Promise<T[]> => {
  const documents: T[] = [];
  let cursor: string | null = null;

  while (true) {
    const page = await fetchPage(cursor);
    documents.push(...page);

    if (page.length < pageSize) {
      return documents;
    }

    const nextCursor = page[page.length - 1]?.$id;
    if (!nextCursor || nextCursor === cursor) {
      throw new Error(`Repeated pagination cursor: ${nextCursor ?? ''}`);
    }

    cursor = nextCursor;
  }
};
