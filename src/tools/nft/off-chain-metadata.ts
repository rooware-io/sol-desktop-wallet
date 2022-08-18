export type MetadataJSONStructure = {
    name: string;
    symbol: string;
    description: string;
    seller_fee_basis_points: number;
    image: string;
    attributes: [
      {
        trait_type: string;
        value: string;
      },
      {
        trait_type: string;
        value: string;
      }
    ];
    collection: {
      name: string;
      family: string;
    };
    properties: {
      files: [
        {
          uri: string;
          type: string;
        }
      ];
      category: string;
      creators: [
        {
          address: string;
          share: number;
        }
      ];
    };
  };