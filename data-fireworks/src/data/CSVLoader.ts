import Papa from 'papaparse';

export interface DataPoint {
  region: string;
  population: number;
  gdp: number;
  category: string;
}

export class CSVLoader {
  static async load(url: string): Promise<DataPoint[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data: DataPoint[] = results.data.map((row: any) => ({
            region: row.region as string,
            population: Number(row.population),
            gdp: Number(row.gdp),
            category: row.category as string,
          }));
          resolve(data);
        },
        error: (err: Error) => reject(err),
      });
    });
  }
}
