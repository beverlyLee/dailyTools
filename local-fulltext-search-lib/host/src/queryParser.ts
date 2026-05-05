export type QueryOperator = 'AND' | 'OR' | 'NOT';

export interface QueryNode {
  type: 'term' | 'phrase' | 'and' | 'or' | 'not';
  value?: string;
  terms?: string[];
  left?: QueryNode;
  right?: QueryNode;
  inner?: QueryNode;
}

export class QueryParser {
  static parse(query: string): string {
    return query.trim();
  }

  static and(queries: string[]): string {
    if (queries.length === 0) return '';
    if (queries.length === 1) return queries[0];
    return queries.map(q => `(${q})`).join(' AND ');
  }

  static or(queries: string[]): string {
    if (queries.length === 0) return '';
    if (queries.length === 1) return queries[0];
    return queries.map(q => `(${q})`).join(' OR ');
  }

  static not(query: string): string {
    return `NOT (${query})`;
  }

  static phrase(terms: string[]): string {
    return `"${terms.join(' ')}"`;
  }

  static term(term: string): string {
    return term;
  }

  static build(node: QueryNode): string {
    switch (node.type) {
      case 'term':
        return node.value || '';
      case 'phrase':
        return this.phrase(node.terms || []);
      case 'and':
        if (node.left && node.right) {
          return this.and([this.build(node.left), this.build(node.right)]);
        }
        return '';
      case 'or':
        if (node.left && node.right) {
          return this.or([this.build(node.left), this.build(node.right)]);
        }
        return '';
      case 'not':
        if (node.inner) {
          return this.not(this.build(node.inner));
        }
        return '';
      default:
        return '';
    }
  }
}

export function createQueryBuilder(): QueryBuilder {
  return new QueryBuilder();
}

export class QueryBuilder {
  private parts: string[] = [];

  term(term: string): this {
    this.parts.push(QueryParser.term(term));
    return this;
  }

  phrase(terms: string[]): this {
    this.parts.push(QueryParser.phrase(terms));
    return this;
  }

  and(...queries: string[]): this {
    this.parts.push(QueryParser.and(queries));
    return this;
  }

  or(...queries: string[]): this {
    this.parts.push(QueryParser.or(queries));
    return this;
  }

  not(query: string): this {
    this.parts.push(QueryParser.not(query));
    return this;
  }

  build(): string {
    return this.parts.join(' AND ');
  }
}
