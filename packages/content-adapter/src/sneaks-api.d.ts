declare module "sneaks-api" {
  export default class SneaksAPI {
    getProducts(
      keyword: string,
      limit: number,
      cb: (err: Error | null, products: unknown[]) => void,
    ): void;
    getMostPopular(
      limit: number,
      cb: (err: Error | null, products: unknown[]) => void,
    ): void;
    getProductPrices(
      styleID: string,
      cb: (err: Error | null, product: unknown) => void,
    ): void;
  }
}
