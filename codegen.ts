import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../api/schema.gql',
  generates: {
    './lib/graphql-types.ts': {
      plugins: ['typescript'],
      config: {
        avoidOptionals: false,
        maybeValue: 'T | null | undefined',
        scalars: {
          DateTime: 'string',
        },
      },
    },
  },
};

export default config;

