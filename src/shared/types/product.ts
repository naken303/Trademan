export interface ProductImage {
  type: "file";
  path: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  unitsPerCrate: number;
  image?: ProductImage;
}